"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ClipboardSignature,
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
];

export default function LogisticsDashboardPage() {
  const [rows, setRows] = useState<StockWarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingRow, setSavingRow] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("ALL");
  const [workflow, setWorkflow] = useState("ALL");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [focus, setFocus] = useState<"LOW" | "REQUEST" | "ORDERED">("LOW");
  const [showMovement, setShowMovement] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getStockWarnings(false));
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
      if (updated?.WorkflowStatus === "SELESAI") {
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
    <main className="min-h-dvh bg-slate-50 pb-8 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <header className="bg-[#0f172a] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ArrowLeft size={15} /> Kembali
            </Link>
            <div className="flex items-center gap-2">
              <Link
                href="/serah-terima"
                className="inline-flex h-9 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-xs font-bold"
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
          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">
            Implant inventory
          </p>
          <h1 className="mt-1 text-2xl font-black">Dashboard Logistik</h1>
          <p className="mt-1 text-xs text-slate-300">Lihat kebutuhan refill dan progres permintaan dalam satu tampilan.</p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-4 p-3 sm:p-6">
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
          <div className="border-b p-4">
            <h2 className="text-sm font-black">Ringkasan pekerjaan</h2>
            <p className="mt-0.5 text-[11px] text-zinc-500">Pilih ringkasan untuk melihat item yang perlu ditindaklanjuti.</p>
          </div>
          <div className="grid gap-px bg-zinc-200 dark:bg-zinc-800 sm:grid-cols-3">
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

        <section className="grid gap-2 rounded-2xl border bg-white p-3 dark:bg-zinc-900 sm:grid-cols-[1fr_160px_220px_auto]">
          <label className="relative">
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
          <div className="grid h-11 grid-cols-2 rounded-xl border bg-slate-50 p-1 dark:bg-zinc-950">
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
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-blue-600" /></div>
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
  return <button type="button" onClick={onClick} className={`bg-white p-4 text-left transition dark:bg-zinc-900 ${active ? "inset-ring-2 inset-ring-blue-600" : "hover:bg-slate-50 dark:hover:bg-zinc-800"}`}>
    <div className="flex items-center justify-between"><span className={styles[tone]}>{icon}</span><b className="text-2xl">{value}</b></div>
    <p className="mt-3 text-xs font-black">{label}</p><p className="mt-0.5 text-[10px] text-zinc-500">{detail}</p>
  </button>;
}

function LogisticsCard({ row, saving, onSave }: { row: StockWarningRow; saving: boolean; onSave: (patch: Partial<StockWarningRow>) => void }) {
  const [status, setStatus] = useState<LogisticsWorkflowStatus>(row.WorkflowStatus || "BELUM DIPROSES");
  const [pic, setPic] = useState(row.PIC || "");
  const [target, setTarget] = useState(toDateInput(row.TargetRefill));
  const [note, setNote] = useState(row.LogisticsNote || "");
  const critical = Number(row.SisaStock) <= 0;
  const message = `⚠️ INFO LOGISTIK STOCK IMPLANT\n${row.NoStok} | ${row.Deskripsi}\n${row.Brand} | ${row.Implant} | LOT ${row.Batch}\nSisa stok: ${row.SisaStock}\nPIC: ${pic || "-"}\nTarget refill: ${target || "-"}\nCatatan: ${note || "-"}`;

  return (
    <article className={`overflow-hidden rounded-2xl border border-l-4 bg-white shadow-sm dark:bg-zinc-900 ${critical ? "border-l-red-500" : "border-l-amber-500"}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
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
          </div>
        </details>
        {row.InformedAt && <p className="mt-3 text-[10px] text-zinc-400">Sudah diinformasikan oleh {row.InformedBy || "Logistik"}.</p>}
      </div>
    </article>
  );
}

function LogisticsTableRow({
  row,
  saving,
  onSave,
}: {
  row: StockWarningRow;
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
