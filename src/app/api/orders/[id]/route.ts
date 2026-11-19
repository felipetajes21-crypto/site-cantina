import { handle, ok } from "@/lib/api";
import { loadOwnOrder } from "@/lib/order-access";
import { expireStaleOrders, orderInclude, refreshPayment, serializeOrder } from "@/lib/orders";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// Consultada a cada poucos segundos pela tela do pedido (tempo real por polling).
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await expireStaleOrders();
  let order = await loadOwnOrder((await params).id);
  // Pix: confere no gateway se o pagamento já caiu.
  if (await refreshPayment(order)) {
    order = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  }
  return ok({ order: serializeOrder(order) });
});
