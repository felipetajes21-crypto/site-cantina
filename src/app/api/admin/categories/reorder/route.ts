import { z } from "zod";
import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";

// Nova ordem das categorias no cardápio (lista de ids, do primeiro ao último).
const schema = z.object({ ids: z.array(z.string().min(1).max(40)).min(1).max(100) });

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const { ids } = schema.parse(await req.json());
  const existing = await prisma.category.count({ where: { id: { in: ids } } });
  if (existing !== new Set(ids).size) throw new HttpError(400, "Lista de categorias desatualizada. Recarregue a página.");
  await prisma.$transaction(ids.map((id, i) => prisma.category.update({ where: { id }, data: { sortOrder: i } })));
  return ok();
});
