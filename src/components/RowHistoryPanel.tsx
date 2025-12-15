"use client";

import { useStockHistory } from "@/hooks/useStockHistory";
import { StockRow } from "@/types/stock";

/* ================= TYPES ================= */
type Props = {
  sheet: string;
  No: number;
  localChanges?: Partial<
    Record<keyof StockRow, { before: string | number; after: string | number }>
  >;
};

type HistoryChange = {
  field: string;
  before: string;
  after: string;
};

type HistoryRow = {
  Timestamp: string;
  Action: string;
  Sheet: string;
  No: number;
  Changes: string;
  By: string;
};

/* ================= HELPERS ================= */
function parseChanges(raw: string): HistoryChange[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/* ================= COMPONENT ================= */
export default function HistoryPanel({ sheet, No, localChanges }: Props) {
  const { data, loading, error } = useStockHistory(sheet, No);

  return (
    <div className="space-y-4 text-xs">
      <strong>📜 Riwayat Perubahan (No #{No})</strong>

      {/* 🔥 LOCAL SESSION */}
      {localChanges && Object.keys(localChanges).length > 0 && (
        <div className="border-l-2 border-yellow-400 pl-3">
          <div className="font-semibold text-zinc-700 mb-1">
            Perubahan Terakhir (Session Ini)
          </div>

          <ul className="space-y-1">
            {Object.entries(localChanges).map(([k, v]) => (
              <li key={k} className="flex gap-2 items-center">
                <span className="w-28 font-medium">{k}</span>
                <span className="line-through text-red-500">
                  {String(v.before)}
                </span>
                <span className="text-zinc-400">→</span>
                <span className="font-semibold text-green-600">
                  {String(v.after)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 🌐 SERVER HISTORY */}
      <div className="border-l-2 border-blue-400 pl-3 space-y-4">
        {loading && (
          <div className="italic text-zinc-400">Loading history…</div>
        )}

        {error && <div className="text-red-500">Error: {error}</div>}

        {!loading && !error && data.length === 0 && (
          <div className="italic text-zinc-400">
            Belum ada history untuk item ini
          </div>
        )}

        {!loading &&
          !error &&
          (data as HistoryRow[]).map((h) => {
            const changes = parseChanges(h.Changes);
            if (changes.length === 0) return null;

            return (
              <div key={h.Timestamp} className="space-y-1">
                <div className="text-[11px] text-zinc-500">
                  <b>{h.Action}</b> •{" "}
                  {new Date(h.Timestamp).toLocaleString()}
                  {h.By && (
                    <span className="ml-1 text-zinc-400">
                      by {h.By}
                    </span>
                  )}
                </div>

                <ul className="space-y-1">
                  {changes.map((c) => (
                    <li
                      key={c.field}
                      className="flex gap-2 items-center"
                    >
                      <span className="w-28 font-medium">{c.field}</span>
                      <span className="line-through text-red-500">
                        {c.before || "∅"}
                      </span>
                      <span className="text-zinc-400">→</span>
                      <span className="font-semibold text-green-600">
                        {c.after || "∅"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
      </div>
    </div>
  );
}
