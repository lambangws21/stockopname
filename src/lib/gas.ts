import { HistoryRow } from "@/types/history";
import {
  GasResponse,
  StockRow,
  StockKPI,
  CreatePayload,
  UpdatePayload,
  DeletePayload,
  MutasiPayload,
  DuplicatePayload,
  HistoryChange
} from "@/types/stock";

const API = "/api/super-sheet";

/* =========================================================
   CORE REQUEST (NO any, MATCH HANDLER)
========================================================= */
async function request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  payload?: unknown,
  query?: string
): Promise<GasResponse<T>> {
  const url = query ? `${API}?${query}` : API;

  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: payload ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API Error ${res.status}`);
  }

  return res.json() as Promise<GasResponse<T>>;
}

/* =========================================================
   GET DATA
========================================================= */
export function gasGET(sheet: string) {
  return request<StockRow[]>("GET", undefined, `sheet=${sheet}`);
}

/* =========================================================
   CREATE
========================================================= */
export function gasCreate(payload: CreatePayload) {
  return request<void>("POST", payload);
}

/* =========================================================
   UPDATE (KENA PUT HANDLER)
========================================================= */
export function gasUpdate(payload: UpdatePayload) {
  return request<void>("PUT", payload);
}

/* =========================================================
   DELETE (KENA DELETE HANDLER)
========================================================= */
export function gasDelete(payload: DeletePayload) {
  return request<void>("DELETE", payload);
}

/* =========================================================
   MUTASI
========================================================= */
export function gasMutasi(payload: MutasiPayload) {
  return request<void>("POST", {
    ...payload,
    action: "mutasi",
  });
}

/* =========================================================
   DUPLICATE
========================================================= */
export function gasDuplicate(payload: DuplicatePayload) {
  return request<void>("POST", {
    ...payload,
    action: "duplicate",
  });
}

/* =========================================================
   KPI
========================================================= */
export function gasKPI(sheet: string) {
  return request<{ kpi: StockKPI }>(
    "GET",
    undefined,
    `sheet=${sheet}&action=kpi`
  );
}


/* =========================================================
   BACKUP
========================================================= */
export function gasBackup() {
  return request<{ backupUrl: string }>("GET", undefined, "action=backup");
}

/* =========================================================
   EXPORT PDF
========================================================= */
export function gasExportPDF(sheet: string) {
  return `${API}?sheet=${encodeURIComponent(sheet)}&action=pdf`;
}

/* =========================================================
   HISTORY
========================================================= */
export function gasGetHistory(sheet?: string, No?: number) {
  const params = new URLSearchParams({
    action: "history",
  });

  if (sheet) params.set("sheet", sheet);
  if (typeof No === "number") params.set("No", String(No));

  return request<HistoryRow[]>("GET", undefined, params.toString());
}


export function parseChanges(raw: string): HistoryChange[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
