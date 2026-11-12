// Middleware: roda antes de todas as páginas e rotas de API.
// 1) Proteção CSRF: requisições que alteram dados precisam vir do próprio site.
// 2) Controle de acesso: painel só para admin; área de pedidos só para logados.
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session-token";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // O webhook do gateway vem de fora (sem cookie) e é validado pela assinatura.
  if (pathname === "/api/payments/webhook") return NextResponse.next();

  if (isApi && !SAFE_METHODS.includes(req.method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    let sameOrigin = false;
    try {
      sameOrigin = !!origin && new URL(origin).host === host;
    } catch {}
    if (!sameOrigin) {
      return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
    }
  }

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/admin")) {
    if (!session) return NextResponse.json({ error: "Faça login para continuar." }, { status: 401 });
    if (session.role !== "ADMIN") return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  } else if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    if (session?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
  } else if (pathname.startsWith("/pedidos")) {
    if (!session) {
      const url = new URL("/entrar", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/pedidos/:path*", "/api/:path*"],
};
