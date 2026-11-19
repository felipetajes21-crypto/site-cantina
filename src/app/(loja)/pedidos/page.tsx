import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { expireStaleOrders } from "@/lib/orders";
import { formatBRL, orderNumber } from "@/lib/format";
import { formatDateTime, localInfo } from "@/lib/time";
import { pickupText } from "@/lib/schedule";
import type { OrderStatus } from "@/lib/status";
import { StatusBadge } from "@/components/StatusBadge";
import { RepeatOrderButton } from "@/components/RepeatOrderButton";

export const metadata = { title: "Meus pedidos" };

// Histórico de pedidos do cliente, com "repetir pedido".
export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/entrar?next=/pedidos");
  await expireStaleOrders();
  const today = localInfo().date;

  const orders = await prisma.order.findMany({
    where: { userId: session.sub },
    include: { items: true },
    orderBy: { id: "desc" },
    take: 50,
  });

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Meus pedidos</h1>
      {orders.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">Você ainda não fez nenhum pedido</p>
          <Link href="/" className="btn-primary mt-4">Ver cardápio</Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="card p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold tabular-nums">Pedido {orderNumber(o.id)}</p>
                <StatusBadge status={o.status as OrderStatus} />
              </div>
              <p className="mt-0.5 text-sm text-stone-500">
                Feito em {formatDateTime(o.createdAt)} · Retirada: {pickupText(o.pickupDate, o.pickupSlot, today)}
              </p>
              <p className="mt-2 text-sm text-stone-700">
                {o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
              </p>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="font-semibold tabular-nums">{formatBRL(o.totalCents)}</span>
                <div className="flex gap-2">
                  <RepeatOrderButton
                    items={o.items.filter((i) => i.productId).map((i) => ({ productId: i.productId!, quantity: i.quantity, note: i.note ?? "" }))}
                  />
                  <Link href={`/pedidos/${o.id}`} className="btn-secondary btn-sm">Ver</Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
