import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { DEMO_PIX_KEY } from "@/lib/pix";
import { AdminNav } from "@/components/admin/AdminNav";

// Layout do painel. O middleware já barra quem não é admin; aqui conferimos
// de novo no banco (defesa em profundidade).
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const user = session && (await prisma.user.findUnique({ where: { id: session.sub }, select: { role: true } }));
  if (user?.role !== "ADMIN") redirect("/admin/login");

  const settings = await getSettings();
  const pixWarning = !settings.pixKey
    ? "Nenhuma chave Pix cadastrada: os clientes não conseguem fazer pedidos."
    : settings.pixKey === DEMO_PIX_KEY
      ? "O site está usando uma chave Pix de demonstração. Cadastre a chave da cantina antes de receber pedidos reais."
      : null;

  return (
    <>
      <AdminNav cantinaName={settings.cantinaName} />
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16">
        {pixWarning && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
            {pixWarning}{" "}
            <a href="/admin/configuracoes" className="font-semibold underline">Abrir configurações</a>
          </p>
        )}
        {children}
      </main>
    </>
  );
}
