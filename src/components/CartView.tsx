"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatBRL } from "@/lib/format";
import type { Menu } from "@/lib/menu";
import type { Availability, PickupDay } from "@/lib/slots";
import { groupByHour, pickupTimes } from "@/lib/pickup-times";
import { useCart } from "./cart";
import { Stepper } from "./Stepper";


export function CartView({ loggedIn }: { loggedIn: boolean }) {
  const cart = useCart();
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [limits, setLimits] = useState<Record<string, { available: boolean; max: number }>>({});
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [pickup, setPickup] = useState<string | null>(null); // "ASAP" ou "HH:MM"
  const [time, setTime] = useState(""); // horário digitado pelo cliente
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Ao abrir o carrinho, busca horários de retirada e atualiza preços e
  // disponibilidade dos itens (o cardápio pode ter mudado).
  useEffect(() => {
    if (!cart.ready) return;
    api<Availability>("/api/slots").then((a) => {
      setAvailability(a);
      if (a.days[0]) selectDay(a.days[0]);
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

  /** Ao trocar de dia: hoje com a cantina aberta sugere "o mais rápido possível"; nos outros dias, o primeiro horário. */
  function selectDay(day: PickupDay) {
    const first = pickupTimes(day)[0] ?? "";
    setPickupDate(day.date);
    setTime(first);
    setPickup(day.asap ? "ASAP" : first || null);
  }

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

  const selectedDay = availability?.days.find((d) => d.date === pickupDate);
  // Validação no navegador do horário digitado (o servidor confere de novo).
  // Só existem horários dentro do funcionamento do dia (definido no painel).
  const times = selectedDay ? pickupTimes(selectedDay) : [];
  const byHour = groupByHour(times);
  const timeError = pickup && pickup !== "ASAP" && !times.includes(pickup) ? "Escolha a hora e os minutos da retirada." : null;

  /** Troca a hora mantendo os minutos, se existirem nessa hora; senão usa o primeiro minuto disponível. */
  function chooseTime(hour: string, minute: string) {
    const minutes = byHour.get(hour) ?? [];
    const next = `${hour}:${minutes.includes(minute) ? minute : minutes[0]}`;
    setTime(next);
    setPickup(next);
  }

  async function submit() {
    if (!pickupDate || !pickup) return setError("Escolha o dia e o horário de retirada.");
    if (timeError) return setError(timeError);
    setError(null);
    setSending(true);
    try {
      const { id } = await api<{ id: number }>("/api/orders", "POST", {
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, note: i.note || undefined })),
        note: note || undefined,
        pickupDate,
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
          <p className="rounded-xl border border-saffron-300 bg-saffron-100 px-3 py-2.5 text-sm text-saffron-900">{availability.reason}</p>
        ) : (
          <>
            <p className="mb-1.5 text-sm font-medium text-stone-700">Dia</p>
            <div role="radiogroup" aria-label="Dia da retirada" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {availability.days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  role="radio"
                  aria-checked={pickupDate === d.date}
                  onClick={() => selectDay(d)}
                  className={`flex min-w-[5.5rem] shrink-0 cursor-pointer flex-col items-start rounded-xl border px-3 py-2 text-left transition-colors ${
                    pickupDate === d.date ? "border-brand-700 bg-brand-700 text-white" : "border-stone-300 bg-white text-stone-800 hover:border-brand-700"
                  }`}
                >
                  <span className="text-sm font-bold">{d.label}</span>
                  <span className={`text-xs tabular-nums ${pickupDate === d.date ? "text-brand-100" : "text-stone-500"}`}>
                    {d.hours.from}–{d.hours.to}
                  </span>
                </button>
              ))}
            </div>

            <p className="mt-4 mb-1.5 text-sm font-medium text-stone-700">Horário</p>
            {selectedDay && (
              <div role="radiogroup" aria-label="Horário de retirada" className="space-y-2">
                {selectedDay.asap && (
                  <TimeOption
                    selected={pickup === "ASAP"}
                    onSelect={() => setPickup("ASAP")}
                    title="O mais rápido possível"
                    hint="A cantina prepara assim que o pedido chegar."
                  />
                )}
                {times.length > 0 && (
                  <TimeOption
                    selected={pickup !== "ASAP"}
                    onSelect={() => setPickup(time || times[0])}
                    title="Escolher horário"
                    hint={`A cantina funciona das ${selectedDay.hours.from} às ${selectedDay.hours.to} neste dia.`}
                  >
                    {/* Duas listas: só aparecem horas e minutos dentro do funcionamento. */}
                    <div className="mt-2 flex items-center gap-2" onFocus={() => setPickup(time || times[0])}>
                      <select
                        aria-label="Hora da retirada"
                        className="input w-24 text-lg font-semibold tabular-nums"
                        value={(time || times[0]).slice(0, 2)}
                        onChange={(e) => chooseTime(e.target.value, (time || times[0]).slice(3, 5))}
                      >
                        {[...byHour.keys()].map((h) => (
                          <option key={h} value={h}>{h}h</option>
                        ))}
                      </select>
                      <span className="text-lg font-semibold text-stone-500">:</span>
                      <select
                        aria-label="Minutos da retirada"
                        className="input w-24 text-lg font-semibold tabular-nums"
                        value={(time || times[0]).slice(3, 5)}
                        onChange={(e) => chooseTime((time || times[0]).slice(0, 2), e.target.value)}
                      >
                        {(byHour.get((time || times[0]).slice(0, 2)) ?? []).map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </TimeOption>
                )}
                {timeError && <p className="text-sm font-medium text-red-700" role="alert">{timeError}</p>}
              </div>
            )}
          </>
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
        <button type="button" className="btn-primary mt-4 w-full" disabled={sending || blocked || !availability?.open || !pickup || !!timeError} onClick={submit}>
          {sending ? "Enviando…" : "Fazer pedido e pagar"}
        </button>
      ) : (
        <Link href="/entrar?next=/carrinho" className="btn-primary mt-4 w-full">Entrar para finalizar</Link>
      )}
      <Link href="/" className="btn mt-2 w-full text-stone-700 hover:bg-stone-100">Adicionar mais itens</Link>
    </>
  );
}

/** Opção de horário em forma de cartão selecionável. */
function TimeOption({
  selected,
  onSelect,
  title,
  hint,
  children,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${selected ? "border-brand-700 bg-brand-50" : "border-stone-300 bg-white"}`}
    >
      <button type="button" role="radio" aria-checked={selected} onClick={onSelect} className="flex w-full cursor-pointer items-start gap-3 text-left">
        <span
          aria-hidden
          className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${selected ? "border-brand-700" : "border-stone-400"}`}
        >
          {selected && <span className="size-2.5 rounded-full bg-brand-700" />}
        </span>
        <span>
          <span className="block font-semibold">{title}</span>
          <span className="block text-sm text-stone-600">{hint}</span>
        </span>
      </button>
      {children && <div className="pl-8">{children}</div>}
    </div>
  );
}
