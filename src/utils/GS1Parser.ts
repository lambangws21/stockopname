// utils/GS1Parser.ts

export interface GS1Data {
  gtin?: string;
  lot?: string;
  exp?: string;
}

const GS = "\u001D";

function readFixedDigits(input: string, start: number, length: number) {
  const raw = input.slice(start, start + length);
  const digits = raw.replace(/\D/g, "");
  return digits.length === length ? digits : "";
}

export function parseGS1(raw: string): GS1Data {
  const result: GS1Data = {};
  const source = String(raw ?? "")
    .trim()
    // Sebagian decoder menyertakan symbology identifier, misalnya ]Q3 untuk GS1 QR.
    .replace(/^\](?:Q\d|d\d|C\d)/i, "");
  if (!source) return result;

  // Label dari kamera/OCR kadang menghasilkan bentuk human-readable seperti
  // (01).... /(17)05.2030 /(10)25040829. Ambil field penting lebih dulu agar
  // pemisah titik atau slash tidak menggagalkan identifikasi LOT.
  const readableGtin = source.match(/\(01\)\s*([0-9\s-]{13,20})/i)?.[1]?.replace(/\D/g, "");
  if (readableGtin && readableGtin.length >= 13) {
    result.gtin = readableGtin.slice(0, 14);
  }

  const readableLot = source.match(/\(10\)\s*([A-Z0-9._-]+)/i)?.[1]?.trim();
  if (readableLot) result.lot = readableLot;

  const readableExpiryRaw = source.match(/\(17\)\s*([0-9./-]{6,10})/i)?.[1] ?? "";
  const readableExpiry = readableExpiryRaw.replace(/\D/g, "");
  if (readableExpiry.length === 6) {
    // Tampilan MM.YYYY di beberapa label diubah menjadi YYMM00.
    result.exp = /[./-]/.test(readableExpiryRaw)
      ? `${readableExpiry.slice(2)}${readableExpiry.slice(0, 2)}00`
      : readableExpiry;
  }

  let i = 0;
  while (i < source.length) {
    if (source[i] === GS) {
      i += 1;
      continue;
    }

    let ai = "";
    if (source[i] === "(") {
      const close = source.indexOf(")", i + 1);
      if (close === -1) {
        i += 1;
        continue;
      }
      ai = source.slice(i + 1, close);
      i = close + 1;
    } else {
      ai = source.slice(i, i + 2);
      i += 2;
    }

    if (ai === "01") {
      const gtin = readFixedDigits(source, i, 14);
      if (gtin) result.gtin = gtin;
      i += 14;
      continue;
    }

    if (ai === "17") {
      const exp = readFixedDigits(source, i, 6);
      if (exp) result.exp = exp;
      i += 6;
      continue;
    }

    if (ai === "10") {
      let end = i;
      while (end < source.length) {
        if (source[end] === GS || source[end] === "(") break;
        end += 1;
      }
      const lot = source.slice(i, end).trim();
      if (lot) result.lot = lot;
      i = source[end] === GS ? end + 1 : end;
      continue;
    }

    i += 1;
  }

  return result;
}
