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
      icon: c.icon,
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

/**
 * "Mais pedidos": os produtos mais vendidos nos últimos 30 dias (pedidos que
 * foram para a fila, sem cancelados). Retorna os ids, do mais vendido ao menos.
 */
export async function getPopularProductIds(limit = 4) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const rows = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      productId: { not: null },
      order: { createdAt: { gte: since }, status: { in: ["RECEIVED", "PREPARING", "READY", "PICKED_UP"] } },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: limit,
  });
  return rows.map((r) => r.productId!);
}
