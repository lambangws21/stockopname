import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import type {
  CustomerMappingRow,
  CustomerPriority,
} from "@/types/customer-mapping";

const GAS_URL =
  process.env.GAS_SUPER_SHEET_URL ||
  "https://script.google.com/macros/s/AKfycbzYixMvNT2jkoKl-P0973ijFkM0XCQRb8oEMyFKTB-BmbKd_HyirtYvdgO-v84xgVF3mA/exec";

type ImportCustomer = Pick<
  CustomerMappingRow,
  | "customerType"
  | "territory"
  | "hospital"
  | "doctor"
  | "note"
  | "plan"
  | "priority"
  | "status"
  | "sourceFile"
  | "sourceRow"
>;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function colorOf(cell: ExcelJS.Cell) {
  const color = cell.fill?.type === "pattern" ? cell.fill.fgColor : undefined;
  return clean(color && "argb" in color ? color.argb : "").toUpperCase();
}

function readPriority(row: ExcelJS.Row): CustomerPriority {
  const colors = [13, 14, 15].map((column) => colorOf(row.getCell(column)));
  if (colors[0].includes("FF0000")) return "HIGH";
  if (colors[1].includes("FFC000") || colors[1].includes("FFFF00")) return "MEDIUM";
  if (colors[2].includes("00B050") || colors[2].includes("00FF00")) return "LOW";
  return "MEDIUM";
}

function parseCustomerWorkbook(worksheet: ExcelJS.Worksheet, fileName: string) {
  const rows: ImportCustomer[] = [];

  for (let rowNumber = 4; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const existingHospital = clean(row.getCell(3).text);
    const existingDoctor = clean(row.getCell(4).text);
    const targetHospital = clean(row.getCell(9).text);
    const targetDoctor = clean(row.getCell(10).text);

    if (existingHospital || existingDoctor) {
      rows.push({
        customerType: "EXISTING",
        territory: clean(row.getCell(2).text),
        hospital: existingHospital,
        doctor: existingDoctor,
        note: clean(row.getCell(5).text),
        plan: "",
        priority: "MEDIUM",
        status: "APPROVED",
        sourceFile: fileName,
        sourceRow: rowNumber,
      });
    }

    if (targetHospital || targetDoctor) {
      rows.push({
        customerType: "TARGET",
        territory: clean(row.getCell(8).text),
        hospital: targetHospital,
        doctor: targetDoctor,
        note: clean(row.getCell(11).text),
        plan: clean(row.getCell(12).text),
        priority: readPriority(row),
        status: "NEW",
        sourceFile: fileName,
        sourceRow: rowNumber,
      });
    }
  }

  return rows;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { status: "error", message: "File Excel wajib dipilih" },
        { status: 400 }
      );
    }

    if (!/\.xlsx$/i.test(file.name)) {
      return NextResponse.json(
        { status: "error", message: "Format yang didukung hanya .xlsx" },
        { status: 400 }
      );
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      return NextResponse.json(
        { status: "error", message: "Worksheet tidak ditemukan" },
        { status: 400 }
      );
    }

    const customers = parseCustomerWorkbook(worksheet, file.name);
    if (!customers.length) {
      return NextResponse.json(
        {
          status: "error",
          message: "Tidak ada data customer pada kolom Existing atau Planning",
        },
        { status: 400 }
      );
    }

    const actor = clean(formData.get("actor")) || "Lambang";

    // Script lama akan menganggap action yang tidak dikenal sebagai CREATE stock.
    // Preflight ini mencegah data customer salah masuk ke Sheet1.
    const capabilityResponse = await fetch(
      `${GAS_URL}?action=customerList`,
      { cache: "no-store" }
    );
    const capability = await capabilityResponse.json();
    if (
      !capabilityResponse.ok ||
      capability?.status !== "success" ||
      capability?.sheet !== "CustomerMapping"
    ) {
      return NextResponse.json(
        {
          status: "error",
          code: "CUSTOMER_SCRIPT_NOT_DEPLOYED",
          message:
            "Upload dibatalkan agar data tidak masuk ke sheet stok. Deploy Apps Script terbaru dari docs/super-sheet-final.gs terlebih dahulu.",
          parsed: customers.length,
        },
        { status: 409 }
      );
    }

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "customerBulkImport",
        rows: customers,
        by: actor,
      }),
      cache: "no-store",
    });
    const result = await response.json();

    return NextResponse.json(
      { ...result, parsed: customers.length },
      { status: response.ok ? 200 : response.status }
    );
  } catch (error) {
    console.error("CUSTOMER IMPORT ERROR:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Import customer gagal",
      },
      { status: 500 }
    );
  }
}
