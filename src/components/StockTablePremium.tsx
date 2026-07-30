"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import ExcelJS from "exceljs";
import {
  Search,
  FileSpreadsheet,
  RefreshCcw,
  Plus,
  ChevronLeft,
  ChevronRight,
  NotebookTabs,
  Layers3,
  SlidersHorizontal,
  Activity,
  ArrowDownToLine,
  ArrowUpFromLine,
  Truck,
  FootprintsIcon,
  UserRoundCheckIcon,
  LoaderCircle,
  Check,
  ChevronDown,
  Table2,
  LayoutGrid,
  ClipboardCheck,
  ClipboardSignature,
  Hospital,
  BellRing,
  ScanLine,
  Warehouse,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StockRow } from "@/types/stock";
import { useStockCRUD } from "@/hooks/useStockCRUD";
import { useStockTable } from "@/hooks/useStockTable";
import EditModal from "./EditModal";
import RowActions from "./RowActions";
import HistoryTimelineModal from "./HistoryModalTimeline";
import QuickSearch from "./QuickSearch";
import MutateModal from "./MutateModal";
import StockOpnameModal from "./StockOpnameModal";
import LowStockAlertModal from "./LowStockAlertModal";
import { gasGetHistoryWithContext, type GasSheetContext } from "@/lib/gas";
import { parseChanges } from "@/lib/history";
import type { HistoryRow } from "@/types/history";
import {
  STOCK_IMPLANT_CATEGORY_LABELS,
  STOCK_PROCEDURE_CATEGORIES,
  STOCK_COMPONENT_CATEGORIES,
  type StockImplantCategory,
} from "@/lib/stockCategories";
import { toast } from "sonner";

/* ================= TYPES ================= */
type FilterMode = "ALL" | "REF" | "LOT" | "NAMA";
type BrandFilter = "NORMMED" | "ZIMMER";
type ImplantFilter = StockImplantCategory;
type StockStatusFilter = "ALL" | "LOW" | "OUT";
type ExternalScanPayload = {
  ref: string;
  lot?: string;
  exp?: string;
  raw?: string;
  searchField?: "REF" | "LOT";
};
type MovementReason =
  | "OPERASI"
  | "REFILL"
  | "MOBILISASI_KELUAR"
  | "MOBILISASI_MASUK";
type DashboardMovement = HistoryRow & {
  reason: MovementReason;
  qty: number;
  before: number;
  after: number;
  description: string;
  row?: StockRow;
};

const MOVEMENT_REASONS = new Set<MovementReason>([
  "OPERASI",
  "REFILL",
  "MOBILISASI_KELUAR",
  "MOBILISASI_MASUK",
]);

function toSafeNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;

    const normalized = trimmed
      .replace(/\s+/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(/,(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".")
      .replace(/[^0-9.-]/g, "");

    if (!normalized || normalized === "-" || normalized === "." || normalized === "-.") {
      return 0;
    }

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function latestDescription(value: unknown) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.at(-1) || "";
}

function subscribeMobileViewport(onChange: () => void) {
  const mediaQuery = window.matchMedia("(max-width: 639px)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getMobileViewportSnapshot() {
  return window.matchMedia("(max-width: 639px)").matches;
}

function getServerMobileViewportSnapshot() {
  return false;
}

/* ================= DEBOUNCE ================= */
function useDebounce<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/* ================= COMPONENT ================= */
export default function StockTablePremium({
  sheet = "Sheet1",
  externalScan,
  context,
  title = "📦 Stock Management",
  onOpenScanner,
}: {
  sheet?: string;
  externalScan?: ExternalScanPayload | null;
  context?: GasSheetContext;
  title?: string;
  onOpenScanner?: () => void;
}) {
  const [lowStockAlertOpen, setLowStockAlertOpen] = useState(false);

  const handleRemoteChange = useCallback(() => {
    toast.info("Data diperbarui oleh user lain. Tabel disegarkan otomatis.");
  }, []);

  const handleInitialStockLoad = useCallback((rows: StockRow[]) => {
    if (rows.some((row) => Number(row.TotalQty || 0) <= 1)) {
      setLowStockAlertOpen(true);
    }
  }, []);

  const { data, loading, mutating, reload, createRow, updateRow } = useStockCRUD({
    sheet,
    context,
    pollIntervalMs: 12000,
    onRemoteChange: handleRemoteChange,
    onInitialLoad: handleInitialStockLoad,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);
  const [movementRow, setMovementRow] = useState<StockRow | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<FilterMode>("ALL");
  const [brandFilters, setBrandFilters] = useState<BrandFilter[]>([]);
  const [implantFilters, setImplantFilters] = useState<ImplantFilter[]>([]);
  const isMobileViewport = useSyncExternalStore(
    subscribeMobileViewport,
    getMobileViewportSnapshot,
    getServerMobileViewportSnapshot
  );
  const [viewModePreference, setViewModePreference] = useState<
    "table" | "card" | null
  >(null);
  const viewMode =
    viewModePreference ?? (isMobileViewport ? "card" : "table");
  const [stockStatusFilter, setStockStatusFilter] =
    useState<StockStatusFilter>("ALL");
  const [lowStockThreshold, setLowStockThreshold] = useState(1);
  const [opnameOpen, setOpnameOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [isCreate, setIsCreate] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNo, setHistoryNo] = useState<number | null>(null);
  const [movementHistory, setMovementHistory] = useState<HistoryRow[]>([]);
  const [movementHistoryLoading, setMovementHistoryLoading] = useState(true);
  const [timelineExpanded, setTimelineExpanded] = useState(false);
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [movementRefresh, setMovementRefresh] = useState(0);

  const debounced = useDebounce(search, 350);
  const scannedRef = String(externalScan?.ref ?? "").trim();
  const scannedLot = String(externalScan?.lot ?? "").trim();
  const scannedValue =
    externalScan?.searchField === "LOT"
      ? scannedLot
      : scannedRef || scannedLot;
  const activeSearch = scannedValue || debounced;
  const activeMode: FilterMode = scannedValue
    ? externalScan?.searchField === "LOT"
      ? "LOT"
      : "REF"
    : mode;

  /* ================= AUTO BARCODE ================= */
  useEffect(() => {
    const onScan = (e: KeyboardEvent) => {
      if (e.key === "Enter" && search.length > 3) {
        setMode("REF");
      }
    };
    window.addEventListener("keydown", onScan);
    return () => window.removeEventListener("keydown", onScan);
  }, [search]);

  /* ================= FILTER ================= */
  const filteredData = useMemo(() => {
    const q = activeSearch.toLowerCase();

    return data.filter((r) => {
      const rowBrand = String(r.Brand ?? "").trim().toUpperCase();
      const rowImplant = String(r.Implant ?? "").trim().toUpperCase();
      const matchesBrand =
        brandFilters.length === 0 ||
        brandFilters.includes(rowBrand as BrandFilter);
      const matchesImplant =
        implantFilters.length === 0 ||
        implantFilters.includes(rowImplant as ImplantFilter);
      const stockQty = toSafeNumber(r.TotalQty);
      const matchesStockStatus =
        stockStatusFilter === "ALL" ||
        (stockStatusFilter === "OUT" && stockQty <= 0) ||
        (stockStatusFilter === "LOW" &&
          stockQty > 0 &&
          stockQty <= lowStockThreshold);

      if (!matchesBrand || !matchesImplant || !matchesStockStatus) return false;
      if (!q) return true;

      const ref = String(r.NoStok ?? "").toLowerCase();
      const lot = String(r.Batch ?? "").toLowerCase();
      const nama = String(r.Deskripsi ?? "").toLowerCase();

      if (activeMode === "REF") return ref.includes(q);
      if (activeMode === "LOT") return lot.includes(q);
      if (activeMode === "NAMA") return nama.includes(q);

      return (
        ref.includes(q) || lot.includes(q) || nama.includes(q)
      );
    });
  }, [
    data,
    activeSearch,
    activeMode,
    brandFilters,
    implantFilters,
    stockStatusFilter,
    lowStockThreshold,
  ]);

  const tableData = useStockTable(filteredData);
  const setTablePage = tableData.setPage;

  /* ================= SUMMARY (FILTERED) ================= */
  const summary = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.qty += toSafeNumber(r.Qty);
        acc.used += toSafeNumber(r.TERPAKAI);
        acc.refill += toSafeNumber(r.REFILL);
        return acc;
      },
      { count: 0, qty: 0, used: 0, refill: 0 }
    );
  }, [filteredData]);

  const brandSummary = useMemo(() => {
    const initial = {
      NORMMED: { count: 0, available: 0, used: 0, refill: 0 },
      ZIMMER: { count: 0, available: 0, used: 0, refill: 0 },
    };

    return data.reduce((acc, row) => {
      const brand = String(row.Brand ?? "").trim().toUpperCase();
      if (brand !== "NORMMED" && brand !== "ZIMMER") return acc;
      acc[brand].count += 1;
      acc[brand].available += toSafeNumber(row.TotalQty);
      acc[brand].used += toSafeNumber(row.TERPAKAI);
      acc[brand].refill += toSafeNumber(row.REFILL);
      return acc;
    }, initial);
  }, [data]);

  useEffect(() => {
    let active = true;

    const loadMovementHistory = async () => {
      try {
        const response = await gasGetHistoryWithContext(
          sheet,
          undefined,
          context
        );
        if (!active) return;
        setMovementHistory(response.data ?? []);
      } catch {
        if (active) setMovementHistory([]);
      } finally {
        if (active) setMovementHistoryLoading(false);
      }
    };

    setMovementHistoryLoading(true);
    void loadMovementHistory();
    const timer = window.setInterval(loadMovementHistory, 30_000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [sheet, context, movementRefresh]);

  const movementEntries = useMemo(() => {
    const visibleRows = new Map(
      filteredData.map((row) => [row.No, row] as const)
    );

    return movementHistory
      .filter((history) =>
        MOVEMENT_REASONS.has(
          String(history.Action ?? "").toUpperCase() as MovementReason
        )
      )
      .map((history) => {
        const reason = String(history.Action).toUpperCase() as MovementReason;
        const changes = parseChanges(history.Changes);
        const qtyChange = changes.find(
          (change) => change.field === "Qty" || change.field === "TotalQty"
        );
        const before = toSafeNumber(qtyChange?.before);
        const after = toSafeNumber(qtyChange?.after);
        const ket = changes.find((change) => change.field === "KET");
        const description = String(ket?.after ?? "")
          .split("\n")
          .filter(Boolean)
          .at(-1);

        return {
          ...history,
          reason,
          qty: Math.abs(after - before),
          before,
          after,
          description: description || movementLabel(reason),
          row: visibleRows.get(history.No),
        };
      })
      .filter((entry) => Boolean(entry.row))
      .sort(
        (a, b) =>
          new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime()
      );
  }, [filteredData, movementHistory]);

  const movementSummary = useMemo(
    () =>
      movementEntries.reduce(
        (summary, movement) => {
          summary[movement.reason] += movement.qty;
          return summary;
        },
        {
          OPERASI: 0,
          REFILL: 0,
          MOBILISASI_KELUAR: 0,
          MOBILISASI_MASUK: 0,
        } satisfies Record<MovementReason, number>
      ),
    [movementEntries]
  );

  const lowStockAlertCount = useMemo(
    () =>
      data.filter((row) => Number(row.TotalQty || 0) <= lowStockThreshold)
        .length,
    [data, lowStockThreshold]
  );

  useEffect(() => {
    setTablePage(1);
  }, [
    brandFilters,
    implantFilters,
    stockStatusFilter,
    lowStockThreshold,
    activeSearch,
    setTablePage,
  ]);

  /* ================= HIGHLIGHT ================= */
  const highlight = (text: string | number) => {
    if (!debounced) return text;
    const str = String(text);
    const q = debounced.toLowerCase();
    const idx = str.toLowerCase().indexOf(q);
    if (idx === -1) return str;

    return (
      <>
        {str.slice(0, idx)}
        <mark className="bg-yellow-300 text-black rounded px-1">
          {str.slice(idx, idx + q.length)}
        </mark>
        {str.slice(idx + q.length)}
      </>
    );
  };

  /* ================= EXPORT ================= */
  const handleExport = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(sheet);

    const headers: (keyof StockRow)[] = [
      "NoStok",
      "Deskripsi",
      "Implant",
      "Brand",
      "Batch",
      "Qty",
      "TotalQty",
      "TERPAKAI",
      "REFILL",
      "KET",
    ];

    ws.addRow(headers);
    headers.forEach((_, i) => (ws.getColumn(i + 1).width = 18));
    tableData.sorted.forEach((r) => ws.addRow(headers.map((h) => r[h])));

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheet}-stock.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================= UI ================= */
  return (
    <div
      className="relative overflow-hidden border-x-0 border-y-0 bg-white shadow-sm dark:bg-zinc-900 sm:rounded-2xl sm:border"
      aria-busy={loading || mutating}
    >
      {(loading || mutating) && (
        <div className="absolute inset-x-0 top-0 z-30 h-1 overflow-hidden bg-blue-100 dark:bg-blue-950">
          <div className="h-full w-full origin-left animate-pulse bg-blue-600" />
        </div>
      )}
      {mutating && (
        <div className="fixed inset-0 z-10020 flex items-center justify-center bg-zinc-950/35 px-4 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-semibold shadow-2xl dark:bg-zinc-900">
            <LoaderCircle className="animate-spin text-blue-600" size={20} />
            Menyimpan perubahan…
          </div>
        </div>
      )}
      {/* HEADER */}
      <div className="border-b bg-[#0f172a] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:bg-linear-to-br sm:from-zinc-950 sm:via-zinc-900 sm:to-blue-950 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">
              <Layers3 size={15} />
              Implant inventory
            </div>
            <h2 className="text-xl font-bold sm:text-2xl">{title}</h2>
            <p className="mt-1 hidden text-xs text-zinc-300 sm:block sm:text-sm">
              Pantau stok Normmed dan Zimmer dalam satu dashboard.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[11px] font-semibold hover:bg-white/20 sm:hidden"
              title="Scan barcode"
            >
              <ScanLine size={16} />
              <span>Scan</span>
            </button>
          )}
          <button onClick={reload} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[11px] font-semibold hover:bg-white/20" title="Muat ulang">
            <RefreshCcw size={16} />
            <span className="sm:hidden">Muat ulang</span>
          </button>
          <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[11px] font-semibold hover:bg-white/20" title="Export Excel">
            <FileSpreadsheet size={16} />
            <span className="sm:hidden">Export Excel</span>
          </button>
          <button
            onClick={() => setOpnameOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[11px] font-semibold hover:bg-white/20"
            title="Stock opname cepat"
          >
            <ClipboardCheck size={16} />
            <span className="sm:hidden">Cek stok</span>
          </button>
          <button
            onClick={() => setLowStockAlertOpen(true)}
            disabled={lowStockAlertCount === 0}
            className="relative inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[11px] font-semibold hover:bg-white/20 disabled:opacity-40"
            title="Lihat peringatan stok"
          >
            <BellRing size={16} />
            <span className="sm:hidden">Peringatan</span>
            {lowStockAlertCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full bg-red-500 px-1 text-[9px] font-bold leading-4 text-white">
                {lowStockAlertCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setIsCreate(true);
              setSelectedRow(null);
              setEditOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-500 p-2.5 text-[11px] font-semibold text-white hover:bg-blue-400 sm:col-span-1"
            title="Tambah data"
          >
            <Plus size={16} />
            <span className="sm:hidden">Tambah implant</span>
          </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-[#f8fafc] p-3 pb-24 dark:bg-zinc-950 sm:bg-transparent sm:p-5 sm:pb-5 dark:sm:bg-transparent">
      {/* COMPACT BRAND SELECTOR */}
      <div className="-mt-7 grid grid-cols-3 gap-1 rounded-xl border bg-white p-1 shadow-sm dark:bg-zinc-900 sm:mt-0 sm:flex sm:gap-2 sm:overflow-x-auto sm:border-0 sm:bg-transparent sm:p-0 sm:pb-1 sm:shadow-none dark:sm:bg-transparent">
        <button
          type="button"
          onClick={() => setBrandFilters([])}
          className={`min-w-0 shrink-0 rounded-lg border px-2 py-2.5 text-center transition sm:rounded-xl sm:px-4 sm:text-left ${
            brandFilters.length === 0
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
              : "bg-white hover:bg-zinc-50 dark:bg-zinc-900"
          }`}
        >
          <div className="text-[11px] font-bold sm:text-xs">Semua Brand</div>
          <div className="mt-0.5 text-[10px] opacity-70">{data.length}</div>
        </button>
        {(["NORMMED", "ZIMMER"] as const).map((brand) => {
          const stats = brandSummary[brand];
          const active = brandFilters.includes(brand);
          const normmed = brand === "NORMMED";
          return (
            <button
              type="button"
              key={brand}
              onClick={() => setBrandFilters(active ? [] : [brand])}
              className={`min-w-0 shrink-0 rounded-lg border px-2 py-2.5 text-center transition sm:min-w-44 sm:rounded-xl sm:px-4 sm:text-left ${
                active
                  ? normmed
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                    : "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                  : "bg-white hover:bg-zinc-50 dark:bg-zinc-900"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="text-[11px] font-bold sm:text-xs">
                  {brand === "NORMMED" ? "Normmed" : "Zimmer"}
                </div>
                <div className={`text-sm font-black sm:text-lg ${
                  normmed ? "text-emerald-600" : "text-blue-600"
                }`}>
                  {stats.available}
                </div>
              </div>
              <div className="mt-0.5 hidden justify-between text-[10px] text-zinc-500 sm:flex">
                <span>{stats.count} data</span>
                <span>stok tersedia</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FILTERS */}
      <div className="rounded-xl border bg-white p-2.5 dark:bg-zinc-800/50 sm:bg-zinc-50">
        <div className="mb-2 hidden flex-wrap items-center justify-between gap-2 px-0.5 sm:flex">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <SlidersHorizontal size={15} />
            <span>Filter</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700">
              {filteredData.length}/{data.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setBrandFilters([]);
              setImplantFilters([]);
              setSearch("");
              setMode("ALL");
              setStockStatusFilter("ALL");
            }}
            className="text-[11px] font-semibold text-blue-600 hover:underline"
          >
            Reset filter
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(280px,1fr)_150px_190px_110px_auto]">
        <div className="relative flex-1 max-sm:pr-24">
          <Search size={15} className="absolute left-3 top-3 text-zinc-400" />
          <input
            value={scannedValue || search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari REF, nama, batch..."
            className="h-10 w-full rounded-lg border bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-400 dark:bg-zinc-900"
          />
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((value) => !value)}
            className="absolute right-0 top-0 inline-flex h-10 w-[88px] items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-700 sm:hidden"
            aria-expanded={mobileFiltersOpen}
          >
            <SlidersHorizontal size={13} />
            Filter
            <ChevronDown
              size={12}
              className={mobileFiltersOpen ? "rotate-180" : ""}
            />
          </button>
        </div>

        <div className={`${mobileFiltersOpen ? "contents" : "hidden"} sm:contents`}>
        <ChecklistFilter
          label="Brand"
          allLabel="Semua brand"
          values={brandFilters}
          options={[
            { value: "NORMMED", label: "Normmed" },
            { value: "ZIMMER", label: "Zimmer" },
          ]}
          onChange={(values) => setBrandFilters(values as BrandFilter[])}
        />
        <ChecklistFilter
          label="Tindakan & Komponen"
          allLabel="Tindakan / komponen"
          values={implantFilters}
          options={[
            ...STOCK_PROCEDURE_CATEGORIES.map((category) => ({
              value: category,
              label: STOCK_IMPLANT_CATEGORY_LABELS[category],
              group: "Tindakan utama",
            })),
            ...STOCK_COMPONENT_CATEGORIES.map((category) => ({
              value: category,
              label: STOCK_IMPLANT_CATEGORY_LABELS[category],
              group: "Komponen implant",
            })),
          ]}
          onChange={(values) => setImplantFilters(values as ImplantFilter[])}
        />
        <select
          value={scannedValue ? activeMode : mode}
          onChange={(e) => setMode(e.target.value as FilterMode)}
          className="rounded-lg border bg-white px-3 py-2.5 text-sm dark:bg-zinc-900"
        >
          <option value="ALL">ALL</option>
          <option value="REF">REF</option>
          <option value="LOT">LOT</option>
          <option value="NAMA">NAMA</option>
        </select>
        <div className="inline-flex h-10 rounded-lg border bg-white p-1 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setViewModePreference("table")}
            title="Table view"
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-semibold ${
              viewMode === "table"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500"
            }`}
          >
            <Table2 size={13} /> Table
          </button>
          <button
            type="button"
            onClick={() => setViewModePreference("card")}
            title="Card view"
            className={`inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-semibold ${
              viewMode === "card"
                ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                : "text-zinc-500"
            }`}
          >
            <LayoutGrid size={13} /> Card
          </button>
        </div>
        </div>
        </div>
        <div className={`${mobileFiltersOpen ? "flex" : "hidden"} mt-2 flex-wrap items-center gap-1.5 border-t pt-2 sm:flex`}>
          <span className="mr-1 text-[10px] font-semibold text-zinc-500">
            Status stok
          </span>
          {([
            ["ALL", "Semua"],
            ["LOW", "Menipis"],
            ["OUT", "Habis"],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setStockStatusFilter(value)}
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                stockStatusFilter === value
                  ? value === "OUT"
                    ? "border-red-600 bg-red-600 text-white"
                    : value === "LOW"
                    ? "border-amber-500 bg-amber-500 text-white"
                    : "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "bg-white text-zinc-500 dark:bg-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
          <label className="ml-auto inline-flex items-center gap-1.5 text-[10px] text-zinc-500">
            Batas minimum
            <input
              type="number"
              min={0}
              value={lowStockThreshold}
              onChange={(event) =>
                setLowStockThreshold(Math.max(0, Number(event.target.value) || 0))
              }
              className="h-7 w-14 rounded-md border bg-white px-2 text-center font-bold text-zinc-900 dark:bg-zinc-900 dark:text-white"
            />
          </label>
        </div>
      </div>
      <QuickSearch
        data={data}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSelect={(row) => {
          setSelectedRow(row);
          setEditOpen(true);
          setIsCreate(false);
        }}
      />

      {/* SUMMARY */}
      <div className="grid grid-cols-4 divide-x overflow-hidden rounded-xl border bg-white py-1 dark:bg-zinc-900">
        <SimpleMetric label="Data" value={summary.count} tone="text-zinc-900 dark:text-white" />
        <SimpleMetric label="Stok" value={summary.qty} tone="text-zinc-900 dark:text-white" />
        <SimpleMetric label="Terpakai" value={summary.used} tone="text-red-600" />
        <SimpleMetric label="Refill" value={summary.refill} tone="text-blue-600" />
      </div>

      {/* MOVEMENT DASHBOARD + TIMELINE */}
      <section className="hidden overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 sm:block">
        <div className="flex items-center justify-between gap-3 p-3 sm:p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-bold">
              <FootprintsIcon size={17} className="text-violet-600" />
              Pergerakan Implant
            </div>
            <p className="mt-0.5 truncate text-[11px] text-zinc-500">
              {movementEntries.length} aktivitas sesuai filter
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTimelineExpanded((value) => !value)}
            className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            {timelineExpanded ? "Tutup" : "Lihat timeline"}
          </button>
        </div>

        <div className="grid grid-cols-4 divide-x border-t">
          <MovementMetric
            label="Operasi"
            value={movementSummary.OPERASI}
            icon={<UserRoundCheckIcon size={16} />}
            tone="red"
          />
          <MovementMetric
            label="Refill"
            value={movementSummary.REFILL}
            icon={<ArrowDownToLine size={16} />}
            tone="emerald"
          />
          <MovementMetric
            label="Support keluar"
            value={movementSummary.MOBILISASI_KELUAR}
            icon={<Truck size={16} />}
            tone="amber"
          />
          <MovementMetric
            label="Kembali"
            value={movementSummary.MOBILISASI_MASUK}
            icon={<ArrowUpFromLine size={16} />}
            tone="blue"
          />
        </div>

        {timelineExpanded && <div className="border-t bg-zinc-50 px-3 py-4 dark:bg-zinc-800/40 sm:px-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold">Timeline terbaru</h3>
            <span className="text-xs text-zinc-500">
              {movementEntries.length} aktivitas
            </span>
          </div>

          {movementHistoryLoading ? (
            <div className="py-8 text-center text-sm text-zinc-400">
              Memuat pergerakan implant…
            </div>
          ) : movementEntries.length === 0 ? (
            <div className="rounded-xl border border-dashed bg-white px-4 py-8 text-center dark:bg-zinc-900">
              <Activity className="mx-auto text-zinc-300" size={28} />
              <p className="mt-2 text-sm font-semibold">Belum ada pergerakan</p>
              <p className="mt-1 text-xs text-zinc-500">
                Aktivitas operasi, refill, dan support cabang akan muncul di sini.
              </p>
            </div>
          ) : (
            <>
              <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-700">
                {movementEntries
                  .slice(0, showAllMovements ? 20 : 3)
                  .map((movement, index) => (
                    <MovementTimelineItem
                      key={`${movement.Timestamp}-${movement.No}-${index}`}
                      movement={movement}
                      onOpenHistory={() => {
                        setHistoryNo(movement.No);
                        setHistoryOpen(true);
                      }}
                    />
                  ))}
              </div>
              {movementEntries.length > 3 && (
                <button
                  type="button"
                  onClick={() => setShowAllMovements((value) => !value)}
                  className="mt-4 w-full rounded-xl border bg-white py-2.5 text-xs font-semibold hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                >
                  {showAllMovements ? "Tampilkan lebih sedikit" : "Lihat timeline lainnya"}
                </button>
              )}
            </>
          )}
        </div>}
      </section>

      {/* ================= TABLE VIEW ================= */}
      <div className={`${viewMode === "table" ? "block" : "hidden"} overflow-x-auto rounded-xl border`}>
        <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] w-full text-sm">
              {/* ================= HEADER ================= */}
              <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 border-b">
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  {[
                    "REF",
                    "Deskripsi",
                    "Implant",
                    "Brand",
                    "Batch",
                    "Qty",
                    "Total",
                    "Terpakai",
                    "Refill",
                    "Keterangan",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-semibold whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Aksi</th>
                </tr>
              </thead>

              {/* ================= BODY ================= */}
              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map((_, rowIndex) => (
                    <tr key={`stock-skeleton-${rowIndex}`} className="border-b">
                      {Array.from({ length: 11 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-3">
                          <div
                            className={`h-3 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700 ${
                              cellIndex === 1 ? "w-40" : "w-14"
                            }`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tableData.paginated.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-6 text-center text-zinc-400">
                      Tidak ada data
                    </td>
                  </tr>
                ) : (
                  tableData.paginated.map((r: StockRow, i: number) => (
                    <motion.tr
                      key={`${r.No}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15 }}
                      className="
                border-b last:border-b-0
                hover:bg-zinc-50 dark:hover:bg-zinc-800
                transition-colors
              "
                    >
                      {/* REF */}
                      <td className="px-3 py-2 text-zinc-600">
                        {highlight(r.NoStok)}
                      </td>

                      {/* Deskripsi */}
                      <td className="px-3 py-2 max-w-[260px] truncate">
                        {highlight(r.Deskripsi)}
                      </td>

                      <td className="px-3 py-2">
                        <Badge variant="outline">{r.Implant || "-"}</Badge>
                      </td>

                      <td className="px-3 py-2">
                        <Badge variant="secondary">{r.Brand || "-"}</Badge>
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-2 text-zinc-500">
                        {highlight(r.Batch)}
                      </td>

                      {/* Qty */}
                      <td className="px-3 py-2">
                        <Badge variant="default">{r.Qty}</Badge>
                      </td>

                      {/* Total */}
                      <td className="px-3 py-2">
                        <Badge
                          variant={r.TotalQty <= 0 ? "outline" : "destructive"}
                        >
                          {r.TotalQty}
                        </Badge>
                      </td>

                      {/* Terpakai */}
                      <td className="px-3 py-2">
                        <Badge className="animate-warning text-slate-800">
                          {r.TERPAKAI}
                        </Badge>
                      </td>

                      {/* Refill */}
                      <td className="px-3 py-2">
                        <Badge variant="secondary">{r.REFILL}</Badge>
                      </td>

                      {/* Keterangan */}
                      <td
                        className="max-w-[260px] px-3 py-2 text-xs leading-5 text-zinc-500"
                        title={latestDescription(r.KET)}
                      >
                        <span className="line-clamp-2">
                          {latestDescription(r.KET) || "-"}
                        </span>
                      </td>

                      {/* ================= ACTION ================= */}
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setHistoryNo(r.No);
                              setHistoryOpen(true);
                            }}
                            className="
                      p-2 rounded-lg
                      hover:bg-blue-100 dark:hover:bg-blue-900/30
                      text-blue-600 dark:text-blue-400
                      transition
                    "
                            title="History"
                          >
                            <NotebookTabs size={16} />
                          </button>

                          <RowActions
                            row={r}
                            sheet={sheet}
                            context={context}
                            onReload={reload}
                            onEdit={(row) => {
                              setIsCreate(false);
                              setSelectedRow(row);
                              setEditOpen(true);
                            }}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ================= CARD VIEW ================= */}
      {viewMode === "card" && (
        <div id="stock-list" className="flex scroll-mt-4 items-center justify-between sm:hidden">
          <h3 className="text-sm font-black tracking-tight">
            Daftar Stock Implant
          </h3>
          <span className="text-[10px] font-semibold text-blue-600">
            View: Card
          </span>
        </div>
      )}
      <div className={viewMode === "card" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "hidden"}>
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`mobile-stock-skeleton-${index}`}
              className="space-y-3 rounded-2xl border bg-white p-4 dark:bg-zinc-900"
            >
              <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="flex gap-2">
                <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
                <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
          ))}
        {tableData.paginated.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-none transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className={`hidden h-1 sm:block ${
              r.Brand === "NORMMED"
                ? "bg-emerald-500"
                : r.Brand === "ZIMMER"
                ? "bg-blue-500"
                : "bg-zinc-300"
            }`} />
            <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`rounded-md px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide ${
                    r.Brand === "NORMMED"
                      ? "bg-blue-50 text-blue-600"
                      : r.Brand === "ZIMMER"
                      ? "bg-fuchsia-50 text-fuchsia-600"
                      : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {r.Brand || "Tanpa brand"}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[9px] font-bold uppercase text-slate-600">
                    {r.Implant || "Tanpa kategori"}
                  </span>
                </div>
                <div className="mt-2 line-clamp-2 min-h-10 text-sm font-black uppercase leading-5 tracking-[0.01em]">
                  {highlight(r.Deskripsi)}
                </div>
              </div>
              <div className={`shrink-0 rounded-full border px-3 py-1 text-center text-[9px] font-bold ${
                r.TotalQty <= 0
                  ? "border-red-200 bg-red-50 text-red-600"
                  : r.TotalQty <= lowStockThreshold
                  ? "border-amber-200 bg-amber-50 text-amber-600"
                  : "border-emerald-200 bg-emerald-50 text-emerald-600"
              }`}>
                {r.TotalQty <= 0
                  ? "Habis"
                  : r.TotalQty <= lowStockThreshold
                  ? "Perlu Refill"
                  : "Aman"}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 px-4 py-2.5 text-xs dark:bg-zinc-800/70">
              <div>
                <div className="text-[9px] uppercase text-zinc-400">REF</div>
                <div className="truncate font-bold">{highlight(r.NoStok) || "-"}</div>
              </div>
              <div>
                <div className="text-[9px] uppercase text-zinc-400">LOT / Batch</div>
                <div className="truncate font-bold">{highlight(r.Batch) || "-"}</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 divide-x border-t py-2.5">
              <div>
                <div className="text-[9px] text-zinc-400">Stok Tersedia</div>
                <div className={`mt-1 text-base font-black ${
                  r.TotalQty <= 0 ? "text-red-600" : "text-zinc-900 dark:text-white"
                }`}>{r.TotalQty} Pcs</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-400">Terpakai</div>
                <div className="mt-1 text-base font-black text-red-500">{r.TERPAKAI || 0} Pcs</div>
              </div>
              <div>
                <div className="text-[9px] text-zinc-400">Riwayat Refill</div>
                <div className="mt-1 text-base font-black text-amber-500">{r.REFILL || 0} Pcs</div>
              </div>
            </div>

            {latestDescription(r.KET) && (
              <div className="mt-2 line-clamp-2 rounded-xl border border-dashed px-3 py-2 text-[11px] leading-5 text-zinc-500">
                <span className="font-semibold text-zinc-700 dark:text-zinc-200">Terbaru: </span>
                {latestDescription(r.KET)}
              </div>
            )}

            <div className="mt-3 border-t pt-3">
              <span className="text-[10px] text-zinc-400">Baris #{r.No}</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setHistoryNo(r.No);
                  setHistoryOpen(true);
                }}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 text-[11px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                aria-label="Lihat riwayat implant"
              >
                <NotebookTabs size={16} />
                Riwayat
              </button>

              <RowActions
                row={r}
                sheet={sheet}
                context={context}
                showLabel
                onReload={reload}
                onEdit={(row) => {
                  setSelectedRow(row);
                  setEditOpen(true);
                }}
              />
              </div>
            </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => tableData.setPage(Math.max(1, tableData.page - 1))}
          disabled={tableData.page <= 1}
          className="inline-flex h-10 items-center gap-1 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40"
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft size={16} />
          <span className="sm:hidden">Sebelumnya</span>
        </button>
        <span className="text-sm">
          {tableData.page} / {tableData.totalPages}
        </span>
        <button
          onClick={() =>
            tableData.setPage(
              Math.min(tableData.totalPages, tableData.page + 1)
            )
          }
          disabled={tableData.page >= tableData.totalPages}
          className="inline-flex h-10 items-center gap-1 rounded-lg border px-3 text-xs font-semibold disabled:opacity-40"
          aria-label="Halaman berikutnya"
        >
          <span className="sm:hidden">Berikutnya</span>
          <ChevronRight size={16} />
        </button>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t bg-white/95 px-[max(0.25rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex flex-col items-center gap-1 text-[10px] font-bold text-blue-600"
        >
          <Layers3 size={17} />
          Dashboard
        </button>
        <button
          type="button"
          onClick={() =>
            document
              .getElementById("stock-list")
              ?.scrollIntoView({ behavior: "smooth", block: "start" })
          }
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-500"
        >
          <ClipboardCheck size={17} />
          Stok
        </button>
        <Link
          href="/logistik"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-500"
        >
          <Warehouse size={17} />
          Logistik
        </Link>
        <Link
          href="/serah-terima"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-500"
        >
          <ClipboardSignature size={17} />
          Serah
        </Link>
        <Link
          href="/rumah-sakit"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-500"
        >
          <Hospital size={17} />
          Stock RS
        </Link>
        <Link
          href="/histori-tabel"
          className="flex flex-col items-center gap-1 text-[10px] font-semibold text-zinc-500"
        >
          <NotebookTabs size={17} />
          Riwayat
        </Link>
      </nav>

      {/* EDIT */}
      <EditModal
        open={editOpen}
        row={selectedRow}
        onClose={() => setEditOpen(false)}
        onMovement={(row) => {
          setMovementRow(row);
          setMovementOpen(true);
        }}
        // onSave={async (payload) => {
        //   if (payload.No) await updateRow(payload);
        //   else await createRow(payload);
        //   setEditOpen(false);
        //   reload();
        // }}
        onSave={async (payload) => {
          if (isCreate) {
            await createRow(payload);
          } else {
            await updateRow(payload);
          }

          setEditOpen(false);
          setIsCreate(false);
          reload();
        }}
      />

      <MutateModal
        open={movementOpen}
        row={movementRow}
        sheet={sheet}
        context={context}
        onClose={() => {
          setMovementOpen(false);
          setMovementRow(null);
        }}
        onSuccess={async () => {
          await reload();
          setMovementRefresh((value) => value + 1);
        }}
      />

      <StockOpnameModal
        open={opnameOpen}
        rows={data}
        onClose={() => setOpnameOpen(false)}
      />

      <LowStockAlertModal
        open={lowStockAlertOpen}
        rows={data}
        threshold={lowStockThreshold}
        onClose={() => setLowStockAlertOpen(false)}
        onShowStatus={(status) => {
          setStockStatusFilter(status);
          setLowStockAlertOpen(false);
        }}
      />

      {/* HISTORY MODAL */}
      {historyNo !== null && (
        <HistoryTimelineModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          sheet={sheet}
          No={historyNo}
        />
      )}
      </div>
    </div>
  );
}

function ChecklistFilter({
  label,
  allLabel,
  values,
  options,
  onChange,
}: {
  label: string;
  allLabel: string;
  values: string[];
  options: Array<{ value: string; label: string; group?: string }>;
  onChange: (values: string[]) => void;
}) {
  const selectedLabels = options
    .filter((option) => values.includes(option.value))
    .map((option) => option.label);
  const summary =
    selectedLabels.length === 0
      ? allLabel
      : selectedLabels.length <= 2
      ? selectedLabels.join(", ")
      : `${selectedLabels.length} dipilih`;

  const toggle = (value: string) => {
    onChange(
      values.includes(value)
        ? values.filter((item) => item !== value)
        : [...values, value]
    );
  };

  return (
    <details className="group relative">
      <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border bg-white px-3 text-sm dark:bg-zinc-900 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {values.length > 0 && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {values.length}
            </span>
          )}
          <ChevronDown
            size={14}
            className="transition group-open:rotate-180"
          />
        </span>
      </summary>

      <div className="absolute right-0 top-11 z-40 w-full min-w-56 overflow-hidden rounded-xl border bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-xs font-bold">{label}</span>
          {values.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="text-[10px] font-semibold text-blue-600 hover:underline"
            >
              Hapus pilihan
            </button>
          )}
        </div>
        <div className="max-h-64 overflow-y-auto p-1.5">
          {options.map((option, index) => {
            const checked = values.includes(option.value);
            return (
              <Fragment key={option.value}>
              {option.group &&
                option.group !== options[index - 1]?.group && (
                  <div className="px-2.5 pb-1 pt-2 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400 first:pt-1">
                    {option.group}
                  </div>
                )}
              <label
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(option.value)}
                  className="sr-only"
                />
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                    checked
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {checked && <Check size={11} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
              </label>
              </Fragment>
            );
          })}
        </div>
      </div>
    </details>
  );
}

function SimpleMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="px-2 py-3 text-center sm:px-4">
      <div className={`text-xl font-black sm:text-2xl ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] text-zinc-500 sm:text-xs">{label}</div>
    </div>
  );
}

function movementLabel(reason: MovementReason) {
  const labels: Record<MovementReason, string> = {
    OPERASI: "Terpakai untuk operasi",
    REFILL: "Refill stok",
    MOBILISASI_KELUAR: "Support ke cabang",
    MOBILISASI_MASUK: "Kembali dari cabang",
  };
  return labels[reason];
}

function MovementMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone: "red" | "emerald" | "amber" | "blue";
}) {
  const styles = {
    red: "text-red-600 dark:text-red-300",
    emerald: "text-emerald-600 dark:text-emerald-300",
    amber: "text-amber-600 dark:text-amber-300",
    blue: "text-blue-600 dark:text-blue-300",
  };

  return (
    <div className="min-w-0 px-1 py-3 text-center sm:px-3">
      <div className={`flex items-center justify-center ${styles[tone]}`}>
        {icon}
      </div>
      <div className={`mt-1 text-lg font-black ${styles[tone]}`}>{value}</div>
      <div className="truncate text-[9px] text-zinc-500 sm:text-[10px]">{label}</div>
    </div>
  );
}

function MovementTimelineItem({
  movement,
  onOpenHistory,
}: {
  movement: DashboardMovement;
  onOpenHistory: () => void;
}) {
  const styles: Record<
    MovementReason,
    { dot: string; badge: string; sign: string }
  > = {
    OPERASI: {
      dot: "bg-red-500",
      badge: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
      sign: "−",
    },
    REFILL: {
      dot: "bg-emerald-500",
      badge:
        "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
      sign: "+",
    },
    MOBILISASI_KELUAR: {
      dot: "bg-amber-500",
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
      sign: "−",
    },
    MOBILISASI_MASUK: {
      dot: "bg-blue-500",
      badge:
        "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300",
      sign: "+",
    },
  };
  const style = styles[movement.reason];

  return (
    <button
      type="button"
      onClick={onOpenHistory}
      className="relative w-full rounded-xl border bg-white p-3 text-left transition hover:border-violet-300 hover:shadow-sm dark:bg-zinc-900"
    >
      <span
        className={`absolute -left-[22px] top-5 size-3 rounded-full ring-4 ring-zinc-50 dark:ring-zinc-800 ${style.dot}`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${style.badge}`}>
              {movementLabel(movement.reason)}
            </span>
            <Badge variant="outline" className="text-[10px]">
              {movement.row?.Brand || "-"}
            </Badge>
            <Badge variant="secondary" className="text-[10px]">
              {movement.row?.Implant || "-"}
            </Badge>
          </div>
          <p className="mt-2 truncate text-sm font-semibold">
            {movement.row?.Deskripsi || `Baris #${movement.No}`}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            REF {movement.row?.NoStok || "-"} · Batch {movement.row?.Batch || "-"}
          </p>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
            {movement.description}
          </p>
          <p className="mt-2 text-[10px] text-zinc-400">
            {new Date(movement.Timestamp).toLocaleString("id-ID", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {movement.By ? ` · ${movement.By}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-xl font-black ${style.badge.split(" ")[1]}`}>
            {style.sign}
            {movement.qty}
          </div>
          <div className="text-[10px] text-zinc-400">
            {movement.before} → {movement.after}
          </div>
        </div>
      </div>
    </button>
  );
}
