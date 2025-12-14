import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ImplantStockItem } from "@/types/implant-stock";

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "implantStocks"));

    const data: ImplantStockItem[] = snapshot.docs.map((doc) => {
      const raw = doc.data();

      return {
        id: doc.id,

        // ✅ SESUAI DENGAN FIELD FIRESTORE
        no: Number(raw.no ?? 0),
        stockNo: String(raw.noStok ?? ""),          // ✅ FIX
        description: String(raw.deskripsi ?? ""),  // ✅ FIX
        batch: String(raw.batch ?? ""),
        qty: Number(raw.qty ?? 0),
        totalQty: Number(raw.totalQty ?? 0),
        used: Number(raw.terpakai ?? 0),           // ✅ FIX
        refill: Number(raw.refill ?? 0),
        note: String(raw.keterangan ?? ""),        // ✅ FIX
        createdAt: String(raw.createdAt ?? ""),
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET implantStocks error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
