import { HistoryChange, HistoryRow } from "@/types/history";

/* =====================================================
   SMART HISTORY PARSER
   - JSON array  ✅
   - JSON object ✅
   - string key  ✅
   - empty       ✅
===================================================== */

function normalizeTime(ts: string) {
    // merge per DETIK (bukan millisecond)
    return new Date(ts).toISOString().slice(0, 19);
  }
  
  export function mergeHistory(rows: HistoryRow[]): HistoryRow[] {
    const map = new Map<string, HistoryRow>();
  
    rows.forEach((row) => {
      const key = [
        row.Action,
        row.Sheet,
        row.No,
        normalizeTime(row.Timestamp),
        row.By || "",
      ].join("|");
  
      const existing = map.get(key);
  
      if (!existing) {
        map.set(key, {
          ...row,
          Rows: row.Rows || (row.Row ? [row.Row] : []),
          Changes: normalizeChanges(row.Changes),
        });
      } else {
        existing.Rows = Array.from(
          new Set([
            ...(existing.Rows || (existing.Row ? [existing.Row] : [])),
            ...(row.Rows || (row.Row ? [row.Row] : [])),
          ])
        );
        // 🔥 GABUNGKAN CHANGES
        existing.Changes = JSON.stringify([
          ...parseChanges(existing.Changes),
          ...parseChanges(row.Changes),
        ]);
      }
    });
  
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.Timestamp).getTime() -
        new Date(a.Timestamp).getTime()
    );
  }

export function parseChanges(raw: string): HistoryChange[] {
  if (!raw) return [];

  /* ================= JSON ARRAY ================= */
  if (raw.trim().startsWith("[")) {
    try {
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];

      return arr
        .filter((x) => x?.field)
        .map((x) => ({
          field: String(x.field),
          before: String(x.before ?? ""),
          after: String(x.after ?? ""),
        }));
    } catch {
      return [];
    }
  }

  /* ================= JSON OBJECT ================= */
  if (raw.trim().startsWith("{")) {
    try {
      const obj = JSON.parse(raw) as Record<string, unknown>;

      return Object.entries(obj).map(([k, v]) => ({
        field: k,
        before: "",
        after: String(v ?? ""),
      }));
    } catch {
      return [];
    }
  }

  /* ================= SINGLE FIELD ================= */
  return [
    {
      field: raw,
      before: "",
      after: "",
    },
  ];
}

export function badge(action: string) {
    if (action.includes("MUTASI"))
      return "bg-purple-100 text-purple-700";
    if (action.includes("CREATE"))
      return "bg-green-100 text-green-700";
    if (action.includes("DELETE"))
      return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  }

const FIELD_LABELS: Record<string, string> = {
  NoStok: "REF implant",
  Deskripsi: "Deskripsi",
  Implant: "Kategori implant",
  Brand: "Brand",
  Batch: "LOT / Batch",
  Qty: "Jumlah stok",
  TotalQty: "Stok tersedia",
  TERPAKAI: "Total terpakai",
  REFILL: "Total refill",
  KET: "Keterangan terbaru",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Data implant ditambahkan",
  UPDATE: "Data implant diperbarui",
  DELETE: "Data implant dihapus",
  DUPLICATE: "Data implant diduplikat",
  OPERASI: "Implant terpakai untuk operasi",
  REFILL: "Stok implant direfill",
  SERAH_TERIMA_RS: "Implant dikirim untuk tindakan operasi di rumah sakit",
  MOBILISASI_KELUAR: "Implant dikirim untuk support",
  MOBILISASI_MASUK: "Implant kembali dari support",
};

export function historyFieldLabel(field: string) {
  return FIELD_LABELS[field] || field;
}

export function historyActionLabel(action: string) {
  return ACTION_LABELS[String(action || "").toUpperCase()] || action || "Aktivitas";
}

export function historyActionTone(action: string) {
  const value = String(action || "").toUpperCase();
  if (value === "DELETE" || value === "OPERASI")
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300";
  if (value === "REFILL" || value === "MOBILISASI_MASUK" || value === "CREATE")
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300";
  if (value === "MOBILISASI_KELUAR")
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300";
  if (value === "SERAH_TERIMA_RS")
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300";
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300";
}

export function formatHistoryTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp || "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}



  function normalizeChanges(raw: string): string {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? JSON.stringify(parsed)
        : "[]";
    } catch {
      return "[]";
    }
  }
