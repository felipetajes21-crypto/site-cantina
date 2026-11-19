// Regras de negócio dos pedidos: criação, pagamento, avanço de status,
// cancelamento e expiração. Usadas pelas rotas do cliente e do painel.
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./api";
import { getSettings } from "./settings";
import { checkPickupCapacity, getAvailability, isWithinDay } from "./slots";
import { getPaymentProvider, providerById } from "./payments";
import { NEXT_STATUS, type OrderStatus } from "./status";
import type { z } from "zod";
import type { orderSchema } from "./validation";
import { formatTime, localInfo } from "./time";
import { pickupText } from "./schedule";

/** Prazo para pagar antes de o pedido ser cancelado automaticamente. */
export const PAYMENT_TIMEOUT_MINUTES = 20;

export const orderInclude = {
  items: true,
  user: { select: { name: true } },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

/** Formato enviado ao navegador (sem campos internos). */
export function serializeOrder(o: OrderWithItems) {
  return {
    id: o.id,
    code: o.code,
    status: o.status as OrderStatus,
    totalCents: o.totalCents,
    note: o.note,
    pickupDate: o.pickupDate,
    pickupSlot: o.pickupSlot,
    // Texto pronto, ex.: "Hoje às 12:15" ou "qua, 19/11 às 08:00".
    pickupLabel: pickupText(o.pickupDate, o.pickupSlot, localInfo().date),
    isToday: o.pickupDate === localInfo().date,
    pixPayload: o.status === "AWAITING_PAYMENT" ? o.pixPayload : null,
    // Página de pagamento do gateway (PayPal etc.), enquanto não pago.
    checkoutUrl: o.status === "AWAITING_PAYMENT" ? o.checkoutUrl : null,
    paymentMethod: o.paymentProvider,
    cancelReason: o.cancelReason,
    refundStatus: o.refundStatus,
    paymentClaimed: !!o.paymentClaimedAt,
    paymentConfirmed: !!o.paidAt, // a cantina conferiu o Pix (ou o gateway confirmou)
    // Prazo de pagamento já formatado no fuso da cantina.
    payUntil: o.expiresAt ? formatTime(o.expiresAt) : null,
    createdAt: o.createdAt.toISOString(),
    customerName: o.user.name,
    items: o.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      unitCents: i.unitCents,
      quantity: i.quantity,
      note: i.note,
    })),
  };
}

export type OrderDTO = ReturnType<typeof serializeOrder>;

/**
 * Cria o pedido e a cobrança. `baseUrl` é o endereço do site (para o gateway
 * saber para onde mandar o cliente de volta). Retorna o número do pedido e,
 * para gateways com página própria, o endereço de pagamento.
 */
export async function createOrder(userId: string, input: z.infer<typeof orderSchema>, baseUrl: string) {
  const settings = await getSettings();
  const availability = await getAvailability(settings);
  if (!availability.open) throw new HttpError(409, availability.reason ?? "Cantina fechada.");

  // Valida o dia e o horário de retirada escolhidos.
  const day = availability.days.find((d) => d.date === input.pickupDate);
  if (!day) throw new HttpError(409, "Esse dia não está disponível para retirada. Escolha outro.");
  let pickupSlot: string | null = null;
  if (input.pickup === "ASAP") {
    if (!day.asap) throw new HttpError(409, "Escolha um horário de retirada.");
  } else {
    // Horário livre, escolhido pelo cliente, dentro do funcionamento do dia.
    if (!isWithinDay(day, input.pickup)) {
      throw new HttpError(409, `Escolha um horário entre ${day.earliest} e ${day.latest}.`);
    }
    await checkPickupCapacity(settings, day.date, input.pickup);
    pickupSlot = input.pickup;
  }

  // Junta itens repetidos do mesmo produto apenas para conferir o estoque.
  const qtyByProduct = new Map<string, number>();
  for (const item of input.items) {
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const provider = getPaymentProvider(settings);

  const orderId = await prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({ where: { id: { in: [...qtyByProduct.keys()] } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const [productId, qty] of qtyByProduct) {
      const product = byId.get(productId);
      if (!product || !product.active) {
        throw new HttpError(409, `"${product?.name ?? "Um item"}" não está mais disponível. Remova-o do carrinho.`);
      }
      if (product.trackStock) {
        // Baixa condicional: só desconta se ainda houver estoque suficiente,
        // evitando vender a mesma unidade para dois pedidos simultâneos.
        const updated = await tx.product.updateMany({
          where: { id: productId, stock: { gte: qty } },
          data: { stock: { decrement: qty } },
        });
        if (updated.count === 0) {
          throw new HttpError(409, `"${product.name}" não tem estoque suficiente (restam ${product.stock}).`);
        }
      }
    }

    // O preço vem sempre do banco, nunca do navegador.
    const items = input.items.map((item) => {
      const product = byId.get(item.productId)!;
      return {
        productId: product.id,
        name: product.name,
        unitCents: product.priceCents,
        quantity: item.quantity,
        note: item.note || null,
      };
    });
    const totalCents = items.reduce((sum, i) => sum + i.unitCents * i.quantity, 0);

    const order = await tx.order.create({
      data: {
        code: randomBytes(9).toString("base64url"),
        userId,
        totalCents,
        note: input.note || null,
        pickupDate: day.date,
        pickupSlot,
        paymentProvider: provider.id,
        expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60_000),
        items: { create: items },
      },
    });

    return order.id;
  });

  // A cobrança é criada fora da transação (pode chamar o gateway pela internet).
  // Se falhar, o pedido é cancelado e o estoque volta.
  try {
    const charge = await provider.createCharge({
      orderId,
      amountCents: (await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { totalCents: true } })).totalCents,
      description: `Pedido #${String(orderId).padStart(4, "0")} · ${settings.cantinaName}`,
      settings,
      returnUrl: `${baseUrl}/api/payments/return?order=${orderId}`,
      cancelUrl: `${baseUrl}/pedidos/${orderId}`,
    });
    await prisma.order.update({
      where: { id: orderId },
      data:
        charge.kind === "pix"
          ? { paymentRef: charge.providerRef, pixPayload: charge.pixCopyPaste }
          : { paymentRef: charge.providerRef, checkoutUrl: charge.redirectUrl },
    });
    return { id: orderId, redirectUrl: charge.kind === "redirect" ? charge.redirectUrl : null };
  } catch (err) {
    await cancelOrder(orderId, "PAYMENT_ERROR");
    throw err;
  }
}

/** Cancela o pedido e devolve o estoque. Não faz nada se já estiver finalizado. */
export type CancelReason = "EXPIRED" | "CUSTOMER" | "REFUSED" | "PAYMENT_ERROR";

export async function cancelOrder(orderId: number, reason: CancelReason, refund?: { status: string; ref?: string }) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: { notIn: ["PICKED_UP", "CANCELLED"] } },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: reason,
        ...(refund ? { refundStatus: refund.status, refundRef: refund.ref ?? null, refundedAt: refund.status === "REFUNDED" ? new Date() : null } : {}),
      },
    });
    if (updated.count === 0) return false;

    const items = await tx.orderItem.findMany({ where: { orderId, productId: { not: null } } });
    for (const item of items) {
      await tx.product.updateMany({
        where: { id: item.productId!, trackStock: true },
        data: { stock: { increment: item.quantity } },
      });
    }
    return true;
  });
}

/**
 * Cancela pedidos que passaram do prazo sem pagamento. É chamada nas leituras
 * (não depende de cron). Pedidos em que o cliente informou "já paguei" ficam
 * aguardando a conferência da cantina.
 */
export async function expireStaleOrders() {
  const stale = await prisma.order.findMany({
    where: { status: "AWAITING_PAYMENT", paymentClaimedAt: null, expiresAt: { lt: new Date() } },
    select: { id: true },
  });
  for (const { id } of stale) await cancelOrder(id, "EXPIRED");
}

/**
 * Cliente tocou em "Já paguei": o pedido entra na fila da cantina como
 * Recebido, com o selo "Conferir Pix" até a cantina confirmar.
 */
export async function claimPayment(orderId: number) {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: "AWAITING_PAYMENT" },
    data: { status: "RECEIVED", paymentClaimedAt: new Date() },
  });
  return updated.count > 0;
}

/**
 * Pagamento confirmado: pela cantina (conferiu o Pix no app do banco) ou pelo
 * webhook do gateway. Funciona com o pedido aguardando ou já na fila.
 */
export async function markOrderPaid(orderId: number, captureRef?: string) {
  const now = new Date();
  const [fromWaiting, inQueue] = await prisma.$transaction([
    prisma.order.updateMany({
      where: { id: orderId, status: "AWAITING_PAYMENT" },
      data: { status: "RECEIVED", paidAt: now, ...(captureRef ? { captureRef } : {}) },
    }),
    prisma.order.updateMany({
      where: { id: orderId, status: { in: ["RECEIVED", "PREPARING", "READY"] }, paidAt: null },
      data: { paidAt: now },
    }),
  ]);
  return fromWaiting.count + inQueue.count > 0;
}

/** Avança o pedido para o próximo status do fluxo (Recebido → Pronto → Retirado). */
export async function advanceOrder(orderId: number, from: OrderStatus) {
  const next = NEXT_STATUS[from];
  if (!next) throw new HttpError(400, "Esse pedido não pode avançar.");
  // O "where status = from" garante que dois cliques simultâneos não pulem etapas.
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: from },
    data: {
      status: next,
      ...(next === "READY" ? { readyAt: new Date() } : {}),
      // Entregar no balcão confirma o pagamento, se ainda não estava confirmado.
      ...(next === "PICKED_UP" ? { pickedUpAt: new Date() } : {}),
    },
  });
  if (updated.count === 0) throw new HttpError(409, "O pedido já foi atualizado por outra pessoa.");
  if (next === "PICKED_UP") {
    await prisma.order.updateMany({ where: { id: orderId, paidAt: null }, data: { paidAt: new Date() } });
  }
  return next;
}

/**
 * A cantina recusa o pedido. Se ele foi pago por um gateway que permite
 * devolução (PayPal, pagamento de teste), o dinheiro é devolvido ao cliente
 * automaticamente ANTES de cancelar; se a devolução falhar, o pedido não é
 * cancelado e a cantina vê o motivo. Pago por Pix manual, o pedido é
 * cancelado e marcado para a cantina devolver pelo banco.
 */
export async function refuseOrder(orderId: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "PICKED_UP" || order.status === "CANCELLED") {
    throw new HttpError(409, "Esse pedido já foi finalizado.");
  }
  const provider = providerById(order.paymentProvider);
  const paid = !!order.paidAt || !!order.paymentClaimedAt;

  let refund: { status: string; ref?: string } | undefined;
  if (order.paidAt && provider?.canRefund && provider.refund && order.paymentRef) {
    const { refundRef } = await provider.refund({
      providerRef: order.paymentRef,
      captureRef: order.captureRef,
      amountCents: order.totalCents,
      orderId,
    });
    refund = { status: "REFUNDED", ref: refundRef };
  } else if (paid) {
    refund = { status: "MANUAL" };
  }
  await cancelOrder(orderId, "REFUSED", refund);
  return refund?.status ?? null;
}
