import { getSession } from "@/lib/auth";
import { CartView } from "@/components/CartView";

export const metadata = { title: "Carrinho" };

export default async function CartPage() {
  return <CartView loggedIn={!!(await getSession())} />;
}
