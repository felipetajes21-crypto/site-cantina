const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Valores monetários são sempre guardados em centavos (inteiros). */
export const formatBRL = (cents: number) => brl.format(cents / 100);

/** Número do pedido com zeros à esquerda, ex.: #0042 */
export const orderNumber = (id: number) => `#${String(id).padStart(4, "0")}`;

export const pickupLabel = (slot: string | null) => slot ?? "O mais rápido possível";
