import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const ALLOWED_COLLECTIONS = [
  "implantStocks",
  "implant_products",
  "implant_batches",
  "excel_uploads",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || body.secret !== process.env.RESET_SECRET) {
      return NextResponse.json(
        { status: "error", message: "Unauthorized" },
        { status: 401 }
      );
    }

    const result: Record<string, number> = {};

    for (const colName of ALLOWED_COLLECTIONS) {
      const snapshot = await getDocs(collection(db, colName));
      let counter = 0;

      for (const document of snapshot.docs) {
        await deleteDoc(doc(db, colName, document.id));
        counter++;
      }

      result[colName] = counter;
    }

    return NextResponse.json({
      status: "success",
      deleted: result,
    });
  } catch (error) {
    console.error("🔥 RESET ERROR REAL:", error);

    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error ? error.message : "Unknown reset error",
      },
      { status: 500 }
    );
  }
}
