import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { activePaymentProvider } from "@/lib/payments";
import { AdminNav } from "@/components/admin/AdminNav";

// Layout do painel. O middleware já barra quem não é admin; aqui conferimos
// de novo no banco (defesa em profundidade).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session && (await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true } }));
  if (user?.role !== "ADMIN") redirect("/admin/login");

  const settings = await getSettings();
  // Aviso quando o site ainda não cobra de verdade.
  const provider = activePaymentProvider(settings);
  const paymentWarning = !provider
    ? "Nenhuma forma de pagamento configurada: os clientes não conseguem fazer pedidos."
    : provider.id === "teste"
      ? "O site está usando o pagamento de teste (nenhum dinheiro é cobrado). Configure o Mercado Pago antes de receber pedidos reais."
      : null;

  return (
    <>
      <AdminNav cantinaName={settings.cantinaName} />
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16">
        {paymentWarning && (
          <p className="mb-4 rounded-xl border border-saffron-300 bg-saffron-100 px-3 py-2.5 text-sm text-saffron-900">
            {paymentWarning}{" "}
            <a href="/admin/configuracoes" className="font-semibold underline">Abrir configurações</a>
          </p>
        )}
        {children}
      </main>
    </>
  );
}
