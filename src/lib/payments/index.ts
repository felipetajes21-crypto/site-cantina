import { staticPix } from "./static-pix";
import { testGateway } from "./test-gateway";
import { paypalProvider } from "./paypal";
import type { PaymentProvider } from "./types";

// Formas de pagamento disponíveis. Para um gateway novo (Mercado Pago,
// Stripe…), implemente PaymentProvider e acrescente aqui.
export const PROVIDERS: Record<string, PaymentProvider> = {
  [staticPix.id]: staticPix,
  [testGateway.id]: testGateway,
  [paypalProvider.id]: paypalProvider,
};

/**
 * Forma de pagamento ativa: a escolhida no painel ou, se vazio, a variável
 * PAYMENT_PROVIDER. Se a escolhida não estiver pronta, cai no Pix.
 */
export function getPaymentProvider(settings?: { paymentProvider?: string }): PaymentProvider {
  const id = settings?.paymentProvider || process.env.PAYMENT_PROVIDER || staticPix.id;
  const provider = PROVIDERS[id];
  return provider && !provider.unavailableReason() ? provider : staticPix;
}

/** Provedor que criou um pedido (para confirmar ou devolver depois). */
export const providerById = (id: string) => PROVIDERS[id] ?? null;

/** Lista para o painel, com o motivo quando não pode ser usado. */
export const providerOptions = () =>
  Object.values(PROVIDERS).map((p) => ({ id: p.id, label: p.label, unavailable: p.unavailableReason() }));
