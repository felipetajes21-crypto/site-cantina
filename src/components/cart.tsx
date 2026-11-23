"use client";

// Carrinho guardado no navegador (localStorage). O servidor recalcula preços
// e confere disponibilidade quando o pedido é enviado.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  name: string;
  priceCents: number;
  quantity: number;
  note: string;
};

type CartContext = {
  items: CartItem[];
  ready: boolean; // false até carregar do localStorage
  count: number;
  totalCents: number;
  quantityOf: (productId: string) => number;
  setQuantity: (product: { id: string; name: string; priceCents: number }, quantity: number) => void;
  setNote: (productId: string, note: string) => void;
  replace: (items: CartItem[]) => void;
  clear: () => void;
};

const STORAGE_KEY = "cantina:carrinho:v1";
const Ctx = createContext<CartContext | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) setItems(saved);
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const setQuantity = useCallback<CartContext["setQuantity"]>((product, quantity) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (quantity <= 0) return prev.filter((i) => i.productId !== product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id ? { ...i, quantity, name: product.name, priceCents: product.priceCents } : i,
        );
      }
      return [...prev, { productId: product.id, name: product.name, priceCents: product.priceCents, quantity, note: "" }];
    });
  }, []);

  const setNote = useCallback((productId: string, note: string) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, note } : i)));
  }, []);

  const value = useMemo<CartContext>(
    () => ({
      items,
      ready,
      count: items.reduce((n, i) => n + i.quantity, 0),
      totalCents: items.reduce((n, i) => n + i.priceCents * i.quantity, 0),
      quantityOf: (id) => items.find((i) => i.productId === id)?.quantity ?? 0,
      setQuantity,
      setNote,
      replace: setItems,
      clear: () => setItems([]),
    }),
    [items, ready, setQuantity, setNote],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart precisa estar dentro de <CartProvider>");
  return ctx;
}
