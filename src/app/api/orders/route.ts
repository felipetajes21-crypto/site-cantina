import { handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { orderSchema } from "@/lib/validation";

// Cria um pedido a partir do carrinho. Preços e disponibilidade são sempre
// conferidos no servidor (ver createOrder).
export const POST = handle(async (req: Request) => {
  const session = await requireUser();
  const input = orderSchema.parse(await req.json());
  const id = await createOrder(session.sub, input);
  return ok({ id }, 201);
});
