import { getMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { getAvailability } from "@/lib/slots";
import { brand } from "@/config/brand";
import { MenuView } from "@/components/MenuView";

// Página inicial: cardápio por categorias.
export default async function MenuPage() {
  const settings = await getSettings();
  const [menu, availability] = await Promise.all([getMenu(), getAvailability(settings)]);
  const today = availability.days.find((d) => d.date === availability.today);
  const orderingToday = !!today;
  const nextDay = availability.days[0];
  const nextTime = nextDay?.asap ? null : nextDay?.earliest;

  return (
    <>
      <div className="mb-3">
        <h1 className="text-[28px] leading-tight font-bold">Cardápio</h1>
        <p className="mt-1 text-[15px] text-stone-600">{brand.tagline}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          {orderingToday ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-1 font-semibold text-brand-900">
              <span className="size-1.5 rounded-full bg-brand-700" aria-hidden />
              Aceitando pedidos
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-200 px-2.5 py-1 font-semibold text-stone-700">
              <span className="size-1.5 rounded-full bg-stone-500" aria-hidden />
              {availability.todayHours ? "Encerrado por hoje" : "Fechado hoje"}
            </span>
          )}
          <span className="text-stone-600 tabular-nums">
            {availability.todayHours && <>Hoje: {availability.todayHours.from} às {availability.todayHours.to}</>}
            {orderingToday && nextTime && <> · retirada a partir das {nextTime}</>}
            {!orderingToday && nextDay && (
              <>
                {availability.todayHours ? " · " : ""}Peça agora e retire {nextDay.label.toLowerCase()}
                {nextTime && <> a partir das {nextTime}</>}
              </>
            )}
          </span>
        </p>
      </div>
      {!availability.open && (
        <p className="mb-4 rounded-xl border border-saffron-300 bg-saffron-100 px-3 py-2.5 text-sm text-saffron-900">
          {availability.reason} Você pode ver o cardápio, mas não é possível fazer pedidos agora.
        </p>
      )}
      <MenuView menu={menu} />
    </>
  );
}
