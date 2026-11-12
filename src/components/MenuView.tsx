"use client";

import Link from "next/link";
import { formatBRL } from "@/lib/format";
import type { Menu, MenuProduct } from "@/lib/menu";
import { useCart } from "./cart";
import { CATEGORY_TINT, CategoryIcon, categoryKind } from "./CategoryIcon";
import { ProductImage } from "./ProductImage";
import { Stepper } from "./Stepper";

export function MenuView({ menu }: { menu: Menu }) {
  const cart = useCart();

  if (menu.length === 0) {
    return <p className="card p-6 text-center text-stone-600">O cardápio ainda não tem produtos.</p>;
  }

  return (
    <>
      {/* Atalhos das categorias */}
      <nav
        aria-label="Categorias"
        className="no-scrollbar sticky top-14 z-20 -mx-4 mb-1 flex gap-2 overflow-x-auto bg-stone-50/95 px-4 py-2.5 backdrop-blur"
      >
        {menu.map((c) => {
          const kind = categoryKind(c.name);
          return (
            <a
              key={c.id}
              href={`#cat-${c.id}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white py-1.5 pr-3.5 pl-1.5 text-sm font-semibold text-stone-800 transition-colors hover:border-brand-700 hover:text-brand-800"
            >
              <span className={`grid size-6 place-items-center rounded-full ${CATEGORY_TINT[kind]}`}>
                <CategoryIcon kind={kind} className="size-4" />
              </span>
              {c.name}
            </a>
          );
        })}
      </nav>

      {menu.map((category) => (
        <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-28 pt-5">
          <h2 className="mb-2.5 flex items-baseline gap-2 text-xl font-bold">
            {category.name}
            <span className="font-sans text-sm font-medium text-stone-500 tabular-nums">{category.products.length}</span>
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {category.products.map((p) => (
              <ProductCard key={p.id} product={p} category={category.name} />
            ))}
          </ul>
        </section>
      ))}

      {/* Barra fixa do carrinho */}
      {cart.ready && cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
          <Link href="/carrinho" className="btn-primary mx-auto flex min-h-12 w-full max-w-3xl justify-between pr-5 pl-2.5">
            <span className="flex items-center gap-2.5">
              <span className="grid size-7 place-items-center rounded-lg bg-saffron-400 text-[13px] font-bold text-stone-900 tabular-nums">
                {cart.count}
              </span>
              Ver carrinho
            </span>
            <span className="tabular-nums">{formatBRL(cart.totalCents)}</span>
          </Link>
        </div>
      )}
    </>
  );
}

function ProductCard({ product: p, category }: { product: MenuProduct; category: string }) {
  const cart = useCart();
  const quantity = cart.quantityOf(p.id);

  return (
    <li
      className={`card flex gap-3 p-3 transition-[border-color,box-shadow] ${
        quantity > 0 ? "border-brand-200 ring-1 ring-brand-200" : ""
      } ${p.available ? "" : "opacity-60 saturate-50"}`}
    >
      <ProductImage src={p.image} name={p.name} category={category} className="size-[84px] shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="font-sans text-[15px] leading-snug font-semibold tracking-normal">{p.name}</h3>
        {p.description && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-stone-600">{p.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="font-display text-[17px] font-bold tabular-nums">{formatBRL(p.priceCents)}</span>
          {!p.available ? (
            <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700">Esgotado</span>
          ) : quantity > 0 ? (
            <Stepper value={quantity} max={p.maxQuantity} label={p.name} onChange={(q) => cart.setQuantity(p, q)} />
          ) : (
            <button type="button" className="btn-secondary btn-sm gap-1" onClick={() => cart.setQuantity(p, 1)}>
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <path d="M12 5v14M5 12h14" />
              </svg>
              Adicionar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
