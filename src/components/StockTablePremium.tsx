"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
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
  ChevronUp,
  Table2,
  LayoutGrid,
  ClipboardCheck,
  ClipboardSignature,
  Hospital,
  BellRing,
  ScanLine,
  Warehouse,
  StickyNote,
  UploadCloud,
  MoreHorizontal,
  AlertTriangle,
  X,
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
import type { OnlineHandover } from "@/types/handover";
import { listOnlineHandovers } from "@/lib/handover";
import {
  STOCK_IMPLANT_CATEGORY_LABELS,
  STOCK_PROCEDURE_CATEGORIES,
  STOCK_COMPONENT_CATEGORIES,
  type StockImplantCategory,
} from "@/lib/stockCategories";
import { toast } from "sonner";
import { isDiscontinuedStock, isSupportCenterStock } from "@/lib/stockStatus";

/* ================= TYPES ================= */
type FilterMode = "ALL" | "REF" | "LOT" | "NAMA";
type BrandFilter = "NORMMED" | "ZIMMER";
type ImplantFilter = StockImplantCategory;
type StockStatusFilter = "ALL" | "LOW" | "OUT" | "SAFE";
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

function stockProductIdentity(row: StockRow) {
  return [row.Brand, row.Implant, row.Deskripsi]
    .map((value) =>
      String(value || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, " ")
    )
    .join("|");
}

function latestDescription(value: unknown) {
  const lines = String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const latest = lines.at(-1) || "";
  return /serah terima\s+ST-|dokumen\s*:\s*ST-/i.test(latest)
    ? latest.replace(
        /Support keluar(?: ke cabang)?/i,
        "Dikirim untuk tindakan operasi"
      )
    : latest;
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
  opnameRequest = 0,
}: {
  sheet?: string;
  externalScan?: ExternalScanPayload | null;
  context?: GasSheetContext;
  title?: string;
  onOpenScanner?: () => void;
  opnameRequest?: number;
}) {
  const [lowStockAlertOpen, setLowStockAlertOpen] = useState(false);

  const handleRemoteChange = useCallback(() => {
    toast.info("Data diperbarui oleh user lain. Tabel disegarkan otomatis.");
  }, []);

  const handleInitialStockLoad = useCallback((rows: StockRow[]) => {
    if (
      rows.some(
        (row) =>
          !isDiscontinuedStock(row) && !isSupportCenterStock(row) && Number(row.TotalQty || 0) <= 1
      )
    ) {
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
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastQuickScanRef = useRef("");

  useEffect(() => {
    const updateScrollTopVisibility = () => setShowScrollTop(window.scrollY > 560);
    updateScrollTopVisibility();
    window.addEventListener("scroll", updateScrollTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollTopVisibility);
  }, []);

  useEffect(() => {
    if (opnameRequest > 0) setOpnameOpen(true);
  }, [opnameRequest]);

  const [isCreate, setIsCreate] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNo, setHistoryNo] = useState<number | null>(null);
  const [noteRow, setNoteRow] = useState<StockRow | null>(null);
  const [movementHistory, setMovementHistory] = useState<HistoryRow[]>([]);
  const [movementDocuments, setMovementDocuments] = useState<OnlineHandover[]>([]);
  const [movementHistoryLoading, setMovementHistoryLoading] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false);
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
  const activeFilterCount =
    brandFilters.length +
    implantFilters.length +
    (stockStatusFilter === "ALL" ? 0 : 1) +
    (mode === "ALL" ? 0 : 1);

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
        (!isDiscontinuedStock(r) && !isSupportCenterStock(r) && stockStatusFilter === "OUT" && stockQty <= 0) ||
        (stockStatusFilter === "LOW" &&
          !isDiscontinuedStock(r) && !isSupportCenterStock(r) &&
          stockQty > 0 &&
          stockQty <= lowStockThreshold) ||
        (stockStatusFilter === "SAFE" &&
          !isDiscontinuedStock(r) && !isSupportCenterStock(r) &&
          stockQty > lowStockThreshold);

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

  const groupedDisplayData = useMemo(() => {
    const groups = new Map<string, StockRow[]>();
    filteredData.forEach((row) => {
      const key = [
        stockProductIdentity(row),
        isSupportCenterStock(row) ? "SUPPORT PUSAT" : "OFFICE",
        isDiscontinuedStock(row) ? "DISCONTINUE" : "ACTIVE",
      ].join("|");
      const current = groups.get(key) || [];
      current.push(row);
      groups.set(key, current);
    });
    const collator = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" });
    return Array.from(groups.values()).map((rows) => {
      const variants = [...rows].sort(
        (first, second) =>
          collator.compare(String(first.NoStok || ""), String(second.NoStok || "")) ||
          collator.compare(String(first.Batch || ""), String(second.Batch || "")) ||
          Number(first.No || 0) - Number(second.No || 0)
      );
      const representative = variants[0];
      return {
        ...representative,
        Qty: variants.reduce((total, item) => total + toSafeNumber(item.Qty), 0),
        TotalQty: variants.reduce((total, item) => total + toSafeNumber(item.TotalQty), 0),
        TERPAKAI: variants.reduce((total, item) => total + toSafeNumber(item.TERPAKAI), 0),
        REFILL: variants.reduce((total, item) => total + toSafeNumber(item.REFILL), 0),
        KET: variants.map((item) => latestDescription(item.KET)).filter(Boolean).at(-1) || "",
        Variants: variants,
        VariantCount: variants.length,
      } satisfies StockRow;
    });
  }, [filteredData]);

  useEffect(() => {
    if (!scannedValue || data.length === 0) return;
    const normalizedRef = scannedRef.toUpperCase();
    const normalizedLot = scannedLot.toUpperCase();
    const signature = `${normalizedRef}::${normalizedLot}`;
    if (lastQuickScanRef.current === signature) return;
    const match = data.find((row) => {
      const sameRef = !normalizedRef || String(row.NoStok || "").trim().toUpperCase() === normalizedRef;
      const sameLot = !normalizedLot || String(row.Batch || "").trim().toUpperCase() === normalizedLot;
      return sameRef && sameLot;
    });
    if (!match) return;
    lastQuickScanRef.current = signature;
    setMovementRow(match);
    setMovementOpen(true);
    toast.success("Implant ditemukan. Pilih aksi yang ingin dilakukan.");
  }, [data, scannedLot, scannedRef, scannedValue]);

  const tableData = useStockTable(groupedDisplayData);
  const setTablePage = tableData.setPage;

  /* ================= SUMMARY (FILTERED) ================= */
  const summary = useMemo(() => {
    const productKeys = new Set<string>();
    const totals = filteredData.reduce(
      (acc, r) => {
        productKeys.add(stockProductIdentity(r));
        acc.qty += isSupportCenterStock(r) ? 0 : toSafeNumber(r.TotalQty);
        acc.used += toSafeNumber(r.TERPAKAI);
        acc.refill += toSafeNumber(r.REFILL);
        return acc;
      },
      { count: 0, qty: 0, used: 0, refill: 0 }
    );
    totals.count = productKeys.size;
    return totals;
  }, [filteredData]);

  const brandSummary = useMemo(() => {
    const initial = {
      NORMMED: { count: 0, available: 0, used: 0, refill: 0 },
      ZIMMER: { count: 0, available: 0, used: 0, refill: 0 },
    };

    const productKeys = { NORMMED: new Set<string>(), ZIMMER: new Set<string>() };
    const totals = data.reduce((acc, row) => {
      const brand = String(row.Brand ?? "").trim().toUpperCase();
      if (brand !== "NORMMED" && brand !== "ZIMMER") return acc;
      productKeys[brand].add(stockProductIdentity(row));
      acc[brand].available += isSupportCenterStock(row)
        ? 0
        : toSafeNumber(row.TotalQty);
      acc[brand].used += toSafeNumber(row.TERPAKAI);
      acc[brand].refill += toSafeNumber(row.REFILL);
      return acc;
    }, initial);
    totals.NORMMED.count = productKeys.NORMMED.size;
    totals.ZIMMER.count = productKeys.ZIMMER.size;
    return totals;
  }, [data]);
  const allProductCount = useMemo(
    () => new Set(data.map(stockProductIdentity)).size,
    [data]
  );

  useEffect(() => {
    let active = true;

    const loadMovementHistory = async () => {
      try {
        const [response, handovers] = await Promise.all([
          gasGetHistoryWithContext(sheet, undefined, context),
          listOnlineHandovers(),
        ]);
        if (!active) return;
        setMovementHistory(response.data ?? []);
        setMovementDocuments(handovers);
      } catch {
        if (active) {
          setMovementHistory([]);
          setMovementDocuments([]);
        }
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
        const preferredField =
          reason === "OPERASI"
            ? "TERPAKAI"
            : reason === "REFILL"
              ? "REFILL"
              : "TotalQty";
        const qtyChange =
          changes.find((change) => change.field === preferredField) ||
          changes.find(
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
          qty: Math.max(1, Math.abs(after - before)),
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

  const movementSummary = useMemo(() => {
    const summary = {
      OPERASI: 0,
      REFILL: 0,
      MOBILISASI_KELUAR: 0,
      MOBILISASI_MASUK: 0,
    } satisfies Record<MovementReason, number>;
    const manualOutsideByRow = new Map<number, number>();
    [...movementEntries].reverse().forEach((movement) => {
      if (movement.reason === "OPERASI") summary.OPERASI += movement.qty;
      if (movement.reason === "REFILL") summary.REFILL += movement.qty;
      if (movement.reason === "MOBILISASI_MASUK") {
        summary.MOBILISASI_MASUK += movement.qty;
      }
      if (/serah terima\s+ST-|dokumen\s+ST-/i.test(movement.description)) {
        return;
      }
      const current = manualOutsideByRow.get(movement.No) || 0;
      if (movement.reason === "MOBILISASI_KELUAR") {
        manualOutsideByRow.set(movement.No, current + movement.qty);
      } else if (movement.reason === "MOBILISASI_MASUK") {
        manualOutsideByRow.set(movement.No, Math.max(0, current - movement.qty));
      }
    });
    const visibleByNo = new Map(filteredData.map((row) => [Number(row.No), row]));
    const visibleByIdentity = new Map(
      filteredData.map((row) => [
        `${String(row.NoStok).trim()}|${String(row.Batch || "").trim()}`,
        row,
      ])
    );
    let documentOutside = 0;
    movementDocuments
      .filter((document) => document.Status !== "DRAFT")
      .forEach((document) => {
        document.Items.forEach((item) => {
          const requested = visibleByNo.get(Number(item.stockRow));
          const row =
            requested &&
            String(requested.NoStok) === String(item.partNumber) &&
            String(requested.Batch || "") === String(item.batch || "")
              ? requested
              : visibleByIdentity.get(
                  `${String(item.partNumber).trim()}|${String(item.batch || "").trim()}`
                );
          if (!row) return;
          const hospitalQty = Math.max(
            0,
            Number(item.hospitalQty ?? item.qtyIssued ?? 0) || 0
          );
          documentOutside += Math.max(
            0,
            hospitalQty -
              (Number(item.usedQty || 0) || 0) -
              (Number(item.returnedQty || 0) || 0)
          );
        });
      });
    const manualOutside = Array.from(manualOutsideByRow.values()).reduce(
      (total, quantity) => total + quantity,
      0
    );
    summary.MOBILISASI_KELUAR = documentOutside + manualOutside;
    return summary;
  }, [filteredData, movementDocuments, movementEntries]);

  const lowStockAlertCount = useMemo(
    () =>
      data.filter(
        (row) =>
          !isDiscontinuedStock(row) && !isSupportCenterStock(row) &&
          Number(row.TotalQty || 0) <= lowStockThreshold
      )
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
      <div className="hidden border-b bg-[#0f172a] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:block sm:bg-linear-to-br sm:from-zinc-950 sm:via-zinc-900 sm:to-blue-950 sm:p-6">
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

          <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-6 sm:overflow-visible sm:px-0 sm:pb-0">
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex min-w-[82px] shrink-0 snap-start items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[10px] font-semibold hover:bg-white/20 sm:hidden"
              title="Scan barcode"
            >
              <ScanLine size={16} />
              <span>Scan</span>
            </button>
          )}
          <button onClick={reload} className="inline-flex min-w-24 shrink-0 snap-start items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[10px] font-semibold hover:bg-white/20 sm:min-w-0 sm:text-[11px]" title="Muat ulang">
            <RefreshCcw size={16} />
            <span className="sm:hidden">Muat ulang</span>
          </button>
          <button onClick={handleExport} className="inline-flex min-w-28 shrink-0 snap-start items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[10px] font-semibold hover:bg-white/20 sm:min-w-0 sm:text-[11px]" title="Export Excel">
            <FileSpreadsheet size={16} />
            <span className="sm:hidden">Export Excel</span>
          </button>
          <Link href="/upload-stock" className="inline-flex min-w-28 shrink-0 snap-start items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[10px] font-semibold hover:bg-white/20 sm:min-w-0 sm:text-[11px]" title="Import Excel ke Google Sheet">
            <UploadCloud size={16} />
            <span className="sm:hidden">Import Excel</span>
          </Link>
          <button
            onClick={() => setOpnameOpen(true)}
            className="inline-flex min-w-[92px] shrink-0 snap-start items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[10px] font-semibold hover:bg-white/20 sm:min-w-0 sm:text-[11px]"
            title="Stock opname cepat"
          >
            <ClipboardCheck size={16} />
            <span className="sm:hidden">Cek stok</span>
          </button>
          <button
            onClick={() => setLowStockAlertOpen(true)}
            disabled={lowStockAlertCount === 0}
            className="relative inline-flex min-w-[102px] shrink-0 snap-start items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 p-2.5 text-[10px] font-semibold hover:bg-white/20 disabled:opacity-40 sm:min-w-0 sm:text-[11px]"
            title="Lihat peringatan stok"
          >
            <BellRing size={16} />
            <span className="sm:hidden">Peringatan</span>
            {lowStockAlertCount > 0 && (
              <span className="absolute right-1 top-1 flex min-h-5 min-w-5 items-center justify-center rounded-md border-2 border-[#263047] bg-red-500 px-1 text-[9px] font-black leading-none text-white shadow-sm sm:-right-1.5 sm:-top-1.5 sm:border-zinc-900">
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
            className="inline-flex min-w-[126px] shrink-0 snap-start items-center justify-center gap-2 rounded-lg bg-blue-500 p-2.5 text-[10px] font-semibold text-white hover:bg-blue-400 sm:col-span-1 sm:min-w-0 sm:text-[11px]"
            title="Tambah data"
          >
            <Plus size={16} />
            <span className="sm:hidden">Tambah implant</span>
          </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 bg-[#f8fafc] p-3 pb-32 dark:bg-zinc-950 sm:bg-transparent sm:p-5 sm:pb-5 dark:sm:bg-transparent">
      <section className="flex items-center gap-2 rounded-xl border bg-white p-2 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:hidden">
        <div className="min-w-0 flex-1 pl-1">
          <h2 className="truncate text-xs font-black">Daftar Stock Implant</h2>
          <p className="mt-0.5 text-[9px] text-zinc-500">{allProductCount} jenis · {data.length} varian REF/LOT</p>
        </div>
        {onOpenScanner && (
          <button
            type="button"
            onClick={onOpenScanner}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border px-2.5 text-[9px] font-bold text-zinc-600 dark:text-zinc-300"
          >
            <ScanLine size={14} /> Scan
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setIsCreate(true);
            setSelectedRow(null);
            setEditOpen(true);
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-[9px] font-black text-white"
        >
          <Plus size={14} /> Tambah
        </button>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMobileActionsOpen((value) => !value)}
            className="inline-flex size-10 items-center justify-center rounded-lg border text-zinc-600 dark:text-zinc-300"
            aria-label="Aksi lainnya"
            aria-expanded={mobileActionsOpen}
          >
            <MoreHorizontal size={17} />
          </button>
          {mobileActionsOpen && (
            <div className="absolute right-0 top-[calc(100%+0.45rem)] z-40 w-44 overflow-hidden rounded-xl border bg-white p-1.5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
              <button type="button" onClick={() => { reload(); setMobileActionsOpen(false); }} className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-zinc-800">
                <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Muat ulang data
              </button>
              <Link href="/upload-stock" onClick={() => setMobileActionsOpen(false)} className="flex h-10 items-center gap-2 rounded-lg px-3 text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-zinc-800">
                <UploadCloud size={14} /> Import Excel
              </Link>
              <button type="button" onClick={() => { setOpnameOpen(true); setMobileActionsOpen(false); }} className="flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-[10px] font-bold hover:bg-slate-100 dark:hover:bg-zinc-800">
                <ClipboardCheck size={14} /> Stock opname
              </button>
            </div>
          )}
        </div>
      </section>

      {/* COMPACT BRAND SELECTOR */}
      <div className="hidden sm:static sm:flex sm:gap-2 sm:overflow-x-auto sm:border-0 sm:bg-transparent sm:p-0 sm:pb-1 sm:shadow-none dark:sm:bg-transparent">
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
          {loading ? <span className="mx-auto mt-1 block h-3 w-10 animate-pulse rounded bg-slate-300 dark:bg-zinc-700 sm:mx-0" /> : <div className="mt-0.5 text-[10px] opacity-70">{allProductCount} jenis</div>}
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
                {loading ? (
                  <span className="h-5 w-9 animate-pulse rounded bg-slate-200 dark:bg-zinc-700" />
                ) : (
                  <div className={`text-sm font-black sm:text-lg ${normmed ? "text-emerald-600" : "text-blue-600"}`}>
                    {stats.count}
                  </div>
                )}
              </div>
              <div className="mt-0.5 hidden justify-between text-[10px] text-zinc-500 sm:flex">
                <span>{stats.count} jenis</span>
                <span>{stats.available} pcs tersedia</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* FILTERS */}
      <div className={`sticky top-[4.35rem] rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:static sm:bg-zinc-50 sm:p-3 sm:shadow-none dark:sm:bg-zinc-800/50 ${
        mobileFiltersOpen ? "z-60" : "z-30"
      }`}>
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
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(280px,1fr)_150px_190px_130px_auto]">
        <div className="grid grid-cols-[minmax(0,1fr)_48px] gap-2 sm:block">
          <label className="relative block">
            <Search size={16} className="pointer-events-none absolute left-3 top-3.5 text-zinc-400" />
            <input
              value={scannedValue || search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, REF, atau LOT..."
              className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-9 text-sm font-medium outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-blue-950 sm:h-11 sm:rounded-lg"
            />
            {search && !scannedValue && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-slate-100 hover:text-zinc-700 dark:hover:bg-zinc-800 sm:right-1.5 sm:top-1.5"
                aria-label="Hapus pencarian"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen((value) => !value)}
            className={`relative inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border text-[10px] font-black shadow-sm sm:hidden ${
              mobileFiltersOpen || activeFilterCount > 0
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-slate-300 bg-slate-100 text-slate-700"
            }`}
            aria-expanded={mobileFiltersOpen}
          >
            <SlidersHorizontal size={17} />
            <span className="sr-only">Filter</span>
            {activeFilterCount > 0 && (
              <span className="flex min-w-4 items-center justify-center rounded bg-white/20 px-1 text-[9px]">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              size={12}
              className={`transition ${mobileFiltersOpen ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <AnimatePresence>
          {mobileFiltersOpen && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileFiltersOpen(false)}
              className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] sm:hidden"
              aria-label="Tutup filter"
            />
          )}
        </AnimatePresence>

        <motion.div
          key={mobileFiltersOpen ? "filter-open" : "filter-closed"}
          initial={
            isMobileViewport && mobileFiltersOpen
              ? { opacity: 0, y: 72, scale: 0.98 }
              : false
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 340,
            damping: 30,
            mass: 0.8,
          }}
          className={`${
            mobileFiltersOpen
              ? "fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 grid max-h-[calc(100dvh-8rem)] gap-3 overflow-y-auto rounded-2xl border bg-white p-3 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
              : "hidden"
          } sm:contents`}
        >
        <div className="sticky -top-3 z-10 -mx-3 flex items-center justify-between border-b bg-white px-3 pb-3 pt-3 dark:bg-zinc-900 sm:hidden">
          <div>
            <p className="text-sm font-black">Filter Stock</p>
            <p className="text-[9px] text-zinc-500">
              {filteredData.length} dari {data.length} data
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="flex size-9 items-center justify-center rounded-xl border text-zinc-500"
            aria-label="Tutup panel filter"
          >
            <X size={16} />
          </button>
        </div>
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
          className="h-11 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-900"
        >
          <option value="ALL">Cari semua kolom</option>
          <option value="REF">Hanya REF</option>
          <option value="LOT">Hanya LOT</option>
          <option value="NAMA">Hanya nama</option>
        </select>
        <div className="relative grid h-11 grid-cols-2 overflow-hidden rounded-lg border border-slate-300 bg-slate-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
          <motion.span
            aria-hidden="true"
            className="absolute bottom-1 left-1 top-1 w-[calc(50%-0.25rem)] rounded-md bg-zinc-900 shadow-sm dark:bg-white"
            animate={{ x: viewMode === "table" ? "0%" : "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          />
          <button
            type="button"
            onClick={() => setViewModePreference("table")}
            title="Table view"
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-semibold transition-colors ${
              viewMode === "table"
                ? "text-white dark:text-zinc-900"
                : "text-zinc-500"
            }`}
          >
            <Table2 size={13} /> Table
          </button>
          <button
            type="button"
            onClick={() => setViewModePreference("card")}
            title="Card view"
            className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-md px-3 text-[11px] font-semibold transition-colors ${
              viewMode === "card"
                ? "text-white dark:text-zinc-900"
                : "text-zinc-500"
            }`}
          >
            <LayoutGrid size={13} /> Card
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-slate-50 p-2 sm:col-span-full sm:rounded-none sm:bg-transparent sm:p-0 sm:pt-2 dark:bg-zinc-800/70 dark:sm:bg-transparent">
          <span className="mr-1 w-full text-[9px] font-black uppercase tracking-wide text-zinc-500 sm:w-auto">
            Status stok
          </span>
          {([
            ["ALL", "Semua"],
            ["LOW", "Menipis"],
            ["OUT", "Habis"],
            ["SAFE", "Aman"],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setStockStatusFilter(value)}
              className={`rounded-md border px-2.5 py-1 text-[10px] font-semibold ${
                stockStatusFilter === value
                  ? value === "OUT"
                    ? "border-red-600 bg-red-600 text-white"
                    : value === "LOW"
                    ? "border-amber-500 bg-amber-500 text-white"
                    : value === "SAFE"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "bg-white text-zinc-500 dark:bg-zinc-900"
              }`}
            >
              {label}
            </button>
          ))}
          <label className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md border bg-white px-2 text-[9px] font-bold text-zinc-500 dark:bg-zinc-900">
            Batas minimum
            <input
              type="number"
              min={0}
              value={lowStockThreshold}
              onChange={(event) =>
                setLowStockThreshold(Math.max(0, Number(event.target.value) || 0))
              }
              className="h-6 w-10 border-l bg-transparent pl-1 text-center font-black text-zinc-900 outline-none dark:text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setBrandFilters([]);
              setImplantFilters([]);
              setSearch("");
              setMode("ALL");
              setStockStatusFilter("ALL");
            }}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-[10px] font-bold text-zinc-600 sm:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          >
            Reset semua filter
          </button>
        </div>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(false)}
          className="sticky -bottom-3 z-10 -mx-3 mb-[-0.75rem] h-13 rounded-b-2xl border-t border-blue-500 bg-blue-600 text-xs font-black text-white shadow-[0_-8px_20px_rgba(255,255,255,0.9)] dark:shadow-[0_-8px_20px_rgba(24,24,27,0.9)] sm:hidden"
        >
          Terapkan Filter · {filteredData.length} data
        </button>
        </motion.div>
        </div>
        {activeFilterCount > 0 && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 sm:hidden">
            {brandFilters.map((value) => (
              <FilterChip key={value} label={value === "NORMMED" ? "Normmed" : "Zimmer"} onRemove={() => setBrandFilters(brandFilters.filter((item) => item !== value))} />
            ))}
            {implantFilters.map((value) => (
              <FilterChip key={value} label={STOCK_IMPLANT_CATEGORY_LABELS[value]} onRemove={() => setImplantFilters(implantFilters.filter((item) => item !== value))} />
            ))}
            {stockStatusFilter !== "ALL" && (
              <FilterChip label={stockStatusFilter === "LOW" ? "Stok menipis" : stockStatusFilter === "OUT" ? "Stok habis" : "Stok aman"} onRemove={() => setStockStatusFilter("ALL")} />
            )}
            {mode !== "ALL" && <FilterChip label={`Cari: ${mode}`} onRemove={() => setMode("ALL")} />}
            <button type="button" onClick={() => { setBrandFilters([]); setImplantFilters([]); setStockStatusFilter("ALL"); setMode("ALL"); }} className="shrink-0 px-2 py-1 text-[9px] font-black text-blue-600">Reset</button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 sm:hidden">
        <div className="grid min-w-0 flex-1 grid-cols-3 rounded-xl border bg-white p-1 shadow-sm dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setBrandFilters([])}
            className={`h-9 min-w-0 rounded-lg px-1 text-[9px] font-black ${brandFilters.length === 0 ? "bg-slate-900 text-white" : "text-zinc-500"}`}
          >
            Semua
          </button>
          {(["NORMMED", "ZIMMER"] as const).map((brand) => {
            const active = brandFilters.includes(brand);
            return (
              <button
                type="button"
                key={`mobile-brand-${brand}`}
                onClick={() => setBrandFilters(active ? [] : [brand])}
                className={`h-9 min-w-0 truncate rounded-lg px-1 text-[9px] font-black ${active ? brand === "NORMMED" ? "bg-emerald-600 text-white" : "bg-violet-600 text-white" : "text-zinc-500"}`}
              >
                {brand === "NORMMED" ? "Normmed" : "Zimmer"}
              </button>
            );
          })}
        </div>
        <div className="grid h-11 shrink-0 grid-cols-2 rounded-xl border bg-white p-1 dark:bg-zinc-900">
          <button type="button" onClick={() => setViewModePreference("card")} className={`flex size-8 items-center justify-center rounded-lg ${viewMode === "card" ? "bg-slate-900 text-white" : "text-zinc-500"}`} aria-label="Card view"><LayoutGrid size={14} /></button>
          <button type="button" onClick={() => setViewModePreference("table")} className={`flex size-8 items-center justify-center rounded-lg ${viewMode === "table" ? "bg-slate-900 text-white" : "text-zinc-500"}`} aria-label="Table view"><Table2 size={14} /></button>
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
      <div className="hidden grid-cols-2 gap-px overflow-hidden rounded-lg border bg-slate-200 dark:bg-zinc-700 sm:grid sm:grid-cols-4 sm:rounded-xl">
        <SimpleMetric label="Jenis" value={summary.count} tone="text-zinc-900 dark:text-white" />
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
            onClick={() => setTimelineOpen(true)}
            className="shrink-0 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Lihat timeline
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
            label="Sedang di luar"
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

      </section>

      {/* ================= TABLE VIEW ================= */}
      <motion.div
        key={`table-view-${viewMode}`}
        initial={viewMode === "table" ? { opacity: 0, y: 10 } : false}
        animate={viewMode === "table" ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={`${viewMode === "table" ? "block" : "hidden"} overflow-x-auto rounded-xl border`}
      >
        <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm sm:min-w-[1200px]">
              {/* ================= HEADER ================= */}
              <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 border-b">
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  {[
                    ["REF", ""],
                    ["Nama Produk", ""],
                    ["Implant", "hidden sm:table-cell"],
                    ["Brand", "hidden sm:table-cell"],
                    ["LOT", ""],
                    ["Qty", "hidden sm:table-cell"],
                    ["Office / Status", ""],
                    ["Terpakai", "hidden sm:table-cell"],
                    ["Refill", "hidden sm:table-cell"],
                    ["Notes", "hidden sm:table-cell"],
                  ].map(([h, responsiveClass]) => (
                    <th
                      key={h}
                      className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${h === "REF" ? "sticky left-0 z-20 bg-zinc-50 dark:bg-zinc-800" : ""} ${responsiveClass}`}
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
                      className={`border-b transition-colors last:border-b-0 ${
                        isSupportCenterStock(r)
                          ? "border-violet-200 bg-violet-50/80 hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/25 dark:hover:bg-violet-950/40"
                          : "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20"
                      }`}
                    >
                      {/* REF */}
                      <td className="sticky left-0 z-10 bg-white px-3 py-2 text-zinc-600 dark:bg-zinc-900">
                        <div className="flex max-w-44 flex-wrap gap-1">
                          {(r.Variants || [r]).map((variant) => (
                            <span key={`${variant.No}-${variant.NoStok}-${variant.Batch}`} className="rounded-md bg-blue-50 px-1.5 py-1 text-[8px] font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                              {variant.NoStok || "-"}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Deskripsi */}
                      <td className="max-w-[260px] px-3 py-2">
                        <span className="line-clamp-2">{highlight(r.Deskripsi)}</span>
                        {(r.VariantCount || 1) > 1 && <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[8px] font-black text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">{r.VariantCount} REF / LOT</span>}
                      </td>

                      <td className="hidden px-3 py-2 sm:table-cell">
                        <Badge variant="outline">{r.Implant || "-"}</Badge>
                      </td>

                      <td className="hidden px-3 py-2 sm:table-cell">
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="secondary">{r.Brand || "-"}</Badge>
                          <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-black ${
                            isSupportCenterStock(r)
                              ? "bg-violet-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}>
                            {isSupportCenterStock(r) ? "SUPPORT PUSAT" : "OFFICE"}
                          </span>
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="px-3 py-2 text-zinc-500">
                        <div className="flex max-w-44 flex-wrap gap-1">
                          {(r.Variants || [r]).map((variant) => (
                            <span key={`${variant.No}-${variant.Batch}`} className={`rounded-md px-1.5 py-1 text-[8px] font-bold ${variant.Batch ? "bg-slate-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300" : "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"}`}>
                              {variant.Batch || "⚠ LOT belum diinput"}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Qty */}
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <Badge variant="default">{r.Qty}</Badge>
                      </td>

                      {/* Total */}
                      <td className="px-3 py-2">
                        <div className="flex flex-col items-start gap-1">
                          <b className={r.TotalQty <= 0 ? "text-red-600" : "text-emerald-700"}>{r.TotalQty} pcs</b>
                          <span className={`rounded px-1.5 py-0.5 text-[7px] font-black ${r.TotalQty <= 0 ? "bg-red-600 text-white" : r.TotalQty <= lowStockThreshold ? "bg-amber-500 text-white" : "bg-emerald-100 text-emerald-700"}`}>
                            {r.TotalQty <= 0 ? "HABIS" : r.TotalQty <= lowStockThreshold ? "MENIPIS" : "AMAN"}
                          </span>
                        </div>
                      </td>

                      {/* Terpakai */}
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <Badge className="animate-warning text-slate-800">
                          {r.TERPAKAI}
                        </Badge>
                      </td>

                      {/* Refill */}
                      <td className="hidden px-3 py-2 sm:table-cell">
                        <Badge variant="secondary">{r.REFILL}</Badge>
                      </td>

                      {/* Notes */}
                      <td className="hidden px-3 py-2 sm:table-cell">
                        {latestDescription(r.KET) ? (
                          <button
                            type="button"
                            onClick={() => setNoteRow(r)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
                          >
                            <StickyNote size={12} /> Notes
                          </button>
                        ) : <span className="text-zinc-300">-</span>}
                      </td>

                      {/* ================= ACTION ================= */}
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setHistoryNo((r.Variants || [r])[0].No);
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
                            row={(r.Variants || [r])[0]}
                            stockRows={data}
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
      </motion.div>

      {/* ================= CARD VIEW ================= */}
      <motion.div
        key={`card-view-${viewMode}`}
        initial={viewMode === "card" ? { opacity: 0, y: 10 } : false}
        animate={viewMode === "card" ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className={viewMode === "card" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3" : "hidden"}
      >
        {loading &&
          Array.from({ length: 4 }).map((_, index) => (
            <div
              key={`mobile-stock-skeleton-${index}`}
              className="space-y-3 rounded-xl border bg-white p-4 dark:bg-zinc-900"
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
            className={`overflow-hidden rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              isSupportCenterStock(r)
                ? "border-violet-400 bg-violet-50 shadow-violet-100 hover:border-violet-600 dark:border-violet-800 dark:bg-violet-950/25 dark:shadow-none"
                : r.TotalQty <= 0
                ? "border-red-400 bg-red-50 shadow-red-100 hover:border-red-600 dark:border-red-800 dark:bg-red-950/25 dark:shadow-none"
                : "border-slate-300 bg-white hover:border-blue-300 dark:border-zinc-700 dark:bg-zinc-900"
            }`}
          >
            <div className={`h-1.5 ${
              isSupportCenterStock(r)
                ? "bg-violet-600"
                : r.TotalQty <= 0
                ? "bg-red-600"
                : r.Brand === "NORMMED"
                ? "bg-emerald-600"
                : r.Brand === "ZIMMER"
                ? "bg-violet-600"
                : "bg-zinc-500"
            }`} />
            <div className="p-3.5 sm:p-4">
              <div className="flex min-w-0 items-center justify-end gap-1.5 sm:flex-wrap sm:justify-start">
                  <span className={`hidden h-7 shrink-0 items-center rounded-lg px-2.5 text-[9px] font-black uppercase tracking-wide sm:inline-flex ${
                    r.Brand === "NORMMED"
                      ? "bg-emerald-600 text-white"
                      : r.Brand === "ZIMMER"
                      ? "bg-violet-600 text-white"
                      : "bg-zinc-700 text-white"
                  }`}>
                    {r.Brand || "Tanpa brand"}
                  </span>
                  <span className="hidden h-7 min-w-0 max-w-[52%] items-center truncate rounded-lg bg-slate-200 px-2.5 text-[9px] font-black uppercase text-slate-800 dark:bg-zinc-700 dark:text-zinc-100 sm:inline-flex">
                    {r.Implant || "Tanpa kategori"}
                  </span>
                  <span className={`ml-auto inline-flex h-7 shrink-0 items-center rounded-lg border px-2.5 text-center text-[9px] font-black uppercase sm:order-4 ${
                    isSupportCenterStock(r)
                      ? "border-violet-600 bg-violet-600 text-white"
                      : isDiscontinuedStock(r)
                      ? "border-zinc-500 bg-zinc-600 text-white"
                      : r.TotalQty <= 0
                      ? "animate-pulse border-red-700 bg-red-600 text-white shadow-sm shadow-red-300"
                      : r.TotalQty <= lowStockThreshold
                      ? "border-amber-600 bg-amber-500 text-white"
                      : "border-emerald-700 bg-emerald-600 text-white"
                  }`}>
                    {isSupportCenterStock(r)
                      ? "Support Pusat"
                      : isDiscontinuedStock(r)
                      ? "Discontinue"
                      : r.TotalQty <= 0
                      ? "Habis"
                      : r.TotalQty <= lowStockThreshold
                      ? "Perlu Refill"
                      : "Aman"}
                  </span>
                  {latestDescription(r.KET) && (
                    <button
                      type="button"
                      onClick={() => setNoteRow(r)}
                      className="order-3 hidden h-7 shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-[9px] font-black uppercase text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 sm:inline-flex"
                    >
                      <StickyNote size={11} /> Notes
                    </button>
                  )}
              </div>
              <div className="mt-2 line-clamp-2 min-h-10 text-sm font-black uppercase leading-5 tracking-[0.01em]">
                {highlight(r.Deskripsi)}
              </div>
              <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[9px] font-bold text-zinc-500 sm:hidden">
                <span className="truncate">{r.Brand || "Tanpa brand"} • {r.Implant || "Tanpa kategori"}</span>
                {latestDescription(r.KET) && (
                  <button type="button" onClick={() => setNoteRow(r)} className="ml-auto inline-flex shrink-0 items-center gap-1 text-blue-600">
                    <StickyNote size={11} /> Notes
                  </button>
                )}
              </div>

              {(r.VariantCount || 1) > 1 ? (
                <details className="group mt-2 overflow-hidden rounded-xl border bg-slate-50 dark:border-zinc-700 dark:bg-zinc-800/60">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-2.5">
                    <span className="text-[9px] font-black uppercase tracking-wide text-zinc-500">{r.VariantCount} varian REF / LOT</span>
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold text-blue-600">Lihat <ChevronDown size={13} className="transition group-open:rotate-180" /></span>
                  </summary>
                  <div className="flex gap-1.5 overflow-x-auto border-t p-2">
                    {(r.Variants || [r]).map((variant) => (
                      <div key={`${variant.No}-${variant.NoStok}-${variant.Batch}`} className="min-w-fit rounded-lg border bg-white px-2 py-1.5 dark:bg-zinc-900">
                        <p className="text-[8px] font-black text-blue-700 dark:text-blue-300">REF {variant.NoStok || "Belum diinput"}</p>
                        {variant.Batch ? (
                          <p className="mt-0.5 text-[8px] font-bold text-zinc-600 dark:text-zinc-300">LOT {variant.Batch}</p>
                        ) : (
                          <p className="mt-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                            <AlertTriangle size={9} /> LOT belum diinput
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border bg-slate-50 px-2.5 py-2 text-[9px] dark:border-zinc-700 dark:bg-zinc-800/60">
                  <b className="text-blue-700 dark:text-blue-300">REF {r.NoStok || "Belum diinput"}</b>
                  <span className="text-zinc-300">•</span>
                  {r.Batch ? (
                    <b className="text-zinc-600 dark:text-zinc-300">LOT {r.Batch}</b>
                  ) : (
                    <b className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-1 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      <AlertTriangle size={10} /> LOT belum diinput
                    </b>
                  )}
                </div>
              )}

            <div className="mt-2 grid grid-cols-3 divide-x rounded-lg border-y bg-white/60 dark:border-zinc-700 dark:bg-zinc-900/40">
              <div className="px-2 py-2">
                <div className={`text-[8px] font-bold uppercase ${isSupportCenterStock(r) ? "text-violet-600" : "text-emerald-600"}`}>{isSupportCenterStock(r) ? "Stok Pusat" : "Office"}</div>
                <div className={`mt-0.5 text-sm font-black ${
                  isSupportCenterStock(r) ? "text-violet-600" : r.TotalQty <= 0 ? "text-red-600" : "text-zinc-900 dark:text-white"
                }`}>{r.TotalQty} Pcs</div>
              </div>
              <div className="px-2 py-2">
                <div className="text-[8px] font-bold uppercase text-zinc-500">Terpakai</div>
                <div className={`mt-0.5 text-sm font-black ${Number(r.TERPAKAI || 0) > 0 ? "text-red-600" : "text-zinc-500"}`}>{r.TERPAKAI || 0} Pcs</div>
              </div>
              <div className="px-2 py-2">
                <div className="text-[8px] font-bold uppercase text-zinc-500">Refill</div>
                <div className={`mt-0.5 text-sm font-black ${Number(r.REFILL || 0) > 0 ? "text-amber-600" : "text-zinc-500"}`}>{r.REFILL || 0} Pcs</div>
              </div>
            </div>

            <div className="mt-2 border-t pt-2">
              <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setHistoryNo((r.Variants || [r])[0].No);
                  setHistoryOpen(true);
                }}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-100 px-3 text-[10px] font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-300"
                aria-label="Lihat riwayat implant"
              >
                <NotebookTabs size={16} />
                Riwayat
              </button>

              <RowActions
                row={(r.Variants || [r])[0]}
                stockRows={data}
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
      </motion.div>

      {/* PAGINATION */}
      <div className="mb-28 flex items-center justify-center gap-2 sm:mb-0">
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

      <AnimatePresence>
        {showScrollTop && !mobileFiltersOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8, x: 8 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 8 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed right-3 z-39 flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white/95 text-slate-600 shadow-lg backdrop-blur active:scale-95 dark:border-zinc-700 dark:bg-zinc-900/95 dark:text-zinc-300 sm:hidden"
            style={{ bottom: "calc(5.75rem + env(safe-area-inset-bottom))" }}
            aria-label="Kembali ke atas"
            title="Kembali ke atas"
          >
            <ChevronUp size={18} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-[max(0.5rem,env(safe-area-inset-left))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.1)] backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/95 sm:hidden" aria-label="Navigasi utama Stock Implant">
        <div className="mx-auto grid max-w-lg grid-cols-4 gap-1">
          <MobileNavLink href="/logistik" label="Logistik" icon={<Warehouse size={17} />} />
          <MobileNavLink href="/serah-terima" label="Serah Terima" icon={<ClipboardSignature size={17} />} />
          <MobileNavLink href="/rumah-sakit" label="Stock RS" icon={<Hospital size={17} />} />
          <MobileNavLink href="/histori-tabel" label="Riwayat" icon={<NotebookTabs size={17} />} />
        </div>
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
        onSuccess={reload}
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

      <AnimatePresence>
        {noteRow && (
          <motion.div
            className="fixed inset-0 z-[10040] flex items-end justify-center bg-zinc-950/35 p-3 backdrop-blur-[2px] sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setNoteRow(null);
            }}
          >
            <motion.section
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="w-full max-w-md overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-2xl dark:border-blue-900 dark:bg-zinc-900"
            >
              <header className="flex items-start justify-between gap-3 border-b bg-blue-50 p-4 dark:bg-blue-950/30">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white"><StickyNote size={18} /></span>
                  <div className="min-w-0">
                    <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-blue-600">Notes Implant</p>
                    <p className="mt-1 truncate text-sm font-black">{noteRow.NoStok || "Tanpa REF"}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] text-zinc-500">{noteRow.Deskripsi}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setNoteRow(null)} className="rounded-full border bg-white p-2 text-zinc-500 dark:bg-zinc-900" aria-label="Tutup notes"><X size={16} /></button>
              </header>
              <div className="p-4">
                <p className="whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm leading-6 text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                  {latestDescription(noteRow.KET)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold uppercase text-zinc-500">
                  <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{noteRow.Brand || "Tanpa brand"}</span>
                  <span className="rounded-md bg-zinc-100 px-2 py-1 dark:bg-zinc-800">{noteRow.Implant || "Tanpa kategori"}</span>
                </div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {timelineOpen && (
          <motion.div
            className="fixed inset-0 z-10030 flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setTimelineOpen(false);
            }}
          >
            <motion.section
              initial={{ y: 36, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 36, opacity: 0, scale: 0.98 }}
              className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl"
            >
              <header className="flex items-center justify-between gap-3 border-b p-4 sm:p-5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                    <FootprintsIcon size={18} />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-black">Timeline Pergerakan Implant</h3>
                    <p className="text-[10px] text-zinc-500">
                      {movementEntries.length} aktivitas sesuai filter stock
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTimelineOpen(false)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-xl border hover:text-red-600"
                  aria-label="Tutup timeline"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="grid grid-cols-2 gap-px border-b bg-slate-200 dark:bg-zinc-700 sm:grid-cols-4">
                <MovementMetric label="Operasi" value={movementSummary.OPERASI} icon={<UserRoundCheckIcon size={16} />} tone="red" />
                <MovementMetric label="Refill" value={movementSummary.REFILL} icon={<ArrowDownToLine size={16} />} tone="emerald" />
                <MovementMetric label="Sedang di luar" value={movementSummary.MOBILISASI_KELUAR} icon={<Truck size={16} />} tone="amber" />
                <MovementMetric label="Kembali" value={movementSummary.MOBILISASI_MASUK} icon={<ArrowUpFromLine size={16} />} tone="blue" />
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-zinc-950 sm:p-5">
                {movementHistoryLoading ? (
                  <div className="animate-pulse space-y-2" aria-label="Memuat pergerakan implant">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex gap-3 rounded-xl border bg-white p-3 dark:bg-zinc-900">
                        <div className="size-9 shrink-0 rounded-xl bg-slate-200 dark:bg-zinc-800" />
                        <div className="min-w-0 flex-1"><div className="h-3 w-2/3 rounded bg-slate-200 dark:bg-zinc-800" /><div className="mt-2 h-3 w-1/3 rounded bg-slate-100 dark:bg-zinc-800" /></div>
                      </div>
                    ))}
                  </div>
                ) : movementEntries.length === 0 ? (
                  <div className="rounded-2xl border border-dashed bg-white px-4 py-10 text-center dark:bg-zinc-900">
                    <Activity className="mx-auto text-zinc-300" size={30} />
                    <p className="mt-2 text-sm font-semibold">Belum ada pergerakan</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Operasi, refill, support keluar, dan kembali akan muncul di sini.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative space-y-3 pl-5 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-zinc-200 dark:before:bg-zinc-700">
                      {movementEntries
                        .slice(0, showAllMovements ? 100 : 10)
                        .map((movement, index) => (
                          <MovementTimelineItem
                            key={`${movement.Timestamp}-${movement.No}-${index}`}
                            movement={movement}
                            onOpenHistory={() => {
                              setTimelineOpen(false);
                              setHistoryNo(movement.No);
                              setHistoryOpen(true);
                            }}
                          />
                        ))}
                    </div>
                    {movementEntries.length > 10 && (
                      <button
                        type="button"
                        onClick={() => setShowAllMovements((value) => !value)}
                        className="mt-4 w-full rounded-xl border bg-white py-3 text-xs font-bold hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      >
                        {showAllMovements ? "Tampilkan 10 terbaru" : `Lihat semua ${movementEntries.length} aktivitas`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>

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
    <details className="group relative rounded-xl max-sm:border max-sm:border-slate-200 max-sm:bg-slate-50 max-sm:p-1.5 dark:max-sm:border-zinc-800 dark:max-sm:bg-zinc-950/40">
      <summary className="flex h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold dark:border-zinc-700 dark:bg-zinc-900 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate text-zinc-700 dark:text-zinc-200">{summary}</span>
        <span className="flex shrink-0 items-center gap-1">
          {values.length > 0 && (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {values.length}
            </span>
          )}
          <ChevronDown
            size={14}
            className="transition group-open:rotate-180"
          />
        </span>
      </summary>

      <div className="mt-1.5 w-full overflow-hidden rounded-lg border bg-white shadow-sm sm:absolute sm:right-0 sm:top-12 sm:z-40 sm:mt-0 sm:min-w-56 sm:shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
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

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 pl-2 pr-1 text-[9px] font-bold text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="flex size-5 items-center justify-center rounded-md hover:bg-blue-100 dark:hover:bg-blue-900"
        aria-label={`Hapus filter ${label}`}
      >
        <X size={11} />
      </button>
    </span>
  );
}

function MobileNavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 text-[9px] font-bold text-zinc-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-[0.97] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
    >
      <span className="flex size-6 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300">
        {icon}
      </span>
      <span className="max-w-full truncate leading-none">{label}</span>
    </Link>
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
    <div className="bg-white px-2 py-3 text-center dark:bg-zinc-900 sm:px-4">
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
