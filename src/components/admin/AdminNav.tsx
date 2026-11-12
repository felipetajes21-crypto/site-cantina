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
    <header className="sticky top-0 z-30 bg-brand-900 text-white">
      <div className="mx-auto flex h-12 max-w-6xl items-center gap-2.5 px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt="" width={28} height={28} className="rounded-lg ring-1 ring-white/15" />
        <span className="mr-auto truncate font-display font-bold">{cantinaName} <span className="font-sans font-medium text-brand-200">· Painel</span></span>
        <Link href="/" className="rounded-lg px-2 py-1.5 text-sm text-brand-100 hover:bg-white/10 hover:text-white">Ver site</Link>
        <LogoutButton redirectTo="/admin/login" className="cursor-pointer rounded-lg px-2 py-1.5 text-sm text-brand-100 hover:bg-white/10 hover:text-white" />
      </div>
      <nav aria-label="Painel" className="no-scrollbar mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-[3px] px-3 py-2.5 text-sm font-semibold transition-colors ${
                active ? "border-saffron-400 text-white" : "border-transparent text-brand-200 hover:text-white"
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
