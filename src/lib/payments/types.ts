// Contrato que qualquer provedor de pagamento precisa implementar.
// Para integrar um gateway (Mercado Pago, Asaas, Efí, etc.), crie um arquivo
// nesta pasta implementando PaymentProvider e registre-o em ./index.ts.
import type { CantinaSettings } from "../settings";

export type ChargeInput = {
  orderId: number;
  amountCents: number;
  settings: CantinaSettings;
};

export type Charge = {
  /** Identificador da cobrança no provedor (usado para casar o webhook). */
  providerRef: string;
  /** Texto do Pix copia e cola (também usado para gerar o QR Code). */
  pixCopyPaste: string;
};

export type WebhookResult = { providerRef: string; paid: boolean } | null;

export interface PaymentProvider {
  id: string;
  /** true = o provedor avisa sozinho quando o Pix cai (webhook). */
  autoConfirms: boolean;
  createCharge(input: ChargeInput): Promise<Charge>;
  /**
   * Valida e interpreta a notificação do gateway. Deve conferir a assinatura
   * da requisição e retornar null se ela não for autêntica.
   */
  parseWebhook?(request: Request): Promise<WebhookResult>;
}
