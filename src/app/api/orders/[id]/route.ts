import { handle, ok } from "@/lib/api";
import { loadOwnOrder } from "@/lib/order-access";
import { expireStaleOrders, serializeOrder } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

// Consultada a cada poucos segundos pela tela do pedido (tempo real por polling).
export const GET = handle(async (_req: Request, { params }: Ctx) => {
  await expireStaleOrders();
  const order = await loadOwnOrder((await params).id);
  return ok({ order: serializeOrder(order) });
});
