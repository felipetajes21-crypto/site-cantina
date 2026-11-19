import { STATUS_LABEL, type OrderStatus } from "@/lib/status";

// Cores de status dentro da paleta: cinza (aguardando), laranja claro
// (recebido), laranja (em preparo), amarelo (pronto) e cinza claro (fim).
const STYLE: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-stone-200 text-stone-800",
  RECEIVED: "bg-brand-100 text-brand-900",
  PREPARING: "bg-brand-700 text-white",
  READY: "bg-saffron-400 text-stone-900",
  PICKED_UP: "bg-stone-100 text-stone-600",
  CANCELLED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status, refused }: { status: OrderStatus; refused?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLE[status]}`}>
      {refused && status === "CANCELLED" ? "Recusado" : STATUS_LABEL[status]}
    </span>
  );
}
