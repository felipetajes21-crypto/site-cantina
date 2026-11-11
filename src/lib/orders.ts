// Regras de negócio dos pedidos: criação, pagamento, avanço de status,
// cancelamento e expiração. Usadas pelas rotas do cliente e do painel.
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { HttpError } from "./api";
import { getSettings } from "./settings";
import { getAvailability } from "./slots";
import { getPaymentProvider } from "./payments";
import { NEXT_STATUS, type OrderStatus } from "./status";
import type { z } from "zod";
import type { orderSchema } from "./validation";
import { formatTime } from "./time";

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
    pixPayload: o.status === "AWAITING_PAYMENT" ? o.pixPayload : null,
    paymentClaimed: !!o.paymentClaimedAt,
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

export async function createOrder(userId: string, input: z.infer<typeof orderSchema>) {
  const settings = await getSettings();
  const availability = await getAvailability(settings);
  if (!availability.open) throw new HttpError(409, availability.reason ?? "Cantina fechada.");

  // Valida o horário de retirada escolhido.
  let pickupSlot: string | null = null;
  if (input.pickup === "ASAP") {
    if (!availability.asap) {
      throw new HttpError(409, `A cantina abre às ${settings.openTime}. Escolha um horário de retirada.`);
    }
  } else {
    const slot = availability.slots.find((s) => s.time === input.pickup);
    if (!slot) throw new HttpError(409, "Esse horário não está mais disponível. Escolha outro.");
    if (slot.full) throw new HttpError(409, "Esse horário lotou. Escolha outro.");
    pickupSlot = slot.time;
  }

  // Junta itens repetidos do mesmo produto apenas para conferir o estoque.
  const qtyByProduct = new Map<string, number>();
  for (const item of input.items) {
    qtyByProduct.set(item.productId, (qtyByProduct.get(item.productId) ?? 0) + item.quantity);
  }

  const provider = getPaymentProvider();

  return prisma.$transaction(async (tx) => {
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
        pickupDate: availability.date,
        pickupSlot,
        paymentProvider: provider.id,
        expiresAt: new Date(Date.now() + PAYMENT_TIMEOUT_MINUTES * 60_000),
        items: { create: items },
      },
    });

    const charge = await provider.createCharge({ orderId: order.id, amountCents: totalCents, settings });
    await tx.order.update({
      where: { id: order.id },
      data: { paymentRef: charge.providerRef, pixPayload: charge.pixCopyPaste },
    });
    return order.id;
  });
}

/** Cancela o pedido e devolve o estoque. Não faz nada se já estiver finalizado. */
export async function cancelOrder(orderId: number) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: { notIn: ["PICKED_UP", "CANCELLED"] } },
      data: { status: "CANCELLED", cancelledAt: new Date() },
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
  for (const { id } of stale) await cancelOrder(id);
}

/** Pagamento confirmado (pela cantina ou pelo webhook do gateway). */
export async function markOrderPaid(orderId: number) {
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: "AWAITING_PAYMENT" },
    data: { status: "RECEIVED", paidAt: new Date() },
  });
  return updated.count > 0;
}

/** Avança o pedido para o próximo status do fluxo (Recebido → Em preparo → Pronto → Retirado). */
export async function advanceOrder(orderId: number, from: OrderStatus) {
  const next = NEXT_STATUS[from];
  if (!next) throw new HttpError(400, "Esse pedido não pode avançar.");
  // O "where status = from" garante que dois cliques simultâneos não pulem etapas.
  const updated = await prisma.order.updateMany({
    where: { id: orderId, status: from },
    data: {
      status: next,
      ...(next === "READY" ? { readyAt: new Date() } : {}),
      ...(next === "PICKED_UP" ? { pickedUpAt: new Date() } : {}),
    },
  });
  if (updated.count === 0) throw new HttpError(409, "O pedido já foi atualizado por outra pessoa.");
  return next;
}
