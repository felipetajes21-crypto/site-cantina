import { getMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { getAvailability } from "@/lib/slots";
import { brand } from "@/config/brand";
import { MenuView } from "@/components/MenuView";

// Página inicial: cardápio por categorias.
export default async function MenuPage() {
  const settings = await getSettings();
  const [menu, availability] = await Promise.all([getMenu(), getAvailability(settings)]);

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Cardápio</h1>
        <p className="mt-0.5 text-sm text-stone-600">
          {brand.tagline} · Aberto das {settings.openTime} às {settings.closeTime}
        </p>
      </div>
      {!availability.open && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          {availability.reason} Você pode ver o cardápio, mas não é possível fazer pedidos agora.
        </p>
      )}
      <MenuView menu={menu} />
    </>
  );
}
