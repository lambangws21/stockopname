"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight } from "lucide-react";

import { useStockHistory } from "@/hooks/useStockHistory";
import { parseChanges } from "@/lib/history";
import { HistoryRow } from "@/types/history";

type Props = {
  sheet: string;
};

export default function HistoryTimelineGrouped({ sheet }: Props) {
  const { data, loading, error } = useStockHistory(sheet);
  const [openNo, setOpenNo] = useState<number | null>(null);

  const groups = useMemo(
    () => groupByNo(data ?? []),
    [data]
  );

  if (loading) {
    return <div className="text-sm text-zinc-500">Loading history…</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  if (groups.length === 0) {
    return <div className="text-sm text-zinc-500">Tidak ada history</div>;
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const isOpen = openNo === group.No;

        return (
          <div
            key={group.No}
            className="border rounded-lg bg-white dark:bg-zinc-900"
          >
            {/* HEADER */}
            <button
              onClick={() =>
                setOpenNo(isOpen ? null : group.No)
              }
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <div className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
                <span className="font-semibold text-sm">
                  No #{group.No}
                </span>
                <span className="text-xs text-zinc-500">
                  ({group.items.length} event)
                </span>
              </div>

              <span className="text-xs text-zinc-400">
                {group.items[0]?.Sheet}
              </span>
            </button>

            {/* BODY */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="relative pl-6 py-4 space-y-6">
                    <div className="absolute left-[11px] top-0 bottom-0 w-px bg-zinc-300 dark:bg-zinc-700" />

                    {group.items.map((h, i) => {
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
                            <div className="flex justify-between">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] text-white ${style.color}`}
                              >
                                {style.label}
                              </span>
                              <span className="text-zinc-500">
                                {new Date(
                                  h.Timestamp
                                ).toLocaleString()}
                              </span>
                            </div>

                            <div className="mt-2 space-y-1">
                              {changes.length === 0 ? (
                                <div className="italic text-zinc-400">
                                  Tidak ada detail perubahan
                                </div>
                              ) : (
                                <ul className="space-y-1">
                                  {changes.map((c, idx) => (
                                    <li
                                      key={idx}
                                      className="flex gap-2"
                                    >
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
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

/* ================= HELPERS ================= */

function groupByNo(rows: HistoryRow[]) {
  const map = new Map<number, HistoryRow[]>();

  rows.forEach((r) => {
    if (!map.has(r.No)) map.set(r.No, []);
    map.get(r.No)!.push(r);
  });

  return Array.from(map.entries()).map(([No, items]) => ({
    No,
    items: items.sort(
      (a, b) =>
        new Date(b.Timestamp).getTime() -
        new Date(a.Timestamp).getTime()
    ),
  }));
}

function actionStyle(action: string) {
  if (action.includes("CREATE"))
    return { color: "bg-green-500", label: "CREATE" };

  if (action.includes("MUTASI"))
    return { color: "bg-purple-500", label: action };

  if (action.includes("UPDATE"))
    return { color: "bg-blue-500", label: "UPDATE" };

  return { color: "bg-zinc-400", label: action || "-" };
}
