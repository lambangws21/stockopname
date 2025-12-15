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
          Changes: normalizeChanges(row.Changes),
        });
      } else {
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