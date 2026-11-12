"use client";

import { useState } from "react";
import { api } from "@/lib/client";

type Values = {
  cantinaName: string;
  acceptingOrders: boolean;
  openTime: string;
  closeTime: string;
  openDays: number[];
  slotMinutes: number;
  maxPerSlot: number;
  prepMinutes: number;
  pixKey: string;
  pixMerchantName: string;
  pixCity: string;
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function SettingsForm({ initial }: { initial: Values }) {
  const [v, setV] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Values>(key: K, value: Values[K]) => setV((prev) => ({ ...prev, [key]: value }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
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
    <form onSubmit={save} className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 font-bold">Cantina</legend>
        <div>
          <label className="label" htmlFor="cantinaName">Nome da cantina</label>
          <input id="cantinaName" className="input" required maxLength={40} value={v.cantinaName} onChange={(e) => set("cantinaName", e.target.value)} />
        </div>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-5 accent-brand-700" checked={v.acceptingOrders} onChange={(e) => set("acceptingOrders", e.target.checked)} />
          Aceitando pedidos pelo site
        </label>
      </fieldset>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 font-bold">Horário de funcionamento</legend>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="openTime">Abre às</label>
            <input id="openTime" type="time" className="input" required value={v.openTime} onChange={(e) => set("openTime", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="closeTime">Fecha às</label>
            <input id="closeTime" type="time" className="input" required value={v.closeTime} onChange={(e) => set("closeTime", e.target.value)} />
          </div>
        </div>
        <div>
          <span className="label">Dias de funcionamento</span>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((d, i) => {
              const on = v.openDays.includes(i);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("openDays", on ? v.openDays.filter((x) => x !== i) : [...v.openDays, i])}
                  className={`min-h-10 cursor-pointer rounded-xl border px-3 text-sm font-medium ${on ? "border-brand-700 bg-brand-700 text-white" : "border-stone-300 bg-white text-stone-700"}`}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 font-bold">Retirada</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {num("slotMinutes", "Intervalo (min)", "Tamanho de cada horário de retirada.", 5, 60)}
          {num("maxPerSlot", "Pedidos por intervalo", "Limite para não acumular fila.", 1, 500)}
          {num("prepMinutes", "Preparo (min)", "Antecedência mínima para retirar.", 0, 120)}
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-4">
        <legend className="px-1 font-bold">Pix</legend>
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
      <button className="btn-primary w-full sm:w-auto" disabled={saving}>{saving ? "Salvando…" : "Salvar configurações"}</button>
    </form>
  );
}
