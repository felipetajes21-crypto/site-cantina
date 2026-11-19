import Link from "next/link";
import { notFound } from "next/navigation";
import { HttpError } from "@/lib/api";
import { loadOwnOrder } from "@/lib/order-access";
import { formatBRL, orderNumber } from "@/lib/format";
import { testApprovalToken } from "@/lib/payments/test-gateway";
import { getSettings } from "@/lib/settings";

export const metadata = { title: "Pagamento de teste" };

// Página que imita a tela de pagamento de um gateway (como a do PayPal).
// Só existe com a forma de pagamento "Pagamento de teste".
export default async function TestPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  let order;
  try {
    order = await loadOwnOrder((await params).id);
  } catch (err) {
    if (err instanceof HttpError) notFound();
    throw err;
  }
  if (order.paymentProvider !== "teste" || !order.paymentRef) notFound();

  const approve = `/api/payments/return?order=${order.id}&token=${testApprovalToken(order.paymentRef)}`;
  const done = order.status !== "AWAITING_PAYMENT";
  const { cantinaName } = await getSettings();

  return (
    <div className="mx-auto max-w-sm pt-2">
      <p className="mb-4 rounded-xl border border-dashed border-stone-400 px-3 py-2 text-center text-xs font-semibold tracking-wide text-stone-600 uppercase">
        Ambiente de teste · nenhum dinheiro é cobrado
      </p>
      <div className="card overflow-hidden">
        <div className="bg-stone-900 px-5 py-4 text-white">
          <p className="text-sm text-stone-300">Pagamento para</p>
          <p className="font-display text-lg font-bold">{cantinaName}</p>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-stone-600">Pedido {orderNumber(order.id)}</span>
            <span className="font-display text-3xl font-extrabold tabular-nums">{formatBRL(order.totalCents)}</span>
          </div>
          <p className="text-sm text-stone-600">
            É aqui que o cliente pagaria com cartão ou conta PayPal. Na versão final, esta tela é a do próprio PayPal.
          </p>
          {done ? (
            <Link href={`/pedidos/${order.id}`} className="btn-primary w-full">Ver pedido</Link>
          ) : (
            <>
              {/* Link GET simples: a aprovação é assinada pelo servidor. */}
              <a href={approve} className="btn-primary w-full">Aprovar pagamento de {formatBRL(order.totalCents)}</a>
              <Link href={`/pedidos/${order.id}`} className="btn w-full text-stone-600 hover:bg-stone-100">
                Cancelar e voltar
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
