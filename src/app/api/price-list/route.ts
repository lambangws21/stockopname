import { NextRequest, NextResponse } from "next/server";

const GAS_URL =
  "https://script.google.com/macros/s/AKfycbyi_4xYyzSpNxAexsf0Wzf3raDg_l6GI161NQIjk_HJaoAyMTpmd7ezZLp3NhZAEiuR/exec";

export interface RawPriceRow {
  "No.": number;
  "System": string;
  "PRODUCT": string;
  "TYPE": string;
  "Qty": number;
  "Harga Nett": number;
  "Harga Nett + PPN": number;
  "Rumah Sakit": string;
}

export interface PriceItem {
  no: number;
  system: string;
  product: string;
  type: string;
  qty: number;
  hargaNett: number;
  hargaNettPPN: number;
  rumahSakit: string;
}

// ========================
// Helper fetch
// ========================
async function callGAS<T>(method: string, body?: unknown): Promise<T> {
  const res = await fetch(GAS_URL, {
    method,
    headers: { "Content-Type": "application/json" },
    body: method !== "GET" ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`GAS Error ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ========================
// GET handler
// ========================
export async function GET() {
  try {
    const response = await callGAS<{ status: string; data: RawPriceRow[] }>(
      "GET"
    );

    const mapped: PriceItem[] = response.data.map((row) => ({
      no: row["No."],
      system: row["System"],
      product: row["PRODUCT"],
      type: row["TYPE"],
      qty: row["Qty"],
      hargaNett: row["Harga Nett"],
      hargaNettPPN: row["Harga Nett + PPN"],
      rumahSakit: row["Rumah Sakit"],
    }));

    return NextResponse.json({ status: "success", data: mapped });
  } catch (error) {
    return NextResponse.json(
      { status: "error", message: (error as Error).message },
      { status: 500 }
    );
  }
}



// ====================
// POST → Tambah data baru
// ====================
export async function POST(req: NextRequest) {
try {
const body = (await req.json()) as PriceItem;


const result = await callGAS("POST", body);

return NextResponse.json({ status: "success", result });


} catch (error) {
return NextResponse.json(
{ status: "error", message: (error as Error).message },
{ status: 500 }
);
}
}

// ====================
// PUT → Update data berdasarkan NO
// ====================
export async function PUT(req: NextRequest) {
try {
const body = (await req.json()) as PriceItem;


if (!body.no) {
  return NextResponse.json(
    { status: "error", message: "Missing 'no' to update" },
    { status: 400 }
  );
}

const result = await callGAS("PUT", body);

return NextResponse.json({ status: "success", result });


} catch (error) {
return NextResponse.json(
{ status: "error", message: (error as Error).message },
{ status: 500 }
);
}
}

// ====================
// DELETE → Hapus data berdasarkan NO
// ====================
export async function DELETE(req: NextRequest) {
try {
const { no } = await req.json();


if (!no) {
  return NextResponse.json(
    { status: "error", message: "Missing 'no' to delete" },
    { status: 400 }
  );
}

const result = await callGAS("DELETE", { no });

return NextResponse.json({ status: "success", result });


} catch (error) {
return NextResponse.json(
{ status: "error", message: (error as Error).message },
{ status: 500 }
);
}
}
