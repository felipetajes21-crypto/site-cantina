import { prisma } from "@/lib/db";
import { productImage } from "@/lib/menu";
import { ProductsManager } from "@/components/admin/ProductsManager";

export const metadata = { title: "Produtos · Painel" };

export default async function ProductsPage() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.product.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      // imageData (os bytes da foto) fica de fora: não é necessário na listagem.
      select: {
        id: true, name: true, description: true, priceCents: true, categoryId: true, active: true,
        trackStock: true, stock: true, imageUrl: true, imageMime: true, updatedAt: true,
      },
    }),
  ]);

  return (
    <ProductsManager
      categories={categories}
      products={products.map(({ imageMime, updatedAt, ...p }) => ({
        ...p,
        image: productImage({ ...p, imageMime, updatedAt }),
        hasUpload: !!imageMime,
      }))}
    />
  );
}
