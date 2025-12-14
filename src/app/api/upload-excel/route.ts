import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface ExcelRow {
  no: number | null;
  noStok: number | null;
  deskripsi: string | null;
  batch: string | null;
  qty: number | null;
  totalQty: number | null;
  terpakai: number | null;
  refill: number | null;
  keterangan: string | null;
}

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

    /* ==========================
       LOAD EXCEL
    ========================== */
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

    let counter = 0;

    for (let i = 2; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);

      const data: ExcelRow = {
        no: Number(row.getCell(1).value) || null,
        noStok: Number(row.getCell(2).value) || null,
        deskripsi: row.getCell(3).text || null,
        batch: row.getCell(4).text || null,
        qty: Number(row.getCell(5).value) || null,
        totalQty: Number(row.getCell(6).value) || null,
        terpakai: Number(row.getCell(7).value) || null,
        refill: Number(row.getCell(8).value) || null,
        keterangan: row.getCell(9).text || null,
      };

      // skip row kosong
      if (!data.deskripsi && !data.noStok) continue;

      await addDoc(collection(db, "implantStocks"), {
        ...data,
        createdAt: serverTimestamp(),
        source: "excel-upload",
      });

      counter++;
    }

    return NextResponse.json({
      status: "success",
      total: counter,
    });
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return NextResponse.json(
      { status: "error", message: "Gagal upload ke Firestore" },
      { status: 500 }
    );
  }
}
