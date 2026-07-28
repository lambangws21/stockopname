"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  MessageCircle,
  PackageX,
  Share2,
  X,
} from "lucide-react";
import type { StockRow } from "@/types/stock";

export default function LowStockAlertModal({
  open,
  rows,
  threshold,
  onClose,
  onShowStatus,
}: {
  open: boolean;
  rows: StockRow[];
  threshold: number;
  onClose: () => void;
  onShowStatus: (status: "LOW" | "OUT") => void;
}) {
  const [logisticsNote, setLogisticsNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [excludedBrands, setExcludedBrands] = useState<Set<string>>(new Set());

  const warningRows = useMemo(
    () =>
      rows.filter((row) => Number(row.TotalQty || 0) <= threshold),
    [rows, threshold]
  );
  const warningBrands = useMemo(
    () =>
      Array.from(
        new Set(
          warningRows
            .filter((row) => Number(row.TotalQty || 0) > 0)
            .map((row) => row.Brand || "TANPA BRAND")
        )
      ).sort(),
    [warningRows]
  );
  const selectedRows = useMemo(
    () =>
      warningRows.filter(
        (row) =>
          !excludedKeys.has(stockRowKey(row)) &&
          (Number(row.TotalQty || 0) <= 0 ||
            !excludedBrands.has(row.Brand || "TANPA BRAND"))
      ),
    [warningRows, excludedKeys, excludedBrands]
  );
  const shareText = useMemo(
    () => buildLogisticsMessage(selectedRows, threshold, logisticsNote),
    [selectedRows, threshold, logisticsNote]
  );

  if (!open) return null;

  const outOfStock = rows.filter((row) => Number(row.TotalQty || 0) <= 0);
  const lowStock = rows.filter((row) => {
    const qty = Number(row.TotalQty || 0);
    return qty > 0 && qty <= threshold;
  });
  const activeBrands = warningBrands.filter(
    (brand) => !excludedBrands.has(brand)
  );
  const visibleOutOfStock = outOfStock;
  const visibleLowStock = lowStock.filter(
    (row) => !excludedBrands.has(row.Brand || "TANPA BRAND")
  );

  if (outOfStock.length === 0 && lowStock.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[10030] flex items-end justify-center bg-zinc-950/60 backdrop-blur-sm sm:items-center sm:p-4">
      <section className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl">
        <header className="flex items-start justify-between gap-3 border-b bg-linear-to-r from-red-600 to-orange-500 px-5 py-5 text-white">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
              <AlertTriangle size={23} />
            </span>
            <div>
              <h2 className="text-lg font-bold">Peringatan Stok Implant</h2>
              <p className="mt-1 text-xs text-red-50">
                Periksa item berikut sebelum kebutuhan operasi berikutnya.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 p-2 hover:bg-white/20"
            aria-label="Tutup peringatan"
          >
            <X size={17} />
          </button>
        </header>

        <div className="grid grid-cols-2 divide-x border-b bg-zinc-50/70 text-center dark:bg-zinc-950/40">
          <button
            type="button"
            onClick={() => onShowStatus("OUT")}
            className="px-4 py-3 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <p className="text-2xl font-black text-red-600">
              {visibleOutOfStock.length}
            </p>
            <p className="text-[10px] font-semibold text-zinc-500">Stok habis</p>
          </button>
          <button
            type="button"
            onClick={() => onShowStatus("LOW")}
            className="px-4 py-3 hover:bg-amber-50 dark:hover:bg-amber-950/20"
          >
            <p className="text-2xl font-black text-amber-600">
              {visibleLowStock.length}
            </p>
            <p className="text-[10px] font-semibold text-zinc-500">
              Stok ≤ {threshold}
            </p>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <section className="overflow-hidden rounded-2xl border border-blue-100 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/20">
            <div className="border-b border-blue-100 bg-white/70 px-3.5 py-3 dark:border-blue-900 dark:bg-zinc-900/60">
              <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                Brand stok menipis yang ditampilkan
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {activeBrands.length > 0 ? (
                  activeBrands.map((brand) => (
                    <span
                      key={brand}
                      className="rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-bold text-white"
                    >
                      {brand}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-600">
                    {warningBrands.length === 0
                      ? "Tidak ada stok menipis"
                      : "Tidak ada brand dipilih"}
                  </span>
                )}
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[10px] font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
                  Stok 0: semua brand
                </span>
              </div>
            </div>

            <div className="p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Share2 size={15} />
                <h3 className="text-xs font-bold">Bagikan Info Logistik</h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold dark:bg-blue-900">
                  {selectedRows.length} dipilih
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedRows.length === warningRows.length) {
                    setExcludedKeys(new Set(warningRows.map(stockRowKey)));
                  } else {
                    setExcludedKeys(new Set());
                    setExcludedBrands(new Set());
                  }
                }}
                className="text-[10px] font-bold text-blue-600 hover:underline"
              >
                {selectedRows.length === warningRows.length
                  ? "Kosongkan pilihan"
                  : "Pilih semua"}
              </button>
            </div>

            <div className="mt-3 rounded-xl border border-blue-100 bg-white/70 p-2.5 dark:border-blue-900 dark:bg-zinc-900/70">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold text-zinc-600 dark:text-zinc-300">
                  Filter brand stok menipis
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setExcludedBrands(
                      excludedBrands.size === 0
                        ? new Set(warningBrands)
                        : new Set()
                    )
                  }
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  {excludedBrands.size === 0
                    ? "Kosongkan brand"
                    : "Pilih semua brand"}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {warningBrands.map((brand) => {
                  const checked = !excludedBrands.has(brand);
                  const count = warningRows.filter(
                    (row) =>
                      Number(row.TotalQty || 0) > 0 &&
                      (row.Brand || "TANPA BRAND") === brand
                  ).length;
                  return (
                    <label
                      key={brand}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-[10px] font-bold ${
                        checked
                          ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          toggleToken(brand, setExcludedBrands)
                        }
                        className="size-3.5 rounded accent-blue-600"
                      />
                      {brand}
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] dark:bg-zinc-900">
                        {count}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <button
                type="button"
                disabled={selectedRows.length === 0}
                onClick={() => void shareWarning(shareText)}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Share2 size={14} />
                Bagikan
              </button>
              <button
                type="button"
                disabled={selectedRows.length === 0}
                onClick={() => openWhatsApp(shareText)}
                className="flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MessageCircle size={14} />
                WhatsApp
              </button>
              <button
                type="button"
                disabled={selectedRows.length === 0}
                onClick={async () => {
                  await navigator.clipboard.writeText(shareText);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1800);
                }}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border bg-white px-3 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-900"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Tersalin" : "Salin pesan"}
              </button>
            </div>

            <textarea
              value={logisticsNote}
              onChange={(event) => setLogisticsNote(event.target.value)}
              rows={2}
              placeholder="Catatan logistik, contoh: Dibutuhkan sebelum operasi hari Jumat."
              className="mt-2.5 w-full resize-none rounded-xl border bg-white px-3 py-2 text-xs outline-none focus:border-blue-400 dark:bg-zinc-900"
            />
            </div>
          </section>

          {visibleOutOfStock.length > 0 && (
            <AlertGroup
              title="Stok Habis"
              rows={visibleOutOfStock}
              tone="red"
              excludedKeys={excludedKeys}
              excludedBrands={excludedBrands}
              onToggle={(row) => toggleExcluded(row, setExcludedKeys)}
            />
          )}
          {visibleLowStock.length > 0 && (
            <AlertGroup
              title={`Stok Menipis (maks. ${threshold})`}
              rows={visibleLowStock}
              tone="amber"
              excludedKeys={excludedKeys}
              excludedBrands={excludedBrands}
              onToggle={(row) => toggleExcluded(row, setExcludedKeys)}
            />
          )}
          {activeBrands.length === 0 && lowStock.length > 0 && (
            <div className="rounded-2xl border border-dashed p-6 text-center">
              <PackageX className="mx-auto text-zinc-300" size={28} />
              <p className="mt-2 text-xs font-bold text-zinc-600 dark:text-zinc-300">
                Tidak ada brand stok menipis dipilih
              </p>
              <p className="mt-1 text-[10px] text-zinc-400">
                Stok habis tetap ditampilkan. Centang brand untuk melihat stok menipis.
              </p>
            </div>
          )}
        </div>

        <footer className="flex flex-col gap-2 border-t p-3 sm:flex-row sm:justify-end sm:px-5">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-xl border px-4 text-xs font-semibold"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={() => onShowStatus(outOfStock.length > 0 ? "OUT" : "LOW")}
            className="h-10 rounded-xl bg-red-600 px-4 text-xs font-semibold text-white hover:bg-red-500"
          >
            Tampilkan di tabel
          </button>
        </footer>
      </section>
    </div>
  );
}

function stockRowKey(row: StockRow) {
  return `${row.No}:${row.NoStok}:${row.Batch}`;
}

function toggleExcluded(
  row: StockRow,
  setExcludedKeys: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  const key = stockRowKey(row);
  setExcludedKeys((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
}

function toggleToken(
  token: string,
  setter: React.Dispatch<React.SetStateAction<Set<string>>>
) {
  setter((current) => {
    const next = new Set(current);
    if (next.has(token)) next.delete(token);
    else next.add(token);
    return next;
  });
}

function buildLogisticsMessage(
  rows: StockRow[],
  threshold: number,
  note: string
) {
  const out = rows.filter((row) => Number(row.TotalQty || 0) <= 0);
  const low = rows.filter((row) => {
    const qty = Number(row.TotalQty || 0);
    return qty > 0 && qty <= threshold;
  });
  const lines = [
    "⚠️ *INFO LOGISTIK — WARNING STOCK IMPLANT*",
    "",
    `🔴 Stok habis: ${out.length} item`,
    `🟠 Stok menipis: ${low.length} item`,
  ];

  if (out.length) {
    lines.push("", "*STOK HABIS*");
    out.forEach((row, index) => {
      lines.push(formatWarningRow(row, index + 1));
    });
  }
  if (low.length) {
    lines.push("", "*AKAN HABIS JIKA DIGUNAKAN*");
    low.forEach((row, index) => {
      lines.push(formatWarningRow(row, index + 1));
    });
  }
  if (note.trim()) {
    lines.push("", `📝 Catatan logistik: ${note.trim()}`);
  }
  lines.push(
    "",
    "Mohon segera dicek dan dijadwalkan refill agar kebutuhan operasi tidak terhambat."
  );
  return lines.join("\n");
}

function formatWarningRow(row: StockRow, index: number) {
  return `${index}. ${row.NoStok || "Tanpa REF"} | ${
    row.Deskripsi || "Tanpa deskripsi"
  } | ${row.Brand || "-"} | ${row.Implant || "-"} | LOT ${
    row.Batch || "-"
  } | Sisa ${Number(row.TotalQty || 0)}`;
}

async function shareWarning(text: string) {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "Warning Stock Implant",
        text,
      });
      return;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
    }
  }
  await navigator.clipboard.writeText(text);
}

function openWhatsApp(text: string) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function AlertGroup({
  title,
  rows,
  tone,
  excludedKeys,
  excludedBrands,
  onToggle,
}: {
  title: string;
  rows: StockRow[];
  tone: "red" | "amber";
  excludedKeys: Set<string>;
  excludedBrands: Set<string>;
  onToggle: (row: StockRow) => void;
}) {
  const styles =
    tone === "red"
      ? "border-red-100 bg-red-50/60 text-red-700 dark:border-red-900 dark:bg-red-950/20"
      : "border-amber-100 bg-amber-50/60 text-amber-700 dark:border-amber-900 dark:bg-amber-950/20";

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <PackageX size={15} className={tone === "red" ? "text-red-600" : "text-amber-600"} />
        <h3 className="text-xs font-bold">{title}</h3>
        <span className="text-[10px] text-zinc-400">({rows.length} item)</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const brandSelected =
            Number(row.TotalQty || 0) <= 0 ||
            !excludedBrands.has(row.Brand || "TANPA BRAND");
          const rowSelected =
            brandSelected && !excludedKeys.has(stockRowKey(row));
          return (
          <article
            key={stockRowKey(row)}
            className={`rounded-xl border p-3 ${styles} ${
              rowSelected ? "ring-2 ring-blue-500/40" : "opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <label className="flex shrink-0 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={rowSelected}
                  disabled={!brandSelected}
                  onChange={() => onToggle(row)}
                  className="size-4 rounded border-zinc-300 accent-blue-600"
                  aria-label={`Pilih ${row.NoStok || row.Deskripsi}`}
                />
              </label>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold">
                  {row.NoStok || "Tanpa REF"} · {row.Brand || "Tanpa brand"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">
                  {row.Deskripsi}
                </p>
                <p className="mt-1 text-[10px] text-zinc-500">
                  {row.Implant || "Tanpa kategori"} · LOT {row.Batch || "-"}
                </p>
                {tone === "red" && (
                  <p className="mt-2 rounded-lg bg-red-600 px-2 py-1.5 text-[10px] font-bold text-white">
                    WARNING: Implant habis dan tidak tersedia lagi — segera refill.
                  </p>
                )}
                {tone === "amber" && (
                  <p className="mt-2 rounded-lg bg-amber-500 px-2 py-1.5 text-[10px] font-bold text-white">
                    WARNING: Jika implant ini digunakan lagi, stok akan habis dan tidak tersedia.
                  </p>
                )}
              </div>
              <div className="shrink-0 text-center">
                <p className="text-xl font-black">{Number(row.TotalQty || 0)}</p>
                <p className="text-[9px] font-semibold">tersisa</p>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
