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
  const source = String(raw ?? "").trim();
  if (!source) return result;

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
