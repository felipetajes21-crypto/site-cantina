"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";

type Mode = "login" | "register" | "admin";

/** Formulário único para login do cliente, cadastro e login do painel. */
export function AuthForm({ mode, next }: { mode: Mode; next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("identifier") ?? "");
    const password = String(form.get("password") ?? "");
    setError(null);

    // Validação no navegador (o servidor valida de novo).
    if (mode === "register" && password.length < 8) {
      return setError("A senha deve ter pelo menos 8 caracteres.");
    }

    setLoading(true);
    try {
      if (mode === "register") {
        await api("/api/auth/register", "POST", { name: String(form.get("name") ?? ""), identifier, password });
      } else {
        await api("/api/auth/login", "POST", { identifier, password, admin: mode === "admin" });
      }
      // Navegação completa para que o cabeçalho reflita a nova sessão.
      window.location.href = next;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  const query = next !== "/" ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
      {mode === "register" && (
        <div>
          <label className="label" htmlFor="name">Nome</label>
          <input id="name" name="name" className="input" required minLength={2} maxLength={60} autoComplete="name" />
        </div>
      )}
      <div>
        <label className="label" htmlFor="identifier">{mode === "admin" ? "E-mail" : "E-mail ou telefone"}</label>
        <input
          id="identifier"
          name="identifier"
          className="input"
          required
          maxLength={120}
          autoComplete="username"
          placeholder={mode === "admin" ? "admin@cantina.com" : "voce@email.com ou (11) 91234-5678"}
        />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === "register" ? 8 : 1}
          maxLength={72}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
        {mode === "register" && <p className="mt-1 text-xs text-stone-500">Mínimo de 8 caracteres.</p>}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      <button className="btn-primary w-full" disabled={loading}>
        {loading ? "Aguarde…" : mode === "register" ? "Criar conta" : "Entrar"}
      </button>

      {mode === "login" && (
        <p className="text-center text-sm text-stone-600">
          Ainda não tem conta?{" "}
          <Link href={`/cadastro${query}`} className="font-semibold text-brand-700 underline">Cadastre-se</Link>
        </p>
      )}
      {mode === "register" && (
        <p className="text-center text-sm text-stone-600">
          Já tem conta?{" "}
          <Link href={`/entrar${query}`} className="font-semibold text-brand-700 underline">Entrar</Link>
        </p>
      )}
    </form>
  );
}
