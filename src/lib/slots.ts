// Horários de retirada: divide o expediente em intervalos (ex.: 15 min) e
// limita a quantidade de pedidos por intervalo para distribuir o movimento.
import { prisma } from "./db";
import { parseOpenDays, type CantinaSettings } from "./settings";
import { fromMinutes, localInfo, toMinutes } from "./time";

export type Availability = {
  open: boolean; // aceita pedidos para hoje?
  reason: string | null; // motivo quando fechado
  date: string; // data local de hoje
  asap: boolean; // "o mais rápido possível" disponível (cantina aberta agora)
  slots: { time: string; full: boolean }[];
};

export async function getAvailability(settings: CantinaSettings): Promise<Availability> {
  const now = localInfo();
  const openMin = toMinutes(settings.openTime);
  const closeMin = toMinutes(settings.closeTime);
  const base = { date: now.date, asap: false, slots: [] };

  if (!settings.acceptingOrders) {
    return { ...base, open: false, reason: "A cantina não está aceitando pedidos no momento." };
  }
  if (!parseOpenDays(settings.openDays).includes(now.weekday)) {
    return { ...base, open: false, reason: "A cantina não abre hoje." };
  }
  if (now.minutes >= closeMin) {
    return { ...base, open: false, reason: `A cantina já encerrou por hoje (fecha às ${settings.closeTime}).` };
  }

  // Primeiro horário possível: agora + tempo de preparo, arredondado para o
  // próximo intervalo, nunca antes da abertura.
  const step = settings.slotMinutes;
  const earliest = Math.max(openMin, now.minutes + settings.prepMinutes);
  const first = openMin + Math.ceil((earliest - openMin) / step) * step;

  const times: string[] = [];
  for (let t = first; t < closeMin; t += step) times.push(fromMinutes(t));

  // Quantos pedidos (não cancelados) já existem em cada horário de hoje.
  const counts = await prisma.order.groupBy({
    by: ["pickupSlot"],
    where: { pickupDate: now.date, pickupSlot: { not: null }, status: { not: "CANCELLED" } },
    _count: true,
  });
  const taken = new Map(counts.map((c) => [c.pickupSlot, c._count]));

  return {
    open: true,
    reason: null,
    date: now.date,
    asap: now.minutes >= openMin,
    slots: times.map((time) => ({ time, full: (taken.get(time) ?? 0) >= settings.maxPerSlot })),
  };
}
