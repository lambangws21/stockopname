"use client";

import { useEffect, useState } from "react";
import { ImplantStockItem } from "@/types/implant-stock";

interface EditStockModalProps {
  open: boolean;
  item: ImplantStockItem | null;
  onClose: () => void;
  onSaved: () => void;
}

export function EditStockModal({
  open,
  item,
  onClose,
  onSaved,
}: EditStockModalProps) {
  const [stockNo, setStockNo] = useState("");
  const [description, setDescription] = useState("");
  const [batch, setBatch] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [totalQty, setTotalQty] = useState<number>(0);
  const [used, setUsed] = useState<number>(0);
  const [refill, setRefill] = useState<number>(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ SYNC DATA DARI TABLE KE FORM
  useEffect(() => {
    if (item) {
      setStockNo(String(item.stockNo ?? ""));
      setDescription(String(item.description ?? ""));
      setBatch(String(item.batch ?? ""));
      setQty(Number(item.qty ?? 0));
      setTotalQty(Number(item.totalQty ?? 0));
      setUsed(Number(item.used ?? 0));
      setRefill(Number(item.refill ?? 0));
      setNote(String(item.note ?? ""));
    }
  }, [item]);

  if (!open || !item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
  
    try {
      const res = await fetch(`/api/implant-stock/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockNo,
          description,
          batch,
          qty,
          used,
          refill,
          note,
        }),
      });
  
      const text = await res.text(); // ✅ BUKAN res.json()
      let result: unknown = {};
  
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { raw: text };
      }
  
      if (!res.ok) {
        console.error("❌ UPDATE ERROR RESPONSE:", result);
        alert(
          typeof result === "object" && result && "error" in result
            ? (result as { error: string }).error
            : "Gagal update data (server tidak mengirim pesan)"
        );
        return;
      }
  
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };
  
  
  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-zinc-900 p-4 shadow-lg">
        <h2 className="text-lg font-semibold mb-3">Edit Stok</h2>

        <form className="space-y-3" onSubmit={handleSubmit}>
          {/* No Stok */}
          <div>
            <label className="text-xs text-zinc-500">No Stok</label>
            <input
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={stockNo}
              onChange={(e) => setStockNo(e.target.value)}
            />
          </div>

          {/* Deskripsi */}
          <div>
            <label className="text-xs text-zinc-500">Deskripsi</label>
            <input
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Batch */}
          <div>
            <label className="text-xs text-zinc-500">Batch</label>
            <input
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
          </div>

          {/* Qty */}
          <div>
            <label className="text-xs text-zinc-500">Qty</label>
            <input
              type="number"
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              min={0}
            />
          </div>

          {/* Total Qty */}
          <div>
            <label className="text-xs text-zinc-500">Total Qty</label>
            <input
              type="number"
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={totalQty}
              onChange={(e) => setTotalQty(Number(e.target.value))}
              min={0}
            />
          </div>

          {/* Terpakai */}
          <div>
            <label className="text-xs text-zinc-500">Terpakai</label>
            <input
              type="number"
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={used}
              onChange={(e) => setUsed(Number(e.target.value))}
              min={0}
            />
          </div>

          {/* Refill */}
          <div>
            <label className="text-xs text-zinc-500">Refill</label>
            <input
              type="number"
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={refill}
              onChange={(e) => setRefill(Number(e.target.value))}
              min={0}
            />
          </div>

          {/* Keterangan */}
          <div>
            <label className="text-xs text-zinc-500">Keterangan</label>
            <textarea
              className="w-full border px-3 py-2 rounded-lg text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-sm rounded-lg border"
              disabled={saving}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-3 py-2 text-sm rounded-lg bg-zinc-900 text-white disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
