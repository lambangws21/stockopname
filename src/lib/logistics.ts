import type {
  LogisticsWorkflowStatus,
  StockWarningRow,
} from "@/types/logistics";

const API = "/api/super-sheet";

export async function getStockWarnings(includeResolved = false) {
  const response = await fetch(
    `${API}?action=warningList&includeResolved=${includeResolved}`,
    { cache: "no-store" }
  );
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: StockWarningRow[];
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Warning stok gagal dimuat");
  }
  return json.data ?? [];
}

export async function updateStockWarning(payload: {
  Row: number;
  WorkflowStatus: LogisticsWorkflowStatus;
  PIC?: string;
  TargetRefill?: string;
  LogisticsNote?: string;
  by?: string;
}) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "warningUpdate", ...payload }),
  });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: StockWarningRow;
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Workflow logistik gagal disimpan");
  }
  return json.data;
}
