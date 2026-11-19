// Integração com o PayPal (Checkout com redirecionamento, API REST v2).
//
// Como ligar:
// 1. Crie um app em https://developer.paypal.com → Apps & Credentials.
// 2. Defina no ambiente: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET e
//    PAYPAL_ENV=sandbox (testes) ou PAYPAL_ENV=live (dinheiro de verdade).
// 3. No painel, em Configurações → Pagamento, escolha "PayPal".
//
// Fluxo: o site cria um pedido no PayPal (intent CAPTURE) e manda o cliente
// para a página de aprovação. Quando ele volta, o site efetiva a cobrança
// (capture) direto com o PayPal. Recusar o pedido no painel faz a devolução
// total (refund) da cobrança.
//
// Observação: este arquivo segue a documentação oficial da API, mas ainda não
// foi testado com uma conta real. Teste primeiro no modo sandbox.
import { HttpError } from "../api";
import type { PaymentProvider } from "./types";

const base = () =>
  process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(`${base()}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new HttpError(502, "Não foi possível conectar ao PayPal. Confira as credenciais.");
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

async function paypal<T>(path: string, init: { method: string; body?: unknown; requestId?: string }): Promise<{ status: number; data: T }> {
  const res = await fetch(`${base()}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      // Idempotência: repetir a mesma operação não cobra/devolve duas vezes.
      ...(init.requestId ? { "PayPal-Request-Id": init.requestId } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

type PayPalOrder = {
  id: string;
  status: string;
  links?: { rel: string; href: string }[];
  purchase_units?: { payments?: { captures?: { id: string; status: string }[] } }[];
  details?: { issue: string }[];
};

const captureOf = (order: PayPalOrder) =>
  order.purchase_units?.[0]?.payments?.captures?.find((c) => c.status === "COMPLETED" || c.status === "PENDING");

export const paypalProvider: PaymentProvider = {
  id: "paypal",
  label: "PayPal (cartão ou conta PayPal)",
  autoConfirms: true,
  canRefund: true,
  unavailableReason: () =>
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET
      ? null
      : "Faltam as credenciais PAYPAL_CLIENT_ID e PAYPAL_CLIENT_SECRET no ambiente.",

  async createCharge({ orderId, amountCents, description, settings, returnUrl, cancelUrl }) {
    const { status, data } = await paypal<PayPalOrder>("/v2/checkout/orders", {
      method: "POST",
      requestId: `cantina-pedido-${orderId}`,
      body: {
        intent: "CAPTURE",
        purchase_units: [
          {
            reference_id: `PEDIDO${orderId}`,
            description: description.slice(0, 127),
            amount: { currency_code: "BRL", value: (amountCents / 100).toFixed(2) },
          },
        ],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: settings.cantinaName.slice(0, 127),
              locale: "pt-BR",
              shipping_preference: "NO_SHIPPING",
              user_action: "PAY_NOW",
              return_url: returnUrl,
              cancel_url: cancelUrl,
            },
          },
        },
      },
    });
    const approve = data.links?.find((l) => l.rel === "payer-action" || l.rel === "approve");
    if (status >= 300 || !approve) throw new HttpError(502, "O PayPal não aceitou criar o pagamento. Tente de novo.");
    return { kind: "redirect", providerRef: data.id, redirectUrl: approve.href };
  },

  async confirmReturn(providerRef) {
    // Efetiva a cobrança. Se já tinha sido efetivada, consulta o pedido.
    const capture = await paypal<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(providerRef)}/capture`, {
      method: "POST",
      requestId: `cantina-captura-${providerRef}`,
      body: {},
    });
    let order = capture.data;
    if (capture.status >= 300) {
      const current = await paypal<PayPalOrder>(`/v2/checkout/orders/${encodeURIComponent(providerRef)}`, { method: "GET" });
      order = current.data;
    }
    const done = order.status === "COMPLETED" ? captureOf(order) : undefined;
    return done ? { paid: true, captureRef: done.id } : { paid: false };
  },

  async refund({ captureRef, orderId }) {
    if (!captureRef) throw new HttpError(409, "Esse pagamento não tem cobrança efetivada no PayPal para devolver.");
    // Sem valor no corpo = devolução total.
    const { status, data } = await paypal<{ id?: string; status?: string }>(
      `/v2/payments/captures/${encodeURIComponent(captureRef)}/refund`,
      { method: "POST", requestId: `cantina-devolucao-${orderId}`, body: {} },
    );
    if (status >= 300 || !data.id) throw new HttpError(502, "O PayPal recusou a devolução. Faça pelo painel do PayPal.");
    return { refundRef: data.id };
  },
};
