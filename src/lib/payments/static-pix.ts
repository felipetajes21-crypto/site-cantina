// Provedor padrão: Pix estático com a chave da própria cantina.
// Não há confirmação automática; a cantina confere o recebimento no app do
// banco e confirma o pagamento no painel.
import { buildPixPayload } from "../pix";
import { HttpError } from "../api";
import type { PaymentProvider } from "./types";

export const staticPix: PaymentProvider = {
  id: "static-pix",
  autoConfirms: false,
  async createCharge({ orderId, amountCents, settings }) {
    if (!settings.pixKey) {
      throw new HttpError(503, "A cantina ainda não configurou o pagamento via Pix.");
    }
    const txid = `PEDIDO${orderId}`;
    return {
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
