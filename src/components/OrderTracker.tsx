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

/** Linha do tempo do pedido + QR Code para apresentar no balcão. */
function Progress({ order }: { order: OrderDTO }) {
  const current = TIMELINE.indexOf(order.status);
  const ready = order.status === "READY";

  return (
    <div className="card p-5">
      {ready && (
        <p className="mb-4 rounded-xl bg-emerald-100 px-3 py-2.5 text-center font-semibold text-emerald-900" role="status">
          Seu pedido está pronto. Retire no balcão.
        </p>
      )}

      <ol aria-label="Andamento do pedido">
        {TIMELINE.map((status, i) => {
          const done = i <= current;
          return (
            <li key={status} className="flex gap-3" aria-current={i === current ? "step" : undefined}>
              <div className="flex flex-col items-center">
                <span className={`grid size-6 place-items-center rounded-full text-xs font-bold ${done ? "bg-brand-700 text-white" : "bg-stone-200 text-stone-500"}`}>
                  {done ? "✓" : i + 1}
                </span>
                {i < TIMELINE.length - 1 && <span className={`w-0.5 flex-1 ${i < current ? "bg-brand-700" : "bg-stone-200"}`} />}
              </div>
              <p className={`pb-4 text-sm ${i === current ? "font-bold" : done ? "text-stone-700" : "text-stone-400"}`}>
                {STATUS_LABEL[status]}
              </p>
            </li>
          );
        })}
      </ol>

      {order.status !== "PICKED_UP" && (
        <div className="mt-1 grid place-items-center border-t border-stone-200 pt-4 text-center">
          <p className="text-sm text-stone-600">Apresente no balcão</p>
          <p className="mb-3 text-4xl font-bold tracking-tight tabular-nums">{orderNumber(order.id)}</p>
          <QrCode value={`CANTINA:${order.code}`} size={180} label="QR Code de retirada" />
        </div>
      )}
      {order.status === "PICKED_UP" && (
        <Link href="/" className="btn-secondary w-full">Fazer novo pedido</Link>
      )}
    </div>
  );
}
