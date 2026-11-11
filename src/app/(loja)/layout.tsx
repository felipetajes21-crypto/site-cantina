import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { brand } from "@/config/brand";
import { CartProvider } from "@/components/cart";
import { CartLink } from "@/components/CartLink";
import { LogoutButton } from "@/components/LogoutButton";

// Layout da área do cliente: cabeçalho fixo + carrinho compartilhado entre as páginas.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  const link = "rounded-lg px-2.5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100";

  return (
    <CartProvider>
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-4">
          <Link href="/" className="mr-auto flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logo} alt="" width={32} height={32} className="size-8 shrink-0" />
            <span className="truncate text-base font-bold tracking-tight">{settings.cantinaName}</span>
          </Link>
          {session ? (
            <>
              <Link href="/pedidos" className={link}>Meus pedidos</Link>
              <LogoutButton className={`${link} cursor-pointer`} />
            </>
          ) : (
            <Link href="/entrar" className={link}>Entrar</Link>
          )}
          <CartLink />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pt-5 pb-28">{children}</main>
    </CartProvider>
  );
}
