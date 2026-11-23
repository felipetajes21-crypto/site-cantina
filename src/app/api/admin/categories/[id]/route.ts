import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

// Renomear / trocar o ícone.
export const PUT = handle(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const { name, icon } = categorySchema.parse(await req.json());
  await prisma.category.update({ where: { id: (await params).id }, data: { name, icon } });
  return ok();
});

// Excluir. Se tiver produtos, eles precisam ir para outra categoria (?moveTo=<id>).
export const DELETE = handle(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const id = (await params).id;
  const moveTo = new URL(req.url).searchParams.get("moveTo");
  const count = await prisma.product.count({ where: { categoryId: id } });

  if (count > 0) {
    if (!moveTo || moveTo === id) {
      throw new HttpError(409, "Escolha para qual categoria mover os produtos antes de excluir.");
    }
    const target = await prisma.category.findUnique({ where: { id: moveTo } });
    if (!target) throw new HttpError(400, "Categoria de destino não encontrada.");
    await prisma.$transaction([
      prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } }),
      prisma.category.delete({ where: { id } }),
    ]);
  } else {
    await prisma.category.delete({ where: { id } });
  }
  return ok();
});
