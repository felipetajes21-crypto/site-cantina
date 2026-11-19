"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { WEEKDAY_NAMES, weekdayOf, type Schedule } from "@/lib/schedule";

type Values = {
  cantinaName: string;
  acceptingOrders: boolean;
  schedule: Schedule;
  daysAhead: number;
  closedDates: string[];
  slotMinutes: number;
  maxPerSlot: number;
  prepMinutes: number;
  paymentProvider: string;
  pixKey: string;
  pixMerchantName: string;
  pixCity: string;
};

// Segunda primeiro, como o dono costuma pensar na semana.
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const formatDate = (d: string) =>
  `${WEEKDAY_NAMES[weekdayOf(d)].slice(0, 3).toLowerCase()}, ${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;

type PaymentOptions = { options: { id: string; label: string; unavailable: string | null }[]; active: string };

export function SettingsForm({ initial, today, payments }: { initial: Values; today: string; payments: PaymentOptions }) {
  const [v, setV] = useState(initial);
  const [newDate, setNewDate] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((prev) => ({ ...prev, [key]: value }));

  const setDay = (day: number, patch: Partial<Schedule[number]>) =>
    set("schedule", v.schedule.map((d, i) => (i === day ? { ...d, ...patch } : d)));

  /** Copia o horário de segunda para todos os outros dias que estão abertos. */
  function copyMonday() {
    const { from, to } = v.schedule[1];
    set("schedule", v.schedule.map((d) => (d.open ? { ...d, from, to } : d)));
  }

  function addClosedDate() {
    if (!newDate || newDate < today || v.closedDates.includes(newDate)) return;
    set("closedDates", [...v.closedDates, newDate].sort());
    setNewDate("");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const invalid = v.schedule.findIndex((d) => d.open && d.from >= d.to);
    if (invalid >= 0) {
      return setMessage({ ok: false, text: `${WEEKDAY_NAMES[invalid]}: o fechamento precisa ser depois da abertura.` });
    }
    setSaving(true);
    setMessage(null);
    try {
      await api("/api/admin/settings", "PUT", v);
      setMessage({ ok: true, text: "Configurações salvas." });
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    }
    setSaving(false);
  }

  const num = (key: "slotMinutes" | "maxPerSlot" | "prepMinutes", label: string, hint: string, min: number, max: number) => (
    <div>
      <label className="label" htmlFor={key}>{label}</label>
      <input id={key} type="number" className="input" min={min} max={max} required value={v[key]} onChange={(e) => set(key, Number(e.target.value))} />
      <p className="mt-1 text-xs text-stone-500">{hint}</p>
    </div>
  );

  return (
    <form onSubmit={save} className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 font-display font-bold">Cantina</legend>
        <div>
          <label className="label" htmlFor="cantinaName">Nome da cantina</label>
          <input id="cantinaName" className="input" required maxLength={40} value={v.cantinaName} onChange={(e) => set("cantinaName", e.target.value)} />
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-5" checked={v.acceptingOrders} onChange={(e) => set("acceptingOrders", e.target.checked)} />
          Aceitando pedidos pelo site
        </label>
        <p className="-mt-2 text-xs text-stone-500">Desmarque para pausar todos os pedidos (ex.: acabou o gás). Os pedidos já feitos continuam na fila.</p>
      </fieldset>

      <fieldset className="card p-4">
        <legend className="px-1 font-display font-bold">Horário de funcionamento</legend>
        <p className="mb-3 text-sm text-stone-600">O cliente só consegue escolher retirada dentro destes horários.</p>
        <ul className="divide-y divide-stone-200">
          {WEEK_ORDER.map((day) => {
            const h = v.schedule[day];
            return (
              <li key={day} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
                <span className="w-20 font-semibold">{WEEKDAY_NAMES[day]}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={h.open}
                  aria-label={`${WEEKDAY_NAMES[day]} aberto`}
                  onClick={() => setDay(day, { open: !h.open })}
                  className={`min-h-9 w-24 cursor-pointer rounded-lg border text-[13px] font-semibold transition-colors ${
                    h.open ? "border-brand-200 bg-brand-50 text-brand-900" : "border-stone-300 bg-stone-100 text-stone-600"
                  }`}
                >
                  {h.open ? "Aberto" : "Fechado"}
                </button>
                {h.open ? (
                  <span className="flex items-center gap-2 text-sm text-stone-600">
                    <input type="time" className="input min-h-9 w-[7.5rem] px-2 text-sm" aria-label={`${WEEKDAY_NAMES[day]} abre às`} value={h.from} onChange={(e) => setDay(day, { from: e.target.value })} required />
                    às
                    <input type="time" className="input min-h-9 w-[7.5rem] px-2 text-sm" aria-label={`${WEEKDAY_NAMES[day]} fecha às`} value={h.to} onChange={(e) => setDay(day, { to: e.target.value })} required />
                  </span>
                ) : (
                  <span className="text-sm text-stone-500">Não recebe pedidos</span>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" className="btn-secondary btn-sm mt-3" onClick={copyMonday}>
          Usar o horário de segunda nos outros dias abertos
        </button>
      </fieldset>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 font-display font-bold">Retirada e agendamento</legend>
        <div>
          <label className="label" htmlFor="daysAhead">Até quando o cliente pode agendar</label>
          <select id="daysAhead" className="input" value={v.daysAhead} onChange={(e) => set("daysAhead", Number(e.target.value))}>
            <option value={0}>Só para hoje</option>
            <option value={1}>Hoje e amanhã</option>
            {[2, 3, 4, 5, 6, 7, 14].map((n) => (
              <option key={n} value={n}>Até {n} dias à frente</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-500">Dias fechados e datas da lista abaixo são pulados automaticamente.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {num("maxPerSlot", "Máximo de pedidos", "Quantos pedidos podem ser retirados na mesma janela de tempo.", 1, 500)}
          {num("slotMinutes", "Janela (min)", "Ex.: no máximo 8 pedidos a cada 15 minutos.", 5, 60)}
          {num("prepMinutes", "Preparo (min)", "Antecedência mínima para retirar hoje.", 0, 120)}
        </div>
      </fieldset>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 font-display font-bold">Datas fechadas</legend>
        <p className="text-sm text-stone-600">Feriados, recesso ou qualquer dia em que a cantina não vai abrir.</p>
        <div className="flex gap-2">
          <label htmlFor="newClosedDate" className="sr-only">Data fechada</label>
          <input id="newClosedDate" type="date" className="input flex-1" min={today} value={newDate} onChange={(e) => setNewDate(e.target.value)} />
          <button type="button" className="btn-secondary" onClick={addClosedDate} disabled={!newDate}>Adicionar</button>
        </div>
        {v.closedDates.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhuma data fechada.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {v.closedDates.map((d) => (
              <li key={d} className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-white py-1 pr-1 pl-3 text-sm font-medium tabular-nums">
                {formatDate(d)}
                <button
                  type="button"
                  className="grid size-7 cursor-pointer place-items-center rounded-full text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                  aria-label={`Remover ${formatDate(d)}`}
                  onClick={() => set("closedDates", v.closedDates.filter((x) => x !== d))}
                >
                  <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </fieldset>

      <fieldset className="card space-y-3 p-4">
        <legend className="px-1 font-display font-bold">Forma de pagamento</legend>
        {payments.options.map((o) => (
          <label
            key={o.id}
            className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
              v.paymentProvider === o.id ? "border-brand-700 bg-brand-50" : "border-stone-300 bg-white"
            } ${o.unavailable ? "opacity-60" : "cursor-pointer"}`}
          >
            <input
              type="radio"
              name="paymentProvider"
              className="mt-0.5 size-4"
              value={o.id}
              checked={v.paymentProvider === o.id}
              disabled={!!o.unavailable}
              onChange={() => set("paymentProvider", o.id)}
            />
            <span>
              <span className="block font-semibold">{o.label}</span>
              {o.unavailable && <span className="block text-stone-600">{o.unavailable}</span>}
              {o.id === "paypal" && !o.unavailable && (
                <span className="block text-stone-600">Confirma o pagamento sozinho e devolve o dinheiro quando você recusa um pedido.</span>
              )}
            </span>
          </label>
        ))}
        <p className="text-xs text-stone-500">As credenciais do PayPal ficam nas variáveis de ambiente (veja o README), nunca no painel.</p>
      </fieldset>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 font-display font-bold">Pix (quando a forma de pagamento for Pix)</legend>
        <div>
          <label className="label" htmlFor="pixKey">Chave Pix da cantina</label>
          <input id="pixKey" className="input" maxLength={77} value={v.pixKey} onChange={(e) => set("pixKey", e.target.value)} />
          <p className="mt-1 text-xs text-stone-500">
            CPF/CNPJ (só números), e-mail, chave aleatória ou telefone no formato +5511912345678.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pixMerchantName">Nome do recebedor</label>
            <input id="pixMerchantName" className="input" required maxLength={25} value={v.pixMerchantName} onChange={(e) => set("pixMerchantName", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pixCity">Cidade</label>
            <input id="pixCity" className="input" required maxLength={15} value={v.pixCity} onChange={(e) => set("pixCity", e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-stone-500">
          Depois de salvar, faça um pedido de teste e leia o QR Code no app do seu banco para conferir o nome do recebedor.
        </p>
      </fieldset>

      {message && (
        <p role="status" className={`rounded-xl px-3 py-2.5 text-sm ${message.ok ? "bg-emerald-100 text-emerald-900" : "bg-red-50 text-red-800"}`}>{message.text}</p>
      )}
      <div className="sticky bottom-0 -mx-4 border-t border-stone-200 bg-stone-50/95 px-4 py-3 backdrop-blur">
        <button className="btn-primary w-full sm:w-auto" disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</button>
      </div>
    </form>
  );
}
