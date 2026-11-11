import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Criar conta" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next);

  return (
    <div className="mx-auto max-w-sm pt-4">
      <h1 className="text-2xl font-bold tracking-tight">Criar conta</h1>
      <p className="mt-1 mb-5 text-sm text-stone-600">Leva menos de um minuto.</p>
      <AuthForm mode="register" next={next} />
    </div>
  );
}
