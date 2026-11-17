import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { expireStaleOrders, orderInclude, serializeOrder } from "@/lib/orders";
import { localInfo } from "@/lib/time";

export const dynamic = "force-dynamic";

// Fila da cantina: pedidos em andamento + finalizados de hoje.
// Consultada a cada poucos segundos pelo painel.
export const GET = handle(async () => {
  await requireAdmin();
  await expireStaleOrders();
  const today = localInfo().date;
  // Fila de hoje: aguardando pagamento (de qualquer dia) + pedidos pagos para hoje.
  // Pedidos pagos para os próximos dias ficam em "Agendados" até o dia chegar.
  const [active, scheduled, done] = await Promise.all([
    prisma.order.findMany({
      where: {
        OR: [
          { status: "AWAITING_PAYMENT" },
          { status: { in: ["RECEIVED", "PREPARING", "READY"] }, pickupDate: { lte: today } },
        ],
      },
      include: orderInclude,
      orderBy: { id: "asc" },
    }),
    prisma.order.findMany({
      where: { status: { in: ["RECEIVED", "PREPARING", "READY"] }, pickupDate: { gt: today } },
      include: orderInclude,
      orderBy: [{ pickupDate: "asc" }, { pickupSlot: "asc" }, { id: "asc" }],
    }),
    prisma.order.findMany({
      where: { status: { in: ["PICKED_UP", "CANCELLED"] }, pickupDate: today },
      include: orderInclude,
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);
  return ok({ active: active.map(serializeOrder), scheduled: scheduled.map(serializeOrder), done: done.map(serializeOrder) });
});
