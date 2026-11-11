// Utilitários de data/hora no fuso da cantina. O servidor pode rodar em UTC
// (ex.: Vercel), então nunca usamos getHours()/getDay() diretamente.
export const TIMEZONE = process.env.APP_TIMEZONE || "America/Sao_Paulo";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function parts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const { type, value } of fmt.formatToParts(date)) p[type] = value;
  return p;
}

/** Data, minutos desde a meia-noite e dia da semana no fuso da cantina. */
export function localInfo(date = new Date()) {
  const p = parts(date);
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    hour: Number(p.hour),
    minutes: Number(p.hour) * 60 + Number(p.minute),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

export const formatDateTime = (date: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

export const formatTime = (date: Date | string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" }).format(
    new Date(date),
  );
