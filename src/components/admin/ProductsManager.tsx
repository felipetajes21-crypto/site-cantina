"use client";

// Gestão do cardápio: produtos (criar, editar, remover, foto, estoque,
// ativar/desativar) e categorias.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { formatBRL } from "@/lib/format";
import { ProductImage } from "../ProductImage";

export type AdminCategory = { id: string; name: string; sortOrder: number };
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
  const [showCategories, setShowCategories] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Atualização rápida (disponível/esgotado, estoque) sem abrir o formulário.
  async function quick(id: string, data: { active?: boolean; stock?: number }) {
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
          <button type="button" className="btn-secondary btn-sm" onClick={() => setShowCategories(true)}>Categorias</button>
          <button type="button" className="btn-primary btn-sm" disabled={categories.length === 0} onClick={() => setEditing("new")}>
            Novo produto
          </button>
        </div>
      </div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {categories.length === 0 && <p className="card p-6 text-center text-stone-600">Crie uma categoria para começar a cadastrar produtos.</p>}

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
                    <ProductImage src={p.image} name={p.name} className="size-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="text-sm text-stone-600 tabular-nums">{formatBRL(p.priceCents)}</p>
                    </div>
                    {p.trackStock && (
                      <label className="flex items-center gap-1.5 text-sm text-stone-600">
                        Estoque
                        <input
                          key={p.stock}
                          type="number"
                          min={0}
                          defaultValue={p.stock}
                          className="input min-h-9 w-20 px-2 text-sm"
                          onBlur={(e) => {
                            const stock = Math.max(0, Math.floor(Number(e.target.value) || 0));
                            if (stock !== p.stock) quick(p.id, { stock });
                          }}
                        />
                      </label>
                    )}
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
      {showCategories && (
        <Modal title="Categorias" onClose={() => setShowCategories(false)}>
          <CategoriesEditor categories={categories} onChange={() => router.refresh()} />
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
        <textarea id="p-desc" className="input py-2.5" rows={2} maxLength={300} value={description} onChange={(e) => setDescription(e.target.value)} />
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
          <ProductImage src={preview} name={name || "?"} className="size-16 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Enviar foto"
              className="block w-full text-sm file:mr-2 file:cursor-pointer file:rounded-lg file:border-0 file:bg-stone-200 file:px-3 file:py-2 file:text-sm file:font-semibold"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  setUpload(await resizeImage(file));
                  setRemoveImage(false);
                } catch {
                  setError("Não foi possível ler essa imagem.");
                }
              }}
            />
            {(upload || (product?.hasUpload && !removeImage)) && (
              <button type="button" className="text-sm font-medium text-red-700 underline" onClick={() => { setUpload(null); setRemoveImage(true); }}>
                Remover foto enviada
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

function CategoriesEditor({ categories, onChange }: { categories: AdminCategory[]; onChange: () => void }) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
      onChange();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-600">A ordem define a sequência no cardápio (menor aparece primeiro).</p>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-2">
            <input
              className="input min-w-0 flex-1"
              aria-label="Nome da categoria"
              defaultValue={c.name}
              maxLength={40}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== c.name) run(() => api(`/api/admin/categories/${c.id}`, "PUT", { name, sortOrder: c.sortOrder }));
              }}
            />
            <input
              type="number"
              className="input w-16 px-2"
              aria-label={`Ordem de ${c.name}`}
              min={0}
              max={999}
              defaultValue={c.sortOrder}
              onBlur={(e) => {
                const sortOrder = Math.max(0, Math.floor(Number(e.target.value) || 0));
                if (sortOrder !== c.sortOrder) run(() => api(`/api/admin/categories/${c.id}`, "PUT", { name: c.name, sortOrder }));
              }}
            />
            <button
              type="button"
              className="btn-danger btn-sm"
              onClick={() => confirm(`Excluir a categoria "${c.name}"?`) && run(() => api(`/api/admin/categories/${c.id}`, "DELETE"))}
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2 border-t border-stone-200 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          run(async () => {
            await api("/api/admin/categories", "POST", { name: newName, sortOrder: categories.length });
            setNewName("");
          });
        }}
      >
        <input className="input flex-1" placeholder="Nova categoria" aria-label="Nova categoria" maxLength={40} value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className="btn-primary">Adicionar</button>
      </form>
      {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    </div>
  );
}
