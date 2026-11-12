import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  await requireAdmin();
  const data = categorySchema.parse(await req.json());
  await prisma.category.update({ where: { id: (await params).id }, data });
  return ok();
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  await requireAdmin();
  const id = (await params).id;
  if ((await prisma.product.count({ where: { categoryId: id } })) > 0) {
    throw new HttpError(409, "Mova ou remova os produtos desta categoria antes de excluí-la.");
  }
  await prisma.category.delete({ where: { id } });
  return ok();
});
