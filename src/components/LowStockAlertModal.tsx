"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Copy,
  MessageCircle,
  PackageX,
  FileSpreadsheet,
  LoaderCircle,
  Search,
  Share2,
  X,
} from "lucide-react";
import type { StockRow } from "@/types/stock";
import { isDiscontinuedStock, isSupportCenterStock } from "@/lib/stockStatus";
import { toast } from "sonner";

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
  const [shareExpanded, setShareExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [brandFilter, setBrandFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OUT" | "LOW">("ALL");
  const [selectionPreset, setSelectionPreset] = useState<"ALL" | "OUT" | "LOW" | "CUSTOM">("OUT");
  const [requestingKeys, setRequestingKeys] = useState<Set<string>>(new Set());
  const [orderedKeys, setOrderedKeys] = useState<Set<string>>(new Set());
  const [visibleLimit, setVisibleLimit] = useState(40);

  const warningRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          !isDiscontinuedStock(row) && !isSupportCenterStock(row) && Number(row.TotalQty || 0) <= threshold
      ),
    [rows, threshold]
  );
  const warningBrands = useMemo(
    () =>
      Array.from(
        new Set(
          warningRows.map((row) => row.Brand || "TANPA BRAND")
        )
      ).sort(),
    [warningRows]
  );
  const selectedRows = useMemo(
    () =>
      warningRows.filter((row) => {
        const qty = Number(row.TotalQty || 0);
        const text = [row.NoStok, row.Deskripsi, row.Batch, row.Brand, row.Implant]
          .join(" ")
          .toLowerCase();
        const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
        const matchesBrand = brandFilter === "ALL" || (row.Brand || "TANPA BRAND") === brandFilter;
        const matchesStatus = statusFilter === "ALL" || (statusFilter === "OUT" ? qty <= 0 : qty > 0);
        const matchesPreset = selectionPreset === "ALL" || selectionPreset === "CUSTOM" || (selectionPreset === "OUT" ? qty <= 0 : qty > 0);
        return matchesQuery && matchesBrand && matchesStatus && matchesPreset && !excludedKeys.has(stockRowKey(row));
      }),
    [brandFilter, excludedKeys, query, selectionPreset, statusFilter, warningRows]
  );
  const shareText = useMemo(
    () => buildLogisticsMessage(selectedRows, threshold, logisticsNote),
    [selectedRows, threshold, logisticsNote]
  );
  const selectedRowKeys = useMemo(
    () => new Set(selectedRows.map(stockRowKey)),
    [selectedRows]
  );

  if (!open) return null;

  const outOfStock = rows.filter(
    (row) => !isDiscontinuedStock(row) && !isSupportCenterStock(row) && Number(row.TotalQty || 0) <= 0
  );
  const lowStock = rows.filter((row) => {
    const qty = Number(row.TotalQty || 0);
    return !isDiscontinuedStock(row) && !isSupportCenterStock(row) && qty > 0 && qty <= threshold;
  });
  const matchesVisibleFilter = (row: StockRow) => {
    const text = [row.NoStok, row.Deskripsi, row.Batch, row.Brand, row.Implant]
      .join(" ")
      .toLowerCase();
    return (
      (!query.trim() || text.includes(query.trim().toLowerCase())) &&
      (brandFilter === "ALL" || (row.Brand || "TANPA BRAND") === brandFilter)
    );
  };
  const visibleOutOfStock = statusFilter === "LOW" ? [] : outOfStock.filter(matchesVisibleFilter);
  const visibleLowStock = statusFilter === "OUT" ? [] : lowStock.filter(matchesVisibleFilter);
  const renderedOutOfStock = visibleOutOfStock.slice(0, visibleLimit);
  const renderedLowStock = visibleLowStock.slice(
    0,
    Math.max(0, visibleLimit - renderedOutOfStock.length)
  );
  const renderedCount = renderedOutOfStock.length + renderedLowStock.length;
  const filteredCount = visibleOutOfStock.length + visibleLowStock.length;

  async function markOrdered(row: StockRow) {
    const key = stockRowKey(row);
    setRequestingKeys((current) => new Set(current).add(key));
    try {
      const response = await fetch("/api/super-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "warningQuickAction",
          StockSheet: "Sheet1",
          No: row.No,
          NoStok: row.NoStok,
          Batch: row.Batch,
          WorkflowStatus: "SEDANG DIPESAN",
          by: "Warning Stock Modal",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Gagal menandai");
      setOrderedKeys((current) => new Set(current).add(key));
      toast.success(`${row.NoStok || "Implant"} ditandai sedang dipesan`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Quick action gagal");
    } finally {
      setRequestingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }

  function toggleRowSelection(row: StockRow) {
    const key = stockRowKey(row);
    const desired = new Set(selectedRows.map(stockRowKey));
    if (desired.has(key)) desired.delete(key);
    else desired.add(key);
    setSelectionPreset("CUSTOM");
    setExcludedKeys(
      new Set(
        warningRows
          .map(stockRowKey)
          .filter((warningKey) => !desired.has(warningKey))
      )
    );
  }

  if (outOfStock.length === 0 && lowStock.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[10030] flex items-end justify-center bg-zinc-950/60 backdrop-blur-sm sm:items-center sm:p-4">
      <section className="flex max-h-[96dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:max-h-[92vh] sm:rounded-3xl">
        <header className="relative flex items-start justify-between gap-3 border-b bg-[#991b1b] px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] text-white sm:px-5 sm:py-5">
          <span className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-white/30 sm:hidden" />
          <div className="flex gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 sm:size-11">
              <AlertTriangle size={21} />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-red-200">
                Perlu tindakan logistik
              </p>
              <h2 className="mt-0.5 text-base font-black sm:text-lg">Warning Stock Implant</h2>
              <p className="mt-1 hidden text-xs text-red-50 sm:block">
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

        <div className="grid grid-cols-2 gap-2 border-b bg-slate-50 p-2.5 text-left dark:bg-zinc-950/40 sm:p-3">
          <button
            type="button"
            onClick={() => onShowStatus("OUT")}
            className="rounded-xl border border-red-100 bg-white px-3 py-2.5 hover:bg-red-50 dark:border-red-900 dark:bg-zinc-900 dark:hover:bg-red-950/20 sm:rounded-2xl sm:px-4 sm:py-3"
          >
            <p className="text-xl font-black text-red-600 sm:text-2xl">
              {visibleOutOfStock.length}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Stok habis</p>
            <p className="mt-0.5 text-[9px] text-zinc-400">Harus segera direfill</p>
          </button>
          <button
            type="button"
            onClick={() => onShowStatus("LOW")}
            className="rounded-xl border border-amber-100 bg-white px-3 py-2.5 hover:bg-amber-50 dark:border-amber-900 dark:bg-zinc-900 dark:hover:bg-amber-950/20 sm:rounded-2xl sm:px-4 sm:py-3"
          >
            <p className="text-xl font-black text-amber-600 sm:text-2xl">
              {visibleLowStock.length}
            </p>
            <p className="text-[10px] font-semibold text-zinc-500">
              Stok menipis
            </p>
            <p className="mt-0.5 text-[9px] text-zinc-400">Tersisa maks. {threshold}</p>
          </button>
        </div>

        <div className="border-b bg-white p-2.5 dark:bg-zinc-900 sm:p-3">
          <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_140px_130px]">
            <label className="relative">
              <Search size={15} className="absolute left-3 top-3.5 text-zinc-400" />
              <input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleLimit(40); }} placeholder="Cari REF, nama, LOT..." className="h-11 w-full rounded-xl border bg-transparent pl-9 pr-9 text-xs outline-none focus:border-blue-500" />
              {query && <button type="button" onClick={() => setQuery("")} className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-lg text-zinc-400" aria-label="Hapus pencarian"><X size={13} /></button>}
            </label>
            <select value={brandFilter} onChange={(event) => { setBrandFilter(event.target.value); setVisibleLimit(40); }} className="h-11 rounded-xl border bg-white px-3 text-xs font-bold dark:bg-zinc-900">
              <option value="ALL">Semua brand</option>
              {warningBrands.map((brand) => <option key={brand}>{brand}</option>)}
            </select>
            <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as "ALL" | "OUT" | "LOW"); setVisibleLimit(40); }} className="h-11 rounded-xl border bg-white px-3 text-xs font-bold dark:bg-zinc-900">
              <option value="ALL">Semua status</option>
              <option value="OUT">Habis</option>
              <option value="LOW">Menipis</option>
            </select>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-2.5 dark:bg-zinc-950/50 sm:space-y-4 sm:p-5">
          <section className="overflow-hidden rounded-2xl border bg-white dark:bg-zinc-900">
            <div className="p-3.5">
            <button
              type="button"
              onClick={() => setShareExpanded((value) => !value)}
              className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
              aria-expanded={shareExpanded}
            >
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Share2 size={15} />
                <h3 className="text-xs font-bold">Bagikan Info Logistik</h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold dark:bg-blue-900">
                  {selectedRows.length} dipilih
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600">
                {shareExpanded ? "Tutup" : "Buka"}
                <ChevronDown
                  size={13}
                  className={`transition ${shareExpanded ? "rotate-180" : ""}`}
                />
              </span>
            </button>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
              {([[
                "OUT",
                `Habis (${outOfStock.length})`,
              ], ["LOW", `Menipis (${lowStock.length})`], ["ALL", `Semua (${warningRows.length})`]] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => { setSelectionPreset(value); setExcludedKeys(new Set()); }} className={`h-9 rounded-lg px-1 text-[9px] font-black transition ${selectionPreset === value ? "bg-blue-600 text-white shadow-sm" : "text-zinc-500"}`}>{label}</button>
              ))}
            </div>

            {shareExpanded && (
            <>
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
            </>
            )}
            </div>
          </section>

          {renderedOutOfStock.length > 0 && (
            <AlertGroup
              title="Stok Habis"
              rows={renderedOutOfStock}
              tone="red"
              selectedKeys={selectedRowKeys}
              onToggle={toggleRowSelection}
              requestingKeys={requestingKeys}
              orderedKeys={orderedKeys}
              onMarkOrdered={(row) => void markOrdered(row)}
            />
          )}
          {renderedLowStock.length > 0 && (
            <AlertGroup
              title={`Stok Menipis (maks. ${threshold})`}
              rows={renderedLowStock}
              tone="amber"
              selectedKeys={selectedRowKeys}
              onToggle={toggleRowSelection}
              requestingKeys={requestingKeys}
              orderedKeys={orderedKeys}
              onMarkOrdered={(row) => void markOrdered(row)}
            />
          )}
          {renderedCount < filteredCount && (
            <button type="button" onClick={() => setVisibleLimit((current) => current + 40)} className="flex h-11 w-full items-center justify-center rounded-xl border bg-white text-xs font-black text-blue-600 dark:bg-zinc-900">
              Muat 40 berikutnya · {filteredCount - renderedCount} tersisa
            </button>
          )}
        </div>

        <footer className="grid grid-cols-3 gap-2 border-t bg-white px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 dark:bg-zinc-900 sm:flex sm:justify-end sm:px-5 sm:pb-3">
          <Link href="/logistik" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-xl border px-2 text-[9px] font-bold sm:px-4 sm:text-xs">
            Halaman penuh
          </Link>
          <button type="button" disabled={selectedRows.length === 0} onClick={() => void exportWarningExcel(selectedRows)} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-[9px] font-bold disabled:opacity-40 sm:px-4 sm:text-xs">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button
            type="button"
            onClick={() => onShowStatus(outOfStock.length > 0 ? "OUT" : "LOW")}
            className="h-10 rounded-xl bg-red-600 px-2 text-[9px] font-bold text-white hover:bg-red-500 sm:px-4 sm:text-xs"
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
    "⚠️ *STOK IMPLANT*",
    `Habis ${out.length} • Menipis ${low.length}`,
  ];

  if (out.length) {
    lines.push("", "*HABIS*");
    out.forEach((row, index) => {
      lines.push(formatWarningRow(row, index + 1));
    });
  }
  if (low.length) {
    lines.push("", "*MENIPIS*");
    low.forEach((row, index) => {
      lines.push(formatWarningRow(row, index + 1));
    });
  }
  if (note.trim()) {
    lines.push("", `Catatan: ${note.trim()}`);
  }
  lines.push("", "Mohon dicek/refill.");
  return lines.join("\n");
}

function formatWarningRow(row: StockRow, index: number) {
  return `${index}. ${row.Brand || "-"} • ${row.NoStok || "Tanpa REF"} • ${compactShareName(row.Deskripsi)} • ${Number(row.TotalQty || 0)} pcs`;
}

function compactShareName(value: unknown) {
  const name = String(value || "Tanpa deskripsi").trim();
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
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

async function exportWarningExcel(rows: StockRow[]) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Warning Stock");
  sheet.columns = [
    { header: "Status", key: "status", width: 14 },
    { header: "Brand", key: "brand", width: 14 },
    { header: "REF", key: "ref", width: 20 },
    { header: "Deskripsi", key: "description", width: 52 },
    { header: "Kategori", key: "category", width: 22 },
    { header: "LOT", key: "lot", width: 18 },
    { header: "Sisa", key: "stock", width: 10 },
  ];
  rows.forEach((row) => sheet.addRow({
    status: Number(row.TotalQty || 0) <= 0 ? "HABIS" : "MENIPIS",
    brand: row.Brand || "-",
    ref: row.NoStok || "-",
    description: row.Deskripsi || "-",
    category: row.Implant || "-",
    lot: row.Batch || "-",
    stock: Number(row.TotalQty || 0),
  }));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF991B1B" } };
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = { from: "A1", to: `G${Math.max(1, rows.length + 1)}` };
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `warning-stock-${new Date().toISOString().slice(0, 10)}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function AlertGroup({
  title,
  rows,
  tone,
  selectedKeys,
  onToggle,
  requestingKeys,
  orderedKeys,
  onMarkOrdered,
}: {
  title: string;
  rows: StockRow[];
  tone: "red" | "amber";
  selectedKeys: Set<string>;
  onToggle: (row: StockRow) => void;
  requestingKeys: Set<string>;
  orderedKeys: Set<string>;
  onMarkOrdered: (row: StockRow) => void;
}) {
  const styles =
    tone === "red"
      ? "border-red-100 border-l-red-500 dark:border-red-900 dark:border-l-red-500"
      : "border-amber-100 border-l-amber-500 dark:border-amber-900 dark:border-l-amber-500";

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex size-7 items-center justify-center rounded-lg ${
          tone === "red" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
        }`}>
          <PackageX size={14} />
        </span>
        <div>
          <h3 className="text-xs font-black">{title}</h3>
          <p className="text-[9px] text-zinc-400">{rows.length} implant perlu diperiksa</p>
        </div>
      </div>
      <div className="space-y-2">
        {rows.map((row) => {
          const rowSelected = selectedKeys.has(stockRowKey(row));
          return (
          <article
            key={stockRowKey(row)}
            className={`rounded-xl border border-l-4 bg-white p-3 shadow-sm dark:bg-zinc-900 sm:rounded-2xl sm:p-3.5 ${styles} ${
              rowSelected ? "" : "opacity-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <label className="flex shrink-0 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={rowSelected}
                  onChange={() => onToggle(row)}
                  className="size-5 rounded border-zinc-300 accent-blue-600"
                  aria-label={`Pilih ${row.NoStok || row.Deskripsi}`}
                />
              </label>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`rounded-md px-2 py-1 text-[9px] font-black ${
                    tone === "red"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}>
                    {tone === "red" ? "HABIS" : "MENIPIS"}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {row.Brand || "Tanpa brand"}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {row.Implant || "Tanpa kategori"}
                  </span>
                </div>
                <p className="mt-1.5 text-xs font-black text-zinc-900 dark:text-white sm:mt-2">
                  {row.NoStok || "Tanpa REF"}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-zinc-600 dark:text-zinc-300">
                  {row.Deskripsi}
                </p>
                <p className="mt-1 hidden text-[10px] text-zinc-500 sm:block">
                  LOT / Batch: <b>{row.Batch || "-"}</b>
                </p>
                <p className={`mt-1.5 text-[9px] font-semibold sm:mt-2 sm:text-[10px] ${
                  tone === "red" ? "text-red-600" : "text-amber-600"
                }`}>
                  {tone === "red"
                    ? "Tidak tersedia — segera jadwalkan refill."
                    : "Jika digunakan lagi, stok akan habis."}
                </p>
                <button
                  type="button"
                  disabled={requestingKeys.has(stockRowKey(row)) || orderedKeys.has(stockRowKey(row))}
                  onClick={() => onMarkOrdered(row)}
                  className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[9px] font-black text-blue-700 disabled:opacity-60 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                >
                  {requestingKeys.has(stockRowKey(row)) ? <LoaderCircle size={12} className="animate-spin" /> : orderedKeys.has(stockRowKey(row)) ? <Check size={12} /> : <Share2 size={12} />}
                  {orderedKeys.has(stockRowKey(row)) ? "Sudah dipesan" : "Tandai dipesan"}
                </button>
              </div>
              <div className={`shrink-0 rounded-lg px-2 py-1.5 text-center sm:rounded-xl sm:px-2.5 sm:py-2 ${
                tone === "red"
                  ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
              }`}>
                <p className="text-lg font-black sm:text-xl">{Number(row.TotalQty || 0)}</p>
                <p className="text-[8px] font-bold uppercase">Sisa</p>
              </div>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}
