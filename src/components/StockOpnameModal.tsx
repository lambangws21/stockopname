"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ClipboardCheck,
  Download,
  Minus,
  Plus,
  ScanLine,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import Scanner from "@/components/stock/Scanner";
import type { StockRow } from "@/types/stock";

type ScanPayload = {
  ref: string;
  lot?: string;
  searchField?: "REF" | "LOT";
};

function normalize(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export default function StockOpnameModal({
  open,
  rows,
  onClose,
}: {
  open: boolean;
  rows: StockRow[];
  onClose: () => void;
}) {
  const [physical, setPhysical] = useState<Record<number, number>>({});
  const [query, setQuery] = useState("");
  const [scannerOpen, setScannerOpen] = useState(true);

  const countedRows = useMemo(
    () =>
      rows
        .filter((row) => Object.hasOwn(physical, row.No))
        .map((row) => ({
          row,
          physical: physical[row.No] ?? 0,
          difference: (physical[row.No] ?? 0) - Number(row.TotalQty || 0),
        })),
    [physical, rows]
  );

  const suggestions = useMemo(() => {
    const token = normalize(query);
    if (!token) return [];
    return rows
      .filter(
        (row) =>
          normalize(row.NoStok).includes(token) ||
          normalize(row.Batch).includes(token) ||
          normalize(row.Deskripsi).includes(token)
      )
      .slice(0, 8);
  }, [query, rows]);

  const addCount = useCallback((row: StockRow, amount = 1) => {
    setPhysical((current) => ({
      ...current,
      [row.No]: Math.max(0, (current[row.No] ?? 0) + amount),
    }));
  }, []);

  const handleScan = useCallback(
    (scan: ScanPayload) => {
      const ref = normalize(scan.ref);
      const lot = normalize(scan.lot);
      const candidates = rows.filter((row) => {
        const rowRef = normalize(row.NoStok);
        const rowLot = normalize(row.Batch);
        if (ref && lot) return rowRef === ref && rowLot === lot;
        if (scan.searchField === "LOT" || (!ref && lot)) return rowLot === lot;
        return rowRef === ref;
      });

      if (candidates.length === 0) {
        toast.error("REF/LOT tidak ditemukan pada stok");
        return;
      }

      addCount(candidates[0]);
      toast.success(`${candidates[0].NoStok} dihitung +1`);
      if (candidates.length > 1) {
        toast.info("Ada beberapa LOT yang sama. Item pertama dipilih; periksa hasil.");
      }
    },
    [addCount, rows]
  );

  const summary = useMemo(
    () => ({
      checked: countedRows.length,
      match: countedRows.filter((item) => item.difference === 0).length,
      mismatch: countedRows.filter((item) => item.difference !== 0).length,
    }),
    [countedRows]
  );

  const exportCsv = () => {
    const lines = [
      ["REF", "Deskripsi", "Implant", "Brand", "LOT", "Stok Sistem", "Fisik", "Selisih"],
      ...countedRows.map(({ row, physical: physicalQty, difference }) => [
        row.NoStok,
        row.Deskripsi,
        row.Implant,
        row.Brand,
        row.Batch,
        row.TotalQty,
        physicalQty,
        difference,
      ]),
    ];
    const csv = lines
      .map((line) =>
        line
          .map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stock-opname-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10010] flex items-end justify-center bg-zinc-950/60 backdrop-blur-sm sm:items-center sm:p-4">
      <section className="flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
        <header className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
          <div>
            <div className="flex items-center gap-2 font-bold">
              <ClipboardCheck size={18} className="text-violet-600" />
              Stock Opname Cepat
            </div>
            <p className="text-[11px] text-zinc-500">
              Scan berulang, hitung fisik, lalu periksa selisih
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border p-2">
            <X size={17} />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[360px_1fr]">
          <aside className="overflow-y-auto border-b p-4 lg:border-b-0 lg:border-r">
            <button
              type="button"
              onClick={() => setScannerOpen((value) => !value)}
              className="mb-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-xs font-bold text-white"
            >
              <ScanLine size={15} />
              {scannerOpen ? "Tutup kamera" : "Buka continuous scan"}
            </button>
            {scannerOpen && <Scanner onDetected={handleScan} />}

            <div className="relative mt-4">
              <Search className="absolute left-3 top-3 text-zinc-400" size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tambah manual: REF, LOT, nama..."
                className="h-10 w-full rounded-xl border pl-9 pr-3 text-xs outline-none focus:border-violet-500 dark:bg-zinc-800"
              />
            </div>
            {suggestions.length > 0 && (
              <div className="mt-2 overflow-hidden rounded-xl border">
                {suggestions.map((row) => (
                  <button
                    type="button"
                    key={row.No}
                    onClick={() => {
                      addCount(row);
                      setQuery("");
                    }}
                    className="flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-xs last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                  >
                    <span className="min-w-0">
                      <b>{row.NoStok}</b>
                      <span className="block truncate text-[10px] text-zinc-500">
                        {row.Deskripsi} · LOT {row.Batch || "-"}
                      </span>
                    </span>
                    <Plus size={14} />
                  </button>
                ))}
              </div>
            )}
          </aside>

          <div className="flex min-h-0 flex-col">
            <div className="grid grid-cols-3 divide-x border-b bg-zinc-50 py-3 text-center dark:bg-zinc-800/50">
              <OpnameMetric label="Diperiksa" value={summary.checked} />
              <OpnameMetric label="Sesuai" value={summary.match} tone="text-emerald-600" />
              <OpnameMetric label="Selisih" value={summary.mismatch} tone="text-red-600" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {countedRows.length === 0 ? (
                <div className="flex min-h-60 flex-col items-center justify-center text-center">
                  <ScanLine size={32} className="text-zinc-300" />
                  <p className="mt-3 text-sm font-bold">Belum ada implant dihitung</p>
                  <p className="mt-1 max-w-sm text-xs text-zinc-500">
                    Scan barcode/angka secara berulang atau cari item secara manual.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {countedRows.map(({ row, physical: physicalQty, difference }) => (
                    <article key={row.No} className="rounded-xl border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">{row.NoStok}</p>
                          <p className="line-clamp-1 text-[11px] text-zinc-500">
                            {row.Deskripsi} · LOT {row.Batch || "-"}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
                            difference === 0
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {difference === 0 ? "Sesuai" : `Selisih ${difference > 0 ? "+" : ""}${difference}`}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                        <div className="rounded-lg bg-zinc-50 p-2 text-center dark:bg-zinc-800">
                          <p className="text-lg font-black">{row.TotalQty}</p>
                          <p className="text-[9px] text-zinc-400">Sistem</p>
                        </div>
                        <span className="text-zinc-300">→</span>
                        <div className="flex items-center justify-center gap-2 rounded-lg bg-violet-50 p-1.5 dark:bg-violet-950/30">
                          <button type="button" onClick={() => addCount(row, -1)} className="flex size-8 items-center justify-center rounded-md bg-white shadow-sm dark:bg-zinc-800"><Minus size={13} /></button>
                          <span className="min-w-7 text-center text-lg font-black">{physicalQty}</span>
                          <button type="button" onClick={() => addCount(row, 1)} className="flex size-8 items-center justify-center rounded-md bg-white shadow-sm dark:bg-zinc-800"><Plus size={13} /></button>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setPhysical((current) => {
                              const next = { ...current };
                              delete next[row.No];
                              return next;
                            })
                          }
                          className="p-2 text-zinc-400 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-2 border-t p-3 sm:px-4">
              <button
                type="button"
                onClick={() => setPhysical({})}
                disabled={countedRows.length === 0}
                className="text-xs font-semibold text-zinc-500 disabled:opacity-40"
              >
                Reset opname
              </button>
              <button
                type="button"
                onClick={exportCsv}
                disabled={countedRows.length === 0}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-bold text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
              >
                <Download size={14} /> Export hasil
              </button>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
}

function OpnameMetric({
  label,
  value,
  tone = "text-zinc-900 dark:text-white",
}: {
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div>
      <p className={`text-xl font-black ${tone}`}>{value}</p>
      <p className="text-[10px] text-zinc-500">{label}</p>
    </div>
  );
}
