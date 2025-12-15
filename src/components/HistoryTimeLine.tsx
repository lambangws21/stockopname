"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { useStockHistory } from "@/hooks/useStockHistory";
import { parseChanges } from "@/lib/history";
import { HistoryRow } from "@/types/history";

type Props = {
  sheet: string;
};

export default function HistoryTimeline({ sheet }: Props) {
  const { data, loading, error } = useStockHistory(sheet);

  const rows = useMemo(() => data ?? [], [data]);

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading history…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (rows.length === 0) {
    return <div className="text-sm text-zinc-500">Tidak ada history</div>;
  }

  return (
    <div className="relative pl-6 space-y-6">
      {/* vertical line */}
      <div className="absolute left-2.5 top-0 bottom-0 w-px bg-zinc-300 dark:bg-zinc-700" />

      {rows.map((h: HistoryRow, i: number) => {
        const changes = parseChanges(h.Changes);
        const style = actionStyle(h.Action);

        return (
          <motion.div
            key={`${h.Timestamp}-${i}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative flex gap-4"
          >
            {/* DOT */}
            <div className="relative z-10">
              <div
                className={`w-3 h-3 rounded-full ${style.color} mt-1`}
              />
            </div>

            {/* CONTENT */}
            <div className="bg-white dark:bg-zinc-900 border dark:border-zinc-700 rounded-lg px-4 py-2 text-xs w-full">
              <div className="flex justify-between items-center">
                <div className="font-semibold flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] text-white ${style.color}`}
                  >
                    {style.label}
                  </span>
                  <span>
                    Sheet <b>{h.Sheet}</b> • No #{h.No}
                  </span>
                </div>

                <span className="text-zinc-500">
                  {new Date(h.Timestamp).toLocaleString()}
                </span>
              </div>

              {/* CHANGES */}
              <div className="mt-2 space-y-1">
                {changes.length === 0 ? (
                  <div className="italic text-zinc-400">
                    Tidak ada detail perubahan
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {changes.map((c, idx) => (
                      <li key={idx} className="flex gap-2">
                        <span className="font-medium w-28">
                          {c.field}
                        </span>

                        {c.before && (
                          <span className="line-through text-red-500">
                            {c.before}
                          </span>
                        )}

                        {c.after && (
                          <span className="text-green-600 font-semibold">
                            → {c.after}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* BY */}
              {h.By && (
                <div className="mt-1 text-[10px] text-zinc-400">
                  by {h.By}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ================= HELPERS ================= */
function actionStyle(action: string) {
  if (action.includes("CREATE"))
    return { color: "bg-green-500", label: "CREATE" };

  if (action.includes("MUTASI"))
    return { color: "bg-purple-500", label: action };

  if (action.includes("UPDATE"))
    return { color: "bg-blue-500", label: "UPDATE" };

  return { color: "bg-zinc-400", label: action || "-" };
}
