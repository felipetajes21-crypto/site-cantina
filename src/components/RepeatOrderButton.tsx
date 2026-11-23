"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import type { Menu } from "@/lib/menu";
import { useCart, type CartItem } from "./cart";

/** Coloca no carrinho os itens de um pedido antigo que ainda estão disponíveis. */
export function RepeatOrderButton({ items }: { items: { productId: string; quantity: number; note: string }[] }) {
  const cart = useCart();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function repeat() {
    const { categories } = await api<{ categories: Menu }>("/api/menu");
    const products = new Map(categories.flatMap((c) => c.products).map((p) => [p.id, p]));
    const next: CartItem[] = [];
    for (const item of items) {
      const p = products.get(item.productId);
      if (!p?.available) continue;
      next.push({
        productId: p.id,
        name: p.name,
        priceCents: p.priceCents,
        quantity: Math.min(item.quantity, p.maxQuantity),
        note: item.note,
      });
    }
    if (next.length === 0) return setMessage("Itens indisponíveis");
    cart.replace(next);
    router.push("/carrinho");
  }

  return (
    <button type="button" className="btn-secondary btn-sm" onClick={repeat} disabled={!!message}>
      {message ?? "Repetir pedido"}
    </button>
  );
}
