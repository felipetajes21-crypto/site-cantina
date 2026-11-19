import { handle, ok } from "@/lib/api";
import { loadOwnOrder } from "@/lib/order-access";
import { claimPayment } from "@/lib/orders";

type Ctx = { params: Promise<{ id: string }> };

// Cliente informa que já fez o Pix: o pedido entra na fila da cantina como
// "Recebido", com o selo "Conferir Pix" para a cantina checar no banco.
export const POST = handle(async (_req: Request, { params }: Ctx) => {
  const order = await loadOwnOrder((await params).id);
  await claimPayment(order.id);
  return ok();
});
