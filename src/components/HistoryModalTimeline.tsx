"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GitCommit, X, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useStockHistory } from "@/hooks/useStockHistory";
import { HistoryRow } from "@/types/history";
import {
  formatHistoryTime,
  historyActionLabel,
  historyActionTone,
  historyFieldLabel,
  parseChanges,
} from "@/lib/history";

const IMPORTANT_FIELDS = ["Qty", "TotalQty", "TERPAKAI", "REFILL", "KET"];

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
          className="fixed inset-0 z-[10040] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.95 }}
            className="max-h-[100dvh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:max-h-[85vh] sm:max-w-lg sm:rounded-3xl"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-4 py-4 sm:px-5">
              <h2 className="font-bold text-sm flex items-center gap-2">
                <GitCommit size={16} />
                Riwayat Implant • Baris #{No}
              </h2>
              <button onClick={onClose} className="hover:text-red-500">
                <X size={18} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="max-h-[calc(100dvh-72px)] overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[70vh] sm:px-5">
              {loading && (
                <div className="text-center text-xs text-zinc-400">
                  Memuat riwayat…
                </div>
              )}

              {error && (
                <div className="text-center text-xs text-red-500">
                  {error}
                </div>
              )}

              {!loading && data.length === 0 && (
                <div className="text-center text-xs text-zinc-400">
                  Belum ada riwayat untuk implant ini.
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
                              className={`rounded-full border px-2 py-1 text-[10px] font-bold ${historyActionTone(
                                h.Action
                              )}`}
                            >
                              {historyActionLabel(h.Action)}
                            </span>

                            <span className="text-zinc-400">
                              {formatHistoryTime(h.Timestamp)}
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
                                Sumber <b>{h.Sheet}</b> • Baris #{h.No}
                              </div>

                              {changes.length === 0 ? (
                                <div className="italic text-zinc-400">
                                  Tidak ada detail perubahan
                                </div>
                              ) : (
                                <ul className="space-y-2">
                                  {changes.map((c, idx) => {
                                    const important =
                                      IMPORTANT_FIELDS.includes(c.field);

                                    return (
                                      <li
                                        key={idx}
                                        className={`rounded-xl border p-2.5 ${
                                          important
                                            ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                                            : "bg-zinc-50 dark:bg-zinc-900"
                                        }`}
                                      >
                                        <div className="mb-1.5 flex items-center justify-between gap-2">
                                          <b>{historyFieldLabel(c.field)}</b>
                                          {important && (
                                            <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                              Penting
                                            </span>
                                          )}
                                        </div>
                                        <div className="grid gap-1">
                                          <span className="break-words text-red-600">
                                            Sebelum: {String(c.before || "-")}
                                          </span>
                                          <span className="break-words font-semibold text-emerald-600">
                                            Sesudah: {String(c.after || "-")}
                                          </span>
                                        </div>
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
