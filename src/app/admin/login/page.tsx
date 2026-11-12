import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { brand } from "@/config/brand";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Painel da cantina" };

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session?.role === "ADMIN") redirect("/admin");
  const { cantinaName } = await getSettings();

  return (
    <main className="mx-auto max-w-sm px-4 pt-16">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.logo} alt="" width={44} height={44} className="mb-4" />
      <h1 className="text-2xl font-bold tracking-tight">Painel da cantina</h1>
      <p className="mt-1 mb-5 text-sm text-stone-600">{cantinaName} · acesso restrito à equipe.</p>
      <AuthForm mode="admin" next="/admin" />
    </main>
  );
}
