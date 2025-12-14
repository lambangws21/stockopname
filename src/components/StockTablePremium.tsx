"use client";

import {  useEffect, useRef, useState } from "react";
import { motion} from "framer-motion";
import ExcelJS from "exceljs";

import { StockRow } from "@/types/stock";
import { useStockCRUD } from "@/hooks/useStockCRUD";
import { useStockTable } from "@/hooks/useStockTable";

import EditModal from "./EditModal";
import RowActions from "./RowActions";
import HistoryTimelineModal from "./HistoryModalTimeline";

import {
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  RefreshCcw,
  Plus,
  Sparkles,
  Search,
  NotebookTabs,

  Receipt,

  BatteryIcon,
  GlassWaterIcon,
  LucideGalleryHorizontal,
} from "lucide-react";

/* ================= TYPES ================= */
type ChangeInfo = {
  before: string | number;
  after: string | number;
};

type ChangeMap = Record<number, Partial<Record<keyof StockRow, ChangeInfo>>>;

/* ================= COMPONENT ================= */
export default function StockTablePremium({
  sheet = "Sheet1",
}: {
  sheet?: string;
}) {
  const { data, loading, reload, createRow, updateRow } = useStockCRUD({ sheet });
  const table = useStockTable(data);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);

  const [changes, setChanges] = useState<ChangeMap>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNo, setHistoryNo] = useState<number | null>(null);

  const [search, setSearch] = useState("");

  const topRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [table.page]);

  /* ================= ACTIONS ================= */
  const openNew = () => {
    setSelectedRow({
      No: 0,
      NoStok: "",
      Deskripsi: "",
      Batch: "",
      Qty: 0,
      TotalQty: 0,
      TERPAKAI: 0,
      REFILL: 0,
      KET: "",
    });
    setEditOpen(true);
  };

  const handleSave = async (payload: StockRow) => {
    if (payload.No === 0) {
      await createRow(payload);
      setEditOpen(false);
      return;
    }

    const before = data.find((d) => d.No === payload.No);
    if (!before) return;

    await updateRow(payload);

    const diff: Partial<Record<keyof StockRow, ChangeInfo>> = {};
    (Object.keys(payload) as (keyof StockRow)[]).forEach((k) => {
      if (payload[k] !== before[k]) {
        diff[k] = { before: before[k], after: payload[k] };
      }
    });

    setChanges((p) => ({ ...p, [payload.No]: diff }));

    setTimeout(() => {
      setChanges((p) => {
        const c = { ...p };
        delete c[payload.No];
        return c;
      });
    }, 6000);

    setEditOpen(false);
  };

  /* ================= EXPORT ================= */
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Stock Dashboard";
    workbook.created = new Date();

    const ws = workbook.addWorksheet(sheet, {
      views: [{ state: "frozen", ySplit: 1 }],
    });

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

    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: "center" };
    });

    table.sorted.forEach((row) => {
      ws.addRow(headers.map((h) => row[h]));
    });

    headers.forEach((_, i) => (ws.getColumn(i + 1).width = 16));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${sheet}-stock.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ================= HELPERS ================= */
  const renderCell = (row: StockRow, field: keyof StockRow) => {
    const change = changes[row.No]?.[field];
    return (
      <div className="flex items-center gap-2">
        <span>{String(row[field])}</span>
        {change && <Sparkles size={14} className="text-yellow-500 animate-pulse" />}
      </div>
    );
  };

  const filteredRows = table.paginated.filter((r) =>
    `${r.No} ${r.NoStok} ${r.Deskripsi} ${r.Batch}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  /* ================= UI ================= */
  return (
    <div
      ref={topRef}
      className="bg-white dark:bg-zinc-900 rounded-xl p-5 shadow-lg border space-y-5"
    >
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  {/* TITLE */}
  <div className="flex flex-col">
    <h2 className="text-lg sm:text-xl font-bold">
      📦 Implant Stock Dashboard
    </h2>
    <p className="text-xs text-zinc-500">
      CRUD • Mutasi • History • KPI Ready
    </p>
  </div>

  {/* ACTION BUTTONS */}
  <div className="flex flex-wrap gap-2 sm:flex-nowrap">
    <button
      onClick={openNew}
      className="btn-outline flex items-center gap-1 text-xs sm:text-sm"
    >
      <Plus size={14} />
      <span className="hidden sm:inline">Tambah</span>
    </button>

    <button
      onClick={handleExport}
      className="btn-outline flex items-center gap-1 text-xs sm:text-sm"
    >
      <FileSpreadsheet size={14} />
      <span className="hidden sm:inline">Export</span>
    </button>

    <button
      onClick={reload}
      className="btn-outline flex items-center gap-1 text-xs sm:text-sm"
    >
      <RefreshCcw size={14} />
      <span className="hidden sm:inline">Reload</span>
    </button>
  </div>
</div>


      {/* SEARCH */}
      <div className="relative w-64">
        <Search size={16} className="absolute left-2 top-2.5 text-zinc-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search No / Nama / Batch"
          className="pl-8 pr-3 py-2 border rounded w-full text-sm dark:bg-zinc-800"
        />
      </div>

      {/* ================= DESKTOP TABLE ================= */}
      <div className="hidden md:block overflow-x-auto border rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800">
            <tr>
              {(
                [
                  "No",
                  "NoStok",
                  "Deskripsi",
                  "Batch",
                  "Qty",
                  "TotalQty",
                  "TERPAKAI",
                  "REFILL",
                  "KET",
                ] as (keyof StockRow)[]
              ).map((f) => (
                <th key={f} className="px-4 py-2">
                  {f}
                </th>
              ))}
              <th className="px-4 py-2 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="p-6 text-center">
                  Loading…
                </td>
              </tr>
            ) : (
              filteredRows.map((r, idx) => (
                <motion.tr
                key={`row-${r.No ?? "temp"}-${r.NoStok ?? "nostok"}-${r.Batch ?? "batch"}-${idx}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}              
                  className={`border-b ${
                    changes[r.No] ? "bg-yellow-50" : ""
                  }`}
                >
                  {(Object.keys(r) as (keyof StockRow)[]).map((f) => (
                    <td key={`${r.No}-${f}`} className="px-4 py-2">
                      {renderCell(r, f)}
                    </td>
                  ))}

                  <td className="px-4 py-2 flex gap-2 items-center">
                    <button
                      onClick={() => {
                        setHistoryNo(r.No);
                        setHistoryOpen(true);
                      }}
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
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE VIEW ================= */}
      <div className="md:hidden space-y-3">
        {filteredRows.map((r, idx) => (
          <motion.div
          key={`mobile-${r.No ?? "temp"}-${r.NoStok ?? "nostok"}-${idx}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
            className="border rounded-lg p-4 space-y-2 shadow-sm"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-semibold">{r.Deskripsi}</div>
                <div className="flex items-center gap-1 text-xs text-zinc-500"><Receipt size={14} /> Number Stock: <span className="font-semibold text-blue-700 font-sm">{r.NoStok}</span></div>
              </div>

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

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1"><BatteryIcon size={14} /> Batch: <span className="font-semibold text-red-700">{r.Batch}</span></div>
              <div className="flex items-center gap-1"><GlassWaterIcon size={14} /> Qty: {r.Qty}</div>
              <div className="flex items-center gap-1"><LucideGalleryHorizontal size={14} /> <span className="font-semibold text-green-700">Terpakai: {r.TERPAKAI}</span></div>
              <div className="flex items-center gap-1"><RefreshCcw size={14} /> <span className="font-semibold text-green-700">Refill: {r.REFILL} </span></div>
            </div>

            <div className="flex justify-between items-center border-t pt-2">
              <div className="font-bold">Total: {r.TotalQty}</div>
              <button
                onClick={() => {
                  setHistoryNo(r.No);
                  setHistoryOpen(true);
                }}
                className="text-xs border px-2 py-1 rounded"
              >
                History
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-center gap-4">
        <button onClick={() => table.setPage(Math.max(1, table.page - 1))}>
          <ChevronLeft />
        </button>
        <span>
          {table.page} / {table.totalPages}
        </span>
        <button
          onClick={() =>
            table.setPage(Math.min(table.totalPages, table.page + 1))
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
        onSave={handleSave}
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
