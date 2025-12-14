import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  ImplantStockItem,
  ImplantedFirestoreStock,
} from "@/types/implant-stock";

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "implantStocks"));

    const data: ImplantStockItem[] = [];

    snapshot.docs.forEach((doc) => {
      const raw = doc.data() as ImplantedFirestoreStock;

      // ✅ Skip data yang di soft delete
      if (raw.isDeleted === true) return;

      data.push({
        id: doc.id,

        // ✅ WAJIB ADA
        no: Number(raw.no ?? 0),

        stockNo: String(raw.noStok ?? ""),
        description: String(raw.deskripsi ?? ""),
        batch: String(raw.batch ?? ""),
        qty: Number(raw.qty ?? 0),
        refill: Number(raw.refill ?? 0),
        used: Number(raw.terpakai ?? 0),
        totalQty: Number(raw.totalQty ?? 0),
        note: String(raw.keterangan ?? ""),
        createdAt: raw.createdAt ? String(raw.createdAt) : undefined,
        updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
      });
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET implantStocks error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
