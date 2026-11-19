// Dias e faixa de horário de retirada. O cliente escolhe livremente o
// horário dentro do funcionamento de cada dia (não há horários fixos).
// Para não acumular fila, a cantina pode limitar quantos pedidos cabem em
// cada janela de `slotMinutes` minutos (ver checkPickupCapacity).
import { prisma } from "./db";
import { HttpError } from "./api";
import type { CantinaSettings } from "./settings";
import { addDays, dayLabel, parseClosedDates, parseSchedule, weekdayOf, type DayHours } from "./schedule";
import { fromMinutes, localInfo, toMinutes } from "./time";
import { pickupTimes } from "./pickup-times";

export type PickupDay = {
  date: string; // AAAA-MM-DD
  label: string; // "Hoje", "Amanhã", "qua, 19/11"
  hours: { from: string; to: string };
  asap: boolean; // "o mais rápido possível" disponível (só hoje, com a cantina aberta)
  earliest: string; // primeiro horário que dá para escolher (HH:MM)
  latest: string; // último horário que dá para escolher (HH:MM)
};

export type Availability = {
  open: boolean; // existe pelo menos um dia para pedir?
  reason: string | null; // motivo quando não há
  today: string;
  todayHours: DayHours | null; // horário de hoje (null = fechado hoje)
  days: PickupDay[]; // só os dias em que dá para pedir
};

export async function getAvailability(settings: CantinaSettings): Promise<Availability> {
  const now = localInfo();
  const schedule = parseSchedule(settings.schedule);
  const closed = new Set(parseClosedDates(settings.closedDates));
  const todayOpen = schedule[now.weekday].open && !closed.has(now.date);
  const base = { today: now.date, todayHours: todayOpen ? schedule[now.weekday] : null };

  if (!settings.acceptingOrders) {
    return { ...base, open: false, reason: "A cantina não está aceitando pedidos no momento.", days: [] };
  }

  const days: PickupDay[] = [];
  for (let i = 0; i <= settings.daysAhead; i++) {
    const date = addDays(now.date, i);
    const hours = schedule[weekdayOf(date)];
    if (!hours.open || closed.has(date)) continue;

    const openMin = toMinutes(hours.from);
    const closeMin = toMinutes(hours.to);
    // Hoje: a partir de agora + tempo de preparo, arredondado para cima de 5 em 5 minutos.
    const earliestMin = i === 0 ? Math.max(openMin, Math.ceil((now.minutes + settings.prepMinutes) / 5) * 5) : openMin;
    const latestMin = closeMin; // pode retirar até o horário de fechamento
    const asap = i === 0 && now.minutes >= openMin && now.minutes < closeMin;
    const day = {
      date,
      label: dayLabel(date, now.date),
      hours: { from: hours.from, to: hours.to },
      asap,
      earliest: fromMinutes(Math.min(earliestMin, latestMin)),
      latest: fromMinutes(latestMin),
    };
    // O dia só aparece se houver pelo menos um horário para escolher.
    if (earliestMin > latestMin || pickupTimes(day).length === 0) {
      if (!asap) continue;
    }
    days.push(day);
  }

  if (days.length === 0) {
    return {
      ...base,
      open: false,
      reason:
        settings.daysAhead === 0
          ? "A cantina não recebe mais pedidos hoje."
          : "Não há horários de retirada disponíveis nos próximos dias.",
      days,
    };
  }
  return { ...base, open: true, reason: null, days };
}

/** Valida o horário escolhido: precisa estar na lista que o carrinho oferece. */
export function isWithinDay(day: PickupDay, time: string) {
  return pickupTimes(day).includes(time);
}

/**
 * Limite de pedidos por janela de tempo (ex.: 8 pedidos a cada 15 min), para
 * a cozinha não receber tudo para o mesmo minuto.
 */
export async function checkPickupCapacity(settings: CantinaSettings, date: string, time: string) {
  const step = settings.slotMinutes;
  const bucket = Math.floor(toMinutes(time) / step);
  const sameDay = await prisma.order.findMany({
    where: { pickupDate: date, pickupSlot: { not: null }, status: { notIn: ["CANCELLED", "AWAITING_PAYMENT"] } },
    select: { pickupSlot: true },
  });
  const taken = sameDay.filter((o) => Math.floor(toMinutes(o.pickupSlot!) / step) === bucket).length;
  if (taken >= settings.maxPerSlot) {
    const from = fromMinutes(bucket * step);
    const to = fromMinutes(bucket * step + step);
    throw new HttpError(409, `Muitos pedidos para retirar entre ${from} e ${to}. Escolha outro horário.`);
  }
}
