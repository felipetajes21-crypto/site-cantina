import { getMenu, getPopularProductIds } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { getAvailability } from "@/lib/slots";
import { MenuView } from "@/components/MenuView";

// Página inicial: cardápio com busca, categorias e "Mais pedidos".
// A situação da cantina (aberta/fechada) fica na faixa abaixo do cabeçalho.
export default async function MenuPage() {
  const settings = await getSettings();
  const [menu, availability, popular] = await Promise.all([getMenu(), getAvailability(settings), getPopularProductIds()]);

  return (
    <>
      {!availability.open && (
        <p className="mb-4 rounded-xl border border-saffron-300 bg-saffron-100 px-3 py-2.5 text-sm text-saffron-900">
          {availability.reason} Você pode ver o cardápio, mas não é possível fazer pedidos agora.
        </p>
      )}
      <MenuView menu={menu} popularIds={popular} />
    </>
  );
}
