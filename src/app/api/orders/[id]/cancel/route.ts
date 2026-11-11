import { handle, HttpError, ok } from "@/lib/api";
import { loadOwnOrder } from "@/lib/order-access";
import { cancelOrder } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

// O cliente só pode cancelar enquanto não pagou.
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const order = await loadOwnOrder((await params).id);
  if (order.status !== "AWAITING_PAYMENT" || order.paymentClaimedAt) {
    throw new HttpError(409, "Esse pedido não pode mais ser cancelado por aqui. Fale com a cantina.");
  }
  await cancelOrder(order.id);
  return ok();
});
