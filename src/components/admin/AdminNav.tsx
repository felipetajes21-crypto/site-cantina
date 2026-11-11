"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { brand } from "@/config/brand";
import { LogoutButton } from "../LogoutButton";

const LINKS = [
  { href: "/admin", label: "Pedidos" },
  { href: "/admin/retirada", label: "Retirada" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export function AdminNav({ cantinaName }: { cantinaName: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-2.5 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt="" width={28} height={28} />
        <span className="mr-auto truncate font-bold">{cantinaName} · Painel</span>
        <Link href="/" className="rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100">Ver site</Link>
        <LogoutButton redirectTo="/admin/login" className="cursor-pointer rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100" />
      </div>
      <nav aria-label="Painel" className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${
                active ? "border-brand-700 text-brand-800" : "border-transparent text-stone-600 hover:text-stone-900"
              }`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
