"use client";

// Retirada no balcão: lê o QR Code do cliente com a câmera ou aceita o número
// do pedido digitado, mostra o pedido e confirma a entrega.
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { api } from "@/lib/client";
import { formatBRL, orderNumber } from "@/lib/format";
import type { OrderDTO } from "@/lib/orders";
import { StatusBadge } from "../StatusBadge";

export function PickupDesk() {
  const [order, setOrder] = useState<OrderDTO | null>(null);
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [done, setDone] = useState(false);

  async function lookup(value: string, confirmPickup = false) {
    setError(null);
    try {
      const res = await api<{ order: OrderDTO }>("/api/admin/pickup", "POST", { query: value, confirm: confirmPickup });
      setOrder(res.order);
      setLastQuery(value);
      setDone(confirmPickup);
      setScanning(false);
    } catch (err) {
      setError((err as Error).message);
      if (!confirmPickup) setOrder(null);
    }
  }

  function reset() {
    setOrder(null);
    setQuery("");
    setError(null);
    setDone(false);
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Retirada</h1>

      {!order && (
        <>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (query.trim()) lookup(query.trim());
            }}
          >
            <label htmlFor="pickup-number" className="sr-only">Número do pedido</label>
            <input
              id="pickup-number"
              className="input flex-1"
              inputMode="numeric"
              placeholder="Número do pedido"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn-primary">Buscar</button>
          </form>

          <button type="button" className="btn-secondary mt-3 w-full" onClick={() => setScanning((s) => !s)}>
            {scanning ? "Fechar câmera" : "Ler QR Code com a câmera"}
          </button>
          {scanning && <Scanner onResult={(text) => lookup(text)} onError={(msg) => { setError(msg); setScanning(false); }} />}
        </>
      )}

      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">{error}</p>}

      {order && (
        <div className="card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-3xl font-bold tabular-nums">{orderNumber(order.id)}</h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-stone-700">{order.customerName}</p>
          <ul className="mt-3 space-y-1 border-t border-stone-200 pt-3 text-sm">
            {order.items.map((i) => (
              <li key={i.id}>
                <span className="font-semibold">{i.quantity}×</span> {i.name}
                {i.note && <span className="text-stone-600"> ({i.note})</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-stone-200 pt-3 font-semibold tabular-nums">Total: {formatBRL(order.totalCents)}</p>

          {done ? (
            <p className="mt-3 rounded-xl bg-emerald-100 px-3 py-2.5 text-center font-semibold text-emerald-900" role="status">Retirada confirmada</p>
          ) : order.status === "READY" ? (
            <button type="button" className="btn-primary mt-3 w-full" onClick={() => lookup(lastQuery, true)}>
              Confirmar retirada
            </button>
          ) : (
            <p className="mt-3 rounded-xl bg-saffron-100 px-3 py-2.5 text-sm text-saffron-900">
              Este pedido não está pronto para retirada. Atualize o status na tela de pedidos.
            </p>
          )}
          <button type="button" className="btn-secondary mt-2 w-full" onClick={reset}>Próximo pedido</button>
        </div>
      )}
    </div>
  );
}

/** Câmera + leitura de QR Code (biblioteca jsQR, funciona em qualquer navegador moderno). */
function Scanner({ onResult, onError }: { onResult: (text: string) => void; onError: (message: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onResult, onError });
  callbacks.current = { onResult, onError };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;
    const canvas = document.createElement("canvas");

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch {
        callbacks.current.onError("Não foi possível acessar a câmera. Verifique a permissão ou digite o número do pedido.");
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play().catch(() => {});

      timer = setInterval(() => {
        if (!video.videoWidth) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(video, 0, 0);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(image.data, image.width, image.height);
        if (result?.data) {
          clearInterval(timer);
          callbacks.current.onResult(result.data);
        }
      }, 250);
    })();

    return () => {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return <video ref={videoRef} playsInline muted className="mt-3 aspect-square w-full rounded-2xl bg-black object-cover" />;
}
