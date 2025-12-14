import { ImplantedFirestoreStock } from "@/types/implant-stock";

export interface UpdateStockPayload {
no  : number;
  stockNo: string;
  description: string;
  batch?: string;
  qty: number;
  refill: number;
  used: number;
  note?: string;
}

/* =========================
   ✅ VALIDASI + AUTO HITUNG
========================= */
export function validateStockPayload(
  body: UpdateStockPayload
): ImplantedFirestoreStock {
  if (!body.stockNo.trim()) {
    throw new Error("No Stok wajib diisi");
  }

  if (!body.description.trim()) {
    throw new Error("Deskripsi wajib diisi");
  }

  if (body.qty < 0 || body.refill < 0 || body.used < 0) {
    throw new Error("Qty, Refill, dan Terpakai tidak boleh minus");
  }

  const totalQty = body.qty + body.refill - body.used;

  if (totalQty < 0) {
    throw new Error("Total Qty tidak boleh minus");
  }

  return {
    no: body.no,
    noStok: body.stockNo,
    deskripsi: body.description,
    batch: body.batch ?? "",
    qty: body.qty,
    refill: body.refill,
    terpakai: body.used,
    totalQty,
    keterangan: body.note ?? "",
  };
}
