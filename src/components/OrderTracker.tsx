"use client";

// Tela do pedido: pagamento via Pix e acompanhamento do status em tempo real.
// O "tempo real" é feito por polling: a cada 4 segundos consultamos o pedido.
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { formatBRL, orderNumber, pickupLabel } from "@/lib/format";
import type { OrderDTO } from "@/lib/orders";
import { isFinal, STATUS_LABEL, TIMELINE } from "@/lib/status";
import { QrCode } from "./QrCode";
import { StatusBadge } from "./StatusBadge";

const POLL_MS = 4000;

export function OrderTracker({ initial }: { initial: OrderDTO }) {
  const [order, setOrder] = useState(initial);
  const previousStatus = useRef(initial.status);

  useEffect(() => {
    if (isFinal(order.status)) return;
    const timer = setInterval(async () => {
      if (document.hidden) return; // não consulta com a aba em segundo plano
      try {
        const { order: fresh } = await api<{ order: OrderDTO }>(`/api/orders/${initial.id}`);
        setOrder(fresh);
      } catch {}
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [initial.id, order.status]);

  // Avisa (vibração) quando o pedido fica pronto.
  useEffect(() => {
    if (previousStatus.current !== order.status && order.status === "READY") {
      navigator.vibrate?.([200, 100, 200]);
    }
    previousStatus.current = order.status;
  }, [order.status]);

  return (
    <div className="mx-auto max-w-md">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight tabular-nums">Pedido {orderNumber(order.id)}</h1>
        <StatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-stone-600">Retirada: {pickupLabel(order.pickupSlot)}</p>

      <div className="mt-5">
        {order.status === "AWAITING_PAYMENT" && <PixPayment order={order} onChange={setOrder} />}
        {order.status === "CANCELLED" && (
          <div className="card p-5 text-center">
            <p className="font-semibold">Este pedido foi cancelado</p>
            <p className="mt-1 text-sm text-stone-600">
              Se você já tinha pago, procure a cantina e informe o número do pedido.
            </p>
            <Link href="/" className="btn-primary mt-4">Fazer novo pedido</Link>
          </div>
        )}
        {TIMELINE.includes(order.status) && <Progress order={order} />}
      </div>

      <section className="card mt-5 p-4">
        <h2 className="mb-2 font-bold">Itens</h2>
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3">
              <span>
                <span className="font-medium">{i.quantity}× {i.name}</span>
                {i.note && <span className="block text-stone-600">Obs.: {i.note}</span>}
              </span>
              <span className="shrink-0 tabular-nums">{formatBRL(i.unitCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        {order.note && <p className="mt-3 border-t border-stone-200 pt-3 text-sm text-stone-700">Observação: {order.note}</p>}
        <div className="mt-3 flex justify-between border-t border-stone-200 pt-3 font-bold">
          <span>Total</span>
          <span className="tabular-nums">{formatBRL(order.totalCents)}</span>
        </div>
      </section>
    </div>
  );
}

/** Etapa de pagamento: QR Code Pix, copia e cola e botão "já paguei". */
function PixPayment({ order, onChange }: { order: OrderDTO; onChange: (o: OrderDTO) => void }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const payload = order.pixPayload ?? "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  async function act(path: "claim-paid" | "cancel") {
    setError(null);
    try {
      await api(`/api/orders/${order.id}/${path}`, "POST", {});
      const { order: fresh } = await api<{ order: OrderDTO }>(`/api/orders/${order.id}`);
      onChange(fresh);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-lg font-bold">Pague com Pix</h2>
      <p className="mt-1 text-sm text-stone-600">
        Valor: <strong className="text-stone-900 tabular-nums">{formatBRL(order.totalCents)}</strong>. Abra o app do seu
        banco, escolha Pix e leia o QR Code ou use o copia e cola.
      </p>

      <div className="mt-4 grid place-items-center">
        <QrCode value={payload} label="QR Code Pix" />
      </div>

      <label className="label mt-4" htmlFor="pix-code">Pix copia e cola</label>
      <div className="flex gap-2">
        <input id="pix-code" readOnly value={payload} className="input min-w-0 flex-1 font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
        <button type="button" className="btn-secondary shrink-0" onClick={copy}>
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>

      {order.paymentClaimed ? (
        <p className="mt-4 rounded-xl bg-brand-50 px-3 py-2.5 text-sm text-brand-800" role="status">
          Recebemos seu aviso. A cantina está conferindo o pagamento e esta tela atualiza sozinha.
        </p>
      ) : (
        <>
          <button type="button" className="btn-primary mt-4 w-full" onClick={() => act("claim-paid")}>
            Já paguei
          </button>
          <button type="button" className="btn mt-1 w-full text-stone-600 hover:bg-stone-100" onClick={() => act("cancel")}>
            Cancelar pedido
          </button>
          {order.payUntil && (
            <p className="mt-2 text-center text-xs text-stone-500">
              Pague até {order.payUntil} ou o pedido será cancelado.
            </p>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
}

const CHECK = (
  <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/**
 * Comanda do pedido: número e QR Code para o balcão, separados por um picote
 * da linha do tempo do preparo.
 */
function Progress({ order }: { order: OrderDTO }) {
  const current = TIMELINE.indexOf(order.status);
  const ready = order.status === "READY";
  const done = order.status === "PICKED_UP";

  return (
    <div className="card overflow-visible">
      <div className={`rounded-t-2xl px-5 pt-5 pb-5 text-center ${ready ? "bg-saffron-100" : ""}`}>
        {ready ? (
          <p className="font-display text-lg font-bold text-saffron-900" role="status">
            Pronto! Retire no balcão.
          </p>
        ) : done ? (
          <p className="font-display text-lg font-bold text-stone-700" role="status">Pedido retirado. Bom apetite!</p>
        ) : (
          <p className="text-sm font-medium text-stone-600">Apresente no balcão</p>
        )}
        <p className="mt-1 font-display text-6xl leading-none font-extrabold tracking-[-0.03em] tabular-nums">
          {orderNumber(order.id)}
        </p>
        {!done && (
          <div className="mt-4 grid place-items-center">
            <QrCode value={`CANTINA:${order.code}`} size={168} label="QR Code de retirada" />
          </div>
        )}
      </div>

      <div className="ticket-tear" style={{ "--tear-inset": "0px" } as React.CSSProperties} />

      <div className="px-5 pt-5 pb-3">
        <ol aria-label="Andamento do pedido">
          {TIMELINE.map((status, i) => {
            const reached = i <= current;
            const isCurrent = i === current;
            return (
              <li key={status} className="flex gap-3" aria-current={isCurrent ? "step" : undefined}>
                <div className="flex flex-col items-center">
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs font-bold transition-colors ${
                      reached ? "bg-brand-700 text-white" : "bg-stone-100 text-stone-500 ring-1 ring-stone-200"
                    } ${isCurrent && !done ? "ring-4 ring-brand-100" : ""}`}
                  >
                    {reached ? CHECK : i + 1}
                  </span>
                  {i < TIMELINE.length - 1 && <span className={`my-1 w-0.5 flex-1 rounded-full ${i < current ? "bg-brand-700" : "bg-stone-200"}`} />}
                </div>
                <p className={`pb-4 text-[15px] ${isCurrent ? "font-semibold text-stone-900" : reached ? "text-stone-600" : "text-stone-400"}`}>
                  {STATUS_LABEL[status]}
                </p>
              </li>
            );
          })}
        </ol>
        {done && (
          <Link href="/" className="btn-secondary mb-2 w-full">Fazer novo pedido</Link>
        )}
      </div>
    </div>
  );
}
