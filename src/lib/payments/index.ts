import { staticPix } from "./static-pix";
import type { PaymentProvider } from "./types";

// Registre aqui novos provedores, ex.: { "static-pix": staticPix, "mercado-pago": mercadoPago }
const providers: Record<string, PaymentProvider> = {
  [staticPix.id]: staticPix,
};

/** Provedor ativo, escolhido pela variável de ambiente PAYMENT_PROVIDER. */
export function getPaymentProvider(): PaymentProvider {
  return providers[process.env.PAYMENT_PROVIDER || staticPix.id] ?? staticPix;
}
