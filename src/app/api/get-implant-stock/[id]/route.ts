import { NextResponse } from "next/server";
import admin from "@/lib/firebase/admin";
import { ImplantedFirestoreStock, StockAction } from "@/types/implant-stock";

/* =========================
   ✅ PAYLOAD EDIT
========================= */
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
function validateAndBuildStock(body: UpdateStockPayload) {
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

  // ✅ MINUS BOLEH
  const totalQty = body.qty + body.refill - body.used;

  // ✅ OBJECT MURNI — TANPA FieldValue
  return {
    noStok: String(body.stockNo),
    deskripsi: String(body.description),
    batch: String(body.batch ?? ""),
    qty: Number(body.qty),
    refill: Number(body.refill),
    terpakai: Number(body.used),
    totalQty: Number(totalQty),
    keterangan: String(body.note ?? ""),
    updatedAt: new Date(), // ✅ FIX UTAMA DI SINI
  };
}

/* =========================
   ✅ PUT — UPDATE STOK (PAKAI BATCH)
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

    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Dokumen stok tidak ditemukan" },
        { status: 404 }
      );
    }

    const before = docSnap.data() as ImplantedFirestoreStock;
    const validated = validateAndBuildStock(body);

    const batch = db.batch();

    // ✅ UPDATE STOK
    batch.update(docRef, validated);

    // ✅ LOG RIWAYAT UPDATE
    const logRef = db.collection("implantStockLogs").doc();
    batch.set(logRef, {
      stockId: id,
      action: "UPDATE" as StockAction,
      before,
      after: validated,
      changedAt: new Date(), // ✅ JUGA GANTI INI
    });

    await batch.commit();

    return NextResponse.json(
      {
        id,
        message: "Stok berhasil diperbarui",
        totalQty: validated.totalQty,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error saat update stok:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Internal Server Error",
      },
      { status: 400 }
    );
  }
}

/* =========================
   ✅ DELETE — SOFT DELETE (PAKAI BATCH)
========================= */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const db = admin.firestore();

    const docRef = db.collection("implantStocks").doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: "Dokumen stok tidak ditemukan" },
        { status: 404 }
      );
    }

    const before = docSnap.data() as ImplantedFirestoreStock;

    const batch = db.batch();

    // ✅ SOFT DELETE
    batch.update(docRef, {
      isDeleted: true,
      updatedAt: new Date(), // ✅ FIX UTAMA JUGA DI SINI
    });

    // ✅ LOG RIWAYAT DELETE
    const logRef = db.collection("implantStockLogs").doc();
    batch.set(logRef, {
      stockId: id,
      action: "DELETE" as StockAction,
      before,
      after: null,
      changedAt: new Date(), // ✅ FIX
    });

    await batch.commit();

    return NextResponse.json(
      { id, message: "Stok berhasil diarsipkan" },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ Error saat soft delete stok:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
