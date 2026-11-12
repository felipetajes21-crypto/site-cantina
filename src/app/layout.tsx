import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { getSettings } from "@/lib/settings";
import { brand } from "@/config/brand";
import "./globals.css";

// Fontes servidas pelo próprio site (o Next baixa no build; nada é carregado do Google no navegador).
const heading = Bricolage_Grotesque({
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

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f3b37" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
