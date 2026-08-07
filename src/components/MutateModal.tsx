"use client";

import { useEffect, useMemo, useState } from "react";
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
import { isSupportCenterStock } from "@/lib/stockStatus";

type MovementReason =
  | "REFILL"
  | "OPERASI"
  | "MOBILISASI_KELUAR"
  | "MOBILISASI_MASUK";

interface MutateModalProps {
  open: boolean;
  row: StockRow | null;
  variants?: StockRow[];
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
  row: initialRow,
  variants = [],
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
  const [doctor, setDoctor] = useState("");
  const [operationDate, setOperationDate] = useState("");
  const [procedure, setProcedure] = useState("");
  const [hospital, setHospital] = useState("");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [selectedRowNo, setSelectedRowNo] = useState(0);
  const [identityEditorOpen, setIdentityEditorOpen] = useState(false);
  const [identitySearch, setIdentitySearch] = useState("");

  useEffect(() => {
    if (!open || !initialRow) return;
    setSelectedRowNo(initialRow.No);
    setIdentityEditorOpen(false);
    setIdentitySearch("");
  }, [initialRow, open]);

  const activeRow =
    variants.find((item) => item.No === selectedRowNo) || initialRow;
  const matchingVariants = useMemo(() => {
    if (!initialRow) return [];
    const normalize = (value: unknown) =>
      String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
    const initialBrand = normalize(initialRow.Brand);
    const initialImplant = normalize(initialRow.Implant);
    const initialDescription = normalize(initialRow.Deskripsi);
    const matches = variants.filter((item) => {
      const sameBrand = normalize(item.Brand) === initialBrand;
      const sameCategory = normalize(item.Implant) === initialImplant;
      const sameDescription = normalize(item.Deskripsi) === initialDescription;
      return sameBrand && (sameCategory || sameDescription);
    });
    const collator = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" });
    return (matches.length ? matches : [initialRow]).sort(
      (first, second) =>
        collator.compare(String(first.Deskripsi || ""), String(second.Deskripsi || "")) ||
        collator.compare(String(first.NoStok || ""), String(second.NoStok || "")) ||
        collator.compare(String(first.Batch || ""), String(second.Batch || ""))
    );
  }, [initialRow, variants]);
  const visibleIdentityVariants = useMemo(() => {
    const query = identitySearch.trim().toLowerCase();
    if (!query) return matchingVariants;
    return matchingVariants.filter((item) =>
      [item.NoStok, item.Batch, item.Deskripsi, item.Implant]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [identitySearch, matchingVariants]);

  if (!open || !activeRow) return null;
  const row = activeRow;

  const selectedAction = ACTIONS.find(
    (action) => action.reason === selectedReason
  );
  const isStockIn =
    selectedReason === "REFILL" || selectedReason === "MOBILISASI_MASUK";
  const supportPusat = isSupportCenterStock(row);
  const changesOfficeStock = !supportPusat;
  const nextStock = !changesOfficeStock
    ? row.TotalQty
    : isStockIn
    ? row.TotalQty + qty
    : Math.max(0, row.TotalQty - qty);

  const reset = () => {
    setSelectedReason(null);
    setQty(1);
    setNote("");
    setDoctor("");
    setOperationDate("");
    setProcedure("");
    setHospital("");
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
    if (!isStockIn && changesOfficeStock && qty > row.TotalQty) {
      setErrMsg("Jumlah melebihi stok yang tersedia");
      return;
    }

    if (
      selectedReason === "OPERASI" &&
      (!doctor.trim() || !operationDate || !procedure || !hospital.trim())
    ) {
      setErrMsg("Dokter, tanggal, jenis tindakan, dan rumah sakit wajib diisi");
      return;
    }

    const isBranchMovement = selectedReason.includes("MOBILISASI");
    if (isBranchMovement && !note.trim()) {
      setErrMsg("Tuliskan nama cabang tujuan atau asal");
      return;
    }

    const safeNote =
      selectedReason === "OPERASI"
        ? [
            supportPusat ? "SUPPORT PUSAT" : "STOK OFFICE",
            `Dokter: ${doctor.trim()}`,
            `Tanggal: ${operationDate}`,
            `Tindakan: ${procedure}`,
            `RS: ${hospital.trim()}`,
            note.trim(),
          ]
            .filter(Boolean)
            .join(" • ")
        : selectedReason === "MOBILISASI_KELUAR"
          ? `Support luar cabang • Tujuan: ${note.trim()}`
          : selectedReason === "MOBILISASI_MASUK"
            ? `Kembali dari luar cabang • Asal: ${note.trim()}`
            : note.trim() || "Refill stok";

    setLoading(true);
    setErrMsg(null);

    try {
      if (isStockIn) {
        await mutateIn(
          row.No,
          qty,
          selectedReason as "REFILL" | "MOBILISASI_MASUK",
          safeNote,
          row.NoStok,
          row.Batch
        );
      } else {
        await mutateOut(
          row.No,
          qty,
          selectedReason as "OPERASI" | "MOBILISASI_KELUAR",
          safeNote,
          row.NoStok,
          row.Batch
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
      <div className="max-h-[100dvh] w-full overflow-y-auto rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-zinc-900 sm:max-h-[92vh] sm:max-w-lg sm:rounded-3xl sm:pb-0">
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
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
                Identitas stok yang diproses
              </p>
              {matchingVariants.length > 0 && (
                <button type="button" onClick={() => setIdentityEditorOpen((value) => !value)} className="rounded-lg border bg-white px-2 py-1 text-[8px] font-black text-blue-700 dark:bg-zinc-900 dark:text-blue-300">
                  {identityEditorOpen ? "Selesai" : "Edit REF / LOT"}
                </button>
              )}
            </div>
            <div className="mt-1.5 text-sm font-black leading-5 sm:text-base">{row.Deskripsi}</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-blue-200 bg-white px-3 py-2.5 dark:border-blue-900 dark:bg-zinc-900">
                <span className="block text-[8px] font-black uppercase tracking-wide text-zinc-400">Nomor REF</span>
                <b className="mt-1 block break-all text-sm text-blue-700 dark:text-blue-300">{row.NoStok || "-"}</b>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white px-3 py-2.5 dark:border-amber-900 dark:bg-zinc-900">
                <span className="block text-[8px] font-black uppercase tracking-wide text-zinc-400">LOT / Batch</span>
                <b className="mt-1 block break-all text-sm text-amber-700 dark:text-amber-300">{row.Batch || "-"}</b>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="rounded-lg bg-white px-2 py-1 font-black text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-white">
                Stok {row.TotalQty} pcs
              </span>
              <span
                className={`rounded-lg px-2 py-1 font-bold ${
                  supportPusat
                    ? "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                }`}
              >
                {supportPusat ? "Support Pusat" : "Stok Office"}
              </span>
            </div>
            {identityEditorOpen && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <p className="text-[9px] font-bold leading-4 text-zinc-500">
                  Pilih REF dan LOT fisik yang benar. Daftar dibatasi pada brand dan kategori implant yang sama.
                </p>
                <input
                  value={identitySearch}
                  onChange={(event) => setIdentitySearch(event.target.value)}
                  placeholder="Cari REF, LOT, ukuran, atau nama..."
                  className="h-10 w-full rounded-xl border bg-white px-3 text-xs outline-none focus:border-blue-500 dark:bg-zinc-900"
                />
                <div className="max-h-52 space-y-2 overflow-y-auto">
                  {visibleIdentityVariants.map((variant) => {
                    const selected = variant.No === row.No;
                    return (
                      <button
                        key={`${variant.No}-${variant.NoStok}-${variant.Batch}`}
                        type="button"
                        onClick={() => {
                          setSelectedRowNo(variant.No);
                          setIdentityEditorOpen(false);
                          setIdentitySearch("");
                          setQty(1);
                          setErrMsg(null);
                        }}
                        className={`flex w-full items-center gap-2 rounded-xl border p-2.5 text-left ${selected ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "bg-white dark:bg-zinc-900"}`}
                      >
                        <span className="min-w-0 flex-1">
                          <b className="block text-[10px] text-blue-700 dark:text-blue-300">REF {variant.NoStok || "-"}</b>
                          <span className="mt-0.5 block text-[9px] font-bold text-amber-700 dark:text-amber-300">LOT {variant.Batch || "-"}</span>
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-[9px] font-black dark:bg-zinc-800">Stok {variant.TotalQty}</span>
                      </button>
                    );
                  })}
                  {visibleIdentityVariants.length === 0 && (
                    <p className="rounded-xl border border-dashed p-5 text-center text-[10px] text-zinc-500">
                      REF atau LOT tidak ditemukan pada kategori ini.
                    </p>
                  )}
                </div>
              </div>
            )}
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
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-current/15 pt-2.5 text-[9px] font-black">
                  <span className="rounded-md bg-white/75 px-2 py-1 dark:bg-zinc-900/60">REF {row.NoStok || "-"}</span>
                  <span className="rounded-md bg-white/75 px-2 py-1 dark:bg-zinc-900/60">LOT {row.Batch || "-"}</span>
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
                    max={isStockIn || supportPusat ? undefined : row.TotalQty}
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
                    {supportPusat ? "Stok office tetap" : "Setelah disimpan"}
                  </div>
                  <div
                    className={`text-xl font-black ${
                      supportPusat
                        ? "text-violet-600"
                        : isStockIn
                        ? "text-emerald-600"
                        : "text-rose-600"
                    }`}
                  >
                    {nextStock}
                  </div>
                </div>
              </div>

              {!supportPusat && !isStockIn && nextStock === 0 && (
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

              {selectedReason === "OPERASI" && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    Dokter
                    <input
                      value={doctor}
                      onChange={(event) => setDoctor(event.target.value)}
                      placeholder="Nama dokter operator"
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal dark:bg-zinc-800"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Tanggal tindakan
                    <input
                      type="date"
                      value={operationDate}
                      onChange={(event) => setOperationDate(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal dark:bg-zinc-800"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    Jenis tindakan
                    <select
                      value={procedure}
                      onChange={(event) => setProcedure(event.target.value)}
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal dark:bg-zinc-800"
                    >
                      <option value="">Pilih tindakan</option>
                      <option value="TKR">TKR</option>
                      <option value="THR">THR</option>
                      <option value="BIPOLAR">Bipolar</option>
                      <option value="LAINNYA">Lainnya</option>
                    </select>
                  </label>
                  <label className="text-sm font-semibold">
                    Rumah sakit
                    <input
                      value={hospital}
                      onChange={(event) => setHospital(event.target.value)}
                      placeholder="Nama rumah sakit"
                      className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-normal dark:bg-zinc-800"
                    />
                  </label>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-semibold">
                  {selectedReason === "MOBILISASI_KELUAR"
                    ? "Tujuan support luar cabang"
                    : selectedReason === "MOBILISASI_MASUK"
                    ? "Asal pengembalian cabang"
                    : selectedReason === "OPERASI"
                    ? "Catatan tambahan (opsional)"
                    : "Keterangan (opsional)"}
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={
                    selectedReason === "MOBILISASI_KELUAR"
                      ? "Contoh: Jawa Tengah, Jakarta, atau Cabang Surabaya"
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
