// Dias e horários de retirada. Cada dia aberto é dividido em intervalos
// (ex.: 15 min) com limite de pedidos por intervalo, para distribuir o
// movimento. O cliente pode agendar até `daysAhead` dias à frente.
import { prisma } from "./db";
import type { CantinaSettings } from "./settings";
import { addDays, dayLabel, parseClosedDates, parseSchedule, weekdayOf, type DayHours } from "./schedule";
import { fromMinutes, localInfo, toMinutes } from "./time";

export type PickupDay = {
  date: string; // AAAA-MM-DD
  label: string; // "Hoje", "Amanhã", "qua, 19/11"
  hours: { from: string; to: string };
  asap: boolean; // "o mais rápido possível" disponível (só hoje, com a cantina aberta)
  slots: { time: string; full: boolean }[];
};

export type Availability = {
  open: boolean; // existe pelo menos um dia/horário para pedir?
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

  // Monta os horários de cada dia, de hoje até daysAhead.
  const candidates: PickupDay[] = [];
  for (let i = 0; i <= settings.daysAhead; i++) {
    const date = addDays(now.date, i);
    const hours = schedule[weekdayOf(date)];
    if (!hours.open || closed.has(date)) continue;

    const openMin = toMinutes(hours.from);
    const closeMin = toMinutes(hours.to);
    const step = settings.slotMinutes;
    // Hoje: primeiro horário = agora + tempo de preparo, arredondado ao intervalo.
    const earliest = i === 0 ? Math.max(openMin, now.minutes + settings.prepMinutes) : openMin;
    const first = openMin + Math.ceil((earliest - openMin) / step) * step;

    const times: string[] = [];
    for (let t = first; t < closeMin; t += step) times.push(fromMinutes(t));
    const asap = i === 0 && now.minutes >= openMin && now.minutes < closeMin;

    candidates.push({
      date,
      label: dayLabel(date, now.date),
      hours: { from: hours.from, to: hours.to },
      asap,
      slots: times.map((time) => ({ time, full: false })),
    });
  }

  // Marca os horários que já atingiram o limite de pedidos.
  const counts = await prisma.order.groupBy({
    by: ["pickupDate", "pickupSlot"],
    where: {
      pickupDate: { in: candidates.map((d) => d.date) },
      pickupSlot: { not: null },
      status: { not: "CANCELLED" },
    },
    _count: true,
  });
  const taken = new Map(counts.map((c) => [`${c.pickupDate} ${c.pickupSlot}`, c._count]));
  for (const day of candidates) {
    for (const slot of day.slots) slot.full = (taken.get(`${day.date} ${slot.time}`) ?? 0) >= settings.maxPerSlot;
  }

  const days = candidates.filter((d) => d.asap || d.slots.length > 0);
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
