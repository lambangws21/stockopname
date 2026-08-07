"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StockRow } from "@/types/stock";
import {
  MoreVertical,
  Edit,
  Copy,
  RefreshCcw,
  Trash2,
  Info,
  Search,
  X,
  Boxes,
  QrCode,
  ShieldAlert,
} from "lucide-react";

import MutateModal from "./MutateModal";
import DuplicateModal from "./DuplicateModal";
import DeleteConfirmModal from "./DeleteConfirm";
import type { GasSheetContext } from "@/lib/gas";
import InventoryConditionModal from "./InventoryConditionModal";

export interface RowActionsProps {
  row: StockRow;
  stockRows?: StockRow[];
  sheet: string;
  context?: GasSheetContext;
  onEdit: (row: StockRow) => void;
  onReload: () => Promise<void>;
  showLabel?: boolean;

  /** OPTIONAL — untuk buka detail + history */
  onDetail?: (row: StockRow) => void;
}

export default function RowActions({
  row,
  stockRows,
  sheet,
  context,
  onEdit,
  onReload,
  onDetail,
  showLabel = false,
}: RowActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [mutateOpen, setMutateOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editVariantOpen, setEditVariantOpen] = useState(false);
  const [conditionOpen, setConditionOpen] = useState(false);
  const [variantSearch, setVariantSearch] = useState("");

  const editVariants = useMemo(() => {
    const normalize = (value: unknown) =>
      String(value ?? "").trim().toUpperCase().replace(/\s+/g, " ");
    const candidates = (stockRows?.length ? stockRows : [row]).filter(
      (item) =>
        normalize(item.Deskripsi) === normalize(row.Deskripsi) &&
        normalize(item.Brand) === normalize(row.Brand) &&
        normalize(item.Implant) === normalize(row.Implant)
    );
    const unique = Array.from(
      new Map(candidates.map((item) => [item.No, item])).values()
    );
    const collator = new Intl.Collator("id-ID", {
      numeric: true,
      sensitivity: "base",
    });
    return unique.sort(
      (first, second) =>
        collator.compare(String(first.NoStok || ""), String(second.NoStok || "")) ||
        collator.compare(String(first.Batch || ""), String(second.Batch || ""))
    );
  }, [row, stockRows]);

  const visibleEditVariants = useMemo(() => {
    const query = variantSearch.trim().toLowerCase();
    if (!query) return editVariants;
    return editVariants.filter((item) =>
      [item.NoStok, item.Batch, item.Deskripsi, item.TotalQty]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [editVariants, variantSearch]);

  function startEdit() {
    setMenuOpen(false);
    if (editVariants.length > 1) {
      setVariantSearch("");
      setEditVariantOpen(true);
      return;
    }
    onEdit(editVariants[0] || row);
  }

  useEffect(() => {
    if (!menuOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current?.getBoundingClientRect();
      if (!trigger) return;

      const menuHeight = menuRef.current?.offsetHeight || 210;
      const spaceBelow = window.innerHeight - trigger.bottom;
      const openAbove = spaceBelow < menuHeight + 12 && trigger.top > menuHeight;

      setMenuPosition({
        top: openAbove
          ? Math.max(8, trigger.top - menuHeight - 6)
          : Math.min(window.innerHeight - menuHeight - 8, trigger.bottom + 6),
        right: Math.max(8, window.innerWidth - trigger.right),
      });
    };

    const closeOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("touchstart", closeOnOutsideClick);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("touchstart", closeOnOutsideClick);
    };
  }, [menuOpen]);

  return (
    <div className="relative">
      {/* ACTION BUTTON */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((x) => !x)}
        className={`inline-flex min-h-9 items-center justify-center gap-2 rounded px-3 text-[10px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
          showLabel
            ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            : ""
        }`}
        aria-label="Buka menu tindakan"
        aria-expanded={menuOpen}
      >
        <MoreVertical size={18} />
        {showLabel && <span>Aksi lainnya</span>}
      </button>

      {/* DROPDOWN MENU */}
      {menuOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={menuRef}
          className="fixed w-48 overflow-hidden rounded-xl border bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          style={{
            top: menuPosition.top,
            right: menuPosition.right,
            zIndex: 10000,
          }}
          role="menu"
        >
          {/* DETAIL */}
          {onDetail && (
            <button
              onClick={() => {
                setMenuOpen(false);
                onDetail(row);
              }}
              className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Info size={15} /> Detail & Riwayat
            </button>
          )}

          {/* EDIT */}
          <button
            onClick={startEdit}
            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Edit size={15} /> Edit data
          </button>

          {/* MUTASI */}
          <button
            onClick={() => {
              setMenuOpen(false);
              setMutateOpen(true);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <RefreshCcw size={15} /> Gunakan / Refill / Support
          </button>

          <button
            onClick={() => {
              setMenuOpen(false);
              window.location.assign(`/scanner?ref=${encodeURIComponent(String(row.NoStok || ""))}&lot=${encodeURIComponent(String(row.Batch || ""))}`);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <QrCode size={15} /> Cetak Barcode / QR
          </button>

          {/* DUPLICATE */}
          <button
            onClick={() => {
              setMenuOpen(false);
              setDuplicateOpen(true);
            }}
            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <Copy size={15} /> Duplikat data
          </button>

          {Number(row.TotalQty || 0) > 0 && (
            <button
              onClick={() => { setMenuOpen(false); setConditionOpen(true); }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              <ShieldAlert size={15} /> Karantina / Rusak / Expired
            </button>
          )}

          {/* DELETE */}
          <button
            onClick={() => {
              setMenuOpen(false);
              setDeleteOpen(true);
            }}
            className="w-full px-3 py-2 text-left text-red-600 flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/30"
          >
            <Trash2 size={15} /> Hapus data
          </button>
        </div>,
        document.body,
      )}

      {/* ===== MODALS ===== */}

      {conditionOpen && typeof document !== "undefined" && createPortal(
        <InventoryConditionModal row={row} onClose={() => setConditionOpen(false)} onSuccess={onReload} />,
        document.body,
      )}

      {editVariantOpen && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[11000] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:max-w-xl sm:rounded-3xl">
            <div className="flex items-start gap-3 border-b p-4 sm:p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <Boxes size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black tracking-[.16em] text-blue-600">PILIH DATA FISIK</p>
                <h2 className="text-lg font-black">Pilih REF dan LOT</h2>
                <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{row.Deskripsi}</p>
              </div>
              <button type="button" onClick={() => setEditVariantOpen(false)} className="grid size-10 shrink-0 place-items-center rounded-xl border" aria-label="Tutup pilihan varian">
                <X size={18} />
              </button>
            </div>

            <div className="border-b p-3 sm:px-5">
              <div className="flex h-11 items-center gap-2 rounded-xl border bg-zinc-50 px-3 focus-within:border-blue-500 dark:bg-zinc-800">
                <Search size={17} className="text-zinc-400" />
                <input
                  value={variantSearch}
                  onChange={(event) => setVariantSearch(event.target.value)}
                  placeholder="Cari REF atau LOT..."
                  className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-5">
              {visibleEditVariants.map((variant, index) => {
                const stock = Number(variant.TotalQty || 0);
                return (
                  <button
                    type="button"
                    key={`${variant.No}-${variant.NoStok}-${variant.Batch}`}
                    onClick={() => {
                      setEditVariantOpen(false);
                      onEdit(variant);
                    }}
                    className={`w-full rounded-2xl border p-3 text-left transition hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 ${stock <= 0 ? "border-red-300 bg-red-50/70 dark:bg-red-950/20" : "bg-white dark:bg-zinc-900"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black text-zinc-400">VARIAN {index + 1}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${stock <= 0 ? "bg-red-600 text-white" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"}`}>
                        Stok {stock} pcs
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-zinc-100 p-2.5 dark:bg-zinc-800">
                        <p className="text-[9px] font-bold text-zinc-500">REF</p>
                        <p className="mt-0.5 break-all text-sm font-black">{variant.NoStok || "-"}</p>
                      </div>
                      <div className="rounded-xl bg-zinc-100 p-2.5 dark:bg-zinc-800">
                        <p className="text-[9px] font-bold text-zinc-500">LOT / BATCH</p>
                        <p className="mt-0.5 break-all text-sm font-black">{variant.Batch || "-"}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
              {visibleEditVariants.length === 0 && (
                <div className="py-10 text-center text-sm text-zinc-500">REF atau LOT tidak ditemukan.</div>
              )}
            </div>
            <p className="border-t bg-amber-50 px-4 py-3 text-[11px] font-medium text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
              Hanya varian yang dipilih yang akan diubah. Stok dan riwayat varian lain tetap aman.
            </p>
          </div>
        </div>,
        document.body,
      )}

      {/* Mutasi IN / OUT */}
      <MutateModal
        open={mutateOpen}
        sheet={sheet}
        context={context}
        row={row}
        variants={stockRows}
        onClose={() => setMutateOpen(false)}
        onSuccess={onReload}
      />

      {/* Duplicate */}
      <DuplicateModal
        open={duplicateOpen}
        sheet={sheet}
        context={context}
        row={row}
        onClose={() => setDuplicateOpen(false)}
        onSuccess={onReload}
      />

      {/* Delete */}
      <DeleteConfirmModal
        open={deleteOpen}
        sheet={sheet}
        context={context}
        row={row}
        onClose={() => setDeleteOpen(false)}
        onSuccess={onReload}
      />
    </div>
  );
}
