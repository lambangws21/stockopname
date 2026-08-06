"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
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
  Table2,
  UserRound,
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
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [focus, setFocus] = useState<"LOW" | "REQUEST" | "ORDERED">("LOW");
  const [showMovement, setShowMovement] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

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
      if (!query) return true;
      return [row.NoStok, row.Deskripsi, row.Batch, row.Implant, row.PIC]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [brand, focus, rows, search, workflow]);

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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan");
    } finally {
      setSavingRow(null);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <header className="bg-[#0f172a] px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white sm:px-6 sm:pb-5 sm:pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ArrowLeft size={15} /> Kembali
            </Link>
            <div className="flex items-center gap-2">
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
          <div className="col-span-2 grid h-11 grid-cols-2 rounded-xl border bg-slate-50 p-1 dark:bg-zinc-950 sm:col-span-1">
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
        </section>

        <div className="flex items-end justify-between gap-3 px-1">
          <div>
            <h2 className="text-base font-black">{focus === "LOW" ? "Stok menipis" : focus === "REQUEST" ? "Permintaan perlu diproses" : "Stok sudah diminta"}</h2>
            <p className="text-[10px] text-zinc-500">Menampilkan {filtered.length} item · tekan detail untuk mengubah proses.</p>
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
            {filtered.map((row, index) => (
              <LogisticsCard
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

function LogisticsCard({ row, selected, onToggle, saving, onSave }: { row: StockWarningRow; selected: boolean; onToggle: () => void; saving: boolean; onSave: (patch: Partial<StockWarningRow>) => void }) {
  const [status, setStatus] = useState<LogisticsWorkflowStatus>(row.WorkflowStatus || "BELUM DIPROSES");
  const [pic, setPic] = useState(row.PIC || "");
  const [target, setTarget] = useState(toDateInput(row.TargetRefill));
  const [note, setNote] = useState(row.LogisticsNote || "");
  const critical = Number(row.SisaStock) <= 0;
  const message = [
    "⚠️ *REFILL IMPLANT*",
    `${row.Brand || "-"} • ${row.NoStok || "Tanpa REF"}`,
    compactShareName(row.Deskripsi),
    `Stok: ${Number(row.SisaStock || 0)} pcs`,
    pic ? `PIC: ${pic}` : "",
    target ? `Target: ${target}` : "",
    note ? `Catatan: ${note}` : "",
  ].filter(Boolean).join("\n");

  return (
    <article className={`overflow-hidden rounded-2xl border border-l-4 bg-white shadow-sm transition dark:bg-zinc-900 ${selected ? "ring-2 ring-blue-500" : ""} ${critical ? "border-l-red-500" : "border-l-amber-500"}`}>
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          <input type="checkbox" checked={selected} onChange={onToggle} aria-label={`Pilih ${row.NoStok}`} className="mt-0.5 size-5 shrink-0 accent-blue-600" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap gap-1.5">
              <span className={`rounded-md px-2 py-1 text-[9px] font-black ${critical ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{critical ? "HABIS" : "MENIPIS"}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{row.Brand || "-"}</span>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-600">{row.Implant || "-"}</span>
            </div>
            <h2 className="mt-2 text-sm font-black">{row.NoStok || "Tanpa REF"}</h2>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-300">{row.Deskripsi}</p>
            <p className="mt-1 text-[10px] text-zinc-400">LOT {row.Batch || "-"}</p>
          </div>
          <div className={`rounded-xl px-3 py-2 text-center ${critical ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}><b className="text-xl">{row.SisaStock}</b><p className="text-[8px] font-bold">SISA</p></div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 dark:bg-zinc-950">
          <div><p className="text-[8px] font-bold uppercase text-zinc-400">Proses</p><p className="mt-1 truncate text-[10px] font-black">{status}</p></div>
          <div><p className="text-[8px] font-bold uppercase text-zinc-400">PIC</p><p className="mt-1 truncate text-[10px] font-black">{pic || "Belum ada"}</p></div>
          <div><p className="text-[8px] font-bold uppercase text-zinc-400">Target</p><p className="mt-1 truncate text-[10px] font-black">{target || "Belum ada"}</p></div>
        </div>

        <details className="group mt-3 rounded-xl border">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-3 text-xs font-bold">
            Ubah proses permintaan
            <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
          </summary>
          <div className="grid gap-2 border-t p-3 sm:grid-cols-2">
          <label className="text-[10px] font-bold text-zinc-500">Status proses
            <select value={status} onChange={(event) => setStatus(event.target.value as LogisticsWorkflowStatus)} className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-sm dark:bg-zinc-900">
              {WORKFLOW_OPTIONS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="text-[10px] font-bold text-zinc-500">PIC logistik
            <input value={pic} onChange={(event) => setPic(event.target.value)} placeholder="Nama PIC" className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm" />
          </label>
          <label className="text-[10px] font-bold text-zinc-500">Target refill
            <input type="date" value={target} onChange={(event) => setTarget(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm" />
          </label>
          <label className="text-[10px] font-bold text-zinc-500">Catatan
            <input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Supplier / kebutuhan operasi" className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm" />
          </label>
          </div>

          <div className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-3">
          <button type="button" disabled={saving} onClick={() => onSave({ WorkflowStatus: status, PIC: pic, TargetRefill: target, LogisticsNote: note })} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white disabled:opacity-50">
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Simpan
          </button>
          <button type="button" onClick={() => onSave({ WorkflowStatus: "SUDAH DIINFORMASIKAN", PIC: pic, TargetRefill: target, LogisticsNote: note })} className="inline-flex items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold text-emerald-700">
            <CheckCircle2 size={15} /> Sudah info
          </button>
          <button type="button" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer")} className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white sm:col-span-1">
            <MessageCircle size={15} /> WhatsApp
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              if (window.confirm("Tandai implant ini discontinue? Item tidak akan muncul lagi pada warning stok.")) {
                onSave({ WorkflowStatus: "DISCONTINUE", PIC: pic, TargetRefill: target, LogisticsNote: note });
              }
            }}
            className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-zinc-300 px-3 text-xs font-bold text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 sm:col-span-3 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <Ban size={15} /> Tandai discontinue
          </button>
          </div>
        </details>
        {row.InformedAt && <p className="mt-3 text-[10px] text-zinc-400">Sudah diinformasikan oleh {row.InformedBy || "Logistik"}.</p>}
      </div>
    </article>
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
