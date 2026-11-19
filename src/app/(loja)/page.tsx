import { getMenu } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { getAvailability } from "@/lib/slots";
import { brand } from "@/config/brand";
import { localInfo } from "@/lib/time";
import { MenuView } from "@/components/MenuView";

// Página inicial: cardápio por categorias.
export default async function MenuPage() {
  const settings = await getSettings();
  const [menu, availability] = await Promise.all([getMenu(), getAvailability(settings)]);
  const today = availability.days.find((d) => d.date === availability.today);
  const orderingToday = !!today;
  const nextDay = availability.days[0];
  const nextTime = nextDay?.asap ? null : nextDay?.earliest;
  const hour = localInfo().hour;
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <>
      {/* Boas-vindas: saudação pela hora do dia, status da cantina e o logo grande. */}
      <section className="relative mb-4 overflow-hidden rounded-3xl border border-saffron-300 bg-saffron-100 px-5 pt-5 pb-5 text-stone-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt="" aria-hidden className="pointer-events-none absolute -right-6 -bottom-8 size-36 rotate-[-10deg] opacity-95 drop-shadow-[0_10px_18px_rgba(120,50,0,0.25)] sm:size-44" />
        <p className="text-sm font-semibold text-brand-800">{greeting}!</p>
        <h1 className="mt-0.5 max-w-[15rem] text-[28px] leading-[1.1] font-extrabold sm:max-w-none">O que vai ser hoje?</h1>
        <p className="mt-1.5 max-w-[16rem] text-[15px] text-stone-800 sm:max-w-none">{brand.tagline}.</p>
        <p className="mt-4 flex max-w-[calc(100%-6.5rem)] flex-wrap items-center gap-x-2 gap-y-1.5 text-sm sm:max-w-none">
          {orderingToday ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-700 px-2.5 py-1 font-semibold text-white">
              <span className="size-1.5 rounded-full bg-saffron-400" aria-hidden />
              Aceitando pedidos
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-semibold text-stone-700">
              <span className="size-1.5 rounded-full bg-stone-500" aria-hidden />
              {availability.todayHours ? "Encerrado por hoje" : "Fechado hoje"}
            </span>
          )}
          <span className="font-medium text-stone-800 tabular-nums">
            {availability.todayHours && <>Hoje: {availability.todayHours.from} às {availability.todayHours.to}</>}
            {!orderingToday && nextDay && (
              <>
                {availability.todayHours ? " · " : ""}Peça agora e retire {nextDay.label.toLowerCase()}
                {nextTime && <> a partir das {nextTime}</>}
              </>
            )}
          </span>
        </p>
      </section>
      {!availability.open && (
        <p className="mb-4 rounded-xl border border-saffron-300 bg-saffron-100 px-3 py-2.5 text-sm text-saffron-900">
          {availability.reason} Você pode ver o cardápio, mas não é possível fazer pedidos agora.
        </p>
      )}
      <MenuView menu={menu} />
    </>
  );
}
