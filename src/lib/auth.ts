// Sessão no lado do servidor: cookie httpOnly com JWT + helpers de autorização.
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { HttpError } from "./api";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session-token";

export const hashPassword = (password: string) => bcrypt.hash(password, 12);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

export async function createSession(user: { id: string; role: string; name: string }) {
  const token = await signSession({
    sub: user.id,
    role: user.role === "ADMIN" ? "ADMIN" : "CUSTOMER",
    name: user.name,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, // inacessível a JavaScript (mitiga roubo de sessão por XSS)
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // não é enviado em POSTs vindos de outros sites (mitiga CSRF)
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession() {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}

/** Para rotas de API do cliente: exige login. */
export async function requireUser() {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Faça login para continuar.");
  return session;
}

/**
 * Para rotas de API do painel: além do token, confere no banco se o usuário
 * ainda existe e continua sendo admin.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Faça login para continuar.");
  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true } });
  if (user?.role !== "ADMIN") throw new HttpError(403, "Acesso restrito à cantina.");
  return session;
}
