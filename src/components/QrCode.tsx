"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/** Desenha um QR Code a partir de um texto (Pix copia e cola ou código do pedido). */
export function QrCode({ value, size = 220, label }: { value: string; size?: number; label: string }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { width: size * 2, margin: 1, errorCorrectionLevel: "M" }).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div
      className="grid place-items-center rounded-2xl border border-stone-200 bg-white p-3"
      style={{ width: size + 26, height: size + 26 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src && <img src={src} alt={label} width={size} height={size} />}
    </div>
  );
}
