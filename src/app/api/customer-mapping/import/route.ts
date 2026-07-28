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
  | "phone"
  | "specialty"
  | "practiceHospital2"
  | "practiceHospital3"
>;

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalized(value: unknown) {
  return clean(value).toLocaleLowerCase("id-ID").replace(/[^a-z0-9]+/g, " ").trim();
}

function doctorIdentity(value: unknown) {
  return clean(value)
    .toLocaleLowerCase("id-ID")
    .replace(/^(?:dr\.?\s*)+/i, "")
    .split(/\s*,?\s*(?:m[\s.,-]*biomed|m[\s.,-]*kes|sp[\s.,-]*ot|spot\b)/i)[0]
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function hospitalIdentity(value: unknown) {
  return normalized(value)
    .replace(/\brumah sakit\b|\brsud\b|\brsu\b|\brs\b|\bprovinsi\b/g, " ")
    .replace(/\bbali\s*mandara(?:\s+bali)?\b|\bbalimandara\b/g, " bali mandara ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeHospitals(...values: unknown[]) {
  const result: string[] = [];
  values.flatMap((value) => Array.isArray(value) ? value : [value]).forEach((value) => {
    const hospital = clean(value);
    if (hospital && !result.some((item) => hospitalIdentity(item) === hospitalIdentity(hospital))) result.push(hospital);
  });
  return result.slice(0, 3);
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
  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, column) => headers.set(normalized(cell.text), column));
  const doctorColumn = [...headers].find(([header]) => header.includes("nama dokter"))?.[1];
  const hospitalColumn = [...headers].find(([header]) => header.includes("rumah sakit"))?.[1];
  if (doctorColumn && hospitalColumn) {
    const phoneColumn = [...headers].find(([header]) => header.includes("telepon") || header.includes("handphone"))?.[1];
    const planningColumn = [...headers].find(([header]) => header.includes("planning"))?.[1];
    const grouped = new Map<string, ImportCustomer>();
    for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
      const row = worksheet.getRow(rowNumber);
      const doctor = clean(row.getCell(doctorColumn).text);
      const hospital = clean(row.getCell(hospitalColumn).text);
      if (!doctor) continue;
      const identity = doctorIdentity(doctor) || normalized(doctor);
      const previous = grouped.get(identity);
      const hospitals = mergeHospitals(previous?.hospital, previous?.practiceHospital2, previous?.practiceHospital3, hospital);
      grouped.set(identity, {
        customerType: previous?.customerType || "TARGET",
        territory: previous?.territory || "BALI",
        hospital: hospitals[0] || "",
        doctor: previous?.doctor || doctor,
        note: previous?.note || "",
        plan: clean(planningColumn ? row.getCell(planningColumn).text : "") || previous?.plan || "",
        priority: previous?.priority || "MEDIUM",
        status: previous?.status || "NEW",
        sourceFile: fileName,
        sourceRow: previous?.sourceRow || rowNumber,
        phone: clean(phoneColumn ? row.getCell(phoneColumn).text : "") || previous?.phone || "",
        specialty: previous?.specialty || "Ortopedi dan Traumatologi",
        practiceHospital2: hospitals[1] || "",
        practiceHospital3: hospitals[2] || "",
      });
    }
    return [...grouped.values()];
  }

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
        phone: "",
        specialty: "",
        practiceHospital2: "",
        practiceHospital3: "",
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
        phone: "",
        specialty: "",
        practiceHospital2: "",
        practiceHospital3: "",
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
            "Upload dibatalkan agar data tidak masuk ke sheet stok. Deploy Apps Script terbaru dari docs/appscript.gs terlebih dahulu.",
          parsed: customers.length,
        },
        { status: 409 }
      );
    }

    const existingRows = Array.isArray(capability.data) ? capability.data as CustomerMappingRow[] : [];
    const mergedCustomers = customers.map((customer) => {
      const existing = existingRows.find((row) => doctorIdentity(row.doctor) === doctorIdentity(customer.doctor));
      if (!existing) return customer;
      const hospitals = mergeHospitals(
        existing.hospital,
        existing.practiceHospital2,
        existing.practiceHospital3,
        customer.hospital,
        customer.practiceHospital2,
        customer.practiceHospital3
      );
      return {
        ...customer,
        customerType: existing.customerType,
        territory: existing.territory || customer.territory,
        hospital: existing.hospital || hospitals[0] || customer.hospital,
        doctor: existing.doctor,
        note: existing.note || customer.note,
        plan: existing.plan || customer.plan,
        priority: existing.priority,
        status: existing.status,
        phone: existing.phone || customer.phone,
        specialty: existing.specialty || customer.specialty,
        practiceHospital2: hospitals.filter((hospital) => normalized(hospital) !== normalized(existing.hospital))[0] || "",
        practiceHospital3: hospitals.filter((hospital) => normalized(hospital) !== normalized(existing.hospital))[1] || "",
      };
    });

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "customerBulkImport",
        rows: mergedCustomers,
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
