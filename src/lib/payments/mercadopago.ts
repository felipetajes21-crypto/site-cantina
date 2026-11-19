// Integração com o Mercado Pago (Checkout Pro).
//
// Como ligar:
// 1. Em https://www.mercadopago.com.br/developers/panel crie uma aplicação
//    (produto "Checkout Pro") e copie o Access Token.
//    - Credenciais de teste começam com TEST- (nenhum dinheiro de verdade).
//    - Credenciais de produção cobram de verdade.
// 2. Defina no ambiente: MERCADOPAGO_ACCESS_TOKEN.
// 3. No painel, em Configurações → Forma de pagamento, escolha "Mercado Pago".
//
// Fluxo: o site cria uma "preferência" com o valor do pedido e manda o cliente
// para a página do Mercado Pago, onde ele escolhe Pix, cartão etc. O pagamento
// é confirmado consultando a API do Mercado Pago (nunca só pela URL):
// - na volta do cliente (/api/payments/return);
// - enquanto a tela do pedido está aberta (útil no Pix, que cai segundos depois);
// - pela notificação (webhook), se o site estiver publicado com https.
// Recusar o pedido no painel devolve o valor total (também no Pix).
//
// Observação: segue a documentação oficial da API, mas ainda não foi testado
// com uma conta real. Teste primeiro com as credenciais de teste (TEST-...).
import { HttpError } from "../api";
import type { PaymentProvider, PaymentResult } from "./types";

const API = "https://api.mercadopago.com";
const PAYMENT_MINUTES = 20; // mesmo prazo de pagamento do site

type MPPayment = {
  id: number;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded…
  external_reference?: string;
  transaction_amount?: number;
};

async function mp<T>(path: string, init: { method: string; body?: unknown; idempotencyKey?: string }) {
  const res = await fetch(`${API}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      // Idempotência: repetir a mesma operação não devolve duas vezes.
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { status: res.status, data };
}

/** Confere um pagamento: aprovado, do pedido certo e com o valor certo. */
function check(payment: MPPayment | undefined, providerRef: string, amountCents?: number): PaymentResult {
  if (!payment || payment.status !== "approved" || payment.external_reference !== providerRef) return { paid: false };
  if (amountCents !== undefined && Math.round((payment.transaction_amount ?? 0) * 100) < amountCents) return { paid: false };
  return { paid: true, captureRef: String(payment.id) };
}

/** Procura um pagamento aprovado para o pedido (o mais recente primeiro). */
async function findApproved(providerRef: string, amountCents?: number): Promise<PaymentResult> {
  const { status, data } = await mp<{ results?: MPPayment[] }>(
    `/v1/payments/search?external_reference=${encodeURIComponent(providerRef)}&sort=date_created&criteria=desc`,
    { method: "GET" },
  );
  if (status >= 300) return { paid: false };
  for (const payment of data.results ?? []) {
    const result = check(payment, providerRef, amountCents);
    if (result.paid) return result;
  }
  return { paid: false };
}

export const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago",
  label: "Mercado Pago (Pix, cartão e saldo Mercado Pago)",
  autoConfirms: true,
  canRefund: true,
  unavailableReason: () =>
    process.env.MERCADOPAGO_ACCESS_TOKEN ? null : "Falta a credencial MERCADOPAGO_ACCESS_TOKEN no ambiente.",

  async createCharge({ orderId, amountCents, description, settings, returnUrl, cancelUrl }) {
    const ref = `PEDIDO${orderId}`;
    const site = new URL(returnUrl);
    const expires = new Date(Date.now() + PAYMENT_MINUTES * 60_000).toISOString();
    const { status, data } = await mp<{ id?: string; init_point?: string; sandbox_init_point?: string }>(
      "/checkout/preferences",
      {
        method: "POST",
        body: {
          items: [
            { id: ref, title: description.slice(0, 250), quantity: 1, currency_id: "BRL", unit_price: amountCents / 100 },
          ],
          external_reference: ref,
          statement_descriptor: settings.cantinaName.replace(/[^A-Za-z0-9 ]/g, "").slice(0, 22) || "CANTINA",
          back_urls: { success: returnUrl, pending: returnUrl, failure: cancelUrl },
          auto_return: "approved",
          // Notificação só funciona com o site publicado em https.
          ...(site.protocol === "https:"
            ? { notification_url: `${site.origin}/api/payments/webhook?provider=mercadopago` }
            : {}),
          // Sem boleto (demora dias); Pix e cartão à vista.
          payment_methods: { excluded_payment_types: [{ id: "ticket" }], installments: 1 },
          expires: true,
          expiration_date_to: expires,
          date_of_expiration: expires,
        },
      },
    );
    const url = data.init_point ?? data.sandbox_init_point;
    if (status >= 300 || !url) throw new HttpError(502, "O Mercado Pago não aceitou criar o pagamento. Tente de novo.");
    return { kind: "redirect", providerRef: ref, redirectUrl: url };
  },

  async confirmReturn(providerRef, params) {
    // O Mercado Pago devolve payment_id na URL; o pagamento é conferido na API.
    const paymentId = params.get("payment_id") ?? params.get("collection_id");
    if (paymentId && /^\d+$/.test(paymentId)) {
      const { data } = await mp<MPPayment>(`/v1/payments/${paymentId}`, { method: "GET" });
      const result = check(data, providerRef);
      if (result.paid) return result;
    }
    return findApproved(providerRef);
  },

  async checkPayment(providerRef, amountCents) {
    return findApproved(providerRef, amountCents);
  },

  async parseWebhook(request) {
    // Aceita os dois formatos de notificação ({type, data: {id}} ou ?data.id=).
    const url = new URL(request.url);
    const body = (await request.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
    const id = String(body.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
    if (!/^\d+$/.test(id)) return null;
    // A autenticidade vem de consultar o pagamento na API com o nosso token.
    const { status, data } = await mp<MPPayment>(`/v1/payments/${id}`, { method: "GET" });
    if (status >= 300 || !data.external_reference) return null;
    return { providerRef: data.external_reference, paid: data.status === "approved", captureRef: String(data.id) };
  },

  async refund({ captureRef, orderId }) {
    if (!captureRef) throw new HttpError(409, "Esse pagamento não foi encontrado no Mercado Pago para devolver.");
    // Sem valor no corpo = devolução total (funciona também para Pix).
    const { status, data } = await mp<{ id?: number }>(`/v1/payments/${encodeURIComponent(captureRef)}/refunds`, {
      method: "POST",
      body: {},
      idempotencyKey: `cantina-devolucao-${orderId}`,
    });
    if (status >= 300 || !data.id) throw new HttpError(502, "O Mercado Pago recusou a devolução. Faça pelo painel do Mercado Pago.");
    return { refundRef: String(data.id) };
  },
};
