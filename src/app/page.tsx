"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
// import KpiCards from "@/components/dashboard/KpiCard";
import StockTablePremium from "@/components/StockTablePremium";
import Scanner from "@/components/stock/Scanner";
import {
  Activity,
  AlertTriangle,
  Bell,
  Boxes,
  CheckCircle2,
  ClipboardSignature,
  FileClock,
  Hospital,
  PackagePlus,
  QrCode,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Target,
  Warehouse,
  X,
} from "lucide-react";
import { gasGET, gasGetHistory } from "@/lib/gas";
import { listOnlineHandovers } from "@/lib/handover";
import type { OnlineHandover } from "@/types/handover";
import type { StockRow } from "@/types/stock";
import type { HistoryRow } from "@/types/history";

type DashboardListKind =
  | "STOCK"
  | "USED"
  | "REFILL"
  | "SUPPORT_OUT"
  | "RETURN";

type MobileSummaryTab = "HANDOVER" | "LOW_STOCK" | "MOVEMENT";

type ScanPayload = {
  ref: string;
  lot?: string;
  exp?: string;
  raw?: string;
  searchField?: "REF" | "LOT";
};

export function StockManagementPage() {
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanPayload | null>(null);
  const [opnameRequest, setOpnameRequest] = useState(0);

  return (
    <main className="min-h-dvh bg-slate-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-[1680px] space-y-0 px-0 py-0 sm:space-y-4 sm:px-5 sm:py-5 lg:space-y-5">
        <DashboardOverview
          onSelectStock={(row) => {
            setScanResult({
              ref: row.NoStok,
              lot: row.Batch,
              searchField: "REF",
            });
            window.setTimeout(
              () =>
                document
                  .getElementById("stock-data")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" }),
              50
            );
          }}
          onOpenOpname={() => setOpnameRequest((value) => value + 1)}
        />

        <header className="hidden flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-none">
              <Boxes size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                Stock Implant
              </h1>
              <p className="text-xs text-zinc-500">
                Stok, pergerakan, dan riwayat dalam satu halaman
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setScanOpen((value) => !value)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <QrCode size={15} />
              {scanOpen ? "Tutup Scan" : "Scan Barcode"}
            </button>
            <Link
              href="/logistik"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Warehouse size={15} />
              Dashboard Logistik
            </Link>
            <Link
              href="/serah-terima"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <ClipboardSignature size={15} />
              Serah Terima
            </Link>
            <Link
              href="/rumah-sakit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <Hospital size={15} />
              Stock RS
            </Link>
            <Link
              href="/customer-mapping"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <Target size={15} />
              Customer Mapping
            </Link>
          </div>
        </header>

        <section className={`${scanOpen ? "block" : "hidden"} p-3 sm:p-0`}>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40">
                <QrCode size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold">Barcode implant</p>
                <p className="text-[11px] text-zinc-500">
                  Cari REF dan batch secara cepat
                </p>
              </div>
              {scanOpen && (
                <button
                  type="button"
                  onClick={() => setScanOpen(false)}
                  className="ml-auto inline-flex size-9 items-center justify-center rounded-lg border text-zinc-500 sm:hidden"
                  aria-label="Tutup scanner"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {scanOpen && (
              <div className="mt-4 border-t pt-4">
                <Scanner onDetected={setScanResult} />
              </div>
            )}

            {scanResult && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs dark:bg-violet-950/30">
                <span><b>REF:</b> {scanResult.ref || "-"}</span>
                <span><b>LOT:</b> {scanResult.lot || "-"}</span>
                {scanResult.searchField && (
                  <span className="rounded-full bg-white px-2 py-1 font-semibold text-violet-700">
                    Pencarian {scanResult.searchField}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="ml-auto inline-flex items-center gap-1 font-semibold text-violet-700"
                >
                  <X size={12} /> Hapus
                </button>
              </div>
            )}
          </div>
        </section>

        <div id="stock-data" className="scroll-mt-24">
        <Suspense fallback={<TableSkeleton />}>
          <StockTablePremium
            sheet="Sheet1"
            externalScan={scanResult}
            title="Stock Management"
            onOpenScanner={() => {
              setScanOpen(true);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            opnameRequest={opnameRequest}
          />
        </Suspense>
        </div>
      </div>
    </main>
  );
}

function DashboardOverview({
  onSelectStock,
  onOpenOpname,
}: {
  onSelectStock: (row: StockRow) => void;
  onOpenOpname: () => void;
}) {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [documents, setDocuments] = useState<OnlineHandover[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [lowStockOpen, setLowStockOpen] = useState(false);
  const [listModal, setListModal] = useState<DashboardListKind | null>(null);
  const [listSearch, setListSearch] = useState("");
  const [lastRefreshAt, setLastRefreshAt] = useState("");
  const [mobileSummaryTab, setMobileSummaryTab] =
    useState<MobileSummaryTab>("LOW_STOCK");
  const [query, setQuery] = useState("");
  const [documentFilter, setDocumentFilter] = useState<
    "ALL" | "DIKIRIM" | "DITERIMA"
  >("ALL");
  const searchRef = useRef<HTMLInputElement>(null);
  const refreshInFlightRef = useRef(false);

  const refreshDashboard = useCallback(async (initial = false) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    if (initial) setLoading(true);
    else setRefreshing(true);
    try {
      const [stockResult, handoverRows, historyResult] = await Promise.all([
        gasGET("Sheet1"),
        listOnlineHandovers(),
        gasGetHistory("Sheet1"),
      ]);
      setStock(stockResult.data ?? []);
      setDocuments(handoverRows);
      setHistory(historyResult.data ?? []);
      setLastRefreshAt(new Date().toISOString());
    } catch {
      // Pertahankan snapshot terakhir jika refresh sementara gagal.
    } finally {
      refreshInFlightRef.current = false;
      if (initial) setLoading(false);
      else setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void refreshDashboard(true);
    const timer = window.setInterval(() => {
      if (active && document.visibilityState === "visible") {
        void refreshDashboard(false);
      }
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshDashboard]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === "Escape") setCommandOpen(false);
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    if (commandOpen) window.setTimeout(() => searchRef.current?.focus(), 30);
    else window.setTimeout(() => setQuery(""), 0);
  }, [commandOpen]);

  const totalStock = stock.reduce(
    (total, row) => total + stockRemaining(row),
    0
  );
  const lowStock = useMemo(
    () =>
      stock
        .filter((row) => stockRemaining(row) <= 1)
        .sort(
          (a, b) =>
            stockRemaining(a) - stockRemaining(b)
        ),
    [stock]
  );
  const waitingDocuments = documents.filter(
    (document) => document.Status === "DIKIRIM"
  );
  const draftDocuments = documents.filter(
    (document) => document.Status === "DRAFT"
  );
  const completedDocuments = documents.filter(
    (document) => document.Status === "DITERIMA"
  );
  const usedTotal = stock.reduce(
    (total, row) => total + Number(row.TERPAKAI || 0),
    0
  );
  const refillTotal = stock.reduce(
    (total, row) => total + Number(row.REFILL || 0),
    0
  );
  const outstandingSupport = buildOutstandingSupport(history, stock, documents);
  const returnHistory = history.filter(
    (row) => String(row.Action).toUpperCase() === "MOBILISASI_MASUK"
  );
  const supportOutTotal = outstandingSupport.reduce(
    (total, item) => total + item.quantity,
    0
  );
  const supportReturnTotal = returnHistory.reduce(
    (total, row) => total + historyMovementQty(row),
    0
  );
  const actionCount = lowStock.length + waitingDocuments.length;
  const filteredDocuments = documents
    .filter(
      (document) =>
        documentFilter === "ALL" || document.Status === documentFilter
    )
    .slice(0, 6);
  const normalizedQuery = query.trim().toLowerCase();
  const stockResults = normalizedQuery
    ? stock
        .filter((row) =>
          [row.NoStok, row.Deskripsi, row.Batch, row.Brand, row.Implant]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 6)
    : [];
  const documentResults = normalizedQuery
    ? documents
        .filter((document) =>
          [
            document.ID,
            document.Hospital,
            document.Surgeon,
            document.Sender,
            document.Receiver,
          ]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        )
        .slice(0, 5)
    : [];
  const movementMax = Math.max(
    refillTotal,
    usedTotal,
    supportOutTotal,
    supportReturnTotal,
    1
  );

  return (
    <>
      <section className="relative z-30 overflow-visible bg-[#0f172a] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:rounded-2xl sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600">
              <Boxes size={22} />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Implant inventory
              </p>
              <h1 className="text-xl font-black">Dashboard Stock</h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3 text-left text-xs text-slate-300 xl:ml-6 xl:max-w-xl"
          >
            <Search size={16} />
            <span className="min-w-0 flex-1 truncate">
              Cari dokumen, dokter, RS, REF atau LOT...
            </span>
            <kbd className="hidden rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[9px] sm:block">
              ⌘/Ctrl K
            </kbd>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void refreshDashboard(false)}
              className="flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-[9px] font-bold"
              title="Refresh dashboard"
            >
              <RefreshCw size={15} className={loading || refreshing ? "animate-spin" : ""} />
              <span className="hidden 2xl:inline">
                {lastRefreshAt
                  ? `Update ${formatRefreshTime(lastRefreshAt)}`
                  : "Refresh"}
              </span>
            </button>
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setNotificationsOpen((value) => !value)}
                className="relative flex size-11 items-center justify-center rounded-xl border border-white/15 bg-white/10"
                aria-label="Buka notifikasi"
              >
                <Bell size={17} />
                {actionCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[9px] font-black text-white ring-2 ring-[#0f172a]">
                    {actionCount > 99 ? "99+" : actionCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="absolute right-0 top-[calc(100%+0.6rem)] z-80 max-h-[70dvh] w-[min(380px,calc(100vw-24px))] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3 text-zinc-900 shadow-2xl ring-1 ring-slate-950/5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black">Perlu tindakan</p>
                      <p className="mt-0.5 text-[9px] text-zinc-500">
                        {actionCount} notifikasi aktif
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotificationsOpen(false)}
                      className="flex size-8 items-center justify-center rounded-lg border"
                      aria-label="Tutup notifikasi"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="mt-3 space-y-2 text-[10px]">
                    <div className="rounded-xl bg-red-50 p-3 text-red-700">
                      <b>{lowStock.length} item stok kritis</b>
                      <p className="mt-0.5">Stok kosong atau tersisa maksimal 1 pcs.</p>
                      <div className="mt-2 space-y-1.5 border-t border-red-100 pt-2">
                        {lowStock.slice(0, 4).map((row) => (
                          <button
                            key={`notification-${row.No}-${row.Batch}`}
                            type="button"
                            onClick={() => {
                              onSelectStock(row);
                              setNotificationsOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg bg-white/70 p-2 text-left"
                          >
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-red-600 font-black text-white">
                              {stockRemaining(row)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <b className="block truncate">{row.Deskripsi}</b>
                              <span className="block truncate text-[8px] text-red-500">
                                {row.NoStok} · {row.Brand}
                              </span>
                            </span>
                          </button>
                        ))}
                        {lowStock.length > 4 && (
                          <button
                            type="button"
                            onClick={() => {
                              setNotificationsOpen(false);
                              setLowStockOpen(true);
                            }}
                            className="h-8 w-full rounded-lg border border-red-200 bg-white text-[9px] font-black"
                          >
                            Lihat semua {lowStock.length} item
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3 text-amber-700">
                      <b>{waitingDocuments.length} dokumen menunggu TTD</b>
                      <p className="mt-0.5">Segera ingatkan pihak penerima.</p>
                      {waitingDocuments.length > 0 && (
                        <div className="mt-2 space-y-1.5 border-t border-amber-100 pt-2">
                          {waitingDocuments.slice(0, 4).map((document, index) => (
                            <Link
                              key={`waiting-${document.ID || index}`}
                              href={`/serah-terima?id=${encodeURIComponent(document.ID || "")}&token=${encodeURIComponent(document.VerificationToken || "")}`}
                              className="block rounded-lg bg-white/70 p-2"
                            >
                              <b className="block truncate">
                                {document.Hospital || document.ID || "Dokumen"}
                              </b>
                              <span className="mt-0.5 block truncate text-[8px] text-amber-600">
                                {document.Procedure} · {document.Sender || "Logistik"}
                              </span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <Link
              href="/serah-terima"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-[10px] font-black sm:flex-none"
            >
              <ClipboardSignature size={15} /> Serah Terima Baru
            </Link>
            <button
              type="button"
              onClick={onOpenOpname}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 text-[10px] font-black sm:flex-none"
            >
              <PackagePlus size={15} /> Stock Opname
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:gap-4 sm:p-0">
        <MetricCard
          label="Total stok tersedia"
          value={totalStock}
          note="Data gudang saat ini"
          icon={<Boxes size={17} />}
          tone="blue"
          loading={loading}
          onClick={() => setListModal("STOCK")}
        />
        <MetricCard
          label="Dokumen serah terima"
          value={documents.length}
          note={`${draftDocuments.length} draft · ${completedDocuments.length} selesai`}
          icon={<FileClock size={17} />}
          tone="violet"
          loading={loading}
        />
        <MetricCard
          label="Item perlu refill"
          value={lowStock.length}
          note="Batas kritis ≤ 1 pcs"
          icon={<AlertTriangle size={17} />}
          tone="red"
          loading={loading}
          onClick={() => setLowStockOpen(true)}
        />
        <MetricCard
          label="Unit terpakai"
          value={usedTotal}
          note="Akumulasi operasi tercatat"
          icon={<Activity size={17} />}
          tone="emerald"
          loading={loading}
          onClick={() => setListModal("USED")}
        />
      </section>

      <section className="px-3 sm:hidden">
        <article className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b p-2">
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
              {[
                ["HANDOVER", "Serah Terima", documents.length],
                ["LOW_STOCK", "Stok Menipis", lowStock.length],
                ["MOVEMENT", "Pergerakan", usedTotal + refillTotal + supportOutTotal + supportReturnTotal],
              ].map(([value, label, count]) => (
                <button
                  key={String(value)}
                  type="button"
                  onClick={() => setMobileSummaryTab(value as MobileSummaryTab)}
                  className={`min-w-0 rounded-lg px-1 py-2 text-[9px] font-black transition ${
                    mobileSummaryTab === value
                      ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-700 dark:text-blue-300"
                      : "text-zinc-500"
                  }`}
                >
                  <span className="block truncate">{label}</span>
                  <span className={`mt-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[8px] ${
                    mobileSummaryTab === value
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                      : "bg-white text-zinc-500 dark:bg-zinc-900"
                  }`}>
                    {Number(count).toLocaleString("id-ID")}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {mobileSummaryTab === "HANDOVER" && (
            <div className="divide-y">
              {documents.slice(0, 3).map((document, index) => (
                <Link
                  key={document.ID || index}
                  href={`/serah-terima?id=${encodeURIComponent(document.ID || "")}&token=${encodeURIComponent(document.VerificationToken || "")}`}
                  className="flex items-center gap-3 p-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                    <ClipboardSignature size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[11px]">{document.Hospital || "Rumah sakit belum diisi"}</b>
                    <span className="mt-0.5 block truncate text-[8px] text-zinc-500">
                      {document.Procedure || "-"} · {formatDashboardDate(document.UpdatedAt || document.CreatedAt)}
                    </span>
                  </span>
                  <DashboardStatus status={document.Status} />
                </Link>
              ))}
              {!documents.length && (
                <p className="p-6 text-center text-xs text-zinc-500">Belum ada serah terima.</p>
              )}
              {documents.length > 3 && (
                <Link href="/serah-terima" className="block p-3 text-center text-[10px] font-black text-blue-600">
                  Lihat semua dokumen
                </Link>
              )}
            </div>
          )}

          {mobileSummaryTab === "LOW_STOCK" && (
            <div className="space-y-2 p-3">
              {lowStock.slice(0, 3).map((row) => (
                <button
                  key={`${row.No}-${row.Batch}`}
                  type="button"
                  onClick={() => onSelectStock(row)}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/70 p-2.5 text-left dark:border-red-950 dark:bg-red-950/20"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                    {stockRemaining(row)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[10px]">{row.Deskripsi}</b>
                    <span className="mt-0.5 block truncate text-[8px] text-red-600">{row.NoStok} · {row.Brand}</span>
                  </span>
                </button>
              ))}
              {!lowStock.length && (
                <div className="rounded-xl bg-emerald-50 p-5 text-center text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="mx-auto mb-2" size={20} /> Semua stok aman
                </div>
              )}
              {lowStock.length > 3 && (
                <button type="button" onClick={() => setLowStockOpen(true)} className="w-full rounded-xl border py-2.5 text-[10px] font-black text-red-600">
                  Lihat semua {lowStock.length} item
                </button>
              )}
            </div>
          )}

          {mobileSummaryTab === "MOVEMENT" && (
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                ["Terpakai", usedTotal, "USED", "border-red-100 bg-red-50 text-red-700"],
                ["Refill", refillTotal, "REFILL", "border-emerald-100 bg-emerald-50 text-emerald-700"],
                ["Sedang di luar", supportOutTotal, "SUPPORT_OUT", "border-amber-100 bg-amber-50 text-amber-700"],
                ["Kembali", supportReturnTotal, "RETURN", "border-blue-100 bg-blue-50 text-blue-700"],
              ].map(([label, value, kind, tone]) => (
                <button
                  type="button"
                  key={String(kind)}
                  onClick={() => setListModal(kind as DashboardListKind)}
                  className={`rounded-xl border p-3 text-left ${tone}`}
                >
                  <b className="block text-lg font-black">{Number(value).toLocaleString("id-ID")}</b>
                  <span className="text-[9px] font-bold">{label}</span>
                </button>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="hidden gap-4 px-3 sm:grid sm:px-0 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <article className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-black">Serah Terima Terbaru</h2>
              <p className="text-[10px] text-zinc-500">Akses cepat dokumen BAST</p>
            </div>
            <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
              {[
                ["ALL", "Semua"],
                ["DIKIRIM", "Menunggu TTD"],
                ["DITERIMA", "Selesai"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setDocumentFilter(
                      value as "ALL" | "DIKIRIM" | "DITERIMA"
                    )
                  }
                  className={`h-8 rounded-lg px-2 text-[9px] font-bold ${
                    documentFilter === value
                      ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-700 dark:text-blue-300"
                      : "text-zinc-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y">
            {filteredDocuments.map((document, index) => (
              <Link
                key={document.ID || index}
                href={`/serah-terima?id=${encodeURIComponent(document.ID || "")}&token=${encodeURIComponent(document.VerificationToken || "")}`}
                className="grid gap-2 p-3 transition hover:bg-slate-50 sm:grid-cols-[1fr_120px_110px] sm:items-center dark:hover:bg-zinc-800"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-black">
                    {document.Hospital || "Rumah sakit belum diisi"}
                  </p>
                  <p className="mt-1 truncate text-[9px] text-zinc-500">
                    {document.ID} · {document.Procedure} · {document.Surgeon || "Dokter -"}
                  </p>
                </div>
                <span className="text-[10px] font-bold text-zinc-500">
                  {formatDashboardDate(document.UpdatedAt || document.CreatedAt)}
                </span>
                <DashboardStatus status={document.Status} />
              </Link>
            ))}
            {!filteredDocuments.length && (
              <p className="p-8 text-center text-xs text-zinc-500">
                Tidak ada dokumen pada filter ini.
              </p>
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">Stok Menipis</h2>
                <p className="text-[10px] text-zinc-500">
                  Menampilkan 5 dari {lowStock.length} item kritis
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLowStockOpen(true)}
                className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[9px] font-black text-red-700"
              >
                Lihat semua
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {lowStock.slice(0, 5).map((row) => (
                <button
                  key={`${row.No}-${row.Batch}`}
                  type="button"
                  onClick={() => onSelectStock(row)}
                  className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-red-50/70 p-3 text-left transition hover:border-red-300"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-600 text-xs font-black text-white">
                    {stockRemaining(row)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[10px]">{row.Deskripsi}</b>
                    <span className="mt-0.5 block truncate text-[9px] text-red-600">
                      {row.NoStok} · {row.Brand} · {row.Batch}
                    </span>
                  </span>
                </button>
              ))}
              {!lowStock.length && (
                <div className="rounded-xl bg-emerald-50 p-5 text-center text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="mx-auto mb-2" size={22} />
                  Semua stok berada di batas aman.
                </div>
              )}
            </div>
          </article>

          <article className="rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black">Pergerakan Barang</h2>
                <p className="text-[10px] text-zinc-500">Ringkasan data live</p>
              </div>
              <TrendingUp size={18} className="text-blue-600" />
            </div>
            <div className="mt-4 space-y-3">
              {[
                ["Refill", refillTotal, "bg-emerald-500", "REFILL"],
                ["Terpakai operasi", usedTotal, "bg-red-500", "USED"],
                ["Sedang di luar", supportOutTotal, "bg-amber-500", "SUPPORT_OUT"],
                ["Kembali ke office", supportReturnTotal, "bg-blue-500", "RETURN"],
              ].map(([label, value, color, kind]) => (
                <button
                  type="button"
                  onClick={() => setListModal(kind as DashboardListKind)}
                  key={String(label)}
                  className="block w-full rounded-lg p-1 text-left transition hover:bg-slate-50 dark:hover:bg-zinc-800"
                >
                  <div className="mb-1 flex justify-between text-[9px] font-bold">
                    <span>{label}</span><span>{Number(value)} unit</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full ${color}`}
                      style={{ width: `${Math.max(4, (Number(value) / movementMax) * 100)}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      {commandOpen && (
        <div
          className="fixed inset-0 z-120 flex items-start justify-center bg-slate-950/55 p-3 pt-[max(5rem,12vh)] backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCommandOpen(false);
          }}
        >
          <section className="w-full max-w-2xl overflow-hidden rounded-2xl border bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
            <label className="flex items-center gap-3 border-b px-4">
              <Search size={19} className="text-blue-600" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari RS, dokter, dokumen, REF, LOT..."
                className="h-14 min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
              <button type="button" onClick={() => setCommandOpen(false)} className="rounded-lg border px-2 py-1 text-[9px]">
                ESC
              </button>
            </label>
            <div className="max-h-[65vh] overflow-y-auto p-2">
              {!normalizedQuery && (
                <p className="p-8 text-center text-xs text-zinc-500">
                  Ketik nama rumah sakit, dokter, ID dokumen, REF atau LOT.
                </p>
              )}
              {documentResults.length > 0 && (
                <div>
                  <p className="px-3 py-2 text-[9px] font-black uppercase text-zinc-400">Dokumen serah terima</p>
                  {documentResults.map((document, index) => (
                    <Link
                      key={document.ID || index}
                      href={`/serah-terima?id=${encodeURIComponent(document.ID || "")}&token=${encodeURIComponent(document.VerificationToken || "")}`}
                      className="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50 dark:hover:bg-zinc-800"
                    >
                      <ClipboardSignature size={17} className="text-blue-600" />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-xs">{document.Hospital || document.ID}</b>
                        <span className="text-[9px] text-zinc-500">{document.Surgeon || "-"} · {document.Procedure}</span>
                      </span>
                      <DashboardStatus status={document.Status} />
                    </Link>
                  ))}
                </div>
              )}
              {stockResults.length > 0 && (
                <div>
                  <p className="px-3 py-2 text-[9px] font-black uppercase text-zinc-400">Stock implant</p>
                  {stockResults.map((row) => (
                    <button
                      key={`${row.No}-${row.Batch}`}
                      type="button"
                      onClick={() => {
                        onSelectStock(row);
                        setCommandOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl p-3 text-left hover:bg-slate-50 dark:hover:bg-zinc-800"
                    >
                      <Boxes size={17} className="text-violet-600" />
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-xs">{row.Deskripsi}</b>
                        <span className="text-[9px] text-zinc-500">{row.NoStok} · LOT {row.Batch}</span>
                      </span>
                      <b className={stockRemaining(row) <= 1 ? "text-red-600" : "text-emerald-600"}>
                        {stockRemaining(row)} pcs
                      </b>
                    </button>
                  ))}
                </div>
              )}
              {normalizedQuery && !documentResults.length && !stockResults.length && (
                <p className="p-8 text-center text-xs text-zinc-500">Data tidak ditemukan.</p>
              )}
            </div>
          </section>
        </div>
      )}

      {lowStockOpen && (
        <div
          className="fixed inset-0 z-125 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLowStockOpen(false);
          }}
        >
          <section className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-2xl">
            <header className="flex items-center justify-between border-b p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-red-50 text-red-600">
                    <TrendingDown size={18} />
                  </span>
                  <div>
                    <h2 className="text-sm font-black">Semua Stock Kritis</h2>
                    <p className="text-[10px] text-zinc-500">
                      {lowStock.length} REF kosong atau tersisa maksimal 1 pcs
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLowStockOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl border"
                aria-label="Tutup daftar stock kritis"
              >
                <X size={18} />
              </button>
            </header>
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
              {lowStock.map((row) => {
                const remaining = stockRemaining(row);
                return (
                  <button
                    key={`${row.No}-${row.Batch}`}
                    type="button"
                    onClick={() => {
                      onSelectStock(row);
                      setLowStockOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border border-red-100 bg-[#FEF2F2] p-3 text-left transition hover:border-red-400"
                  >
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${
                      remaining <= 0 ? "bg-red-600" : "bg-amber-500"
                    }`}>
                      {remaining}
                    </span>
                    <span className="min-w-0 flex-1">
                      <b className="block text-xs leading-4">{row.Deskripsi}</b>
                      <span className="mt-1 block truncate text-[9px] text-zinc-500">
                        REF {row.NoStok} · LOT {row.Batch || "-"} · {row.Brand || "-"} · {row.Implant || "-"}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black ${
                      remaining <= 0
                        ? "bg-red-600 text-white"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {remaining <= 0 ? "HABIS" : "MENIPIS"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {listModal && (
        <DashboardDataModal
          kind={listModal}
          stock={stock}
          history={history}
          documents={documents}
          search={listSearch}
          onSearch={setListSearch}
          onClose={() => {
            setListModal(null);
            setListSearch("");
          }}
          onSelectStock={(row) => {
            onSelectStock(row);
            setListModal(null);
            setListSearch("");
          }}
        />
      )}
    </>
  );
}

function DashboardDataModal({
  kind,
  stock,
  history,
  documents,
  search,
  onSearch,
  onClose,
  onSelectStock,
}: {
  kind: DashboardListKind;
  stock: StockRow[];
  history: HistoryRow[];
  documents: OnlineHandover[];
  search: string;
  onSearch: (value: string) => void;
  onClose: () => void;
  onSelectStock: (row: StockRow) => void;
}) {
  const config = {
    STOCK: { title: "Semua Stock Implant", tone: "blue", label: "Stock" },
    USED: { title: "Implant Terpakai", tone: "red", label: "Terpakai" },
    REFILL: { title: "Riwayat Refill", tone: "emerald", label: "Refill" },
    SUPPORT_OUT: { title: "Implant Sedang di Luar", tone: "amber", label: "Di luar" },
    RETURN: { title: "Implant Kembali", tone: "blue", label: "Kembali" },
  }[kind];
  const query = search.trim().toLowerCase();
  const stockByNo = new Map(stock.map((row) => [Number(row.No), row]));
  const stockItems = stock.filter((row) => {
    if (kind === "USED" && Number(row.TERPAKAI || 0) <= 0) return false;
    if (kind === "REFILL" && Number(row.REFILL || 0) <= 0) return false;
    return (
      !query ||
      [row.NoStok, row.Deskripsi, row.Batch, row.Brand, row.Implant]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  });
  const outstandingItems = buildOutstandingSupport(history, stock, documents).filter(
    ({ row, lastEntry, location }) =>
      !query ||
      [row.NoStok, row.Deskripsi, row.Batch, row.Brand, lastEntry?.By, location]
        .join(" ")
        .toLowerCase()
        .includes(query)
  );
  const historyAction = kind === "RETURN" ? "MOBILISASI_MASUK" : "";
  const historyItems = history.filter((entry) => {
    if (String(entry.Action).toUpperCase() !== historyAction) return false;
    const row = stockByNo.get(Number(entry.No));
    return (
      !query ||
      [row?.NoStok, row?.Deskripsi, row?.Batch, row?.Brand, entry.By]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  });
  const isHistoryMovement = kind === "RETURN";
  const count =
    kind === "SUPPORT_OUT"
      ? outstandingItems.length
      : isHistoryMovement
        ? historyItems.length
        : stockItems.length;
  const toneClass = {
    blue: "bg-blue-600",
    red: "bg-red-600",
    emerald: "bg-emerald-600",
    amber: "bg-amber-500",
  }[config.tone];

  return (
    <div
      className="fixed inset-0 z-130 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-2xl">
        <header className="border-b p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`flex size-10 items-center justify-center rounded-xl text-white ${toneClass}`}>
                <Boxes size={18} />
              </span>
              <div>
                <h2 className="text-sm font-black">{config.title}</h2>
                <p className="text-[10px] text-zinc-500">{count} data ditemukan</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="flex size-10 items-center justify-center rounded-xl border" aria-label="Tutup modal">
              <X size={18} />
            </button>
          </div>
          <label className="relative mt-3 block">
            <Search size={15} className="absolute left-3 top-3.5 text-zinc-400" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Cari REF, LOT, nama, brand..."
              className="h-11 w-full rounded-xl border bg-transparent pl-9 pr-3 text-xs"
            />
          </label>
        </header>
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
          {kind !== "SUPPORT_OUT" && !isHistoryMovement && stockItems.map((row) => {
            const quantity =
              kind === "USED"
                ? Number(row.TERPAKAI || 0)
                : kind === "REFILL"
                  ? Number(row.REFILL || 0)
                  : stockRemaining(row);
            return (
              <button
                key={`${kind}-${row.No}-${row.Batch}`}
                type="button"
                onClick={() => onSelectStock(row)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40 dark:hover:bg-blue-950/10"
              >
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${toneClass}`}>
                  {quantity}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-xs leading-4">{row.Deskripsi}</b>
                  <span className="mt-1 block truncate text-[9px] text-zinc-500">
                    REF {row.NoStok} · LOT {row.Batch || "-"} · {row.Brand || "-"} · {row.Implant || "-"}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[8px] font-black text-zinc-600 dark:bg-zinc-800">
                  {config.label} {quantity}
                </span>
              </button>
            );
          })}
          {kind === "SUPPORT_OUT" && outstandingItems.map(({ row, quantity, lastEntry, location }) => (
            <button
              key={`outstanding-${row.No}-${row.Batch}`}
              type="button"
              onClick={() => onSelectStock(row)}
              className="flex w-full items-center gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3 text-left transition hover:border-amber-300 dark:border-amber-950 dark:bg-amber-950/15"
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${toneClass}`}>
                {quantity}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-xs leading-4">{row.Deskripsi}</b>
                <span className="mt-1 block truncate text-[9px] text-zinc-500">
                  REF {row.NoStok} · LOT {row.Batch || "-"} · {row.Brand || "-"}
                </span>
                <span className="mt-0.5 block truncate text-[8px] text-zinc-400">
                  {location || "Support manual"}
                  {lastEntry?.Timestamp
                    ? ` · ${formatDashboardDateTime(lastEntry.Timestamp)}`
                    : ""}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[8px] font-black text-amber-700">
                Di luar {quantity}
              </span>
            </button>
          ))}
          {isHistoryMovement && historyItems.map((entry, index) => {
            const row = stockByNo.get(Number(entry.No));
            const quantity = historyMovementQty(entry);
            return (
              <button
                key={`${kind}-${entry.Timestamp}-${entry.No}-${index}`}
                type="button"
                disabled={!row}
                onClick={() => row && onSelectStock(row)}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition enabled:hover:border-blue-300 enabled:hover:bg-blue-50/40 disabled:cursor-default"
              >
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white ${toneClass}`}>
                  {quantity}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block text-xs leading-4">{row?.Deskripsi || `Stock baris #${entry.No}`}</b>
                  <span className="mt-1 block truncate text-[9px] text-zinc-500">
                    REF {row?.NoStok || "-"} · LOT {row?.Batch || "-"} · {formatDashboardDateTime(entry.Timestamp)}
                  </span>
                  <span className="mt-0.5 block truncate text-[8px] text-zinc-400">Oleh {entry.By || "Sistem"}</span>
                </span>
              </button>
            );
          })}
          {count === 0 && (
            <p className="rounded-xl border border-dashed p-8 text-center text-xs text-zinc-500">Tidak ada data pada kategori ini.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  icon,
  tone,
  loading,
  onClick,
}: {
  label: string;
  value: number;
  note: string;
  icon: React.ReactNode;
  tone: "blue" | "violet" | "red" | "emerald";
  loading: boolean;
  onClick?: () => void;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 dark:bg-blue-950/30",
    violet: "bg-violet-50 text-violet-700 dark:bg-violet-950/30",
    red: "bg-red-50 text-red-700 dark:bg-red-950/30",
    emerald: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="rounded-2xl border bg-white p-3 text-left shadow-sm transition enabled:hover:-translate-y-0.5 enabled:hover:border-blue-200 enabled:hover:shadow-md disabled:cursor-default dark:border-zinc-800 dark:bg-zinc-900 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`flex size-9 items-center justify-center rounded-xl ${tones[tone]}`}>{icon}</span>
        <span className="text-[8px] font-bold text-zinc-400">LIVE</span>
      </div>
      <p className="mt-3 text-[9px] font-bold text-zinc-500 sm:text-[10px]">{label}</p>
      <p className="mt-1 text-2xl font-black">{loading ? "—" : value.toLocaleString("id-ID")}</p>
      <p className="mt-1 truncate text-[8px] text-zinc-400 sm:text-[9px]">{note}</p>
    </button>
  );
}

function DashboardStatus({ status }: { status: OnlineHandover["Status"] }) {
  const config =
    status === "DITERIMA"
      ? "bg-emerald-50 text-emerald-700"
      : status === "DIKIRIM"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-600";
  return (
    <span className={`w-fit rounded-full px-2 py-1 text-[8px] font-black ${config}`}>
      {status === "DITERIMA" ? "SELESAI" : status === "DIKIRIM" ? "MENUNGGU TTD" : "DRAFT"}
    </span>
  );
}

function formatDashboardDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Makassar",
  }).format(date);
}

function formatDashboardDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Makassar",
  }).format(date);
}

function formatRefreshTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Makassar",
  }).format(date);
}

function historyMovementQty(row: HistoryRow) {
  try {
    const changes = JSON.parse(String(row.Changes || "[]")) as Array<{
      field?: string;
      before?: string | number;
      after?: string | number;
    }>;
    const action = String(row.Action || "").toUpperCase();
    const preferredField =
      action === "OPERASI"
        ? "TERPAKAI"
        : action === "REFILL"
          ? "REFILL"
          : "TotalQty";
    const change =
      changes.find((item) => item.field === preferredField) ||
      changes.find((item) => item.field === "TotalQty") ||
      changes.find((item) => item.field === "Qty");
    if (!change) return 1;
    return Math.max(
      1,
      Math.abs(Number(change.after || 0) - Number(change.before || 0))
    );
  } catch {
    return 1;
  }
}

function historyMovementNote(row: HistoryRow) {
  try {
    const changes = JSON.parse(String(row.Changes || "[]")) as Array<{
      field?: string;
      after?: string | number;
    }>;
    return String(
      changes.find((item) => item.field === "KET")?.after || ""
    );
  } catch {
    return "";
  }
}

function buildOutstandingSupport(
  history: HistoryRow[],
  stock: StockRow[],
  documents: OnlineHandover[]
) {
  const stockByNo = new Map(stock.map((row) => [Number(row.No), row]));
  const stockByIdentity = new Map(
    stock.map((row) => [
      `${String(row.NoStok).trim()}|${String(row.Batch || "").trim()}`,
      row,
    ])
  );
  const active = new Map<
    number,
    {
      quantity: number;
      lastEntry?: HistoryRow;
      locations: Set<string>;
      lastUpdated: string;
    }
  >();

  // Dokumen OnlineHandover adalah sumber utama posisi stock di rumah sakit.
  // History tidak dipakai untuk BAST karena sifatnya akumulatif/audit.
  documents
    .filter((document) => document.Status !== "DRAFT")
    .forEach((document) => {
      document.Items.forEach((item) => {
        const hospitalQty = Math.max(
          0,
          Number(item.hospitalQty ?? item.qtyIssued ?? 0) || 0
        );
        const remaining = Math.max(
          0,
          hospitalQty -
            (Number(item.usedQty || 0) || 0) -
            (Number(item.returnedQty || 0) || 0)
        );
        if (remaining <= 0) return;
        const requestedRow = stockByNo.get(Number(item.stockRow));
        const row =
          requestedRow &&
          String(requestedRow.NoStok) === String(item.partNumber) &&
          String(requestedRow.Batch || "") === String(item.batch || "")
            ? requestedRow
            : stockByIdentity.get(
                `${String(item.partNumber).trim()}|${String(item.batch || "").trim()}`
              );
        if (!row) return;
        const no = Number(row.No);
        const current = active.get(no) || {
          quantity: 0,
          locations: new Set<string>(),
          lastUpdated: "",
        };
        current.quantity += remaining;
        current.locations.add(`RS ${String(document.Hospital || "-").trim()}`);
        current.lastUpdated =
          document.HospitalUpdatedAt ||
          document.UpdatedAt ||
          document.AcceptedAt ||
          document.SentAt ||
          current.lastUpdated;
        active.set(no, current);
      });
    });

  // History hanya melengkapi support manual cabang yang tidak memakai BAST.
  const manualBalances = new Map<
    number,
    { quantity: number; lastEntry?: HistoryRow }
  >();
  const chronological = [...history].sort(
    (first, second) =>
      new Date(first.Timestamp).getTime() - new Date(second.Timestamp).getTime()
  );

  chronological.forEach((entry) => {
    const no = Number(entry.No);
    if (!stockByNo.has(no)) return;
    const action = String(entry.Action || "").toUpperCase();
    const note = historyMovementNote(entry);
    if (/serah terima\s+ST-|dokumen\s+ST-/i.test(note)) return;
    const current = manualBalances.get(no) || { quantity: 0 };
    const quantity = historyMovementQty(entry);
    if (action === "MOBILISASI_KELUAR") {
      current.quantity += quantity;
      current.lastEntry = entry;
    } else if (action === "MOBILISASI_MASUK") {
      current.quantity = Math.max(0, current.quantity - quantity);
      current.lastEntry = entry;
    }
    manualBalances.set(no, current);
  });

  manualBalances.forEach((manual, no) => {
    if (manual.quantity <= 0) return;
    const current = active.get(no) || {
      quantity: 0,
      locations: new Set<string>(),
      lastUpdated: "",
    };
    current.quantity += manual.quantity;
    current.locations.add("Support cabang/manual");
    current.lastEntry = manual.lastEntry;
    current.lastUpdated = manual.lastEntry?.Timestamp || current.lastUpdated;
    active.set(no, current);
  });

  return Array.from(active.entries())
    .filter(([, value]) => value.quantity > 0)
    .map(([no, value]) => ({
      row: stockByNo.get(no)!,
      quantity: value.quantity,
      lastEntry: value.lastEntry,
      location: Array.from(value.locations).join(" · "),
      lastUpdated: value.lastUpdated,
    }))
    .sort(
      (first, second) =>
        new Date(second.lastUpdated || 0).getTime() -
        new Date(first.lastUpdated || 0).getTime()
    );
}

function stockRemaining(row: StockRow) {
  const total = Number(row.TotalQty);
  return Number.isFinite(total) ? total : Number(row.Qty || 0);
}

export default function Page() {
  return <StockManagementPage />;
}

/* ================= SKELETONS ================= */

function TableSkeleton() {
  return (
    <div className="h-64 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
  );
}
