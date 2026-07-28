"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  PackagePlus,
  RotateCcw,
  Stethoscope,
  X,
  LoaderCircle,
  AlertTriangle,
} from "lucide-react";
import { StockRow } from "@/types/stock";
import { useStockMutation } from "@/hooks/useStockMutation";
import type { GasSheetContext } from "@/lib/gas";

type MovementReason =
  | "REFILL"
  | "OPERASI"
  | "MOBILISASI_KELUAR"
  | "MOBILISASI_MASUK";

interface MutateModalProps {
  open: boolean;
  row: StockRow | null;
  sheet: string;
  context?: GasSheetContext;
  onClose: () => void;
  onSuccess: () => void;
}

const ACTIONS: Array<{
  reason: MovementReason;
  label: string;
  description: string;
  icon: typeof Stethoscope;
  color: string;
}> = [
  {
    reason: "OPERASI",
    label: "Terpakai Operasi",
    description: "Kurangi stok dan catat sebagai terpakai",
    icon: Stethoscope,
    color: "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-400 dark:bg-rose-950/30",
  },
  {
    reason: "REFILL",
    label: "Refill Stok",
    description: "Tambah stok dari gudang/pusat",
    icon: PackagePlus,
    color: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 dark:bg-emerald-950/30",
  },
  {
    reason: "MOBILISASI_KELUAR",
    label: "Support Cabang",
    description: "Kirim implant ke cabang lain",
    icon: Building2,
    color: "border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 dark:bg-amber-950/30",
  },
  {
    reason: "MOBILISASI_MASUK",
    label: "Kembali dari Cabang",
    description: "Tambahkan implant yang dikembalikan",
    icon: RotateCcw,
    color: "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-400 dark:bg-blue-950/30",
  },
];

export default function MutateModal({
  open,
  row,
  sheet,
  context,
  onClose,
  onSuccess,
}: MutateModalProps) {
  const { mutateIn, mutateOut } = useStockMutation(sheet, context);
  const [selectedReason, setSelectedReason] =
    useState<MovementReason | null>(null);
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  if (!open || !row) return null;

  const selectedAction = ACTIONS.find(
    (action) => action.reason === selectedReason
  );
  const isStockIn =
    selectedReason === "REFILL" || selectedReason === "MOBILISASI_MASUK";
  const nextStock = isStockIn
    ? row.TotalQty + qty
    : Math.max(0, row.TotalQty - qty);

  const reset = () => {
    setSelectedReason(null);
    setQty(1);
    setNote("");
    setErrMsg(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const selectAction = (reason: MovementReason) => {
    setSelectedReason(reason);
    setQty(1);
    setNote("");
    setErrMsg(null);
  };

  const submit = async () => {
    if (!selectedReason) return;
    if (qty <= 0) {
      setErrMsg("Jumlah minimal 1");
      return;
    }
    if (!isStockIn && qty > row.TotalQty) {
      setErrMsg("Jumlah melebihi stok yang tersedia");
      return;
    }

    const isBranchMovement = selectedReason.includes("MOBILISASI");
    if (isBranchMovement && !note.trim()) {
      setErrMsg("Tuliskan nama cabang tujuan atau asal");
      return;
    }

    const safeNote =
      note.trim() ||
      (selectedReason === "OPERASI"
        ? "Terpakai untuk operasi"
        : "Refill stok");

    setLoading(true);
    setErrMsg(null);

    try {
      if (isStockIn) {
        await mutateIn(
          row.No,
          qty,
          selectedReason as "REFILL" | "MOBILISASI_MASUK",
          safeNote
        );
      } else {
        await mutateOut(
          row.No,
          qty,
          selectedReason as "OPERASI" | "MOBILISASI_KELUAR",
          safeNote
        );
      }

      await onSuccess();
      close();
    } catch (error) {
      setErrMsg(
        error instanceof Error ? error.message : "Pergerakan stok gagal"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20">
          <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold shadow-xl dark:bg-zinc-900">
            <LoaderCircle size={19} className="animate-spin text-blue-600" />
            Menyimpan pergerakan…
          </div>
        </div>
      )}
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:max-w-lg sm:rounded-3xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white/95 px-4 py-3 backdrop-blur dark:bg-zinc-900/95">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-blue-600">
              {selectedReason ? "Langkah 2 dari 2" : "Langkah 1 dari 2"}
            </div>
            <h2 className="font-bold">Pergerakan Implant</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full border p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="rounded-2xl bg-zinc-100 p-3 dark:bg-zinc-800">
            <div className="font-semibold">{row.Deskripsi}</div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-500">
              <span>REF {row.NoStok || "-"}</span>
              <span>Batch {row.Batch || "-"}</span>
              <span className="font-bold text-zinc-900 dark:text-white">
                Stok {row.TotalQty}
              </span>
            </div>
          </div>

          {!selectedReason ? (
            <>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Apa yang terjadi pada implant ini?
              </p>
              <div className="grid grid-cols-2 gap-2.5">
                {ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      type="button"
                      key={action.reason}
                      onClick={() => selectAction(action.reason)}
                      className={`min-h-32 rounded-2xl border p-3 text-left transition active:scale-[0.98] ${action.color}`}
                    >
                      <Icon size={24} />
                      <div className="mt-3 text-sm font-bold">{action.label}</div>
                      <div className="mt-1 text-[11px] leading-relaxed opacity-80">
                        {action.description}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              >
                <ArrowLeft size={14} /> Ganti tindakan
              </button>

              <div className={`rounded-2xl border p-3 ${selectedAction?.color}`}>
                <div className="font-bold">{selectedAction?.label}</div>
                <div className="text-xs opacity-80">
                  {selectedAction?.description}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  Jumlah implant
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="h-11 w-11 rounded-xl border text-xl"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={isStockIn ? undefined : row.TotalQty}
                    value={qty}
                    onChange={(event) =>
                      setQty(Math.max(1, Number(event.target.value) || 1))
                    }
                    className="h-11 min-w-0 flex-1 rounded-xl border text-center text-lg font-bold dark:bg-zinc-800"
                  />
                  <button
                    type="button"
                    onClick={() => setQty(qty + 1)}
                    className="h-11 w-11 rounded-xl border text-xl"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl bg-zinc-100 p-3 text-center dark:bg-zinc-800">
                <div>
                  <div className="text-[10px] uppercase text-zinc-500">
                    Stok sekarang
                  </div>
                  <div className="text-xl font-black">{row.TotalQty}</div>
                </div>
                <div className="text-zinc-400">→</div>
                <div>
                  <div className="text-[10px] uppercase text-zinc-500">
                    Setelah disimpan
                  </div>
                  <div
                    className={`text-xl font-black ${
                      isStockIn ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {nextStock}
                  </div>
                </div>
              </div>

              {!isStockIn && nextStock === 0 && (
                <div className="flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Stok akan habis</p>
                    <p className="mt-0.5 text-xs leading-5">
                      Setelah disimpan, implant ini tidak memiliki stok tersisa.
                      Sistem akan menambahkan note warning agar segera dilakukan refill.
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  {selectedReason.includes("MOBILISASI")
                    ? "Cabang tujuan/asal"
                    : "Keterangan (opsional)"}
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={
                    selectedReason === "MOBILISASI_KELUAR"
                      ? "Contoh: Cabang Surabaya"
                      : selectedReason === "MOBILISASI_MASUK"
                      ? "Contoh: Kembali dari Cabang Makassar"
                      : selectedReason === "OPERASI"
                      ? "Contoh: Operasi TKR RS ABC"
                      : "Contoh: Refill gudang pusat"
                  }
                  className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-zinc-800"
                />
              </div>

              {errMsg && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/30">
                  {errMsg}
                </div>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-500 disabled:opacity-50"
              >
                <Check size={18} />
                {loading ? "Menyimpan..." : `Simpan ${selectedAction?.label}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
