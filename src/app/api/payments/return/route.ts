import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { baseUrl } from "@/lib/api";
import { markOrderPaid } from "@/lib/orders";
import { providerById } from "@/lib/payments";

// O gateway (PayPal, pagamento de teste…) manda o cliente de volta para cá
// depois do pagamento. O pagamento é confirmado direto com o gateway antes de
// o pedido ir para a fila da cantina. Depois, o cliente vai para a tela do pedido.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = Number(url.searchParams.get("order"));
  const site = baseUrl(req);
  if (!Number.isInteger(id) || id < 1) return NextResponse.redirect(`${site}/pedidos`);

  const order = await prisma.order.findUnique({ where: { id } });
  const provider = order && providerById(order.paymentProvider);
  if (order?.status === "AWAITING_PAYMENT" && order.paymentRef && provider?.confirmReturn) {
    try {
      const result = await provider.confirmReturn(order.paymentRef, url.searchParams);
      if (result.paid) await markOrderPaid(order.id, result.captureRef);
    } catch (err) {
      console.error("Falha ao confirmar pagamento", err);
    }
  }
  return NextResponse.redirect(`${site}/pedidos/${id}`);
}
