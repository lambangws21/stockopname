import { NextResponse } from "next/server";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import {
  ImplantStockLog,
  ImplantedFirestoreStock,
} from "@/types/implant-stock";

export async function GET() {
  try {
    const q = query(
      collection(db, "implantStockLogs"),
      orderBy("changedAt", "desc")
    );

    const snapshot = await getDocs(q);

    const data: ImplantStockLog[] = snapshot.docs.map((doc) => {
      const raw = doc.data();

      // 🔥 Handle changedAt
      let changedAt: string = "";
      if (raw.changedAt) {
        if (typeof raw.changedAt === "string") {
          changedAt = raw.changedAt;
        } else if (raw.changedAt.toDate) {
          changedAt = raw.changedAt.toDate().toISOString();
        }
      }

      // 🔥 Handle before/after (null-safe)
      const before =
        raw.before && typeof raw.before === "object"
          ? (raw.before as ImplantedFirestoreStock)
          : null;

      const after =
        raw.after && typeof raw.after === "object"
          ? (raw.after as ImplantedFirestoreStock)
          : null;

      return {
        id: doc.id,
        stockId: String(raw.stockId ?? ""),
        action: raw.action ?? "UPDATE",
        before,
        after,
        changedAt,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET implantStockLogs error:", error);
    return NextResponse.json({ data: [], error: String(error) }, { status: 500 });
  }
}
