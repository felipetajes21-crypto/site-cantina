import { CATEGORY_TINT, CategoryIcon, categoryKind } from "./CategoryIcon";

/** Foto do produto. Sem foto, mostra o ícone da categoria em um fundo tingido. */
export function ProductImage({
  src,
  name,
  category,
  className = "",
}: {
  src: string | null;
  name: string;
  category?: string;
  className?: string;
}) {
  if (!src) {
    const kind = categoryKind(category ?? name);
    return (
      <div aria-hidden className={`grid place-items-center ${CATEGORY_TINT[kind]} ${className}`}>
        <CategoryIcon kind={kind} className="size-[42%]" />
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className={`bg-stone-100 object-cover ${className}`} />;
}
