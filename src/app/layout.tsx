import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { brand } from "@/config/brand";
import "./globals.css";

// Fontes servidas pelo próprio site (o Next baixa no build; nada é carregado do Google no navegador).
// Títulos numa serifada calorosa (combina com café); texto em sans-serif simples.
const heading = Fraunces({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});
const body = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { cantinaName } = await getSettings();
  return {
    title: { default: cantinaName, template: `%s · ${cantinaName}` },
    description: brand.tagline,
    icons: { icon: brand.logo },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#ffc82f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
