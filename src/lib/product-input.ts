import type { z } from "zod";
import { HttpError } from "./api";
import type { productSchema } from "./validation";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

/** Converte os dados validados do formulário em campos do Prisma (incluindo a foto). */
export function productData(input: z.infer<typeof productSchema>) {
  const { imageUpload, removeImage, imageUrl, ...rest } = input;
  const data: Record<string, unknown> = { ...rest, imageUrl: imageUrl || null };

  if (imageUpload) {
    const match = /^data:([a-z/]+);base64,([A-Za-z0-9+/=]+)$/.exec(imageUpload);
    if (!match || !ALLOWED.includes(match[1])) {
      throw new HttpError(400, "Formato de imagem não suportado (use JPG, PNG ou WebP).");
    }
    data.imageData = Buffer.from(match[2], "base64");
    data.imageMime = match[1];
  } else if (removeImage) {
    data.imageData = null;
    data.imageMime = null;
  }
  return data;
}
