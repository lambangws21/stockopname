"use client";

import { useEffect, useState } from "react";
import { ImplantStockItem } from "@/types/implant-stock";
import { StockFilter } from "./StockFilter";
import { EditStockModal } from "./EditStockModal";

interface StockTableProps {
  reloadKey?: number;
}

export default function StockTable({ reloadKey }: StockTableProps) {
  const [data, setData] = useState<ImplantStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [batch, setBatch] = useState("");

  const [editingItem, setEditingItem] = useState<ImplantStockItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/implant-stock");
      const json = await res.json();

      const safeData: ImplantStockItem[] = Array.isArray(json?.data)
        ? json.data
        : [];

      setData(safeData);
    } catch (error) {
      console.error("Gagal load data table:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reloadKey]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/implant-stock/${id}`, { method: "DELETE" });
    loadData();
  };

  const handleEditClick = (item: ImplantStockItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  // ✅ FILTER SESUAI FIELD BARU
  const filtered = data.filter(
    (item) =>
      item.description.toLowerCase().includes(keyword.toLowerCase()) &&
      item.batch.toLowerCase().includes(batch.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow">
      {/* FILTER */}
      <StockFilter
        implant={keyword}
        batch={batch}
        setImplant={setKeyword}
        setBatch={setBatch}
      />

      {loading ? (
        <div className="py-6 text-center text-sm text-zinc-500">
          Memuat data stok...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr className="text-left">
                <th className="px-2 py-2">NO</th>
                <th className="px-2 py-2">No Stok</th>
                <th className="px-2 py-2">Deskripsi</th>
                <th className="px-2 py-2">Batch</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Total Qty</th>
                <th className="px-2 py-2">Terpakai</th>
                <th className="px-2 py-2">Refill</th>
                <th className="px-2 py-2">Ket.</th>
                <th className="px-2 py-2">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-2 py-1">{item.no}</td>
                  <td className="px-2 py-1">{item.stockNo}</td>
                  <td className="px-2 py-1">{item.description}</td>
                  <td className="px-2 py-1">{item.batch}</td>
                  <td className="px-2 py-1">{item.qty}</td>
                  <td className="px-2 py-1">{item.totalQty}</td>
                  <td className="px-2 py-1">{item.used}</td>
                  <td className="px-2 py-1">{item.refill}</td>
                  <td className="px-2 py-1">{item.note}</td>
                  <td className="px-2 py-1 space-x-2">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-2 py-4 text-center text-xs text-zinc-500"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <EditStockModal
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}
