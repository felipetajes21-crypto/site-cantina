import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { brand } from "@/config/brand";
import { CartProvider } from "@/components/cart";
import { CartLink } from "@/components/CartLink";
import { LogoutButton } from "@/components/LogoutButton";
import { StoreStatusBar } from "@/components/StoreStatusBar";
import { getAvailability } from "@/lib/slots";

// Layout da área do cliente: cabeçalho fixo + carrinho compartilhado entre as páginas.
export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [session, settings] = await Promise.all([getSession(), getSettings()]);
  const availability = await getAvailability(settings);
  const link = "rounded-lg px-2.5 py-2 text-sm font-semibold text-stone-800 transition-colors hover:bg-black/5 hover:text-stone-900";

  return (
    <CartProvider>
      <header className="sticky top-0 z-30 border-b border-saffron-500/60 bg-saffron-400 text-stone-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-1 px-4">
          <Link href="/" className="mr-auto flex min-w-0 items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logo} alt="" width={40} height={40} className="size-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate font-display text-[19px] leading-tight font-bold">{settings.cantinaName}</span>
              <span className="hidden truncate text-[11px] font-semibold tracking-wide text-brand-900 uppercase sm:block">{brand.tagline}</span>
            </span>
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
      <StoreStatusBar availability={availability} />
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-28">{children}</main>
    </CartProvider>
  );
}
