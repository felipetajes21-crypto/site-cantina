// Horários que o cliente pode escolher em um dia: de 5 em 5 minutos, só dentro
// do funcionamento definido no painel (de `earliest` até `latest`).
// Usado no carrinho (listas de hora e minuto) e no servidor (validação), para
// os dois aceitarem exatamente os mesmos horários.
const pad = (n: number) => String(n).padStart(2, "0");
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export const PICKUP_STEP_MINUTES = 5;

export function pickupTimes(range: { earliest: string; latest: string }): string[] {
  const step = PICKUP_STEP_MINUTES;
  const first = Math.ceil(toMin(range.earliest) / step) * step;
  const last = Math.floor(toMin(range.latest) / step) * step;
  const out: string[] = [];
  for (let m = first; m <= last; m += step) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

/** Agrupa os horários por hora: { "07": ["00", "05", ...], ... } */
export function groupByHour(times: string[]) {
  const map = new Map<string, string[]>();
  for (const t of times) {
    const [h, m] = t.split(":");
    map.set(h, [...(map.get(h) ?? []), m]);
  }
  return map;
}
