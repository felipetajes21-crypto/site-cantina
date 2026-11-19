// Helpers para as rotas de API: respostas JSON e tratamento de erros padronizado.
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const ok = (data: unknown = { ok: true }, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** Envolve um handler e converte erros conhecidos em respostas JSON. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          { error: err.issues[0]?.message ?? "Dados inválidos." },
          { status: 400 },
        );
      }
      if (err instanceof SyntaxError) {
        return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
      }
      console.error(err);
      return NextResponse.json({ error: "Erro interno. Tente novamente." }, { status: 500 });
    }
  };
}

/**
 * Endereço público do site (ex.: https://cantina.vercel.app). Usa APP_URL se
 * definido; senão, o host da requisição (funciona atrás de proxy: Vercel, Codespaces).
 */
export function baseUrl(req: Request) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host")?.split(",")[0].trim() || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0].trim() || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
