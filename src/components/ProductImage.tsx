/** Foto do produto, com um espaço reservado neutro quando não há foto. */
export function ProductImage({ src, name, className = "" }: { src: string | null; name: string; className?: string }) {
  if (!src) {
    return (
      <div
        aria-hidden
        className={`grid place-items-center bg-stone-100 text-2xl font-semibold text-stone-400 ${className}`}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className={`bg-stone-100 object-cover ${className}`} />;
}
