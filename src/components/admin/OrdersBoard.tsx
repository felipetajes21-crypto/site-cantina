"use client";

// Fila de pedidos da cantina em tempo real (polling a cada 4 s), com alerta
// sonoro quando chega pedido novo ou quando um cliente informa que pagou.
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { formatBRL, orderNumber, pickupLabel } from "@/lib/format";
import type { OrderDTO } from "@/lib/orders";
import { NEXT_ACTION_LABEL, STATUS_LABEL, type OrderStatus } from "@/lib/status";
import { StatusBadge } from "../StatusBadge";

const POLL_MS = 4000;
const COLUMNS: OrderStatus[] = ["AWAITING_PAYMENT", "RECEIVED", "PREPARING", "READY"];

type Data = { active: OrderDTO[]; done: OrderDTO[] };

/** Dois bipes curtos gerados pelo navegador (sem arquivo de áudio). */
function beep(ctx: AudioContext) {
  [0, 0.25].forEach((delay) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + 0.2);
  });
}

export function OrdersBoard() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<OrderStatus | "DONE">("RECEIVED");
  const [sound, setSound] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const soundRef = useRef(false);
  // Chaves já vistas: "id" (pedido pago na fila) e "id:pago" (cliente informou pagamento).
  const seen = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    try {
      const fresh = await api<Data>("/api/admin/orders");
      setData(fresh);
      setError(null);

      const keys = new Set<string>();
      for (const o of fresh.active) {
        if (o.status === "RECEIVED") keys.add(String(o.id));
        if (o.status === "AWAITING_PAYMENT" && o.paymentClaimed) keys.add(`${o.id}:pago`);
      }
      const isNew = seen.current !== null && [...keys].some((k) => !seen.current!.has(k));
      seen.current = new Set([...(seen.current ?? []), ...keys]);
      if (isNew) {
        if (soundRef.current && audio.current) beep(audio.current);
        navigator.vibrate?.(300);
      }
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  // Navegadores só permitem tocar som depois de um clique; por isso o botão.
  function toggleSound() {
    const on = !sound;
    if (on) {
      audio.current ??= new AudioContext();
      audio.current.resume();
      beep(audio.current);
    }
    soundRef.current = on;
    setSound(on);
  }

  async function act(order: OrderDTO, action: "confirm_payment" | "advance" | "cancel") {
    if (action === "cancel" && !confirm(`Cancelar o pedido ${orderNumber(order.id)}?`)) return;
    setBusy(order.id);
    try {
      await api(`/api/admin/orders/${order.id}`, "PATCH", { action });
    } catch (err) {
      alert((err as Error).message);
    }
    await load();
    setBusy(null);
  }

  if (!data) return <p className="text-sm text-stone-500">{error ?? "Carregando pedidos…"}</p>;

  const byStatus = (s: OrderStatus) => data.active.filter((o) => o.status === s);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
        <button type="button" className={sound ? "btn-secondary btn-sm" : "btn-primary btn-sm"} onClick={toggleSound} aria-pressed={sound}>
          {sound ? "Som ativado" : "Ativar som de novo pedido"}
        </button>
      </div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">Sem conexão: {error}</p>}

      {/* Celular: abas por status */}
      <div role="tablist" className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 lg:hidden">
        {[...COLUMNS, "DONE" as const].map((s) => {
          const count = s === "DONE" ? data.done.length : byStatus(s).length;
          return (
            <button
              key={s}
              role="tab"
              aria-selected={tab === s}
              onClick={() => setTab(s)}
              className={`shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                tab === s ? "border-brand-700 bg-brand-700 text-white" : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              {s === "DONE" ? "Finalizados hoje" : STATUS_LABEL[s]} ({count})
            </button>
          );
        })}
      </div>

      {/* Computador/tablet: colunas lado a lado */}
      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((status) => (
          <section key={status} className={tab === status ? "" : "hidden lg:block"} aria-label={STATUS_LABEL[status]}>
            <h2 className="mb-2 hidden items-center justify-between text-sm font-bold text-stone-700 lg:flex">
              {STATUS_LABEL[status]}
              <span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs tabular-nums">{byStatus(status).length}</span>
            </h2>
            <div className="space-y-3">
              {byStatus(status).length === 0 && <p className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">Nenhum pedido</p>}
              {byStatus(status).map((o) => (
                <OrderCard key={o.id} order={o} busy={busy === o.id} onAct={act} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className={`mt-8 ${tab === "DONE" ? "" : "hidden lg:block"}`}>
        <h2 className="mb-2 text-sm font-bold text-stone-700">Finalizados hoje</h2>
        {data.done.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum pedido finalizado hoje.</p>
        ) : (
          <ul className="card divide-y divide-stone-200">
            {data.done.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                <span className="font-bold tabular-nums">{orderNumber(o.id)}</span>
                <span className="min-w-0 flex-1 truncate text-stone-700">{o.customerName}</span>
                <span className="tabular-nums">{formatBRL(o.totalCents)}</span>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function OrderCard({
  order: o,
  busy,
  onAct,
}: {
  order: OrderDTO;
  busy: boolean;
  onAct: (order: OrderDTO, action: "confirm_payment" | "advance" | "cancel") => void;
}) {
  const awaiting = o.status === "AWAITING_PAYMENT";
  return (
    <article className={`card p-3.5 ${awaiting && o.paymentClaimed ? "border-amber-400 ring-2 ring-amber-200" : ""}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xl font-bold tabular-nums">{orderNumber(o.id)}</h3>
        <span className="text-sm font-semibold text-stone-700">{pickupLabel(o.pickupSlot) === o.pickupSlot ? `Retirada ${o.pickupSlot}` : "O quanto antes"}</span>
      </div>
      <p className="truncate text-sm text-stone-600">{o.customerName}</p>

      <ul className="mt-2 space-y-1 border-t border-stone-200 pt-2 text-sm">
        {o.items.map((i) => (
          <li key={i.id}>
            <span className="font-semibold">{i.quantity}×</span> {i.name}
            {i.note && <span className="block rounded bg-amber-50 px-1.5 py-0.5 text-[13px] font-medium text-amber-900">Obs.: {i.note}</span>}
          </li>
        ))}
      </ul>
      {o.note && <p className="mt-2 rounded bg-amber-50 px-1.5 py-1 text-[13px] font-medium text-amber-900">Pedido: {o.note}</p>}

      {awaiting && (
        <p className={`mt-2 text-sm ${o.paymentClaimed ? "font-semibold text-amber-800" : "text-stone-500"}`}>
          {o.paymentClaimed ? "Cliente informou o pagamento" : "Ainda não pagou"} · {formatBRL(o.totalCents)}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary btn-sm flex-1" disabled={busy} onClick={() => onAct(o, awaiting ? "confirm_payment" : "advance")}>
          {NEXT_ACTION_LABEL[o.status]}
        </button>
        <button type="button" className="btn-danger btn-sm" disabled={busy} onClick={() => onAct(o, "cancel")} aria-label={`Cancelar pedido ${orderNumber(o.id)}`}>
          Cancelar
        </button>
      </div>
    </article>
  );
}
