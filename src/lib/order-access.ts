import { prisma } from "./db";
import { HttpError } from "./api";
import { requireUser } from "./auth";
import { orderInclude } from "./orders";

/** Carrega um pedido garantindo que pertence ao usuário logado (ou que é admin). */
export async function loadOwnOrder(idParam: string) {
  const session = await requireUser();
  const id = Number(idParam);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(404, "Pedido não encontrado.");
  const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
  if (!order || (order.userId !== session.sub && session.role !== "ADMIN")) {
    throw new HttpError(404, "Pedido não encontrado.");
  }
  return order;
}
