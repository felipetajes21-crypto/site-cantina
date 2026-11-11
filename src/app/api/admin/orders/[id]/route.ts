import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { advanceOrder, cancelOrder, markOrderPaid } from "@/lib/orders";
import type { OrderStatus } from "@/lib/status";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ action: z.enum(["confirm_payment", "advance", "cancel"]) });

// Muda o status de um pedido a partir do painel.
export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const id = Number((await params).id);
  const { action } = schema.parse(await req.json());

  const order = Number.isInteger(id) ? await prisma.order.findUnique({ where: { id } }) : null;
  if (!order) throw new HttpError(404, "Pedido não encontrado.");

  if (action === "confirm_payment") {
    if (!(await markOrderPaid(id))) throw new HttpError(409, "Esse pedido não está aguardando pagamento.");
  } else if (action === "advance") {
    await advanceOrder(id, order.status as OrderStatus);
  } else {
    if (!(await cancelOrder(id))) throw new HttpError(409, "Esse pedido já foi finalizado.");
  }
  return ok();
});
