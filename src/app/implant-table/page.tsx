"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { RawPriceRow } from "@/types/implant-stock";

import {
  Pencil,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  RefreshCcw,
  Plus,
  ChevronDown,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";
import ExcelJS from "exceljs";
import { StockFilter } from "@/components/stock/StockFilter";
import HistoryTimeline from "@/components/HistoryTimeLine";


const SHEET_NAME = "Sheet1";


/* =====================================================
   EDIT MODAL (disisipkan di atas!)
===================================================== */
function EditModal({
  open,
  row,
  onClose,
  onSave,
}: {
  open: boolean;
  row: RawPriceRow | null;
  onClose: () => void;
  onSave: (updated: RawPriceRow) => void;
}) {
  // Hooks HARUS selalu dipanggil
  const [form, setForm] = useState<RawPriceRow | null>(row);
  

  // Sinkronkan state lokal ketika row berubah
  useEffect(() => {
    setForm(row);
  }, [row]);

  const updateField = (k: keyof RawPriceRow, val: string) => {
    if (!form) return;
    setForm({ ...form, [k]: val });
  };

  // Setelah hooks, baru boleh return null
  if (!open || !form) return null;

  const keys = Object.keys(form) as (keyof RawPriceRow)[];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-xl w-full max-w-md"
      >
        <h2 className="font-semibold text-lg mb-3">
          {form.No ? "Edit Data" : "Tambah Data"}
        </h2>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {keys.map((k) => (
            <div key={k}>
              <label className="text-xs text-zinc-500">{k}</label>
              <input
                className="border w-full rounded-lg px-3 py-2 mt-1 dark:bg-zinc-800 dark:border-zinc-700"
                value={form[k] ?? ""}
                onChange={(e) => updateField(k, e.target.value)}
              />
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg border dark:border-zinc-700"
          >
            Cancel
          </button>

          <button
            onClick={() => onSave(form)}
            className="px-3 py-2 rounded-lg bg-blue-600 text-white"
          >
            Save
          </button>
        </div>
      </motion.div>
    </div>
  );
}


/* =====================================================
   STOCK TABLE PREMIUM MAIN COMPONENT
===================================================== */

type SortField = keyof RawPriceRow | null;
type SortOrder = "asc" | "desc";

export default function StockTablePremium() {
  const [data, setData] = useState<RawPriceRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [batchValue, setBatchValue] = useState("");

  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const skeletonRows = Array.from({ length: 6 });

  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<RawPriceRow | null>(null);

  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* =====================================================
     LOAD DATA
  ===================================================== */
  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/super-sheet", { cache: "no-store" });
      const json = await res.json();

      setData(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      console.error("Load error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     ADD NEW ROW
  ===================================================== */
  const handleAddNew = () => {
    setSelectedRow({
      No: "",
      NoStok: "",
      Deskripsi: "",
      Batch: "",
      Qty: "",
      TotalQty: "",
      TERPAKAI: "",
      REFILL: "",
      KET: "",
    });
    setEditOpen(true);
  };

  /* =====================================================
     SAVE (POST/PUT)
  ===================================================== */
  const handleSave = async (updated: RawPriceRow) => {
    const isNew = !updated.No;
    const method = isNew ? "POST" : "PUT";

    await fetch("/api/super-sheet", {
      method,
      body: JSON.stringify(updated),
    });

    setEditOpen(false);
    loadData();
  };

  /* =====================================================
     DELETE
  ===================================================== */
  const handleDelete = async (row: RawPriceRow) => {
    if (!confirm(`Hapus data No ${row.No}?`)) return;

    await fetch("/api/super-sheet", {
      method: "DELETE",
      body: JSON.stringify({ No: row.No }),
    });

    loadData();
  };

  /* =====================================================
     FILTER
  ===================================================== */
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const desc = String(item.Deskripsi ?? "").toLowerCase();
      const batch = String(item.Batch ?? "").toLowerCase();

      return (
        desc.includes(search.toLowerCase()) &&
        batch.includes(batchValue.toLowerCase())
      );
    });
  }, [data, search, batchValue]);

  /* =====================================================
     SORTING
  ===================================================== */
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      const A = a[sortField] ?? "";
      const B = b[sortField] ?? "";

      const numA = Number(A);
      const numB = Number(B);

      if (!isNaN(numA) && !isNaN(numB)) {
        return sortOrder === "asc" ? numA - numB : numB - numA;
      }

      return sortOrder === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
  }, [filteredData, sortField, sortOrder]);

  /* =====================================================
     PAGINATION
  ===================================================== */
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginated = sortedData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const [openHistory, setOpenHistory] = useState<number | null>(null);

  /* =====================================================
     EXPORT
  ===================================================== */
  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Stock Dashboard";
    workbook.created = new Date();
  
    const ws = workbook.addWorksheet(SHEET_NAME, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
  
    const headers: (keyof RawPriceRow)[] = [
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
  
    sortedData.forEach((row: RawPriceRow) => {
      ws.addRow(headers.map((h) => row[h] ?? ""));
    });
  
    headers.forEach((_, i) => {
      ws.getColumn(i + 1).width = 16;
    });
  
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${SHEET_NAME}-stock.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  

  /* =====================================================
     SORT ICON
  ===================================================== */
  const renderSortIcon = (field: SortField) => (
    <ArrowUpDown
      size={16}
      className={`inline ml-1 ${
        sortField === field ? "text-blue-600" : "text-zinc-400"
      }`}
    />
  );

  /* =====================================================
     UI
  ===================================================== */
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold">📦 Premium Implant Stock Table</h2>
          <p className="text-xs text-zinc-500">
            Autosuggest • Add/Edit/Delete • Sort • Export • Mobile Card
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAddNew}
            className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
          >
            <Plus size={16} /> Tambah Data
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
          >
            <FileSpreadsheet size={16} /> Export
          </button>

          <button
            onClick={loadData}
            className="px-3 py-2 text-sm rounded-lg border dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-1"
          >
            <RefreshCcw size={16} /> Reload
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <StockFilter
        implant={search}
        batch={batchValue}
        setImplant={setSearch}
        setBatch={setBatchValue}
      />

      {/* DESKTOP TABLE */}
      <div className="hidden md:block overflow-x-auto border rounded-xl dark:border-zinc-700">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-800 sticky top-0">
            <tr>
              {(
                [
                  ["No", "No"],
                  ["NoStok", "No Stok"],
                  ["Deskripsi", "Deskripsi"],
                  ["Batch", "Batch"],
                  ["Qty", "Qty"],
                  ["TotalQty", "Total Qty"],
                  ["TERPAKAI", "Terpakai"],
                  ["REFILL", "Refill"],
                  ["KET", "Ket"],
                ] as [SortField, string][]
              ).map(([field, label]) => (
                <th
                  key={field}
                  className="px-3 py-2 cursor-pointer whitespace-nowrap"
                  onClick={() => {
                    setSortField(field);
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                  }}
                >
                  {label}
                  {renderSortIcon(field)}
                </th>
              ))}
              <th className="px-3 py-2 text-center w-20">Aksi</th>
            </tr>
          </thead>

          <tbody>
  {loading
    ? skeletonRows.map((_, i) => (
        <tr key={`skel-${i}`} className="animate-pulse">
          {Array.from({ length: 9 }).map((__, j) => (
            <td key={`skel-${i}-${j}`} className="px-3 py-2">
              <div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded" />
            </td>
          ))}
        </tr>
      ))
    : paginated.map((row, index) => (
      <Fragment key={`row-${row.No || `idx-${index}`}`}>

          {/* ===== MAIN ROW ===== */}
          <tr   key={`history-${row.No}-${index}`} className="border-b dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/30">
            <td className="px-3 py-1">{row.No}</td>
            <td className="px-3 py-1">{row.NoStok}</td>
            <td className="px-3 py-1">{row.Deskripsi}</td>
            <td className="px-3 py-1">
              <span className="px-2 py-1 text-xs rounded bg-blue-200 dark:bg-blue-900">
                {row.Batch}
              </span>
            </td>
            <td className="px-3 py-1">{row.Qty}</td>
            <td className="px-3 py-1 font-semibold">
              {row.TotalQty}
            </td>
            <td className="px-3 py-1">{row.TERPAKAI}</td>
            <td className="px-3 py-1">{row.REFILL}</td>
            <td className="px-3 py-1">{row.KET}</td>

            <td className="px-3 py-1 flex justify-center gap-3">
              {/* TOGGLE HISTORY */}
              <button
                onClick={() =>
                  setOpenHistory(
                    openHistory === Number(row.No)
                      ? null
                      : Number(row.No)
                  )
                }
                className="text-zinc-500 hover:text-zinc-800"
              >
                <ChevronDown
                  size={16}
                  className={`transition ${
                    openHistory === Number(row.No)
                      ? "rotate-180"
                      : ""
                  }`}
                />
              </button>

              <button
                onClick={() => {
                  setSelectedRow(row);
                  setEditOpen(true);
                }}
                className="text-blue-600"
              >
                <Pencil size={16} />
              </button>

              <button
                onClick={() => handleDelete(row)}
                className="text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </td>
          </tr>

          {/* ===== HISTORY ROW (TIMELINE) ===== */}
          <AnimatePresence>
            {openHistory === Number(row.No) && (
              <motion.tr
                key={`history-${row.No}`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-zinc-50 dark:bg-zinc-800/60"
              >
                <td colSpan={10} className="px-6 py-4">
                  <HistoryTimeline
                    sheet="Sheet1"
                    No={Number(row.No)}
                  />
                </td>
              </motion.tr>
            )}
          </AnimatePresence>
        </Fragment>
      ))}
</tbody>

        </table>
      </div>

      {/* MOBILE CARD VIEW */}
      <div className="md:hidden space-y-3">
        {loading
          ? skeletonRows.map((_, i) => (
              <div
                key={`mob-skel-${i}`}
                className="p-4 border rounded-lg bg-zinc-100 dark:bg-zinc-800 animate-pulse"
              >
                <div className="h-4 bg-zinc-300 dark:bg-zinc-700 rounded w-1/2 mb-3" />
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((__, j) => (
                    <div
                      key={j}
                      className="h-3 bg-zinc-300 dark:bg-zinc-700 rounded"
                    />
                  ))}
                </div>
              </div>
            ))
          : paginated.map((row, index) => (
              <motion.div
                key={`${row.No}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
              >
                <div className="flex justify-between">
                  <div>
                    <p className="font-semibold">{row.Deskripsi}</p>
                    <p className="text-xs text-zinc-500">Batch: {row.Batch}</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedRow(row);
                        setEditOpen(true);
                      }}
                      className="text-blue-500"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => handleDelete(row)}
                      className="text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 text-xs mt-2 gap-1">
                  <p>Qty: {row.Qty}</p>
                  <p>Total: {row.TotalQty}</p>
                  <p>Used: {row.TERPAKAI}</p>
                  <p>Refill: {row.REFILL}</p>
                  <p className="col-span-2">Ket: {row.KET}</p>
                </div>
              </motion.div>
            ))}
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center">
        <select
          value={rowsPerPage}
          onChange={(e) => {
            setRowsPerPage(Number(e.target.value));
            setPage(1);
          }}
          className="px-2 py-1 border rounded dark:bg-zinc-800 dark:border-zinc-700"
        >
          <option value={10}>10 baris</option>
          <option value={25}>25 baris</option>
          <option value={50}>50 baris</option>
        </select>

        <div className="flex items-center gap-2">
          <button
            disabled={page === 1}
            className="p-2 disabled:opacity-40"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={18} />
          </button>

          <span className="text-sm">
            {page} / {totalPages || 1}
          </span>

          <button
            disabled={page === totalPages}
            className="p-2 disabled:opacity-40"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* EDIT MODAL */}
      <EditModal
        open={editOpen}
        row={selectedRow}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
