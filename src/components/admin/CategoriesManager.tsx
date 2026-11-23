"use client";

// Categorias do cardápio: criar, renomear, escolher o ícone, mudar a ordem e excluir.
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { CATEGORY_KINDS, CATEGORY_TINT, CategoryIcon, categoryKind, type CategoryKind } from "../CategoryIcon";

type Category = { id: string; name: string; icon: string; products: number };

export function CategoriesManager({ categories: initial }: { categories: Category[] }) {
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState<CategoryKind>("outro");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("");

  useEffect(() => setList(initial), [initial]);

  async function run(fn: () => Promise<unknown>, success?: string) {
    setMessage(null);
    try {
      await fn();
      if (success) setMessage({ ok: true, text: success });
      router.refresh();
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message });
    }
  }

  function move(index: number, delta: number) {
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setList(next);
    run(() => api("/api/admin/categories/reorder", "POST", { ids: next.map((c) => c.id) }));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Categorias</h1>
      <p className="mt-1 mb-4 text-sm text-stone-600">
        É assim que o cardápio aparece para o cliente, na mesma ordem. Use as setas para mudar a posição.
      </p>

      {message && (
        <p role="status" className={`mb-3 rounded-xl px-3 py-2.5 text-sm ${message.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>
          {message.text}
        </p>
      )}

      <ul className="card divide-y divide-stone-200">
        {list.length === 0 && <li className="p-4 text-sm text-stone-500">Nenhuma categoria ainda. Crie a primeira abaixo.</li>}
        {list.map((c, i) => {
          const kind = categoryKind(c.name, c.icon);
          return (
            <li key={c.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex flex-col">
                  <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Subir ${c.name}`}>
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 15 6-6 6 6" /></svg>
                  </button>
                  <button type="button" className="grid size-7 cursor-pointer place-items-center rounded-md text-stone-600 hover:bg-stone-100 disabled:opacity-30" disabled={i === list.length - 1} onClick={() => move(i, 1)} aria-label={`Descer ${c.name}`}>
                    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
                  </button>
                </div>
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${CATEGORY_TINT[kind]}`}>
                  <CategoryIcon kind={kind} className="size-6" />
                </span>
                <input
                  key={c.name}
                  className="input min-w-0 flex-1 basis-40 font-semibold"
                  aria-label={`Nome da categoria ${c.name}`}
                  defaultValue={c.name}
                  maxLength={40}
                  onBlur={(e) => {
                    const name = e.target.value.trim();
                    if (name && name !== c.name) run(() => api(`/api/admin/categories/${c.id}`, "PUT", { name, icon: c.icon }), "Nome salvo.");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
                <span className="text-sm text-stone-500 tabular-nums">{c.products} {c.products === 1 ? "produto" : "produtos"}</span>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={() => {
                    setDeleting(deleting === c.id ? null : c.id);
                    setMoveTo(list.find((x) => x.id !== c.id)?.id ?? "");
                  }}
                >
                  Excluir
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5 pl-9" role="radiogroup" aria-label={`Ícone de ${c.name}`}>
                {CATEGORY_KINDS.map((k) => (
                  <IconChoice key={k.kind} kind={k.kind} label={k.label} selected={kind === k.kind} onSelect={() => run(() => api(`/api/admin/categories/${c.id}`, "PUT", { name: c.name, icon: k.kind }))} />
                ))}
              </div>

              {deleting === c.id && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-900">
                  {c.products === 0 ? (
                    <p>Excluir a categoria “{c.name}”?</p>
                  ) : list.length === 1 ? (
                    <p>Crie outra categoria antes: os {c.products} produtos de “{c.name}” precisam ir para algum lugar.</p>
                  ) : (
                    <label className="flex flex-wrap items-center gap-2">
                      Mover os {c.products} produtos para
                      <select className="input min-h-9 w-auto py-0 text-sm" value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
                        {list.filter((x) => x.id !== c.id).map((x) => (
                          <option key={x.id} value={x.id}>{x.name}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <div className="mt-2 flex gap-2">
                    {(c.products === 0 || list.length > 1) && (
                      <button
                        type="button"
                        className="btn btn-sm bg-red-700 text-white hover:bg-red-800"
                        onClick={() => {
                          setDeleting(null);
                          run(() => api(`/api/admin/categories/${c.id}${c.products ? `?moveTo=${encodeURIComponent(moveTo)}` : ""}`, "DELETE"), `Categoria “${c.name}” excluída.`);
                        }}
                      >
                        Confirmar exclusão
                      </button>
                    )}
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setDeleting(null)}>Cancelar</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="card mt-6 space-y-3 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return setMessage({ ok: false, text: "Informe o nome da categoria." });
          run(async () => {
            await api("/api/admin/categories", "POST", { name: newName, icon: newIcon });
            setNewName("");
          }, `Categoria “${newName.trim()}” criada.`);
        }}
      >
        <h2 className="font-bold">Nova categoria</h2>
        <input className="input" placeholder="Ex.: Cafés, Promoções, Almoço" aria-label="Nome da nova categoria" maxLength={40} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Ícone da nova categoria">
          {CATEGORY_KINDS.map((k) => (
            <IconChoice key={k.kind} kind={k.kind} label={k.label} selected={newIcon === k.kind} onSelect={() => setNewIcon(k.kind)} />
          ))}
        </div>
        <button className="btn-primary">Criar categoria</button>
      </form>
    </div>
  );
}

function IconChoice({ kind, label, selected, onSelect }: { kind: CategoryKind; label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border py-1 pr-3 pl-1 text-[13px] font-medium transition-colors ${
        selected ? "border-brand-700 bg-brand-50 text-brand-900" : "border-stone-200 bg-white text-stone-700 hover:border-stone-400"
      }`}
    >
      <span className={`grid size-6 place-items-center rounded-full ${CATEGORY_TINT[kind]}`}>
        <CategoryIcon kind={kind} className="size-4" />
      </span>
      {label}
    </button>
  );
}
