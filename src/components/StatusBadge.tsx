import { STATUS_LABEL, type OrderStatus } from "@/lib/status";

const STYLE: Record<OrderStatus, string> = {
  AWAITING_PAYMENT: "bg-stone-200 text-stone-800",
  RECEIVED: "bg-sky-100 text-sky-900",
  PREPARING: "bg-violet-100 text-violet-900",
  READY: "bg-saffron-300 text-stone-900",
  PICKED_UP: "bg-stone-200 text-stone-700",
  CANCELLED: "bg-red-100 text-red-800",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
