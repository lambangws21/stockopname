import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import admin from "@/lib/firebase/admin"; // firebase-admin instance

/* ==============================
   TYPE
================================ */
interface ImplantStockRow {
  No?: number;
  NoStok?: string;
  Deskripsi?: string;
  Batch?: string;
  Qty?: number;
  TotalQty?: number;
  TERPAKAI?: number;
  REFILL?: number;
  KET?: string;
}

/* ==============================
   POST
================================ */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { status: "error", message: "File tidak valid" },
        { status: 400 }
      );
    }

    /* ==============================
       LOAD EXCEL (ExcelJS)
    ================================ */
    const arrayBuffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { status: "error", message: "Sheet tidak ditemukan" },
        { status: 400 }
      );
    }

    /* ==============================
       FIRESTORE (ADMIN SDK)
    ================================ */
    const db = admin.firestore();
    const batch = db.batch();
    const colRef = db.collection("implantStocks");

    let inserted = 0;

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header

      const v = row.values as Array<string | number | null>;

      const data: ImplantStockRow = {
        No: Number(v[1]) || undefined,
        NoStok: String(v[2] ?? ""),
        Deskripsi: String(v[3] ?? ""),
        Batch: String(v[4] ?? ""),
        Qty: Number(v[5]) || 0,
        TotalQty: Number(v[6]) || 0,
        TERPAKAI: Number(v[7]) || 0,
        REFILL: Number(v[8]) || 0,
        KET: String(v[9] ?? ""),
      };

      // skip empty row
      if (!data.NoStok && !data.Deskripsi) return;

      const docRef = colRef.doc();

      batch.set(docRef, {
        ...data,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "excel-upload",
      });

      inserted++;
    });

    await batch.commit();

    return NextResponse.json({
      status: "success",
      inserted,
      sheet: worksheet.name,
    });
  } catch (err) {
    console.error("UPLOAD ERROR:", err);
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Server error",
      },
      { status: 500 }
    );
  }
}
