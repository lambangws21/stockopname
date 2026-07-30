"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronDown,
  Clock3,
  FileClock,
  Search,
  UserRound,
} from "lucide-react";
import { useStockHistory } from "@/hooks/useStockHistory";
import {
  formatHistoryTime,
  historyActionLabel,
  historyActionTone,
  historyFieldLabel,
  parseChanges,
} from "@/lib/history";
import type { HistoryRow } from "@/types/history";

export default function HistoryTable() {
  const { data, loading, error } = useStockHistory();
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("ALL");
  const [openKey, setOpenKey] = useState<string | null>(null);

  const actions = useMemo(
    () => Array.from(new Set(data.map((row) => row.Action).filter(Boolean))),
    [data]
  );
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((row) => {
      if (action !== "ALL" && row.Action !== action) return false;
      if (!query) return true;
      return [
        row.Action,
        historyActionLabel(row.Action),
        row.Sheet,
        row.No,
        row.By,
        row.Changes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [action, data, search]);

  return (
    <main className="min-h-dvh bg-slate-50 pb-[max(1rem,env(safe-area-inset-bottom))] text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <header className="bg-[#0f172a] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300"
          >
            <ArrowLeft size={15} /> Kembali ke stok
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10">
              <FileClock size={21} />
            </span>
            <div>
              <h1 className="text-xl font-black">Riwayat Stock Implant</h1>
              <p className="mt-0.5 text-xs text-slate-300">
                {data.length} aktivitas tercatat
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-3 p-3 sm:p-6">
        <section className="grid gap-2 rounded-2xl border bg-white p-3 shadow-sm dark:bg-zinc-900 sm:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="absolute left-3 top-3.5 text-zinc-400" size={16} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari aktivitas, nomor baris, atau user..."
              className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <select
            value={action}
            onChange={(event) => setAction(event.target.value)}
            className="h-11 rounded-xl border bg-white px-3 text-sm dark:bg-zinc-900"
          >
            <option value="ALL">Semua aktivitas</option>
            {actions.map((item) => (
              <option key={item} value={item}>
                {historyActionLabel(item)}
              </option>
            ))}
          </select>
        </section>

        {loading && <HistorySkeleton />}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Riwayat gagal dimuat: {error}
          </div>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-zinc-500 dark:bg-zinc-900">
            Tidak ada riwayat yang sesuai.
          </div>
        )}

        <div className="space-y-3">
          {filtered.map((row, index) => {
            const key = `${row.Timestamp}-${row.No}-${index}`;
            return (
              <HistoryCard
                key={key}
                row={row}
                open={openKey === key}
                onToggle={() => setOpenKey(openKey === key ? null : key)}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}

function HistoryCard({
  row,
  open,
  onToggle,
}: {
  row: HistoryRow;
  open: boolean;
  onToggle: () => void;
}) {
  const changes = parseChanges(row.Changes);
  const latestNote = changes.find((change) => change.field === "KET")?.after;
  const stockChange = changes.find((change) => change.field === "TotalQty");

  return (
    <article className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left"
        aria-expanded={open}
      >
        <span
          className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${historyActionTone(
            row.Action
          )}`}
        >
          {String(row.Action || "?").slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">
            {historyActionLabel(row.Action)}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1">
              <Clock3 size={12} /> {formatHistoryTime(row.Timestamp)}
            </span>
            <span>Baris #{row.No}</span>
            {row.By && (
              <span className="inline-flex items-center gap-1">
                <UserRound size={12} /> {row.By}
              </span>
            )}
          </span>
          {stockChange && (
            <span className="mt-2 block text-xs font-bold text-blue-600">
              Stok: {stockChange.before || "0"} → {stockChange.after || "0"}
            </span>
          )}
          {latestNote && (
            <span className="mt-1 line-clamp-2 block text-xs leading-5 text-zinc-600 dark:text-zinc-300">
              {String(latestNote)}
            </span>
          )}
        </span>
        <ChevronDown
          size={17}
          className={`mt-2 shrink-0 text-zinc-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t bg-slate-50 p-3 dark:bg-zinc-950/40 sm:p-4">
          {changes.length === 0 ? (
            <p className="text-xs italic text-zinc-400">
              Detail perubahan tidak tersedia.
            </p>
          ) : (
            changes.map((change, index) => (
              <div
                key={`${change.field}-${index}`}
                className="rounded-xl border bg-white p-3 dark:bg-zinc-900"
              >
                <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                  {historyFieldLabel(change.field)}
                </p>
                <div className="mt-1.5 grid gap-1 text-xs sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <span className="break-words rounded-lg bg-red-50 px-2 py-1.5 text-red-700 dark:bg-red-950/30 dark:text-red-300">
                    Sebelum: {String(change.before || "-")}
                  </span>
                  <span className="hidden text-zinc-400 sm:block">→</span>
                  <span className="break-words rounded-lg bg-emerald-50 px-2 py-1.5 font-semibold text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
                    Sesudah: {String(change.after || "-")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </article>
  );
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-24 animate-pulse rounded-2xl border bg-white dark:bg-zinc-900"
        />
      ))}
    </div>
  );
}
