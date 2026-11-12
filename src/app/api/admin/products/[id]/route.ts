import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { productData } from "@/lib/product-input";
import { productSchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Atualização rápida usada pelos botões "disponível/esgotado" e pelo estoque.
const quickSchema = z.object({
  active: z.boolean().optional(),
  stock: z.number().int().min(0).max(100_000).optional(),
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const input = productSchema.parse(await req.json());
  await prisma.product.update({ where: { id: (await params).id }, data: productData(input) as never });
  return ok();
});

export const PATCH = handle(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const data = quickSchema.parse(await req.json());
  await prisma.product.update({ where: { id: (await params).id }, data });
  return ok();
});

// Pedidos antigos guardam nome e preço do item, então o histórico é preservado.
export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  await prisma.product.delete({ where: { id: (await params).id } });
  return ok();
});
