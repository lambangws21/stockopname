import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";
import { ImplantedFirestoreStock, StockAction } from "@/types/implant-stock";

interface UpdateStockPayload {
  stockNo: string;
  description: string;
  batch?: string;
  qty: number;
  refill: number;
  used: number;
  note?: string;
}

/* =========================
   ✅ VALIDASI + AUTO HITUNG (MINUS BOLEH)
========================= */
function buildStock(body: UpdateStockPayload) {
  if (!body.stockNo?.trim()) {
    throw new Error("No Stok wajib diisi");
  }

  if (!body.description?.trim()) {
    throw new Error("Deskripsi wajib diisi");
  }

  if (
    typeof body.qty !== "number" ||
    typeof body.refill !== "number" ||
    typeof body.used !== "number"
  ) {
    throw new Error("Qty, Refill, dan Terpakai harus berupa angka");
  }

  const totalQty = body.qty + body.refill - body.used;

  return {
    noStok: body.stockNo,
    deskripsi: body.description,
    batch: body.batch ?? "",
    qty: body.qty,
    refill: body.refill,
    terpakai: body.used,
    totalQty,
    keterangan: body.note ?? "",
    updatedAt: new Date(), // ✅ STABIL
  };
}

/* =========================
   ✅ PUT — UPDATE STOK (TANPA BATCH)
========================= */
export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as UpdateStockPayload;

    const db = admin.firestore();
    const docRef = db.collection("implantStocks").doc(id);

    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { error: "Dokumen stok tidak ditemukan" },
        { status: 404 }
      );
    }

    const before = snap.data() as ImplantedFirestoreStock;
    const updated = buildStock(body);

    // ✅ UPDATE STOK
    await docRef.update(updated);

    // ✅ SIMPAN LOG (TANPA BATCH)
    await db.collection("implantStockLogs").add({
      stockId: id,
      action: "UPDATE" as StockAction,
      before,
      after: updated,
      changedAt: new Date(),
    });

    return NextResponse.json(
      {
        id,
        message: "Stok berhasil diperbarui",
        totalQty: updated.totalQty,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ PUT ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}

/* =========================
   ✅ DELETE — SOFT DELETE (TANPA BATCH)
========================= */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = admin.firestore();

    const docRef = db.collection("implantStocks").doc(id);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { error: "Dokumen stok tidak ditemukan" },
        { status: 404 }
      );
    }

    const before = snap.data() as ImplantedFirestoreStock;

    await docRef.update({
      isDeleted: true,
      updatedAt: new Date(),
    });

    await db.collection("implantStockLogs").add({
      stockId: id,
      action: "DELETE" as StockAction,
      before,
      after: null,
      changedAt: new Date(),
    });

    return NextResponse.json(
      { id, message: "Stok berhasil diarsipkan" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ DELETE ERROR:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
