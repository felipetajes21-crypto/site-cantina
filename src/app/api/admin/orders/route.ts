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
  const [active, done] = await Promise.all([
    prisma.order.findMany({
      where: { status: { in: ["AWAITING_PAYMENT", "RECEIVED", "PREPARING", "READY"] } },
      include: orderInclude,
      orderBy: { id: "asc" },
    }),
    prisma.order.findMany({
      where: { status: { in: ["PICKED_UP", "CANCELLED"] }, pickupDate: today },
      include: orderInclude,
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);
  return ok({ active: active.map(serializeOrder), done: done.map(serializeOrder) });
});
