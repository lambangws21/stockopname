"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GitCommit, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useStockHistory } from "@/hooks/useStockHistory";
import { HistoryRow } from "@/types/history";
import { parseChanges, badge } from "@/lib/history";

const IMPORTANT_FIELDS = ["Qty", "TotalQty", "TERPAKAI", "REFILL"];

type Props = {
  open: boolean;
  onClose: () => void;
  sheet: string;
  No: number;
};

export default function HistoryModalTimeline({
  open,
  onClose,
  sheet,
  No,
}: Props) {
  const { data, loading, error } = useStockHistory(sheet, No);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            drag
            dragElastic={0.15}
            dragMomentum={false}
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-xl shadow-2xl"
          >
            {/* HEADER */}
            <div className="cursor-move px-5 py-3 border-b flex justify-between items-center">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <GitCommit size={16} />
                History Timeline • No #{No}
              </h2>
              <button onClick={onClose} className="hover:text-red-500">
                <X size={18} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="max-h-[65vh] overflow-y-auto px-5 py-4">
              {loading && (
                <div className="text-center text-xs text-zinc-400">
                  Loading history…
                </div>
              )}

              {error && (
                <div className="text-center text-xs text-red-500">
                  {error}
                </div>
              )}

              {!loading && data.length === 0 && (
                <div className="text-center text-xs text-zinc-400">
                  Tidak ada history
                </div>
              )}

              <div className="relative pl-6 space-y-4">
                <div className="absolute left-[11px] top-0 bottom-0 w-px bg-zinc-300 dark:bg-zinc-700" />

                {data.map((h: HistoryRow, i) => {
                  const changes = parseChanges(h.Changes);
                  const isOpen = openIndex === i;

                  return (
                    <div key={`${h.Timestamp}-${i}`} className="relative flex gap-3">
                      {/* DOT */}
                      <div className="relative z-10">
                        <div className="w-3 h-3 rounded-full bg-blue-600 mt-2" />
                      </div>

                      {/* CARD */}
                      <div className="bg-white dark:bg-zinc-800 border dark:border-zinc-700 rounded-lg w-full text-xs">
                        {/* CARD HEADER */}
                        <button
                          onClick={() =>
                            setOpenIndex(isOpen ? null : i)
                          }
                          className="w-full px-3 py-2 flex justify-between items-center hover:bg-zinc-50 dark:hover:bg-zinc-700/40 transition"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${badge(
                                h.Action
                              )}`}
                            >
                              {h.Action || "UNKNOWN"}
                            </span>

                            <span className="text-zinc-400">
                              {new Date(h.Timestamp).toLocaleString()}
                            </span>
                          </div>

                          <ChevronDown
                            size={14}
                            className={`transition ${
                              isOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* COLLAPSIBLE CONTENT */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-3 pb-3"
                            >
                              <div className="text-zinc-500 mb-2">
                                Sheet <b>{h.Sheet}</b> • No #{h.No}
                              </div>

                              {changes.length === 0 ? (
                                <div className="italic text-zinc-400">
                                  Tidak ada detail perubahan
                                </div>
                              ) : (
                                <ul
                                  className={`space-y-1 pr-1 ${
                                    changes.length > 3
                                      ? "max-h-24 overflow-y-auto"
                                      : ""
                                  }`}
                                >
                                  {changes.map((c, idx) => {
                                    const important =
                                      IMPORTANT_FIELDS.includes(c.field);

                                    return (
                                      <li
                                        key={idx}
                                        className={`flex gap-2 ${
                                          important
                                            ? "bg-yellow-50 dark:bg-yellow-900/20 px-2 py-1 rounded"
                                            : ""
                                        }`}
                                      >
                                        <b className="min-w-[90px]">
                                          {c.field}
                                        </b>

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

                                        {important && (
                                          <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-yellow-400 text-black">
                                            important
                                          </span>
                                        )}
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
