"use client";

import { StockRow } from "@/types/stock";
import { useEffect, useState } from "react";
import { useStockMutation } from "@/hooks/useStockMutation";
import type { GasSheetContext } from "@/lib/gas";
import { LoaderCircle } from "lucide-react";

interface DuplicateModalProps {
  open: boolean;
  row: StockRow | null;
  sheet: string;
  context?: GasSheetContext;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DuplicateModal({
  open,
  row,
  sheet,
  context,
  onClose,
  onSuccess,
}: DuplicateModalProps) {
  const { duplicateRow } = useStockMutation(sheet, context);

  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [newRef, setNewRef] = useState("");
  const [newBatch, setNewBatch] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    if (!open) return;
    setNewRef("");
    setNewBatch("");
    setQty(1);
    setErrMsg(null);
  }, [open, row?.No]);

  if (!open || !row) return null;

  const submit = async () => {
    setLoading(true);
    setErrMsg(null);

    try {
      await duplicateRow(row.No, newRef, newBatch, qty);
      onSuccess();
      onClose();
    } catch (err) {
      setErrMsg((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="w-full space-y-4 rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-zinc-900 sm:max-w-md sm:rounded-2xl">

        <h2 className="text-lg font-black">Buat REF / LOT Baru</h2>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Nama, jenis implant, dan brand tetap sama. REF, LOT, dan stok awal dibuat sebagai varian fisik baru.
        </p>

        <div className="text-sm bg-zinc-100 dark:bg-zinc-800 p-3 rounded">
          <div className="font-semibold">{row.Deskripsi}</div>
          <div className="mt-1 text-xs text-zinc-500">Sumber: REF {row.NoStok} · LOT {row.Batch}</div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-bold text-zinc-500">
            REF baru
            <input autoFocus value={newRef} onChange={(event) => setNewRef(event.target.value)} placeholder="Contoh: NMD-002" className="mt-1.5 h-11 w-full rounded-xl border bg-transparent px-3 text-sm font-bold text-zinc-900 dark:text-white" />
          </label>
          <label className="text-[10px] font-bold text-zinc-500">
            LOT / Batch baru
            <input value={newBatch} onChange={(event) => setNewBatch(event.target.value)} placeholder="Contoh: 2608123" className="mt-1.5 h-11 w-full rounded-xl border bg-transparent px-3 text-sm font-bold text-zinc-900 dark:text-white" />
          </label>
          <label className="text-[10px] font-bold text-zinc-500 sm:col-span-2">
            Stok awal
            <input type="number" min={1} value={qty} onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))} className="mt-1.5 h-11 w-full rounded-xl border bg-transparent px-3 text-sm font-bold text-zinc-900 dark:text-white" />
          </label>
        </div>

        <p className="rounded-xl bg-blue-50 p-3 text-[10px] leading-4 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
          Ringkasan “jenis produk” tetap dihitung satu karena nama + brand sama, tetapi stok fisik tetap terlacak per REF dan LOT.
        </p>

        {errMsg && <p className="text-red-500 text-sm">{errMsg}</p>}

        <div className="flex justify-end gap-2 pt-3">
          <button
            className="h-11 rounded-xl border px-4 text-sm"
            onClick={onClose}
            disabled={loading}
          >
            Batal
          </button>

          <button
            className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white disabled:opacity-40"
            onClick={submit}
            disabled={loading || !newRef.trim() || !newBatch.trim() || qty <= 0}
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle size={15} className="animate-spin" />
                Menyalin…
              </span>
            ) : "Buat Varian Baru"}
          </button>
        </div>
      </div>
    </div>
  );
}
