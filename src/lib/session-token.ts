// Criação e verificação do token de sessão (JWT assinado com HS256).
// Este arquivo só depende de "jose" para poder rodar também no middleware (edge).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "cantina_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 dias

export type SessionPayload = { sub: string; role: "CUSTOMER" | "ADMIN"; name: string };

const PLACEHOLDER = "troque-este-segredo-em-producao-0123456789";

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) {
    throw new Error("Defina AUTH_SECRET (mínimo de 32 caracteres) no arquivo .env");
  }
  if (process.env.NODE_ENV === "production" && value === PLACEHOLDER) {
    throw new Error("AUTH_SECRET ainda está com o valor de exemplo. Gere um segredo novo para produção.");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || (payload.role !== "CUSTOMER" && payload.role !== "ADMIN")) return null;
    return { sub: payload.sub, role: payload.role, name: String(payload.name ?? "") };
  } catch {
    return null;
  }
}
