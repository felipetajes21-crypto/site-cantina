import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

// Serve a foto enviada pelo painel. A URL inclui ?v=<versão>, então o
// navegador pode guardar em cache por bastante tempo.
export async function GET(_req: Request, { params }: Ctx) {
  const product = await prisma.product.findUnique({
    where: { id: (await params).id },
    select: { imageData: true, imageMime: true },
  });
  if (!product?.imageData || !product.imageMime) return new Response(null, { status: 404 });
  return new Response(Buffer.from(product.imageData), {
    headers: {
      "Content-Type": product.imageMime,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
