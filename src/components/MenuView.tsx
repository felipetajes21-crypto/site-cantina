"use client";

import Link from "next/link";
import { formatBRL } from "@/lib/format";
import type { Menu, MenuProduct } from "@/lib/menu";
import { useCart } from "./cart";
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
        className="no-scrollbar sticky top-14 z-20 -mx-4 mb-2 flex gap-2 overflow-x-auto bg-stone-50/95 px-4 py-2 backdrop-blur"
      >
        {menu.map((c) => (
          <a
            key={c.id}
            href={`#cat-${c.id}`}
            className="shrink-0 rounded-full border border-stone-300 bg-white px-3.5 py-1.5 text-sm font-medium text-stone-700 hover:border-brand-700 hover:text-brand-800"
          >
            {c.name}
          </a>
        ))}
      </nav>

      {menu.map((category) => (
        <section key={category.id} id={`cat-${category.id}`} className="scroll-mt-28 pt-4">
          <h2 className="mb-2 text-lg font-bold">{category.name}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {category.products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </section>
      ))}

      {/* Barra fixa do carrinho */}
      {cart.ready && cart.count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Link href="/carrinho" className="btn-primary mx-auto flex w-full max-w-3xl justify-between px-5">
            <span>
              Ver carrinho · {cart.count} {cart.count === 1 ? "item" : "itens"}
            </span>
            <span>{formatBRL(cart.totalCents)}</span>
          </Link>
        </div>
      )}
    </>
  );
}

function ProductCard({ product: p }: { product: MenuProduct }) {
  const cart = useCart();
  const quantity = cart.quantityOf(p.id);

  return (
    <li className={`card flex gap-3 p-3 ${p.available ? "" : "opacity-60"}`}>
      <ProductImage src={p.image} name={p.name} className="size-20 shrink-0 rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="leading-snug font-semibold">{p.name}</h3>
        {p.description && <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-stone-600">{p.description}</p>}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <span className="font-semibold tabular-nums">{formatBRL(p.priceCents)}</span>
          {!p.available ? (
            <span className="rounded-full bg-stone-200 px-2.5 py-1 text-xs font-semibold text-stone-700">Esgotado</span>
          ) : quantity > 0 ? (
            <Stepper value={quantity} max={p.maxQuantity} label={p.name} onChange={(q) => cart.setQuantity(p, q)} />
          ) : (
            <button type="button" className="btn-secondary btn-sm" onClick={() => cart.setQuantity(p, 1)}>
              Adicionar
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
