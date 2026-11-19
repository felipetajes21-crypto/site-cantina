// Pix estático com a chave da própria cantina.
// Não há confirmação nem devolução automáticas: o cliente toca em "Já paguei",
// a cantina confere no app do banco e, se recusar o pedido, devolve pelo banco.
import { buildPixPayload } from "../pix";
import { HttpError } from "../api";
import type { PaymentProvider } from "./types";

export const staticPix: PaymentProvider = {
  id: "static-pix",
  label: "Pix com a chave da cantina (conferência manual)",
  autoConfirms: false,
  canRefund: false,
  unavailableReason: () => null,
  async createCharge({ orderId, amountCents, settings }) {
    if (!settings.pixKey) {
      throw new HttpError(503, "A cantina ainda não configurou o pagamento via Pix.");
    }
    const txid = `PEDIDO${orderId}`;
    return {
      kind: "pix",
      providerRef: txid,
      pixCopyPaste: buildPixPayload({
        key: settings.pixKey,
        merchantName: settings.pixMerchantName,
        city: settings.pixCity,
        amountCents,
        txid,
      }),
    };
  },
};
