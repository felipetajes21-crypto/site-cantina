// "Pagamento de teste": imita um gateway de verdade (PayPal, Mercado Pago…)
// para testar o fluxo completo sem conta nem dinheiro. O cliente é levado a
// uma página do próprio site (/pagamento-teste) com os botões Aprovar/Cancelar.
//
// NÃO use para vender de verdade: fica desligado em produção, a não ser que
// ALLOW_TEST_PAYMENTS=true esteja definido.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { PaymentProvider } from "./types";

// Assina a aprovação para que ninguém "aprove" um pedido só editando a URL.
function sign(ref: string) {
  const secret = process.env.AUTH_SECRET ?? "dev";
  return createHmac("sha256", secret).update(`teste:${ref}`).digest("base64url");
}

export const testApprovalToken = sign;

export const testGateway: PaymentProvider = {
  id: "teste",
  label: "Pagamento de teste (simula o Mercado Pago, sem dinheiro de verdade)",
  autoConfirms: true,
  canRefund: true,
  unavailableReason: () =>
    process.env.NODE_ENV === "production" && process.env.ALLOW_TEST_PAYMENTS !== "true"
      ? "Desligado em produção (defina ALLOW_TEST_PAYMENTS=true só para testes)."
      : null,

  async createCharge({ orderId }) {
    const ref = `TESTE-${orderId}-${randomBytes(4).toString("hex")}`;
    return { kind: "redirect", providerRef: ref, redirectUrl: `/pagamento-teste/${orderId}` };
  },

  async confirmReturn(providerRef, params) {
    const token = params.get("token") ?? "";
    const expected = sign(providerRef);
    const ok =
      token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    return ok ? { paid: true, captureRef: `CAPTURA-${providerRef}` } : { paid: false };
  },

  async refund({ captureRef }) {
    return { refundRef: `DEVOLUCAO-${captureRef ?? "teste"}` };
  },
};
