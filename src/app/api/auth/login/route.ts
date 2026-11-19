import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { loginSchema, parseIdentifier } from "@/lib/validation";

// Hash usado quando o usuário não existe, para o tempo de resposta não revelar
// quais contas estão cadastradas.
const DUMMY_HASH = "$2b$12$CwTycUXWue0Thq9StjUM0uJ8.6mSeYB4fSxhU6i7M0h6S7xq8n6ZK";

export const POST = handle(async (req: Request) => {
  const data = loginSchema.parse(await req.json());
  const key = `login:${clientIp(req)}:${data.identifier.toLowerCase()}`;
  if (!rateLimit(key, 8, 15 * 60_000)) {
    throw new HttpError(429, "Muitas tentativas. Aguarde alguns minutos e tente novamente.");
  }

  const identifier = parseIdentifier(data.identifier);
  const user = identifier ? await prisma.user.findFirst({ where: identifier }) : null;
  const valid = await verifyPassword(data.password, user?.passwordHash ?? DUMMY_HASH);

  // O login do painel só aceita contas de admin (mesma mensagem genérica).
  if (!user || !valid || (data.admin && user.role !== "ADMIN")) {
    throw new HttpError(401, "Dados de acesso incorretos.");
  }
  await createSession(user);
  return ok({ ok: true, role: user.role });
});
