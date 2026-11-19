"use client";

import { api } from "@/lib/client";

export function LogoutButton({ redirectTo = "/", className }: { redirectTo?: string; className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        await api("/api/auth/logout", "POST", {});
        window.location.href = redirectTo;
      }}
    >
      Sair
    </button>
  );
}
