import { NextResponse } from "next/server";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { ImplantStockItem } from "@/types/implant-stock";
import { inferImplantClassification } from "@/lib/implantCatalog";

export async function GET() {
  try {
    const snapshot = await getDocs(collection(db, "implantStocks"));

    const data: ImplantStockItem[] = snapshot.docs.flatMap((doc) => {
      const raw = doc.data();
      if (raw.isDeleted === true) return [];
      const inferred = inferImplantClassification(
        raw.procedure,
        raw.brand,
        raw.deskripsi,
        raw.noStok,
        raw.keterangan
      );

      return [{
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
        procedure: raw.procedure ?? inferred.procedure,
        brand: raw.brand ?? inferred.brand,
        component: String(raw.component ?? ""),
        createdAt: String(raw.createdAt ?? ""),
      }];
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET implantStocks error:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
