import { notFound } from "next/navigation";
import { HttpError } from "@/lib/api";
import { loadOwnOrder } from "@/lib/order-access";
import { expireStaleOrders, serializeOrder } from "@/lib/orders";
import { orderNumber } from "@/lib/format";
import { OrderTracker } from "@/components/OrderTracker";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const id = Number((await params).id);
  return { title: Number.isInteger(id) ? `Pedido ${orderNumber(id)}` : "Pedido" };
}

export default async function OrderPage({ params }: Props) {
  await expireStaleOrders();
  try {
    const order = await loadOwnOrder((await params).id);
    return <OrderTracker initial={serializeOrder(order)} />;
  } catch (err) {
    if (err instanceof HttpError) notFound();
    throw err;
  }
}
