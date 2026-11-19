import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";

// Nova categoria: entra no fim da lista.
export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const { name, icon } = categorySchema.parse(await req.json());
  const last = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const category = await prisma.category.create({
    data: { name, icon, sortOrder: (last._max.sortOrder ?? -1) + 1 },
  });
  return ok(category, 201);
});
