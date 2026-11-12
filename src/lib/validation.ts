// Esquemas de validação (zod) usados nas rotas de API.
import { z } from "zod";

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Normaliza o identificador de login: e-mail (minúsculas) ou telefone (só dígitos,
 * com DDD). Retorna null se não for nenhum dos dois.
 */
export function parseIdentifier(raw: string): { email: string } | { phone: string } | null {
  const value = raw.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    return z.string().email().max(120).safeParse(email).success ? { email } : null;
  }
  let digits = value.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  return digits.length === 10 || digits.length === 11 ? { phone: digits } : null;
}

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(60),
  identifier: z.string().min(5, "Informe e-mail ou telefone.").max(120),
  password: z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(72),
});

export const loginSchema = z.object({
  identifier: z.string().min(1).max(120),
  password: z.string().min(1).max(72),
  admin: z.boolean().optional(),
});

export const orderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1).max(40),
        quantity: z.number().int().min(1).max(20),
        note: z.string().trim().max(140).optional(),
      }),
    )
    .min(1, "Seu carrinho está vazio.")
    .max(30),
  note: z.string().trim().max(200).optional(),
  // "ASAP" (o mais rápido possível) ou um horário "HH:MM"
  pickup: z.union([z.literal("ASAP"), z.string().regex(HHMM)]),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(80),
  description: z.string().trim().max(300).default(""),
  priceCents: z.number().int().min(0).max(1_000_000),
  categoryId: z.string().min(1),
  active: z.boolean().default(true),
  trackStock: z.boolean().default(false),
  stock: z.number().int().min(0).max(100_000).default(0),
  // Somente http(s): impede URLs "javascript:" e similares.
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\//i.test(v), "O link da foto deve começar com http(s)://")
    .optional(),
  // Foto enviada pelo painel, como data URL (já reduzida no navegador).
  imageUpload: z.string().max(700_000, "Imagem muito grande.").nullable().optional(),
  removeImage: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome.").max(40),
  sortOrder: z.number().int().min(0).max(999).default(0),
});

export const settingsSchema = z
  .object({
    cantinaName: z.string().trim().min(1).max(40),
    acceptingOrders: z.boolean(),
    openTime: z.string().regex(HHMM, "Horário inválido."),
    closeTime: z.string().regex(HHMM, "Horário inválido."),
    openDays: z.array(z.number().int().min(0).max(6)).max(7),
    slotMinutes: z.number().int().min(5).max(60),
    maxPerSlot: z.number().int().min(1).max(500),
    prepMinutes: z.number().int().min(0).max(120),
    pixKey: z.string().trim().max(77),
    pixMerchantName: z.string().trim().min(1).max(25),
    pixCity: z.string().trim().min(1).max(15),
  })
  .refine((s) => s.openTime < s.closeTime, "O fechamento deve ser depois da abertura.");
