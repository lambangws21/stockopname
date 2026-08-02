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

export interface GasSheetContext {
  sourceUrl?: string;
  sourceId?: string;
  sourceSheet?: string;
  sourceGid?: string;
}

function appendContextQuery(
  params: URLSearchParams,
  context?: GasSheetContext
) {
  if (!context) return;
  if (context.sourceUrl) params.set("sourceUrl", context.sourceUrl);
  if (context.sourceId) params.set("sourceId", context.sourceId);
  if (context.sourceSheet) params.set("sourceSheet", context.sourceSheet);
  if (context.sourceGid) params.set("sourceGid", context.sourceGid);
}

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
    const errorBody = (await res.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(
      errorBody?.message || `API Error ${res.status}`
    );
  }

  return res.json() as Promise<GasResponse<T>>;
}

export interface ScanLookupRow extends StockRow {
  _score?: number;
}

export interface ScanLookupResult {
  status: "success" | "error";
  message?: string;
  found: boolean;
  best: ScanLookupRow | null;
  data: ScanLookupRow[];
  query?: {
    sheet?: string;
    ref?: string;
    lot?: string;
  };
}

/* =========================================================
   GET DATA
========================================================= */
export function gasGET(sheet: string) {
  return request<StockRow[]>("GET", undefined, `sheet=${sheet}`);
}

export function gasGETWithContext(sheet: string, context?: GasSheetContext) {
  const params = new URLSearchParams({
    sheet,
  });
  appendContextQuery(params, context);
  return request<StockRow[]>("GET", undefined, params.toString());
}

export async function gasScanLookup(params: {
  sheet?: string;
  ref: string;
  lot?: string;
  context?: GasSheetContext;
}) {
  const q = new URLSearchParams({
    action: "scanLookup",
    sheet: params.sheet ?? "Sheet1",
    ref: params.ref,
  });

  if (params.lot) {
    q.set("lot", params.lot);
  }
  appendContextQuery(q, params.context);

  const res = await fetch(`${API}?${q.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`API Error ${res.status}`);
  }

  return (await res.json()) as ScanLookupResult;
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
  return request<{ kpi: StockKPI }>("GET", undefined, `sheet=${sheet}&action=kpi`);
}

export function gasKPIWithContext(sheet: string, context?: GasSheetContext) {
  const params = new URLSearchParams({
    action: "kpi",
    sheet,
  });
  appendContextQuery(params, context);
  return request<{ kpi: StockKPI }>("GET", undefined, params.toString());
}


/* =========================================================
   BACKUP
========================================================= */
export function gasBackup() {
  return request<{ backupUrl: string }>("GET", undefined, "action=backup");
}

export type MonthlyBackupResult = {
  status: "success" | "exists" | "busy";
  period?: string;
  fileId?: string;
  fileName?: string;
  backupUrl?: string;
  message?: string;
};

export type MonthlyBackupStatus = {
  enabled: boolean;
  schedule: string;
  timezone: string;
  lastPeriod: string;
  lastBackupAt: string;
  lastFileId: string;
  backupUrl: string;
};

export function gasSetupMonthlyBackup() {
  return request<{
    triggerId: string;
    schedule: string;
    timezone: string;
    message: string;
  }>("POST", { action: "monthlyBackupSetup" });
}

export function gasRunMonthlyBackup(force = false) {
  return request<MonthlyBackupResult>("POST", {
    action: "monthlyBackup",
    force,
  });
}

export function gasGetMonthlyBackupStatus() {
  return request<MonthlyBackupStatus>(
    "GET",
    undefined,
    "action=monthlyBackupStatus"
  );
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

export function gasGetHistoryWithContext(
  sheet?: string,
  No?: number,
  context?: GasSheetContext
) {
  const params = new URLSearchParams({
    action: "history",
  });

  if (sheet) params.set("sheet", sheet);
  if (typeof No === "number") params.set("No", String(No));
  appendContextQuery(params, context);

  return request<HistoryRow[]>("GET", undefined, params.toString());
}

export function gasDeleteHistory(rows: number[]) {
  return request<{ deleted: number }>("POST", {
    action: "historyDelete",
    rows,
  });
}


export function parseChanges(raw: string): HistoryChange[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
