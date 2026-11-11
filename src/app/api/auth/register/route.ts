import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { parseIdentifier, registerSchema } from "@/lib/validation";

export const POST = handle(async (req: Request) => {
  if (!rateLimit(`register:${clientIp(req)}`, 10, 60 * 60_000)) {
    throw new HttpError(429, "Muitas tentativas. Tente novamente mais tarde.");
  }
  const data = registerSchema.parse(await req.json());
  const identifier = parseIdentifier(data.identifier);
  if (!identifier) throw new HttpError(400, "Informe um e-mail válido ou telefone com DDD.");

  const existing = await prisma.user.findFirst({ where: identifier });
  if (existing) throw new HttpError(409, "Já existe uma conta com esse e-mail ou telefone.");

  const user = await prisma.user.create({
    data: { name: data.name, ...identifier, passwordHash: await hashPassword(data.password) },
  });
  await createSession(user);
  return ok({ ok: true }, 201);
});
