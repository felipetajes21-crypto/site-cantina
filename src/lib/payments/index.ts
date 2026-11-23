import { HttpError } from "../api";
import { mercadoPagoProvider } from "./mercadopago";
import { paypalProvider } from "./paypal";
import { testGateway } from "./test-gateway";
import type { PaymentProvider } from "./types";

// Formas de pagamento disponíveis. Para um gateway novo (Stripe, PagSeguro…),
// implemente PaymentProvider e acrescente aqui.
export const PROVIDERS: Record<string, PaymentProvider> = {
  [mercadoPagoProvider.id]: mercadoPagoProvider,
  [paypalProvider.id]: paypalProvider,
  [testGateway.id]: testGateway,
};

/**
 * Forma de pagamento ativa: a escolhida no painel; se vazio, a variável
 * PAYMENT_PROVIDER; se não estiver pronta, a primeira que estiver.
 * Retorna null quando nenhuma está configurada.
 */
export function activePaymentProvider(settings?: { paymentProvider?: string }): PaymentProvider | null {
  const preferred = [settings?.paymentProvider, process.env.PAYMENT_PROVIDER, "mercadopago", "paypal", "teste"];
  for (const id of preferred) {
    const provider = id ? PROVIDERS[id] : undefined;
    if (provider && !provider.unavailableReason()) return provider;
  }
  return null;
}

/** Igual a activePaymentProvider, mas para criar pedidos: falha com mensagem clara. */
export function getPaymentProvider(settings?: { paymentProvider?: string }): PaymentProvider {
  const provider = activePaymentProvider(settings);
  if (!provider) throw new HttpError(503, "A cantina ainda não configurou a forma de pagamento.");
  return provider;
}

/** Provedor que criou um pedido (para confirmar ou devolver depois). */
export const providerById = (id: string) => PROVIDERS[id] ?? null;

/** Lista para o painel, com o motivo quando não pode ser usado. */
export const providerOptions = () =>
  Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, unavailable: p.unavailableReason() }));
