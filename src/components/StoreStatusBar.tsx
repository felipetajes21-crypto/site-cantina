import Link from "next/link";
import type { Availability } from "@/lib/slots";

/**
 * Faixa logo abaixo do cabeçalho com a situação da cantina agora:
 * aberta (até que horas), vai abrir hoje, ou fechada (e quando dá para retirar).
 */
export function StoreStatusBar({ availability: a }: { availability: Availability }) {
  const today = a.days.find((d) => d.date === a.today);
  const next = a.days[0];

  let dot = "bg-stone-400";
  let label: string;
  let detail: string | null = null;
  let action: string | null = null;

  if (today?.asap) {
    dot = "bg-emerald-600";
    label = "Aberta agora";
    detail = `hoje até ${today.hours.to}`;
  } else if (today) {
    dot = "bg-saffron-500";
    label = "Abre hoje";
    detail = `às ${today.hours.from}`;
    action = "Agendar pedido";
  } else if (next) {
    dot = "bg-red-600";
    label = "Fechada";
    detail = `abre ${next.label.toLowerCase()} às ${next.hours.from}`;
    action = "Agendar pedido";
  } else {
    dot = "bg-red-600";
    label = "Fechada";
    detail = a.reason;
  }

  return (
    <div className="border-b border-saffron-300/70 bg-saffron-100">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-1.5 text-[13px]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 font-semibold text-stone-900 shadow-[0_1px_2px_rgba(80,40,0,0.08)]">
          <span className={`size-2 rounded-full ${dot}`} aria-hidden />
          {label}
        </span>
        {detail && <span className="font-medium text-stone-700 tabular-nums">{detail}</span>}
        {action && (
          <Link href="/carrinho" className="inline-flex items-center gap-1 rounded-full bg-brand-700 px-2.5 py-0.5 font-semibold text-white hover:bg-brand-800">
            {action}
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6" /></svg>
          </Link>
        )}
      </div>
    </div>
  );
}
