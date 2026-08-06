import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

type ParsedStockItem = {
  NoStok: string;
  Deskripsi: string;
  Batch: string;
  Qty: number;
  Implant: string;
};

type ParsedInstrument = {
  Code: string;
  Name: string;
  Qty: number;
  Uom: string;
  Condition: string;
};

function text(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("text" in value) return String(value.text || "").trim();
    if ("result" in value) return String(value.result || "").trim();
    if ("richText" in value)
      return value.richText.map((part) => part.text).join("").trim();
  }
  return String(value).trim();
}

function category(description: string) {
  const value = description.toUpperCase();
  if (/BONE\s*CEMENT|REFOBACIN/.test(value)) return "BONE CEMENT";
  if (/PULSAVAC|SAW\s*BLADE|BATTERY|CHARGER|BOR\b/.test(value)) return "AKSESORIS";
  if (/OXFORD|\bOXF\b|UKA|UKR|PKS/.test(value)) return "UKA";
  if (/TIBIAL\s*PLATE|TIBIA/.test(value)) return "TIBIAL COMPONENT";
  if (/ART\s*SURF|BEARING|BRG|INSERT|UHMWPE|LPS-FLEX/.test(value)) return "INSERT TKR";
  if (/FEMORAL|\bFEM\b|FEM\.|COCR/.test(value)) return "FEMORAL COMPONENT";
  return "TKR";
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || !/\.xlsx$/i.test(file.name)) {
      return NextResponse.json(
        { status: "error", message: "Pilih file Excel .xlsx" },
        { status: 400 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const items: ParsedStockItem[] = [];
    const instruments: ParsedInstrument[] = [];

    for (const sheet of workbook.worksheets) {
      let mode: "implant" | "instrument" | null = null;
      for (let rowNumber = 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
        const row = sheet.getRow(rowNumber);
        const values = Array.from(
          { length: Math.max(10, sheet.columnCount) },
          (_, index) => text(row.getCell(index + 1).value)
        );
        const normalized = values.map((value) => value.toUpperCase());

        if (
          normalized.includes("PART NUMBER") &&
          normalized.some((value) => value === "DESCRIPTION")
        ) {
          mode = "implant";
          continue;
        }
        if (
          normalized.includes("KODE BARANG") &&
          normalized.includes("NAMA BARANG")
        ) {
          mode = "instrument";
          continue;
        }

        if (mode === "implant") {
          const partNumber = values[1];
          const description = values[2];
          if (!partNumber && !description) {
            if (/TANDA TERIMA INSTRUMENT/i.test(values.join(" "))) mode = null;
            continue;
          }
          if (!partNumber || !description || !/^\d+$/.test(values[0] || "")) continue;
          const qty = Math.max(0, Number(values[4]) || 0);
          items.push({
            NoStok: partNumber,
            Deskripsi: description,
            Batch: values[3],
            Qty: qty,
            Implant: category(description),
          });
        } else if (mode === "instrument") {
          const name = values[2];
          if (!name || !/^\d+$/.test(values[0] || "")) continue;
          instruments.push({
            Code: values[1] || `INST-${rowNumber}`,
            Name: name,
            Qty: Math.max(0, Number(values[3]) || 0),
            Uom: values[4] || "SET",
            Condition: values[5] || "BAIK",
          });
        }
      }
    }

    if (!items.length && !instruments.length) {
      return NextResponse.json(
        { status: "error", message: "Header Part Number/Description tidak ditemukan" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      status: "success",
      fileName: file.name,
      sheetNames: workbook.worksheets.map((sheet) => sheet.name),
      items,
      instruments,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Excel gagal dibaca",
      },
      { status: 500 }
    );
  }
}
