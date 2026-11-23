import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productData } from "@/lib/product-input";
import { productSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const input = productSchema.parse(await req.json());
  const product = await prisma.product.create({ data: productData(input) as never, select: { id: true } });
  return ok(product, 201);
});
