import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { advanceOrder, orderInclude, serializeOrder } from "@/lib/orders";
import { STATUS_LABEL, type OrderStatus } from "@/lib/status";

// Retirada no balcão: localiza o pedido pelo QR Code (código) ou pelo número
// digitado. Com confirm=true, marca como retirado.
const schema = z.object({
  query: z.string().trim().min(1).max(60),
  confirm: z.boolean().optional(),
});

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const { query, confirm } = schema.parse(await req.json());

  // O QR Code contém "CANTINA:<código>"; números digitados são o id do pedido.
  const code = query.startsWith("CANTINA:") ? query.slice(8) : null;
  const number = /^#?\d{1,9}$/.test(query) ? Number(query.replace("#", "")) : null;
  if (!code && !number) throw new HttpError(400, "Código não reconhecido.");

  const order = await prisma.order.findUnique({
    where: code ? { code } : { id: number! },
    include: orderInclude,
  });
  if (!order) throw new HttpError(404, "Pedido não encontrado.");

  if (confirm) {
    if (order.status !== "READY") {
      throw new HttpError(409, `Não é possível entregar: o pedido está "${STATUS_LABEL[order.status as OrderStatus]}".`);
    }
    await advanceOrder(order.id, "READY");
    return ok({ order: { ...serializeOrder(order), status: "PICKED_UP" } });
  }
  return ok({ order: serializeOrder(order) });
});
