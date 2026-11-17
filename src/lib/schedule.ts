// Horário de funcionamento por dia da semana e utilitários de datas locais
// ("AAAA-MM-DD", sempre no fuso da cantina).

export type DayHours = { open: boolean; from: string; to: string };
export type Schedule = DayHours[]; // 7 itens, 0 = domingo ... 6 = sábado

export const WEEKDAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAY_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Padrão: segunda a sexta, das 07:00 às 18:00. */
export const DEFAULT_SCHEDULE: Schedule = Array.from({ length: 7 }, (_, day) => ({
  open: day >= 1 && day <= 5,
  from: "07:00",
  to: "18:00",
}));

/** Lê o JSON salvo no banco, caindo no padrão se estiver vazio ou inválido. */
export function parseSchedule(json: string): Schedule {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data) && data.length === 7) {
      return data.map((d, i) =>
        d && typeof d.open === "boolean" && HHMM.test(d.from) && HHMM.test(d.to)
          ? { open: d.open, from: d.from, to: d.to }
          : DEFAULT_SCHEDULE[i],
      );
    }
  } catch {}
  return DEFAULT_SCHEDULE.map((d) => ({ ...d }));
}

export const parseClosedDates = (value: string) => value.split(",").filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));

/** Dia da semana (0 = domingo) de uma data "AAAA-MM-DD". */
export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Soma dias a uma data "AAAA-MM-DD". */
export function addDays(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** "Hoje", "Amanhã" ou "qua, 19/11". */
export function dayLabel(date: string, today: string) {
  if (date === today) return "Hoje";
  if (date === addDays(today, 1)) return "Amanhã";
  return `${WEEKDAY_SHORT[weekdayOf(date)]}, ${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

/** Texto do horário de retirada, ex.: "Hoje às 12:15", "qua, 19/11 às 08:00". */
export function pickupText(date: string, slot: string | null, today: string) {
  if (!slot) return date === today ? "O mais rápido possível" : `${dayLabel(date, today)}, o quanto antes`;
  return `${dayLabel(date, today)} às ${slot}`;
}
