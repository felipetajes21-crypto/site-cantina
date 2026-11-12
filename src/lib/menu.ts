import { prisma } from "./db";

/** Cardápio público: categorias com seus produtos e a disponibilidade de cada um. */
export async function getMenu() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      products: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, description: true, priceCents: true, active: true,
          trackStock: true, stock: true, imageUrl: true, imageMime: true, updatedAt: true,
        },
      },
    },
  });
  return categories
    .filter((c) => c.products.length > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      products: c.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        priceCents: p.priceCents,
        available: p.active && (!p.trackStock || p.stock > 0),
        // Limite de unidades por pedido quando há controle de estoque.
        maxQuantity: p.trackStock ? Math.min(p.stock, 20) : 20,
        image: productImage(p),
      })),
    }));
}

/** URL da foto: upload feito no painel tem prioridade sobre o link externo. */
export function productImage(p: { id: string; imageUrl: string | null; imageMime: string | null; updatedAt: Date }) {
  if (p.imageMime) return `/api/products/${p.id}/image?v=${p.updatedAt.getTime()}`;
  return p.imageUrl || null;
}

export type Menu = Awaited<ReturnType<typeof getMenu>>;
export type MenuProduct = Menu[number]["products"][number];
