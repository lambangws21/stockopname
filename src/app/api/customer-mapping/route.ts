import { NextRequest, NextResponse } from "next/server";

const GAS_URL =
  process.env.GAS_SUPER_SHEET_URL ||
  "https://script.google.com/macros/s/AKfycbzYixMvNT2jkoKl-P0973ijFkM0XCQRb8oEMyFKTB-BmbKd_HyirtYvdgO-v84xgVF3mA/exec";

async function readGasResponse(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Respons Apps Script bukan JSON (HTTP ${response.status})`);
  }
}

export async function GET(req: NextRequest) {
  try {
    const query = new URLSearchParams(req.nextUrl.searchParams);
    query.set("action", "customerList");

    const response = await fetch(`${GAS_URL}?${query.toString()}`, {
      cache: "no-store",
    });
    const data = await readGasResponse(response);
    if (data?.status === "success" && data?.sheet !== "CustomerMapping") {
      return NextResponse.json(
        {
          status: "error",
          code: "CUSTOMER_SCRIPT_NOT_DEPLOYED",
          message:
            "Apps Script customer mapping belum di-deploy. Perbarui deployment menggunakan docs/super-sheet-final.gs.",
        },
        { status: 409 }
      );
    }
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Gagal mengambil customer",
      },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const targetAction =
      body.intent === "upsert"
        ? "customerUpsert"
        : body.intent === "journey"
          ? "customerJourney"
          : "customerDecision";
    const capabilityResponse = await fetch(
      `${GAS_URL}?action=customerCapabilities`,
      { cache: "no-store" }
    );
    const capability = await readGasResponse(capabilityResponse);
    const requiresPhotoSupport =
      targetAction === "customerUpsert" &&
      (typeof body.photoDataUrl === "string" ||
        Object.prototype.hasOwnProperty.call(body, "photoFileId"));
    const requiresUsageSupport =
      (targetAction === "customerUpsert" || targetAction === "customerJourney") &&
      (Object.prototype.hasOwnProperty.call(body, "implantUsed") ||
        Object.prototype.hasOwnProperty.call(body, "procedureType"));
    const requiresUsageHospitalSupport =
      targetAction === "customerJourney" &&
      Object.prototype.hasOwnProperty.call(body, "usageHospital");
    if (
      !capabilityResponse.ok ||
      capability?.status !== "success" ||
      capability?.module !== "CustomerMapping" ||
      (requiresUsageHospitalSupport && Number(capability?.version || 0) < 7) ||
      (requiresUsageSupport && Number(capability?.version || 0) < 6) ||
      (requiresPhotoSupport && Number(capability?.version || 0) < 5) ||
      !Array.isArray(capability?.actions) ||
      !capability.actions.includes(targetAction)
    ) {
      return NextResponse.json(
        {
          status: "error",
          code: "CUSTOMER_SCRIPT_NOT_DEPLOYED",
          message:
            requiresUsageHospitalSupport
              ? "Pencatatan rumah sakit pemakaian memerlukan Apps Script Customer Mapping versi 7. Deploy ulang docs/super-sheet-final.gs terlebih dahulu."
              : requiresUsageSupport
              ? "Pencatatan implant dan tindakan memerlukan Apps Script Customer Mapping versi 6. Deploy ulang docs/super-sheet-final.gs terlebih dahulu."
              : requiresPhotoSupport
              ? "Fitur foto dokter memerlukan Apps Script Customer Mapping versi 5. Deploy ulang docs/super-sheet-final.gs terlebih dahulu."
              : "Update dibatalkan agar tidak masuk ke sheet stok. Deploy Apps Script customer mapping terbaru terlebih dahulu.",
        },
        { status: 409 }
      );
    }

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        action: targetAction,
      }),
      cache: "no-store",
    });
    const data = await readGasResponse(response);
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Gagal memperbarui customer",
      },
      { status: 502 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const capabilityResponse = await fetch(
      `${GAS_URL}?action=customerCapabilities`,
      { cache: "no-store" }
    );
    const capability = await readGasResponse(capabilityResponse);
    if (
      !capabilityResponse.ok ||
      capability?.module !== "CustomerMapping" ||
      !Array.isArray(capability?.actions) ||
      !capability.actions.includes("customerDelete")
    ) {
      return NextResponse.json(
        {
          status: "error",
          code: "CUSTOMER_SCRIPT_NOT_DEPLOYED",
          message: "Delete dibatalkan. Deploy Apps Script customer mapping terbaru terlebih dahulu.",
        },
        { status: 409 }
      );
    }

    const response = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, action: "customerDelete" }),
      cache: "no-store",
    });
    const data = await readGasResponse(response);
    return NextResponse.json(data, { status: response.ok ? 200 : response.status });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Gagal menghapus customer",
      },
      { status: 502 }
    );
  }
}
