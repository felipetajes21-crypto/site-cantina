import { baseUrl, handle, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { createOrder } from "@/lib/orders";
import { orderSchema } from "@/lib/validation";

// Cria um pedido a partir do carrinho. Preços e disponibilidade são sempre
// conferidos no servidor (ver createOrder).
export const POST = handle(async (req: Request) => {
  const session = await requireUser();
  const input = orderSchema.parse(await req.json());
  const result = await createOrder(session.sub, input, baseUrl(req));
  return ok(result, 201);
});
