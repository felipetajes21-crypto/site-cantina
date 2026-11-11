"use client";

import Link from "next/link";
import { useCart } from "./cart";

export function CartLink() {
  const { count, ready } = useCart();
  return (
    <Link href="/carrinho" className="relative grid size-10 place-items-center rounded-xl hover:bg-stone-100" aria-label={`Carrinho, ${count} itens`}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 6h15l-1.5 9h-12z" />
        <path d="M6 6 5 3H2" />
        <circle cx="9" cy="20" r="1.4" />
        <circle cx="18" cy="20" r="1.4" />
      </svg>
      {ready && count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-brand-700 px-1 text-[11px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
