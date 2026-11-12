import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { loadOwnOrder } from "@/lib/order-access";

type Ctx = { params: Promise<{ id: string }> };

// Cliente informa que já fez o Pix: destaca o pedido no painel para conferência.
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const order = await loadOwnOrder((await params).id);
  await prisma.order.updateMany({
    where: { id: order.id, status: "AWAITING_PAYMENT", paymentClaimedAt: null },
    data: { paymentClaimedAt: new Date() },
  });
  return ok();
});
