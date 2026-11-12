// Ícones desenhados por categoria (traço único de 1.6) e as cores de cada uma.
// Usados no lugar da foto quando o produto não tem imagem, e nos atalhos do cardápio.

export type CategoryKind = "salgado" | "lanche" | "bebida" | "doce" | "outro";

/** Descobre o tipo da categoria pelo nome (funciona com nomes criados no painel). */
export function categoryKind(name: string | undefined): CategoryKind {
  const n = (name ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (/salgad|empad|pastel|coxinha|esfih/.test(n)) return "salgado";
  if (/lanche|sanduich|burger|tapioca|wrap|prato|refei/.test(n)) return "lanche";
  if (/bebida|suco|cafe|cha|refri|agua|drink/.test(n)) return "bebida";
  if (/doce|sobremesa|bolo|torta|sorvete|brigadeiro/.test(n)) return "doce";
  return "outro";
}

/** Fundo e cor do traço de cada categoria (tons suaves, sempre legíveis). */
export const CATEGORY_TINT: Record<CategoryKind, string> = {
  salgado: "bg-[oklch(95%_0.045_75)] text-[oklch(48%_0.1_60)]",
  lanche: "bg-[oklch(95%_0.04_35)] text-[oklch(50%_0.13_32)]",
  bebida: "bg-[oklch(95%_0.035_215)] text-[oklch(46%_0.09_230)]",
  doce: "bg-[oklch(95%_0.035_350)] text-[oklch(50%_0.12_355)]",
  outro: "bg-brand-50 text-brand-800",
};

const PATHS: Record<CategoryKind, React.ReactNode> = {
  // Coxinha
  salgado: (
    <>
      <path d="M12 3.5c-1.6 2.6-6.5 8-6.5 11.6A5.4 5.4 0 0 0 11 20.5h2a5.4 5.4 0 0 0 5.5-5.4C18.5 11.5 13.6 6.1 12 3.5Z" />
      <path d="M9.2 15.8c.7.7 1.7 1.1 2.8 1.1" />
    </>
  ),
  // Sanduíche
  lanche: (
    <>
      <path d="M4 10.5c0-3.3 3.6-5.5 8-5.5s8 2.2 8 5.5Z" />
      <path d="M3.5 13.5c1.2 0 1.6-1 2.9-1s1.6 1 2.9 1 1.5-1 2.7-1 1.6 1 2.9 1 1.6-1 2.8-1 1.4 1 2.3 1" />
      <path d="M4.5 16.5h15a2.5 2.5 0 0 1-2.5 2.5H7a2.5 2.5 0 0 1-2.5-2.5Z" />
    </>
  ),
  // Copo com canudo
  bebida: (
    <>
      <path d="M6 8.5h12l-1.3 11a1.8 1.8 0 0 1-1.8 1.5H9.1a1.8 1.8 0 0 1-1.8-1.5Z" />
      <path d="M12.5 8.5 14 3h3" />
      <path d="M6.8 13h10.4" />
    </>
  ),
  // Fatia de bolo
  doce: (
    <>
      <path d="M4 12.5 18.5 7v13H4Z" />
      <path d="M4 12.5h14.5" />
      <path d="M4 16.3c1.5 0 1.5 1 3 1s1.5-1 3-1 1.5 1 3 1 1.5-1 3-1c1 0 1.4.5 2.5.8" />
      <path d="M17 6.4c0-1.3.8-2.4 2-2.9" />
    </>
  ),
  // Talheres
  outro: (
    <>
      <path d="M7 3v7a2 2 0 0 0 2 2v9" />
      <path d="M11 3v7a2 2 0 0 1-2 2" />
      <path d="M9 3v5" />
      <path d="M17 21V3c-1.9 1.2-3 3.4-3 6v5h3" />
    </>
  ),
};

export function CategoryIcon({ kind, className = "size-6" }: { kind: CategoryKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {PATHS[kind]}
    </svg>
  );
}
