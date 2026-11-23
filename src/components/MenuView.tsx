"use client";

// Cardápio: busca, filtro por categoria (botões no celular, coluna lateral no
// computador), "Mais pedidos" e cartões de produto com foto grande.
import Link from "next/link";
import { useMemo, useState } from "react";
import { formatBRL } from "@/lib/format";
import type { Menu, MenuProduct } from "@/lib/menu";
import { useCart } from "./cart";
import { ProductImage } from "./ProductImage";
import { Stepper } from "./Stepper";

type Item = MenuProduct & { category: string; icon: string };

/** Compara textos sem acento e sem diferenciar maiúsculas. */
const normalize = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function MenuView({ menu, popularIds }: { menu: Menu; popularIds: string[] }) {
  const cart = useCart();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>("all"); // id da categoria ou "all"

  const all: Item[] = useMemo(
    () => menu.flatMap((c) => c.products.map((p) => ({ ...p, category: c.name, icon: c.icon }))),
    [menu],
  );
  const total = all.length;

  if (menu.length === 0) {
    return <p className="card p-6 text-center text-stone-600">O cardápio ainda não tem produtos.</p>;
  }

  const q = normalize(query.trim());
  const searching = q.length > 0;
  const results = searching ? all.filter((p) => normalize(`${p.name} ${p.description} ${p.category}`).includes(q)) : [];
  const popular = popularIds.map((id) => all.find((p) => p.id === id)).filter((p): p is Item => !!p && p.available);
  const visible = active === "all" ? menu : menu.filter((c) => c.id === active);

  const chip = (id: string, label: string, count: number) => (
    <button
      key={id}
      type="button"
      aria-pressed={active === id}
      onClick={() => {
        setActive(id);
        setQuery("");
      }}
      className={`inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
        active === id ? "border-brand-700 bg-brand-700 text-white" : "border-stone-200 bg-white text-stone-800 hover:border-brand-700"
      }`}
    >
      {label}
      <span className={`rounded-full px-1.5 text-xs tabular-nums ${active === id ? "bg-white/20" : "bg-stone-100 text-stone-600"}`}>{count}</span>
    </button>
  );

  return (
    <>
      <div className="mb-5 text-center">
        <h1 className="text-[32px] leading-tight font-bold sm:text-[40px]">Nosso cardápio</h1>
        <p className="mx-auto mt-1 max-w-md text-[15px] text-stone-600">Escolha, pague pelo celular e retire no balcão, sem fila.</p>
        {/* Busca */}
        <label className="relative mx-auto mt-4 block max-w-md">
          <span className="sr-only">Buscar no cardápio</span>
          <svg viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-stone-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por café, coxinha, bolo…"
            className="input min-h-12 rounded-full pl-11 shadow-[0_1px_3px_rgba(80,40,0,0.08)]"
          />
        </label>
      </div>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        {/* Categorias: coluna lateral no computador */}
        <aside className="hidden lg:block">
          <nav aria-label="Categorias" className="card sticky top-28 p-3">
            <p className="px-2 pt-1 pb-2 font-display text-lg font-bold">Categorias</p>
            <ul className="space-y-1">
              {[{ id: "all", name: "Todos os produtos", count: total }, ...menu.map((c) => ({ id: c.id, name: c.name, count: c.products.length }))].map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={active === c.id}
                    onClick={() => {
                      setActive(c.id);
                      setQuery("");
                    }}
                    className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                      active === c.id ? "bg-brand-700 text-white" : "text-stone-800 hover:bg-stone-100"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className={`rounded-full px-1.5 text-xs tabular-nums ${active === c.id ? "bg-white/20" : "bg-stone-100 text-stone-600"}`}>{c.count}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div className="min-w-0">
          {/* Categorias: botões no celular */}
          <nav aria-label="Categorias" className="no-scrollbar sticky top-16 z-20 -mx-4 mb-1 flex gap-2 overflow-x-auto bg-stone-50/95 px-4 py-2.5 backdrop-blur lg:hidden">
            {chip("all", "Todos", total)}
            {menu.map((c) => chip(c.id, c.name, c.products.length))}
          </nav>

          {searching ? (
            <Section title={`Resultados para “${query.trim()}”`} count={results.length}>
              {results.length === 0 ? (
                <p className="card p-6 text-center text-stone-600">Nada encontrado. Tente outra palavra.</p>
              ) : (
                <Grid items={results} />
              )}
            </Section>
          ) : (
            <>
              {active === "all" && popular.length > 0 && (
                <Section title="Mais pedidos" count={popular.length} highlight>
                  <Grid items={popular} />
                </Section>
              )}
              {visible.map((category) => (
                <Section key={category.id} title={category.name} count={category.products.length} id={`cat-${category.id}`}>
                  <Grid items={category.products.map((p) => ({ ...p, category: category.name, icon: category.icon }))} />
                </Section>
              ))}
            </>
          )}
        </div>
      </div>

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

function Section({ title, count, id, highlight, children }: { title: string; count: number; id?: string; highlight?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-32 pt-5 first:pt-2">
      <div className="mb-3 flex items-end justify-between gap-3 border-b border-stone-200 pb-2">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          {highlight && (
            <svg viewBox="0 0 24 24" className="size-5 text-brand-700" fill="currentColor" aria-hidden>
              <path d="M12 2.5c.4 3.6 2.4 5.4 4.6 7.2 1.9 1.6 3.4 3.4 3.4 6.1A8 8 0 0 1 4 15.8c0-2.3 1-4.2 2.6-5.6.2 1.6.9 2.8 2.2 3.4-.4-4.6 1.2-8.4 3.2-11.1Z" />
            </svg>
          )}
          {title}
        </h2>
        <span className="pb-1 text-sm text-stone-500 tabular-nums">{count} {count === 1 ? "item" : "itens"}</span>
      </div>
      {children}
    </section>
  );
}

function Grid({ items }: { items: Item[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </ul>
  );
}

function ProductCard({ product: p }: { product: Item }) {
  const cart = useCart();
  const quantity = cart.quantityOf(p.id);

  return (
    <li
      className={`card flex flex-col overflow-hidden transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_10px_24px_-12px_rgba(120,50,0,0.35)] ${
        quantity > 0 ? "border-brand-200 ring-2 ring-brand-200" : ""
      } ${p.available ? "" : "opacity-60 saturate-50"}`}
    >
      <div className="relative">
        <ProductImage src={p.image} name={p.name} category={p.category} icon={p.icon} className="aspect-[4/3] w-full rounded-none" />
        {!p.available && (
          <span className="absolute top-2 left-2 rounded-full bg-stone-900/85 px-2.5 py-1 text-xs font-semibold text-white">Esgotado</span>
        )}
        {quantity > 0 && (
          <span className="absolute top-2 right-2 grid min-w-7 place-items-center rounded-full bg-brand-700 px-2 py-1 text-xs font-bold text-white tabular-nums">
            {quantity}×
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <p className="text-[11px] font-bold tracking-wider text-brand-800 uppercase">{p.category}</p>
        <h3 className="mt-0.5 font-display text-[17px] leading-snug font-bold">{p.name}</h3>
        {p.description && <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-stone-600">{p.description}</p>}
        <div className="mt-auto pt-3">
          <p className="border-t border-stone-100 pt-2.5 text-lg font-bold text-brand-800 tabular-nums">{formatBRL(p.priceCents)}</p>
          <div className="mt-2">
            {!p.available ? (
              <button type="button" disabled className="btn-secondary btn-sm w-full">Esgotado</button>
            ) : quantity > 0 ? (
              <div className="flex justify-center">
                <Stepper value={quantity} max={p.maxQuantity} label={p.name} onChange={(q) => cart.setQuantity(p, q)} />
              </div>
            ) : (
              <button type="button" className="btn-primary btn-sm w-full gap-1.5" onClick={() => cart.setQuantity(p, 1)}>
                <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 7h12l-1 13H7Z" />
                  <path d="M9 7a3 3 0 0 1 6 0" />
                </svg>
                Adicionar
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}
