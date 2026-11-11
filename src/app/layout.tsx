import type { Metadata, Viewport } from "next";
import { getSettings } from "@/lib/settings";
import { brand } from "@/config/brand";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { cantinaName } = await getSettings();
  return {
    title: { default: cantinaName, template: `%s · ${cantinaName}` },
    description: brand.tagline,
    icons: { icon: brand.logo },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0f766e" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
