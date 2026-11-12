import { prisma } from "@/lib/db";
import { handle, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth";
import { settingsSchema } from "@/lib/validation";

export const PUT = handle(async (req: Request) => {
  await requireAdmin();
  const { openDays, ...data } = settingsSchema.parse(await req.json());
  const values = { ...data, openDays: [...new Set(openDays)].sort().join(",") };
  await prisma.settings.upsert({ where: { id: 1 }, update: values, create: { id: 1, ...values } });
  return ok();
});
