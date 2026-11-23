import { getSession } from "@/lib/auth";
import { CartView } from "@/components/CartView";

export const metadata = { title: "Carrinho" };

export default async function CartPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <CartView loggedIn={!!(await getSession())} />
    </div>
  );
}
