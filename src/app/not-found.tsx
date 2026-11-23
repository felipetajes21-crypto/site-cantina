import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-sm px-4 pt-24 text-center">
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-stone-600">O endereço pode estar errado ou o pedido não é seu.</p>
      <Link href="/" className="btn-primary mt-6">Voltar ao cardápio</Link>
    </main>
  );
}
