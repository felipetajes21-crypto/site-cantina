// Status do pedido e as transições permitidas.
export const ORDER_STATUSES = [
  "AWAITING_PAYMENT",
  "RECEIVED",
  "PREPARING",
  "READY",
  "PICKED_UP",
  "CANCELLED",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "Aguardando pagamento",
  RECEIVED: "Recebido",
  PREPARING: "Em preparo",
  READY: "Pronto para retirada",
  PICKED_UP: "Retirado",
  CANCELLED: "Cancelado",
};

// Etapas mostradas ao cliente na linha do tempo do pedido.
export const TIMELINE: OrderStatus[] = ["RECEIVED", "PREPARING", "READY", "PICKED_UP"];

// Próximo status no fluxo normal da cozinha.
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  RECEIVED: "PREPARING",
  PREPARING: "READY",
  READY: "PICKED_UP",
};

export const NEXT_ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  AWAITING_PAYMENT: "Confirmar pagamento",
  RECEIVED: "Iniciar preparo",
  PREPARING: "Marcar como pronto",
  READY: "Confirmar retirada",
};

export const isFinal = (s: string) => s === "PICKED_UP" || s === "CANCELLED";
