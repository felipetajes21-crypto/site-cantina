"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatBRL } from "@/lib/format";
import type { Menu } from "@/lib/menu";
import type { Availability } from "@/lib/slots";
import { useCart } from "./cart";
import { Stepper } from "./Stepper";

export function CartView({ loggedIn }: { loggedIn: boolean }) {
  const cart = useCart();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [limits, setLimits] = useState<Record<string, { available: boolean; max: number }>>({});
  const [pickup, setPickup] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Ao abrir o carrinho, busca horários de retirada e atualiza preços e
  // disponibilidade dos itens (o cardápio pode ter mudado).
  useEffect(() => {
    if (!cart.ready) return;
    api<Availability>("/api/slots").then((a) => {
      setAvailability(a);
      setPickup(a.asap ? "ASAP" : (a.slots.find((s) => !s.full)?.time ?? null));
    });
    api<{ categories: Menu }>("/api/menu").then(({ categories }) => {
      const products = new Map(categories.flatMap((c) => c.products).map((p) => [p.id, p]));
      setLimits(
        Object.fromEntries([...products].map(([id, p]) => [id, { available: p.available, max: p.maxQuantity }])),
      );
      cart.replace(
        cart.items.map((i) => {
          const p = products.get(i.productId);
          return p ? { ...i, name: p.name, priceCents: p.priceCents } : i;
        }),
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart.ready]);

  if (!cart.ready) return null;

  if (cart.items.length === 0) {
    return (
      <div className="card mt-6 p-8 text-center">
        <p className="text-lg font-semibold">Seu carrinho está vazio</p>
        <p className="mt-1 text-sm text-stone-600">Escolha os itens no cardápio para começar.</p>
        <Link href="/" className="btn-primary mt-5">Ver cardápio</Link>
      </div>
    );
  }

  const unavailable = cart.items.filter((i) => limits[i.productId] && !limits[i.productId].available);
  const missing = cart.items.filter((i) => Object.keys(limits).length > 0 && !limits[i.productId]);
  const blocked = unavailable.length > 0 || missing.length > 0;

  async function submit() {
    if (!pickup) return setError("Escolha um horário de retirada.");
    setError(null);
    setSending(true);
    try {
      const { id } = await api<{ id: number }>("/api/orders", "POST", {
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note || undefined })),
        note: note || undefined,
        pickup,
      });
      cart.clear();
      window.location.href = `/pedidos/${id}`;
    } catch (err) {
      setError((err as Error).message);
      setSending(false);
    }
  }

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Carrinho</h1>

      <ul className="card divide-y divide-stone-200">
        {cart.items.map((item) => {
          const limit = limits[item.productId];
          const gone = (limit && !limit.available) || missing.includes(item);
          return (
            <li key={item.productId} className="p-3.5">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-stone-600 tabular-nums">{formatBRL(item.priceCents * item.quantity)}</p>
                  {gone && <p className="mt-1 text-sm font-medium text-red-700">Indisponível no momento. Remova para continuar.</p>}
                </div>
                {gone ? (
                  <button type="button" className="btn-danger btn-sm" onClick={() => cart.setQuantity({ id: item.productId, name: item.name, priceCents: item.priceCents }, 0)}>
                    Remover
                  </button>
                ) : (
                  <Stepper
                    value={item.quantity}
                    max={limit?.max ?? 20}
                    label={item.name}
                    onChange={(q) => cart.setQuantity({ id: item.productId, name: item.name, priceCents: item.priceCents }, q)}
                  />
                )}
              </div>
              <input
                className="input mt-2.5 min-h-10 text-sm"
                placeholder="Observação (ex.: sem cebola)"
                aria-label={`Observação para ${item.name}`}
                maxLength={140}
                value={item.note}
                onChange={(e) => cart.setNote(item.productId, e.target.value)}
              />
            </li>
          );
        })}
      </ul>

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-bold">Retirada</h2>
        {!availability ? (
          <p className="text-sm text-stone-500">Carregando horários…</p>
        ) : !availability.open ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">{availability.reason}</p>
        ) : (
          <div role="radiogroup" aria-label="Horário de retirada" className="flex flex-wrap gap-2">
            {availability.asap && (
              <SlotChip label="O mais rápido possível" selected={pickup === "ASAP"} onSelect={() => setPickup("ASAP")} />
            )}
            {availability.slots.map((s) => (
              <SlotChip key={s.time} label={s.time} disabled={s.full} selected={pickup === s.time} onSelect={() => setPickup(s.time)} />
            ))}
            {!availability.asap && availability.slots.length === 0 && (
              <p className="text-sm text-stone-600">Não há mais horários de retirada hoje.</p>
            )}
          </div>
        )}
      </section>

      <section className="mt-6">
        <label className="label" htmlFor="order-note">Observação do pedido (opcional)</label>
        <textarea id="order-note" className="input py-2.5" rows={2} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
      </section>

      <div className="mt-6 flex items-center justify-between text-lg font-bold">
        <span>Total</span>
        <span className="tabular-nums">{formatBRL(cart.totalCents)}</span>
      </div>
      <p className="mt-0.5 text-sm text-stone-600">Pagamento via Pix na próxima etapa.</p>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</p>}

      {loggedIn ? (
        <button type="button" className="btn-primary mt-4 w-full" disabled={sending || blocked || !availability?.open || !pickup} onClick={submit}>
          {sending ? "Enviando…" : "Fazer pedido e pagar"}
        </button>
      ) : (
        <Link href="/entrar?next=/carrinho" className="btn-primary mt-4 w-full">Entrar para finalizar</Link>
      )}
      <Link href="/" className="btn mt-2 w-full text-stone-700 hover:bg-stone-100">Adicionar mais itens</Link>
    </>
  );
}

function SlotChip({ label, selected, disabled, onSelect }: { label: string; selected: boolean; disabled?: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`min-h-10 cursor-pointer rounded-xl border px-3.5 text-sm font-medium tabular-nums transition-colors disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-400 disabled:line-through ${
        selected ? "border-brand-700 bg-brand-700 text-white" : "border-stone-300 bg-white text-stone-800 hover:border-brand-700"
      }`}
    >
      {label}
    </button>
  );
}
