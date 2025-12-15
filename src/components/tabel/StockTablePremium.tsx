"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Search, RefreshCcw, Plus, NotebookTabs } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { StockRow } from "@/types/stock";
import { useStockCRUD } from "@/hooks/useStockCRUD";
import { useStockTable } from "@/hooks/useStockTable";

import EditModal from "../EditModal";
import RowActions from "../RowActions";
import HistoryTimelineModal from "../HistoryModalTimeline";
import InlineEditCell from "./InlineEditCells";
import MobileStockCard from "./MobileStockCard";
import ColumnToggle from "./ColumnToggle";

/* ================= COLUMN ================= */
export type Column = {
  key: keyof StockRow;
  label: string;
  visible: boolean;
};

const DEFAULT_COLUMNS: Column[] = [
  { key: "No", label: "No", visible: true },
  { key: "NoStok", label: "REF", visible: true },
  { key: "Deskripsi", label: "Deskripsi", visible: true },
  { key: "Batch", label: "Batch", visible: true },
  { key: "Qty", label: "Qty", visible: true },
  { key: "TotalQty", label: "Total", visible: true },
  { key: "TERPAKAI", label: "Terpakai", visible: true },
  { key: "REFILL", label: "Refill", visible: true },
  { key: "KET", label: "Keterangan", visible: true },
];

export default function StockTablePremium({
  sheet = "Sheet1",
}: {
  sheet?: string;
}) {
  /* ================= DATA ================= */
  const { data, loading, reload, createRow, updateRow } =
    useStockCRUD({ sheet });

  const tableData = useStockTable(data);

  /* ================= STATE ================= */
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [search, setSearch] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyNo, setHistoryNo] = useState<number | null>(null);

  /* ================= PERSIST COLUMN ================= */
  useEffect(() => {
    localStorage.setItem("stock-columns", JSON.stringify(columns));
  }, [columns]);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    if (!search) return tableData.paginated;
    const q = search.toLowerCase();

    return tableData.paginated.filter(
      (r) =>
        String(r.NoStok).toLowerCase().includes(q) ||
        String(r.Batch).toLowerCase().includes(q) ||
        String(r.Deskripsi).toLowerCase().includes(q)
    );
  }, [search, tableData.paginated]);

  /* ================= VIRTUAL ================= */
  const parentRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 46,
    overscan: 6,
  });

  const isMobile =
    typeof window !== "undefined" && window.innerWidth < 768;

  /* ================= UI ================= */
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 space-y-4 border shadow">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">📦 Stock Management</h2>

        <div className="flex gap-2">
          <button onClick={reload} className="btn-outline">
            <RefreshCcw size={14} />
          </button>
          <button
            onClick={() => {
              setSelectedRow(null);
              setEditOpen(true);
            }}
            className="btn-outline"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* SEARCH */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 text-zinc-400" size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search stock…"
          className="pl-8 pr-3 py-2 w-full border rounded text-sm"
        />
      </div>

      {/* COLUMN TOGGLE */}
      <ColumnToggle columns={columns} setColumns={setColumns} />

      {/* LOADING */}
      {loading && (
        <div className="text-sm text-zinc-400">Loading data…</div>
      )}

      {/* MOBILE */}
      {isMobile ? (
        <div className="space-y-3">
          {filtered.map((r) => (
            <MobileStockCard
              key={r.No}
              row={r}
              sheet={sheet}
              onReload={reload}
            />
          ))}
        </div>
      ) : (
        /* DESKTOP */
        <div
          ref={parentRef}
          className="max-h-[65vh] overflow-y-auto border rounded"
        >
          <table className="min-w-full text-sm relative">
            <thead className="sticky top-0 bg-zinc-100 z-10">
              <tr>
                {columns
                  .filter((c) => c.visible)
                  .map((c) => (
                    <th key={c.key} className="px-3 py-2 text-left">
                      {c.label}
                    </th>
                  ))}
                <th className="px-3 py-2 sticky right-0 bg-zinc-100">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody style={{ height: rowVirtualizer.getTotalSize() }}>
              {rowVirtualizer.getVirtualItems().map((v) => {
                const r = filtered[v.index];
                if (!r) return null;

                return (
                  <motion.tr
                    key={r.No}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${v.start}px)`,
                    }}
                    className="border-b hover:bg-zinc-50"
                  >
                    {columns
                      .filter((c) => c.visible)
                      .map((c) => (
                        <td key={c.key} className="px-3 py-2">
                          {c.key === "Qty" ? (
                            <InlineEditCell
                              value={r.Qty}
                              onSave={(val) =>
                                updateRow({ ...r, Qty: Number(val) })
                              }
                            />
                          ) : c.key === "TotalQty" ? (
                            <Badge
                              variant={
                                r.TotalQty <= 0
                                  ? "outline"
                                  : "destructive"
                              }
                            >
                              {r.TotalQty}
                            </Badge>
                          ) : (
                            String(r[c.key] ?? "-")
                          )}
                        </td>
                      ))}

                    {/* ACTION */}
                    <td className="px-3 py-2 sticky right-0 bg-white">
                      <button
                        onClick={() => {
                          setHistoryNo(r.No);
                          setHistoryOpen(true);
                        }}
                        className="p-1"
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT MODAL */}
      <EditModal
        open={editOpen}
        row={selectedRow}
        onClose={() => setEditOpen(false)}
        onSave={async (r) => {
          if (r.No) await updateRow(r);
          else await createRow(r);
          setEditOpen(false);
          await reload();
        }}
      />

      {/* HISTORY MODAL */}
      {historyNo !== null ? (
        <HistoryTimelineModal
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          sheet={sheet}
          No={historyNo}
        />
      ) : null}
    </div>
  );
}
