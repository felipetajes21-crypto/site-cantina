"use client";

// Gestão do cardápio: produtos (criar, editar, remover, foto, estoque,
// ativar/desativar) e categorias.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { formatBRL } from "@/lib/format";
import { ProductImage } from "../ProductImage";

export type AdminCategory = { id: string; name: string; icon: string; sortOrder: number };
export type AdminProduct = {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  categoryId: string;
  active: boolean;
  trackStock: boolean;
  stock: number;
  imageUrl: string | null;
  image: string | null; // URL final exibida (upload ou link)
  hasUpload: boolean;
};

export function ProductsManager({ categories, products }: { categories: AdminCategory[]; products: AdminProduct[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AdminProduct | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Atualização rápida (disponível/esgotado, estoque) sem abrir o formulário.
  async function quick(id: string, data: { active?: boolean; stock?: number; trackStock?: boolean }) {
    setError(null);
    try {
      await api(`/api/admin/products/${id}`, "PATCH", data);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Produtos</h1>
        <div className="flex gap-2">
          <a href="/admin/categorias" className="btn-secondary btn-sm">Categorias</a>
          <button type="button" className="btn-primary btn-sm" disabled={categories.length === 0} onClick={() => setEditing("new")}>
            Novo produto
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {categories.length === 0 && <p className="card p-6 text-center text-stone-600">Crie uma categoria em <a href="/admin/categorias" className="font-semibold text-brand-800 underline">Categorias</a> para começar a cadastrar produtos.</p>}

      {categories.map((category) => {
        const list = products.filter((p) => p.categoryId === category.id);
        return (
          <section key={category.id} className="mb-6">
            <h2 className="mb-2 font-bold">{category.name}</h2>
            {list.length === 0 ? (
              <p className="text-sm text-stone-500">Nenhum produto nesta categoria.</p>
            ) : (
              <ul className="card divide-y divide-stone-200">
                {list.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
                    <ProductImage src={p.image} name={p.name} category={category.name} icon={category.icon} className="size-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-sm text-stone-600 tabular-nums">{formatBRL(p.priceCents)}</p>
                    </div>
                    <StockControl product={p} onSave={(data) => quick(p.id, data)} />
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.active}
                      aria-label={`${p.name} disponível`}
                      onClick={() => quick(p.id, { active: !p.active })}
                      className={`min-h-9 w-28 cursor-pointer rounded-lg border px-2 text-[13px] font-semibold ${
                        p.active ? "border-emerald-300 bg-emerald-50 text-emerald-900" : "border-stone-300 bg-stone-100 text-stone-600"
                      }`}
                    >
                      {p.active ? "Disponível" : "Esgotado"}
                    </button>
                    <button type="button" className="btn-secondary btn-sm" onClick={() => setEditing(p)}>Editar</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {editing && (
        <Modal title={editing === "new" ? "Novo produto" : "Editar produto"} onClose={() => setEditing(null)}>
          <ProductForm
            product={editing === "new" ? null : editing}
            categories={categories}
            onDone={() => {
              setEditing(null);
              router.refresh();
            }}
          />
        </Modal>
      )}

    </>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(100%-1.5rem,32rem)] rounded-2xl p-0 backdrop:bg-stone-900/50"
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
        <h2 className="text-lg font-bold">{title}</h2>
        <button type="button" className="grid size-9 cursor-pointer place-items-center rounded-lg text-xl hover:bg-stone-100" onClick={onClose} aria-label="Fechar">×</button>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

/** Converte "7,50" em 750 centavos. Retorna null se o texto não for um preço. */
function parsePrice(text: string) {
  const value = Number(text.trim().replace(/\./g, "").replace(",", "."));
  return text.trim() !== "" && Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : null;
}

/** Reduz a foto no navegador (máx. 640 px, JPEG) antes de enviar. */
async function resizeImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

function ProductForm({ product, categories, onDone }: { product: AdminProduct | null; categories: AdminCategory[]; onDone: () => void }) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(product ? (product.priceCents / 100).toFixed(2).replace(".", ",") : "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? "");
  const [active, setActive] = useState(product?.active ?? true);
  const [trackStock, setTrackStock] = useState(product?.trackStock ?? false);
  const [stock, setStock] = useState(product?.stock ?? 0);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [upload, setUpload] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = upload ?? (removeImage ? imageUrl || null : (product?.hasUpload ? product.image : imageUrl || null));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const priceCents = parsePrice(price);
    if (priceCents === null) return setError("Informe um preço válido, ex.: 7,50");
    setSaving(true);
    setError(null);
    const body = { name, description, priceCents, categoryId, active, trackStock, stock, imageUrl, imageUpload: upload, removeImage };
    try {
      if (product) await api(`/api/admin/products/${product.id}`, "PUT", body);
      else await api("/api/admin/products", "POST", body);
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  async function remove() {
    if (!product || !confirm(`Remover "${product.name}" do cardápio?`)) return;
    try {
      await api(`/api/admin/products/${product.id}`, "DELETE");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="label" htmlFor="p-name">Nome</label>
        <input id="p-name" className="input" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="p-desc">Descrição</label>
        <textarea
          id="p-desc"
          className="input py-2.5"
          rows={4}
          maxLength={1000}
          placeholder="O que vai no produto, sabores, tamanho, alérgenos…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <p className="mt-1 text-right text-xs text-stone-500 tabular-nums">{description.length}/1000 · O cliente vê o texto completo ao tocar no produto.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="p-price">Preço (R$)</label>
          <input id="p-price" className="input" required inputMode="decimal" placeholder="0,00" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="p-cat">Categoria</label>
          <select id="p-cat" className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <span className="label">Foto</span>
        <div className="flex items-center gap-3">
          <ProductImage src={preview} name={name || "?"} category={categories.find((c) => c.id === categoryId)?.name} icon={categories.find((c) => c.id === categoryId)?.icon} className="size-20 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            {/* O input fica escondido; o rótulo funciona como botão. */}
            <label className="btn-secondary btn-sm cursor-pointer">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1.5-2h6l1.5 2h2A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" />
                <circle cx="12" cy="13" r="3.2" />
              </svg>
              {preview ? "Trocar foto" : "Tirar ou escolher foto"}
              <input
                type="file"
                // image/* deixa o celular oferecer a câmera; a foto é reduzida e convertida para JPEG antes do envio.
                accept="image/*"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    setUpload(await resizeImage(file));
                    setRemoveImage(false);
                  } catch {
                    setError("Não foi possível ler essa imagem. Tente outra foto.");
                  }
                }}
              />
            </label>
            {(upload || (product?.hasUpload && !removeImage)) && (
              <button type="button" className="block text-sm font-medium text-red-700 underline" onClick={() => { setUpload(null); setRemoveImage(true); }}>
                Remover foto
              </button>
            )}
          </div>
        </div>
        <input className="input mt-2 text-sm" placeholder="ou cole o link de uma foto (https://…)" aria-label="Link da foto" maxLength={500} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
      </div>

      <div className="space-y-3 rounded-xl bg-stone-50 p-3">
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-5 accent-brand-700" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Disponível no cardápio
        </label>
        <label className="flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" className="size-5 accent-brand-700" checked={trackStock} onChange={(e) => setTrackStock(e.target.checked)} />
          Controlar estoque
        </label>
        {trackStock && (
          <div>
            <label className="label" htmlFor="p-stock">Quantidade em estoque</label>
            <input id="p-stock" type="number" min={0} className="input w-32" value={stock} onChange={(e) => setStock(Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
            <p className="mt-1 text-xs text-stone-500">Cada pedido desconta do estoque; ao chegar a zero o produto aparece como esgotado.</p>
          </div>
        )}
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
        {product && <button type="button" className="btn-danger" onClick={remove}>Remover</button>}
      </div>
    </form>
  );
}


/**
 * Estoque direto na lista: botões − / + e campo de quantidade. Sem controle,
 * o produto vende sem limite até alguém marcar "Esgotado".
 */
function StockControl({
  product: p,
  onSave,
}: {
  product: AdminProduct;
  onSave: (data: { stock?: number; trackStock?: boolean }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  if (!p.trackStock && !editing) {
    return (
      <button type="button" className="btn-secondary btn-sm" onClick={() => { setValue(""); setEditing(true); }}>
        Definir estoque
      </button>
    );
  }

  if (!p.trackStock) {
    const qty = Math.floor(Number(value));
    return (
      <form
        className="flex items-center gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (value === "" || !Number.isFinite(qty) || qty < 0) return;
          onSave({ trackStock: true, stock: qty });
          setEditing(false);
        }}
      >
        <label className="sr-only" htmlFor={`stock-new-${p.id}`}>Quantidade em estoque de {p.name}</label>
        <input id={`stock-new-${p.id}`} type="number" min={0} inputMode="numeric" autoFocus placeholder="Qtd." className="input min-h-9 w-20 px-2 text-sm" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn-primary btn-sm">Salvar</button>
        <button type="button" className="btn btn-sm text-stone-600 hover:bg-stone-100" onClick={() => setEditing(false)}>Cancelar</button>
      </form>
    );
  }

  const step = (d: number) => onSave({ stock: Math.max(0, p.stock + d) });
  const btn = "grid size-9 cursor-pointer place-items-center rounded-lg text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-2">
      <div className={`inline-flex items-center rounded-xl border ${p.stock === 0 ? "border-red-200 bg-red-50" : "border-brand-200 bg-brand-50"}`}>
        <button type="button" className={btn} disabled={p.stock === 0} onClick={() => step(-1)} aria-label={`Diminuir estoque de ${p.name}`}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M5 12h14" /></svg>
        </button>
        <input
          key={p.stock}
          type="number"
          min={0}
          inputMode="numeric"
          aria-label={`Estoque de ${p.name}`}
          defaultValue={p.stock}
          className="h-9 w-12 bg-transparent text-center text-sm font-semibold tabular-nums [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
          onBlur={(e) => {
            const stock = Math.max(0, Math.floor(Number(e.target.value) || 0));
            if (stock !== p.stock) onSave({ stock });
          }}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        />
        <button type="button" className={btn} onClick={() => step(1)} aria-label={`Aumentar estoque de ${p.name}`}>
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
        </button>
      </div>
      <button type="button" className="text-xs font-medium text-stone-500 underline hover:text-stone-800" onClick={() => onSave({ trackStock: false })}>
        Sem limite
      </button>
    </div>
  );
}
