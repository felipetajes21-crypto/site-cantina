// Geração do "Pix copia e cola" (BR Code, padrão EMV do Banco Central) para
// uma chave Pix estática com valor definido. O mesmo texto vira o QR Code.

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** Remove acentos e caracteres fora do padrão aceito pelos bancos. */
const sanitize = (text: string, max: number) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .trim()
    .slice(0, max)
    .toUpperCase();

/** CRC16-CCITT (polinômio 0x1021, valor inicial 0xFFFF). */
function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function buildPixPayload(opts: {
  key: string;
  merchantName: string;
  city: string;
  amountCents: number;
  txid: string; // até 25 caracteres alfanuméricos
}) {
  const account = field("00", "br.gov.bcb.pix") + field("01", opts.key.trim());
  const txid = opts.txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const payload =
    field("00", "01") +
    field("26", account) +
    field("52", "0000") +
    field("53", "986") + // BRL
    field("54", (opts.amountCents / 100).toFixed(2)) +
    field("58", "BR") +
    field("59", sanitize(opts.merchantName, 25) || "CANTINA") +
    field("60", sanitize(opts.city, 15) || "BRASIL") +
    field("62", field("05", txid)) +
    "6304";
  return payload + crc16(payload);
}

// Chave de demonstração criada pelo seed (não existe em nenhum banco).
export const DEMO_PIX_KEY = "00000000-0000-4000-8000-000000000000";
