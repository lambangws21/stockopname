"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardSignature,
  Copy,
  LoaderCircle,
  LayoutGrid,
  MessageCircle,
  PackageCheck,
  RefreshCcw,
  Search,
  Settings2,
  Table2,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getStockWarnings, updateStockWarning } from "@/lib/logistics";
import { gasGET } from "@/lib/gas";
import { isDiscontinuedStock, isSupportCenterStock } from "@/lib/stockStatus";
import type { StockRow } from "@/types/stock";
import type {
  LogisticsWorkflowStatus,
  StockWarningRow,
} from "@/types/logistics";
import LogisticsMovementSummary from "@/components/logistics/LogisticsMovementSummary";

const WORKFLOW_OPTIONS: LogisticsWorkflowStatus[] = [
  "BELUM DIPROSES",
  "SUDAH DIINFORMASIKAN",
  "SEDANG DIPESAN",
  "DALAM PENGIRIMAN",
  "SELESAI",
  "DISCONTINUE",
];

export default function LogisticsDashboardPage() {
  const [rows, setRows] = useState<StockWarningRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("ALL");
  const [workflow, setWorkflow] = useState("ALL");
  const [stockStatus, setStockStatus] = useState<"ALL" | "EMPTY" | "LOW">("ALL");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [focus, setFocus] = useState<"LOW" | "REQUEST" | "ORDERED">("LOW");
  const [showMovement, setShowMovement] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [editingRow, setEditingRow] = useState<StockWarningRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [warnings, stockResult] = await Promise.all([
        getStockWarnings(false),
        gasGET("Sheet1"),
      ]);
      const currentStock = stockResult.data ?? [];
      const stockByRow = new Map(currentStock.map((item) => [Number(item.No), item]));
      const stockByIdentity = new Map(
        currentStock.map((item) => [stockIdentity(item.NoStok, item.Batch), item])
      );
      const synchronizedWarnings = warnings
        .map((warning) => {
          const current =
            stockByRow.get(Number(warning.No)) ||
            stockByIdentity.get(stockIdentity(warning.NoStok, warning.Batch));
          if (!current || isDiscontinuedStock(current) || isSupportCenterStock(current)) return null;
          return {
            ...warning,
            No: current.No,
            NoStok: String(current.NoStok || warning.NoStok || ""),
            Deskripsi: String(current.Deskripsi || warning.Deskripsi || ""),
            Implant: String(current.Implant || warning.Implant || ""),
            Brand: String(current.Brand || warning.Brand || ""),
            Batch: String(current.Batch || warning.Batch || ""),
            SisaStock: Number(current.TotalQty || 0),
          } satisfies StockWarningRow;
        })
        .filter((item): item is StockWarningRow => Boolean(item))
        .filter((item) => Number(item.SisaStock) <= 1);
      setStock(currentStock);
      setRows(synchronizedWarnings);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data gagal dimuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return rows.filter((row) => {
      if (
        focus === "REQUEST" &&
        row.WorkflowStatus &&
        row.WorkflowStatus !== "BELUM DIPROSES" &&
        row.WorkflowStatus !== "SUDAH DIINFORMASIKAN"
      ) return false;
      if (
        focus === "ORDERED" &&
        row.WorkflowStatus !== "SEDANG DIPESAN" &&
        row.WorkflowStatus !== "DALAM PENGIRIMAN"
      ) return false;
      if (brand !== "ALL" && row.Brand !== brand) return false;
      if (workflow !== "ALL" && row.WorkflowStatus !== workflow) return false;
      if (stockStatus === "EMPTY" && Number(row.SisaStock) > 0) return false;
      if (stockStatus === "LOW" && Number(row.SisaStock) !== 1) return false;
      if (!query) return true;
      return [row.NoStok, row.Deskripsi, row.Batch, row.Implant, row.PIC]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [brand, focus, rows, search, stockStatus, workflow]);

  const groupedFiltered = useMemo(() => groupWarningRows(filtered), [filtered]);
  const picSuggestions = useMemo(
    () => Array.from(new Set(rows.map((row) => row.PIC?.trim()).filter(Boolean))).sort(),
    [rows]
  );
  const hasDetailedFilter = search.trim() || brand !== "ALL" || workflow !== "ALL" || stockStatus !== "ALL";

  const summary = useMemo(
    () => ({
      critical: rows.filter((row) => Number(row.SisaStock) <= 0).length,
      pending: rows.filter(
        (row) => !row.WorkflowStatus || row.WorkflowStatus === "BELUM DIPROSES"
      ).length,
      request: rows.filter(
        (row) =>
          !row.WorkflowStatus ||
          row.WorkflowStatus === "BELUM DIPROSES" ||
          row.WorkflowStatus === "SUDAH DIINFORMASIKAN"
      ).length,
      ordered: rows.filter((row) => row.WorkflowStatus === "SEDANG DIPESAN")
        .length,
      shipping: rows.filter(
        (row) => row.WorkflowStatus === "DALAM PENGIRIMAN"
      ).length,
      low: rows.length,
      requested: rows.filter(
        (row) =>
          row.WorkflowStatus === "SEDANG DIPESAN" ||
          row.WorkflowStatus === "DALAM PENGIRIMAN"
      ).length,
    }),
    [rows]
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedKeys.has(warningKey(row))),
    [rows, selectedKeys]
  );
  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((row) => selectedKeys.has(warningKey(row)));
  const requestMessage = useMemo(
    () => buildRequestMessage(selectedRows),
    [selectedRows]
  );

  function toggleSelected(row: StockWarningRow) {
    const key = warningKey(row);
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAllFiltered() {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (allFilteredSelected) filtered.forEach((row) => next.delete(warningKey(row)));
      else filtered.forEach((row) => next.add(warningKey(row)));
      return next;
    });
  }

  async function save(row: StockWarningRow, patch: Partial<StockWarningRow>) {
    const next = { ...row, ...patch };
    setSavingRow(row.Row);
    try {
      const updated = await updateStockWarning({
        Row: row.Row,
        WorkflowStatus:
          next.WorkflowStatus || ("BELUM DIPROSES" as LogisticsWorkflowStatus),
        PIC: next.PIC,
        TargetRefill: next.TargetRefill,
        LogisticsNote: next.LogisticsNote,
        by: "Logistik",
      });
      if (
        updated?.WorkflowStatus === "SELESAI" ||
        updated?.WorkflowStatus === "DISCONTINUE"
      ) {
        setRows((current) => current.filter((item) => item.Row !== row.Row));
      } else if (updated) {
        setRows((current) =>
          current.map((item) => (item.Row === row.Row ? updated : item))
        );
      }
      toast.success("Status logistik berhasil disimpan");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
      return false;
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-[calc(8rem+env(safe-area-inset-bottom))] text-zinc-950 dark:bg-zinc-950 dark:text-white sm:pb-10">
      <header className="bg-[#0f172a] px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-6 sm:pb-5 sm:pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ArrowLeft size={15} /> Kembali
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/mutasi-cabang"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 text-[10px] font-bold sm:gap-2 sm:px-3 sm:text-xs"
              >
                <Building2 size={15} /> <span className="hidden sm:inline">Mutasi cabang</span><span className="sm:hidden">Mutasi</span>
              </Link>
              <Link
                href="/serah-terima"
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-2.5 text-[10px] font-bold sm:gap-2 sm:px-3 sm:text-xs"
              >
                <ClipboardSignature size={15} /> Serah terima
              </Link>
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold"
              >
                <RefreshCcw size={15} /> <span className="hidden sm:inline">Muat ulang</span>
              </button>
            </div>
          </div>
          <p className="mt-4 text-[9px] font-bold uppercase tracking-[0.2em] text-blue-300 sm:mt-5 sm:text-[10px]">
            Implant inventory
          </p>
          <h1 className="mt-1 text-xl font-black sm:text-2xl">Dashboard Logistik</h1>
          <p className="mt-1 text-[11px] text-slate-300 sm:text-xs">Kebutuhan refill dan progres permintaan.</p>
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1.5 text-[9px] font-bold text-emerald-200 sm:rounded-full sm:px-3 sm:text-[10px]">
            <span className="size-2 rounded-full bg-emerald-400" />
            <span className="truncate">Terhubung · {stock.length} stok · {rows.length} perlu tindakan</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-3 p-3 sm:space-y-4 sm:p-6">
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
          <div className="hidden border-b p-4 sm:block">
            <h2 className="text-sm font-black">Ringkasan pekerjaan</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">Pilih ringkasan untuk melihat item yang perlu ditindaklanjuti.</p>
          </div>
          <div className="grid grid-cols-3 gap-px bg-zinc-200 dark:bg-zinc-800">
            <SummaryButton active={focus === "LOW"} onClick={() => setFocus("LOW")} icon={<AlertTriangle size={18} />} label="Stok menipis" value={summary.low} detail={`${summary.critical} stok habis`} tone="red" />
            <SummaryButton active={focus === "REQUEST"} onClick={() => setFocus("REQUEST")} icon={<UserRound size={18} />} label="Perlu diminta" value={summary.request} detail={`${summary.pending} belum diproses`} tone="amber" />
            <SummaryButton active={focus === "ORDERED"} onClick={() => setFocus("ORDERED")} icon={<PackageCheck size={18} />} label="Sudah diminta" value={summary.requested} detail={`${summary.ordered} dipesan · ${summary.shipping} dikirim`} tone="blue" />
          </div>
        </section>

        <details onToggle={(event) => setShowMovement(event.currentTarget.open)} className="group overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <div>
              <h2 className="text-sm font-black">Pergerakan barang & saran refill</h2>
              <p className="mt-0.5 text-[10px] text-zinc-500">Terpakai, refill masuk, support keluar, dan kembali.</p>
            </div>
            <ChevronDown size={18} className="shrink-0 transition-transform group-open:rotate-180" />
          </summary>
          {showMovement && <div className="border-t"><LogisticsMovementSummary /></div>}
        </details>

        <section className="grid grid-cols-2 gap-2 rounded-2xl border bg-white p-3 shadow-sm dark:bg-zinc-900 sm:grid-cols-[1fr_160px_220px_auto]">
          <label className="relative col-span-2 sm:col-span-1">
            <Search size={16} className="absolute left-3 top-3.5 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari REF, LOT, deskripsi, atau PIC..."
              className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <select value={brand} onChange={(event) => setBrand(event.target.value)} className="h-11 rounded-xl border bg-white px-3 text-sm dark:bg-zinc-900">
            <option value="ALL">Semua brand</option>
            <option value="NORMMED">Normmed</option>
            <option value="ZIMMER">Zimmer</option>
          </select>
          <select value={workflow} onChange={(event) => setWorkflow(event.target.value)} className="h-11 rounded-xl border bg-white px-3 text-sm dark:bg-zinc-900">
            <option value="ALL">Semua proses</option>
            {WORKFLOW_OPTIONS.filter((item) => item !== "SELESAI").map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <div className="col-span-2 hidden h-11 grid-cols-2 rounded-xl border bg-slate-50 p-1 dark:bg-zinc-950 sm:col-span-1 sm:grid">
            <button
              type="button"
              onClick={() => setViewMode("card")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-bold ${
                viewMode === "card"
                  ? "bg-[#0f172a] text-white"
                  : "text-zinc-500"
              }`}
            >
              <LayoutGrid size={14} /> Card
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-bold ${
                viewMode === "table"
                  ? "bg-[#0f172a] text-white"
                  : "text-zinc-500"
              }`}
            >
              <Table2 size={14} /> Table
            </button>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-2 border-t pt-3 sm:col-span-4">
            <span className="mr-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">Status stok</span>
            <QuickFilterChip active={stockStatus === "ALL"} onClick={() => setStockStatus("ALL")} label={`Semua ${rows.length}`} />
            <QuickFilterChip active={stockStatus === "EMPTY"} onClick={() => setStockStatus("EMPTY")} label={`Habis ${summary.critical}`} tone="red" />
            <QuickFilterChip active={stockStatus === "LOW"} onClick={() => setStockStatus("LOW")} label={`Menipis ${Math.max(0, summary.low - summary.critical)}`} tone="amber" />
            {hasDetailedFilter && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setBrand("ALL");
                  setWorkflow("ALL");
                  setStockStatus("ALL");
                }}
                className="ml-auto text-[10px] font-bold text-blue-600 hover:underline"
              >
                Hapus filter
              </button>
            )}
          </div>
        </section>

        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-base font-black">{focus === "LOW" ? "Stok menipis" : focus === "REQUEST" ? "Permintaan perlu diproses" : "Stok sudah diminta"}</h2>
            <p className="text-[10px] text-zinc-500">{groupedFiltered.length} produk · {filtered.length} LOT · tekan kelola untuk mengubah proses.</p>
          </div>
          <Link href="/#stock-data" className="shrink-0 text-[10px] font-bold text-blue-600 hover:underline">Lihat semua stok</Link>
        </div>

        <section className="sticky top-2 z-20 overflow-hidden rounded-2xl border border-blue-200 bg-white/95 shadow-lg shadow-blue-950/10 backdrop-blur dark:border-blue-900 dark:bg-zinc-900/95">
          <div className="flex items-center gap-2 p-2.5 sm:justify-between sm:p-4">
            <label className="flex cursor-pointer items-center gap-3">
              <input
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleAllFiltered}
                className="size-5 rounded accent-blue-600"
              />
              <span className="min-w-0">
                <span className="block truncate text-[11px] font-black sm:text-xs">Permintaan Refill</span>
                <span className="mt-0.5 block whitespace-nowrap text-[9px] text-zinc-500 sm:text-[10px]">{selectedRows.length} dipilih · {filtered.length} tersedia</span>
              </span>
            </label>
            <div className="ml-auto flex shrink-0 gap-1.5 sm:gap-2">
              <button
                type="button"
                disabled={selectedRows.length === 0}
                onClick={async () => {
                  await navigator.clipboard.writeText(requestMessage);
                  toast.success("Daftar permintaan berhasil disalin");
                }}
                className="inline-flex size-10 items-center justify-center rounded-xl border text-xs font-bold disabled:opacity-40 sm:w-auto sm:gap-2 sm:px-3"
              >
                <Copy size={15} /> <span className="hidden sm:inline">Salin</span>
              </button>
              <button
                type="button"
                disabled={selectedRows.length === 0}
                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(requestMessage)}`, "_blank", "noopener,noreferrer")}
                className="inline-flex size-10 items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white disabled:opacity-40 sm:w-auto sm:gap-2 sm:px-4"
              >
                <MessageCircle size={16} /> <span className="hidden sm:inline">Share WhatsApp</span>
              </button>
            </div>
          </div>
        </section>

        {loading ? (
          <LogisticsListSkeleton />
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-zinc-500 dark:bg-zinc-900">
            Tidak ada pekerjaan logistik sesuai filter.
          </div>
        ) : viewMode === "card" ? (
          <section className="grid gap-3 lg:grid-cols-2">
            {groupedFiltered.map((group) => (
              <LogisticsGroupCard
                key={group.key}
                group={group}
                selected={group.rows.every((row) => selectedKeys.has(warningKey(row)))}
                onToggle={() => {
                  const shouldSelect = !group.rows.every((row) => selectedKeys.has(warningKey(row)));
                  setSelectedKeys((current) => {
                    const next = new Set(current);
                    group.rows.forEach((row) => shouldSelect ? next.add(warningKey(row)) : next.delete(warningKey(row)));
                    return next;
                  });
                }}
                onEdit={setEditingRow}
              />
            ))}
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="min-w-[1180px] w-full text-left text-xs">
                <thead className="bg-slate-100 text-[10px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
                  <tr>
                    <th className="px-3 py-3 text-center">Pilih</th>
                    <th className="px-3 py-3">Status stok</th>
                    <th className="px-3 py-3">REF / Deskripsi</th>
                    <th className="px-3 py-3">Brand</th>
                    <th className="px-3 py-3">Implant</th>
                    <th className="px-3 py-3">LOT</th>
                    <th className="px-3 py-3 text-center">Sisa</th>
                    <th className="px-3 py-3">Proses</th>
                    <th className="px-3 py-3">PIC</th>
                    <th className="px-3 py-3">Target</th>
                    <th className="px-3 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, index) => (
                    <LogisticsTableRow
                      key={[
                        row.Row || "legacy",
                        row.NoStok || "no-ref",
                        row.Batch || "no-batch",
                        index,
                      ].join("-")}
                      row={row}
                      selected={selectedKeys.has(warningKey(row))}
                      onToggle={() => toggleSelected(row)}
                      saving={savingRow === row.Row}
                      onSave={(patch) => void save(row, patch)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      {editingRow && (
        <LogisticsEditModal
          key={warningKey(editingRow)}
          row={editingRow}
          picSuggestions={picSuggestions}
          saving={savingRow === editingRow.Row}
          onClose={() => setEditingRow(null)}
          onSave={async (patch) => {
            const saved = await save(editingRow, patch);
            if (saved) setEditingRow(null);
          }}
        />
      )}
    </main>
  );
}

function SummaryButton({ icon, label, value, detail, tone, active, onClick }: { icon: React.ReactNode; label: string; value: number; detail: string; tone: "red" | "amber" | "blue"; active: boolean; onClick: () => void }) {
  const styles = {
    red: "text-red-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
  };
  return <button type="button" onClick={onClick} className={`min-w-0 bg-white p-2.5 text-left transition dark:bg-zinc-900 sm:p-4 ${active ? "inset-ring-2 inset-ring-blue-600" : "hover:bg-slate-50 dark:hover:bg-zinc-800"}`}>
    <div className="flex items-center justify-between gap-1"><span className={styles[tone]}>{icon}</span><b className="text-lg sm:text-2xl">{value}</b></div>
    <p className="mt-2 line-clamp-2 text-[9px] font-black leading-3 sm:mt-3 sm:text-xs">{label}</p><p className="mt-0.5 hidden text-[10px] text-zinc-500 sm:block">{detail}</p>
  </button>;
}

function QuickFilterChip({ active, onClick, label, tone = "neutral" }: { active: boolean; onClick: () => void; label: string; tone?: "neutral" | "red" | "amber" }) {
  const activeStyle = tone === "red" ? "border-red-600 bg-red-600 text-white" : tone === "amber" ? "border-amber-500 bg-amber-500 text-white" : "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-zinc-950";
  return (
    <button type="button" onClick={onClick} className={`h-9 rounded-xl border px-3 text-[10px] font-bold transition ${active ? activeStyle : "bg-white text-zinc-600 hover:bg-slate-50 dark:bg-zinc-900 dark:text-zinc-300"}`}>
      {label}
    </button>
  );
}

type WarningGroup = {
  key: string;
  rows: StockWarningRow[];
  ref: string;
  description: string;
  brand: string;
  implant: string;
};

function LogisticsGroupCard({ group, selected, onToggle, onEdit }: { group: WarningGroup; selected: boolean; onToggle: () => void; onEdit: (row: StockWarningRow) => void }) {
  const criticalCount = group.rows.filter((row) => Number(row.SisaStock) <= 0).length;
  const critical = criticalCount > 0;
  const totalStock = group.rows.reduce((total, row) => total + Number(row.SisaStock || 0), 0);
  return (
    <article className={`overflow-hidden rounded-2xl border border-l-4 bg-white shadow-sm transition dark:bg-zinc-900 ${selected ? "ring-2 ring-blue-500" : ""} ${critical ? "border-red-300 border-l-red-600 bg-red-50/40 dark:border-red-900" : "border-amber-200 border-l-amber-500"}`}>
      <div className="p-3.5 sm:p-4">
        <div className="flex items-start gap-3">
          <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Pilih semua LOT ${group.ref}`} className="mt-0.5 size-5 shrink-0 accent-blue-600" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-black ${critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                {critical && <span className="size-1.5 animate-pulse rounded-full bg-red-600" />}{critical ? `${criticalCount} LOT HABIS` : "MENIPIS"}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{group.brand || "-"}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{group.implant || "-"}</span>
            </div>
            <h2 className="mt-2 text-sm font-black">{group.ref}</h2>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-600 dark:text-zinc-300">{group.description}</p>
          </div>
          <div className={`min-w-14 rounded-xl px-2.5 py-2 text-center ${critical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
            <b className="text-lg">{totalStock}</b><p className="text-[8px] font-bold">TOTAL</p>
          </div>
        </div>
        <details className="group mt-3 overflow-hidden rounded-xl border bg-white/80 dark:bg-zinc-950/50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 text-xs font-bold">
            <span>{group.rows.length} LOT / batch</span>
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="divide-y border-t">
            {group.rows.map((row) => {
              const rowCritical = Number(row.SisaStock) <= 0;
              return (
                <div key={warningKey(row)} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-black">LOT {row.Batch || "-"}</p>
                    <p className="mt-0.5 truncate text-[9px] text-zinc-500">{row.WorkflowStatus || "BELUM DIPROSES"} · {row.PIC || "PIC belum dipilih"}</p>
                  </div>
                  <span className={`rounded-lg px-2 py-1 text-[10px] font-black ${rowCritical ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{Number(row.SisaStock || 0)} pcs</span>
                  <button type="button" onClick={() => onEdit(row)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[10px] font-bold text-blue-700">
                    <Settings2 size={13} /> Kelola
                  </button>
                </div>
              );
            })}
          </div>
        </details>
      </div>
    </article>
  );
}

function LogisticsEditModal({ row, picSuggestions, saving, onClose, onSave }: { row: StockWarningRow; picSuggestions: string[]; saving: boolean; onClose: () => void; onSave: (patch: Partial<StockWarningRow>) => Promise<void> }) {
  const [status, setStatus] = useState<LogisticsWorkflowStatus>(row.WorkflowStatus || "BELUM DIPROSES");
  const [pic, setPic] = useState(row.PIC || "");
  const [target, setTarget] = useState(toDateInput(row.TargetRefill));
  const [note, setNote] = useState(row.LogisticsNote || "");
  const patch = { WorkflowStatus: status, PIC: pic, TargetRefill: target, LogisticsNote: note };
  const message = buildSingleRequestMessage(row, pic, target, note);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`Kelola permintaan ${row.NoStok}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:max-w-xl sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-white/95 p-4 backdrop-blur dark:bg-zinc-900/95">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-600">Kelola permintaan refill</p>
            <h2 className="mt-1 truncate text-base font-black">{row.NoStok || "Tanpa REF"} · LOT {row.Batch || "-"}</h2>
            <p className="mt-1 line-clamp-2 text-[11px] text-zinc-500">{row.Deskripsi}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border" aria-label="Tutup"><X size={18} /></button>
        </header>
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <label className="text-[10px] font-bold text-zinc-500">Status proses
            <select value={status} onChange={(event) => setStatus(event.target.value as LogisticsWorkflowStatus)} className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm dark:bg-zinc-900">
              {WORKFLOW_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold text-zinc-500">PIC logistik
            <input list="logistics-pic-options" value={pic} onChange={(event) => setPic(event.target.value)} placeholder="Pilih atau ketik nama PIC" className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm" />
            <datalist id="logistics-pic-options">{picSuggestions.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <label className="text-[10px] font-bold text-zinc-500">Target refill
            <input type="date" value={target} onChange={(event) => setTarget(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm" />
          </label>
          <label className="text-[10px] font-bold text-zinc-500">Catatan
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Supplier / kebutuhan operasi" className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 border-t p-4 sm:grid-cols-3">
          <button type="button" disabled={saving} onClick={() => void onSave(patch)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-50">
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Simpan
          </button>
          <button type="button" disabled={saving} onClick={() => void onSave({ ...patch, WorkflowStatus: "SUDAH DIINFORMASIKAN" })} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold text-emerald-700 disabled:opacity-50">
            <CheckCircle2 size={15} /> Sudah info
          </button>
          <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")} className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white sm:col-span-1">
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button type="button" disabled={saving} onClick={() => { if (window.confirm("Tandai implant ini discontinue? Item tidak akan muncul lagi pada warning stok.")) void onSave({ ...patch, WorkflowStatus: "DISCONTINUE" }); }} className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-xs font-bold text-zinc-600 disabled:opacity-50 sm:col-span-3 dark:text-zinc-300">
            <Ban size={15} /> Tandai discontinue
          </button>
        </div>
      </section>
    </div>
  );
}

function LogisticsTableRow({
  row,
  selected,
  onToggle,
  saving,
  onSave,
}: {
  row: StockWarningRow;
  selected: boolean;
  onToggle: () => void;
  saving: boolean;
  onSave: (patch: Partial<StockWarningRow>) => void;
}) {
  const [status, setStatus] = useState<LogisticsWorkflowStatus>(
    row.WorkflowStatus || "BELUM DIPROSES"
  );
  const [pic, setPic] = useState(row.PIC || "");
  const [target, setTarget] = useState(toDateInput(row.TargetRefill));
  const critical = Number(row.SisaStock) <= 0;

  return (
    <tr className="border-t align-middle hover:bg-slate-50 dark:hover:bg-zinc-800/50">
      <td className="px-3 py-3 text-center"><input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Pilih ${row.NoStok}`} className="size-4 accent-blue-600" /></td>
      <td className="px-3 py-3">
        <span
          className={`rounded-full px-2 py-1 text-[9px] font-black ${
            critical
              ? "bg-red-50 text-red-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {critical ? "HABIS" : "MENIPIS"}
        </span>
      </td>
      <td className="max-w-72 px-3 py-3">
        <p className="font-black">{row.NoStok || "Tanpa REF"}</p>
        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-zinc-500">
          {row.Deskripsi}
        </p>
      </td>
      <td className="px-3 py-3 font-bold">{row.Brand || "-"}</td>
      <td className="px-3 py-3">{row.Implant || "-"}</td>
      <td className="px-3 py-3 font-semibold">{row.Batch || "-"}</td>
      <td
        className={`px-3 py-3 text-center text-lg font-black ${
          critical ? "text-red-600" : "text-amber-600"
        }`}
      >
        {row.SisaStock}
      </td>
      <td className="px-3 py-3">
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as LogisticsWorkflowStatus)
          }
          className="h-10 w-48 rounded-lg border bg-white px-2 text-xs dark:bg-zinc-900"
        >
          {WORKFLOW_OPTIONS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3">
        <input
          value={pic}
          onChange={(event) => setPic(event.target.value)}
          placeholder="Nama PIC"
          className="h-10 w-36 rounded-lg border bg-transparent px-2 text-xs"
        />
      </td>
      <td className="px-3 py-3">
        <input
          type="date"
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="h-10 w-36 rounded-lg border bg-transparent px-2 text-xs"
        />
      </td>
      <td className="px-3 py-3">
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            onSave({
              WorkflowStatus: status,
              PIC: pic,
              TargetRefill: target,
              LogisticsNote: row.LogisticsNote,
            })
          }
          className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[10px] font-bold text-white disabled:opacity-50"
        >
          {saving ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <CheckCircle2 size={14} />
          )}
          Simpan
        </button>
      </td>
    </tr>
  );
}

function toDateInput(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function stockIdentity(ref: unknown, batch: unknown) {
  return `${String(ref ?? "").trim().toUpperCase()}::${String(batch ?? "").trim().toUpperCase()}`;
}

function warningKey(row: StockWarningRow) {
  return `${row.StockSheet || "Sheet1"}:${row.No || 0}:${stockIdentity(row.NoStok, row.Batch)}`;
}

function groupWarningRows(rows: StockWarningRow[]): WarningGroup[] {
  const groups = new Map<string, WarningGroup>();
  rows.forEach((row) => {
    const ref = String(row.NoStok || "").trim();
    const description = String(row.Deskripsi || "Tanpa deskripsi").trim();
    const key = ref
      ? `REF:${ref.toUpperCase()}`
      : `NAME:${description.replace(/\s+/g, " ").toUpperCase()}`;
    const current = groups.get(key);
    if (current) current.rows.push(row);
    else groups.set(key, {
      key,
      rows: [row],
      ref: ref || "Tanpa REF",
      description,
      brand: String(row.Brand || ""),
      implant: String(row.Implant || ""),
    });
  });
  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      rows: group.rows.sort((a, b) => String(a.Batch || "").localeCompare(String(b.Batch || ""), "id", { numeric: true })),
    }))
    .sort((a, b) => a.description.localeCompare(b.description, "id", { numeric: true }));
}

function buildRequestMessage(rows: StockWarningRow[]) {
  const lines = [
    `📦 *REFILL IMPLANT (${rows.length})*`,
    "",
  ];
  rows.forEach((row, index) => {
    lines.push(
      `${index + 1}. ${row.Brand || "-"} • ${row.NoStok || "Tanpa REF"} • ${compactShareName(row.Deskripsi)} • stok ${Number(row.SisaStock || 0)}`
    );
  });
  lines.push("", "Mohon diproses.");
  return lines.join("\n");
}

function buildSingleRequestMessage(row: StockWarningRow, pic: string, target: string, note: string) {
  return [
    `Halo${pic ? ` ${pic}` : ""}, mohon bantuan refill implant berikut:`,
    `Produk: ${compactShareName(row.Deskripsi)}`,
    `REF: ${row.NoStok || "-"}`,
    `LOT: ${row.Batch || "-"}`,
    `Stok saat ini: ${Number(row.SisaStock || 0)} pcs`,
    target ? `Target refill: ${target}` : "",
    note ? `Catatan: ${note}` : "",
    "Terima kasih.",
  ].filter(Boolean).join("\n");
}

function compactShareName(value: unknown) {
  const name = String(value || "-").trim();
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

function LogisticsListSkeleton() {
  return (
    <section className="grid animate-pulse gap-3 lg:grid-cols-2" aria-label="Memuat data logistik">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-2xl border bg-white p-4 dark:bg-zinc-900">
          <div className="flex items-center justify-between gap-3"><div className="h-5 w-24 rounded bg-slate-200 dark:bg-zinc-800" /><div className="h-6 w-20 rounded-lg bg-slate-100 dark:bg-zinc-800" /></div>
          <div className="mt-3 h-3 w-4/5 rounded bg-slate-200 dark:bg-zinc-800" />
          <div className="mt-2 h-3 w-2/5 rounded bg-slate-100 dark:bg-zinc-800" />
          <div className="mt-4 grid grid-cols-3 gap-2">{Array.from({ length: 3 }).map((__, itemIndex) => <div key={itemIndex} className="h-12 rounded-xl bg-slate-100 dark:bg-zinc-800" />)}</div>
        </div>
      ))}
    </section>
  );
}
