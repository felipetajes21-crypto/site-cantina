// Contrato que qualquer forma de pagamento implementa.
//
// Há dois tipos de cobrança:
// - "pix": o site mostra QR Code / copia e cola (Pix com a chave da cantina).
// - "redirect": o cliente vai para a página de pagamento do gateway (PayPal,
//   Mercado Pago, Stripe…) e volta para /api/payments/return, onde o site
//   confirma o pagamento direto com o gateway.
//
// Para integrar um gateway novo: crie um arquivo nesta pasta implementando
// PaymentProvider e registre-o em ./index.ts. Veja ./paypal.ts como modelo.
import type { CantinaSettings } from "../settings";

export type ChargeInput = {
  orderId: number;
  amountCents: number;
  description: string; // ex.: "Pedido #0042 · Cantina"
  settings: CantinaSettings;
  returnUrl: string; // para onde o gateway manda o cliente depois de pagar
  cancelUrl: string; // para onde o gateway manda o cliente se desistir
};

export type Charge =
  | { kind: "pix"; providerRef: string; pixCopyPaste: string }
  | { kind: "redirect"; providerRef: string; redirectUrl: string };

export type PaymentResult = { paid: boolean; captureRef?: string };

export type WebhookResult = { providerRef: string; paid: boolean; captureRef?: string } | null;

export interface PaymentProvider {
  id: string;
  /** Nome mostrado no painel. */
  label: string;
  /** true = o site sabe sozinho quando o pagamento foi feito (sem "Já paguei"). */
  autoConfirms: boolean;
  /** true = o site consegue devolver o dinheiro sozinho quando a cantina recusa. */
  canRefund: boolean;
  /** Se não estiver pronto para uso (ex.: faltam credenciais), diz o motivo. */
  unavailableReason(): string | null;

  createCharge(input: ChargeInput): Promise<Charge>;

  /**
   * Chamado quando o cliente volta da página do gateway. Deve confirmar o
   * pagamento DIRETAMENTE com o gateway (nunca confiar só nos parâmetros da URL)
   * e, se for o caso, efetivar a cobrança.
   */
  confirmReturn?(providerRef: string, params: URLSearchParams): Promise<PaymentResult>;

  /** Valida a notificação do gateway (assinatura) e diz se foi pago. */
  parseWebhook?(request: Request): Promise<WebhookResult>;

  /** Devolve o valor total ao cliente. Retorna o id da devolução. */
  refund?(input: { providerRef: string; captureRef: string | null; amountCents: number; orderId: number }): Promise<{ refundRef: string }>;
}
