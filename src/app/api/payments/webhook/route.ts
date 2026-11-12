import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { markOrderPaid } from "@/lib/orders";
import { getPaymentProvider } from "@/lib/payments";

// Ponto de entrada para notificações do gateway de pagamento.
// Com o provedor padrão (Pix estático) esta rota não é usada. Ao integrar um
// gateway, implemente parseWebhook no provedor (validando a assinatura) e
// cadastre a URL https://seu-site/api/payments/webhook no painel do gateway.
export const POST = handle(async (req: Request) => {
  const provider = getPaymentProvider();
  if (!provider.parseWebhook) throw new HttpError(404, "Webhook não habilitado.");

  const event = await provider.parseWebhook(req);
  if (!event) throw new HttpError(401, "Assinatura inválida.");

  if (event.paid) {
    const order = await prisma.order.findFirst({
      where: { paymentRef: event.providerRef, paymentProvider: provider.id },
      select: { id: true },
    });
    if (order) await markOrderPaid(order.id);
  }
  return ok();
});
