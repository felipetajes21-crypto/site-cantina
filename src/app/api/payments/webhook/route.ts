import { prisma } from "@/lib/db";
import { handle, HttpError, ok } from "@/lib/api";
import { markOrderPaid } from "@/lib/orders";
import { getPaymentProvider, providerById } from "@/lib/payments";
import { getSettings } from "@/lib/settings";

// Notificações do gateway (opcional). O fluxo principal confirma o pagamento
// quando o cliente volta da página do gateway (/api/payments/return); o
// webhook cobre o caso de o cliente fechar o navegador antes de voltar.
// Cadastre no gateway: https://seu-site/api/payments/webhook?provider=<id>
export const POST = handle(async (req: Request) => {
  const id = new URL(req.url).searchParams.get("provider");
  const provider = (id && providerById(id)) || getPaymentProvider(await getSettings());
  if (!provider.parseWebhook) throw new HttpError(404, "Webhook não habilitado para essa forma de pagamento.");

  const event = await provider.parseWebhook(req);
  if (!event) throw new HttpError(401, "Assinatura inválida.");

  if (event.paid) {
    const order = await prisma.order.findFirst({
      where: { paymentRef: event.providerRef, paymentProvider: provider.id },
      select: { id: true },
    });
    if (order) await markOrderPaid(order.id, event.captureRef);
  }
  return ok();
});
