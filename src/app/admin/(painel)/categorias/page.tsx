import { prisma } from "@/lib/db";
import { CategoriesManager } from "@/components/admin/CategoriesManager";

export const metadata = { title: "Categorias · Painel" };

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return (
    <CategoriesManager
      categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon, products: c._count.products }))}
    />
  );
}
