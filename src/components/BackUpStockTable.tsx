"use client";

import { useEffect, useMemo, useState } from "react";
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
  Database,
  Package,
  FlameIcon,
  PlugZap2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StockRow } from "@/types/stock";
import { useStockCRUD } from "@/hooks/useStockCRUD";
import { useStockTable } from "@/hooks/useStockTable";
import EditModal from "./EditModal";
import RowActions from "./RowActions";
import HistoryTimelineModal from "./HistoryModalTimeline";

/* ================= TYPES ================= */
type FilterMode = "ALL" | "REF" | "LOT" | "NAMA";

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
}: {
  sheet?: string;
}) {
  const { data, loading, reload, createRow, updateRow } = useStockCRUD({
    sheet,
  });

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);

  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<FilterMode>("ALL");

  const [isCreate, setIsCreate] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNo, setHistoryNo] = useState<number | null>(null);

  const debounced = useDebounce(search, 350);

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
    if (!debounced) return data;
    const q = debounced.toLowerCase();

    return data.filter((r) => {
      const ref = String(r.NoStok ?? "").toLowerCase();
      const lot = String(r.Batch ?? "").toLowerCase();
      const nama = String(r.Deskripsi ?? "").toLowerCase();
      const no = String(r.No ?? "").toLowerCase();

      if (mode === "REF") return ref.includes(q);
      if (mode === "LOT") return lot.includes(q);
      if (mode === "NAMA") return nama.includes(q);

      return (
        ref.includes(q) || lot.includes(q) || nama.includes(q) || no.includes(q)
      );
    });
  }, [data, debounced, mode]);

  const tableData = useStockTable(filteredData);

  /* ================= SUMMARY (FILTERED) ================= */
  const summary = useMemo(() => {
    return filteredData.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.qty += Number(r.Qty || 0);
        acc.used += Number(r.TERPAKAI || 0);
        acc.refill += Number(r.REFILL || 0);
        return acc;
      },
      { count: 0, qty: 0, used: 0, refill: 0 }
    );
  }, [filteredData]);

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
      "No",
      "NoStok",
      "Deskripsi",
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
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 space-y-4 border shadow">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center">
        <h2 className="text-xl font-bold">📦 Stock Management</h2>

        <div className="flex gap-2">
          <button onClick={reload} className="btn-outline">
            <RefreshCcw size={14} />
          </button>
          <button onClick={handleExport} className="btn-outline">
            <FileSpreadsheet size={14} />
          </button>
          <button
            onClick={() => {
              setIsCreate(true);
              setSelectedRow(null);
              setEditOpen(true);
            }}
            className="animate-shake-soft"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-2 top-2.5 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Scan / Search..."
            className="pl-8 pr-3 py-2 w-full border rounded text-sm dark:bg-zinc-800"
          />
        </div>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as FilterMode)}
          className="border rounded px-3 py-2 text-sm dark:bg-zinc-800"
        >
          <option value="ALL">ALL</option>
          <option value="REF">REF</option>
          <option value="LOT">LOT</option>
          <option value="NAMA">NAMA</option>
        </select>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm md:mb-16">
        <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800 border-l-green-700 border-l-4 shadow-lg">
          <div className="text-zinc-500 flex items-center gap-1 ">
            <Database size={22} className="text-green-600 rotate-3" /> Data
          </div>
          <div className="font-bold text-2xl text-green-600">
            {summary.count}
          </div>
        </div>
        <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800 border-l-zinc-500 border-l-4 shadow-lg">
          <div className="text-zinc-500 flex items-center gap-1">
            <Package size={22} className="text-zinc-600 animate-in" />
            Qty
          </div>
          <div className="font-bold text-2xl">{summary.qty}</div>
        </div>
        <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800 border-l-red-500 border-l-4 shadow-lg">
          <div className="text-zinc-500 flex  items-center gap-1">
            <FlameIcon size={22} className="text-red-600 animate-flame-icon" />
            Terpakai
          </div>
          <div className="font-bold text-red-600 text-2xl">{summary.used}</div>
        </div>
        <div className="p-3 rounded-md bg-zinc-50 dark:bg-zinc-800 border-l-blue-600 border-l-4 shadow-lg">
          <div className="text-zinc-500 flex items-center gap-1">
            <PlugZap2
              size={22}
              className="text-blue-600 animate-shake-infinite"
            />{" "}
            Refill
          </div>
          <div className="font-bold text-2xl text-blue-600 ">
            {summary.refill}
          </div>
        </div>
      </div>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block overflow-x-auto border rounded-xl">
        <div className="relative overflow-hidden rounded-xl border bg-white dark:bg-zinc-900 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              {/* ================= HEADER ================= */}
              <thead className="sticky top-0 z-10 bg-zinc-50 dark:bg-zinc-800 border-b">
                <tr className="text-xs uppercase tracking-wide text-zinc-500">
                  {[
                    "No",
                    "REF",
                    "Deskripsi",
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
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-zinc-400">
                      Loading data…
                    </td>
                  </tr>
                ) : tableData.paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-zinc-400">
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
                      {/* No */}
                      <td className="px-3 py-2 font-medium">
                        {highlight(r.No)}
                      </td>

                      {/* REF */}
                      <td className="px-3 py-2 text-zinc-600">
                        {highlight(r.NoStok)}
                      </td>

                      {/* Deskripsi */}
                      <td className="px-3 py-2 max-w-[260px] truncate">
                        {highlight(r.Deskripsi)}
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
                        <Badge className="animate-warning text-slate-800">{r.TERPAKAI}</Badge>
                      </td>

                      {/* Refill */}
                      <td className="px-3 py-2">
                        <Badge variant="secondary">{r.REFILL}</Badge>
                      </td>

                      {/* Keterangan */}
                      <td className="px-3 py-2 text-zinc-500 max-w-[200px] truncate">
                        {r.KET || "-"}
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

      {/* ================= MOBILE CARD ================= */}
      <div className="md:hidden space-y-3">
        {tableData.paginated.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="border rounded-xl p-3 shadow-sm bg-white dark:bg-zinc-900"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{highlight(r.Deskripsi)}</div>
                <div className="text-xs text-zinc-500">
                  REF: {highlight(r.NoStok)} • LOT: {highlight(r.Batch)}
                </div>
              </div>
              <Badge>{r.Qty}</Badge>
            </div>

            <div className="flex gap-2 flex-wrap mt-2">
              <Badge variant="destructive">Total {r.TotalQty}</Badge>
              <Badge variant="destructive">Used {r.TERPAKAI}</Badge>
              <Badge variant="secondary">Refill {r.REFILL}</Badge>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setHistoryNo(r.No);
                  setHistoryOpen(true);
                }}
                className="p-2 rounded-lg bg-blue-100 text-blue-600"
              >
                <NotebookTabs size={16} />
              </button>

              <RowActions
                row={r}
                sheet={sheet}
                onReload={reload}
                onEdit={(row) => {
                  setSelectedRow(row);
                  setEditOpen(true);
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center items-center gap-4">
        <button
          onClick={() => tableData.setPage(Math.max(1, tableData.page - 1))}
        >
          <ChevronLeft />
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
        >
          <ChevronRight />
        </button>
      </div>

      {/* EDIT */}
      <EditModal
        open={editOpen}
        row={selectedRow}
        onClose={() => setEditOpen(false)}
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
  );
}
