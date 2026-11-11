import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { categorySchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  await requireAdmin();
  const data = categorySchema.parse(await req.json());
  const category = await prisma.category.create({ data });
  return ok(category, 201);
});
