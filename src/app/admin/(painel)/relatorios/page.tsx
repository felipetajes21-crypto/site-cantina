import { prisma } from "@/lib/db";
import { formatBRL } from "@/lib/format";
import { localInfo } from "@/lib/time";

export const metadata = { title: "Relatórios · Painel" };

const DAY_MS = 24 * 60 * 60 * 1000;

// Relatórios simples: vendas de hoje e dos últimos 7 dias, produtos mais
// vendidos e horários de pico. Só entram pedidos pagos e não cancelados.
// Os agrupamentos são feitos em JavaScript para funcionar igual em SQLite e
// PostgreSQL; para volumes grandes, troque por consultas agregadas.
export default async function ReportsPage() {
  const now = new Date();
  const days = Array.from({ length: 7 }, (_, i) => localInfo(new Date(now.getTime() - (6 - i) * DAY_MS)).date);
  const today = days[6];

  const orders = await prisma.order.findMany({
    where: { paidAt: { gte: new Date(now.getTime() - 8 * DAY_MS) }, status: { not: "CANCELLED" } },
    select: { totalCents: true, paidAt: true, items: { select: { name: true, quantity: true, unitCents: true } } },
  });

  const byDay = new Map(days.map((d) => [d, { count: 0, cents: 0 }]));
  const byHour = new Map<number, number>();
  const byProduct = new Map<string, { quantity: number; cents: number }>();

  for (const order of orders) {
    const local = localInfo(order.paidAt!);
    const day = byDay.get(local.date);
    if (!day) continue; // fora da janela de 7 dias
    day.count += 1;
    day.cents += order.totalCents;
    byHour.set(local.hour, (byHour.get(local.hour) ?? 0) + 1);
    for (const item of order.items) {
      const p = byProduct.get(item.name) ?? { quantity: 0, cents: 0 };
      p.quantity += item.quantity;
      p.cents += item.quantity * item.unitCents;
      byProduct.set(item.name, p);
    }
  }

  const todayStats = byDay.get(today)!;
  const week = [...byDay.values()].reduce((a, d) => ({ count: a.count + d.count, cents: a.cents + d.cents }), { count: 0, cents: 0 });
  const maxDay = Math.max(1, ...[...byDay.values()].map((d) => d.cents));
  const topProducts = [...byProduct.entries()].sort((a, b) => b[1].quantity - a[1].quantity).slice(0, 10);
  const hours = [...byHour.entries()].sort((a, b) => a[0] - b[0]);
  const maxHour = Math.max(1, ...hours.map(([, n]) => n));
  const peak = hours.reduce<[number, number] | null>((best, h) => (!best || h[1] > best[1] ? h : best), null);

  const tiles = [
    { label: "Vendas hoje", value: formatBRL(todayStats.cents), sub: `${todayStats.count} pedido(s)` },
    { label: "Ticket médio hoje", value: todayStats.count ? formatBRL(Math.round(todayStats.cents / todayStats.count)) : "—", sub: "por pedido" },
    { label: "Vendas em 7 dias", value: formatBRL(week.cents), sub: `${week.count} pedido(s)` },
    { label: "Horário de pico (7 dias)", value: peak ? `${String(peak[0]).padStart(2, "0")}h` : "—", sub: peak ? `${peak[1]} pedido(s)` : "sem dados" },
  ];

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Relatórios</h1>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="card p-4">
            <p className="text-sm text-stone-600">{t.label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums">{t.value}</p>
            <p className="text-xs text-stone-500">{t.sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="mb-3 font-bold">Vendas por dia (últimos 7 dias)</h2>
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr><th>Dia</th><th>Vendas</th><th>Pedidos</th></tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const s = byDay.get(d)!;
                return (
                  <tr key={d}>
                    <th scope="row" className="w-14 py-1.5 text-left font-medium text-stone-600 tabular-nums">{d.slice(8)}/{d.slice(5, 7)}</th>
                    <td className="py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-5 rounded bg-brand-700" style={{ width: `${(s.cents / maxDay) * 70}%`, minWidth: s.cents ? 4 : 0 }} />
                        <span className="font-medium tabular-nums">{formatBRL(s.cents)}</span>
                      </div>
                    </td>
                    <td className="w-20 py-1.5 text-right text-stone-500 tabular-nums">{s.count} ped.</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="card p-4">
          <h2 className="mb-3 font-bold">Pedidos por horário (últimos 7 dias)</h2>
          {hours.length === 0 ? (
            <p className="text-sm text-stone-500">Ainda não há pedidos pagos no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sr-only">
                <tr><th>Hora</th><th>Pedidos</th></tr>
              </thead>
              <tbody>
                {hours.map(([hour, count]) => (
                  <tr key={hour}>
                    <th scope="row" className="w-14 py-1.5 text-left font-medium text-stone-600 tabular-nums">{String(hour).padStart(2, "0")}h</th>
                    <td className="py-1.5">
                      <div className="flex items-center gap-2">
                        <div className="h-5 rounded bg-brand-700" style={{ width: `${(count / maxHour) * 80}%`, minWidth: 4 }} />
                        <span className="font-medium tabular-nums">{count}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 font-bold">Produtos mais vendidos (últimos 7 dias)</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-stone-500">Ainda não há pedidos pagos no período.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 text-left text-stone-500">
                  <th className="py-2 font-medium">Produto</th>
                  <th className="py-2 text-right font-medium">Qtd.</th>
                  <th className="py-2 text-right font-medium">Receita</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {topProducts.map(([name, p]) => (
                  <tr key={name}>
                    <td className="py-2 font-medium">{name}</td>
                    <td className="py-2 text-right tabular-nums">{p.quantity}</td>
                    <td className="py-2 text-right tabular-nums">{formatBRL(p.cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
