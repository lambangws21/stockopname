"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StockRow } from "@/types/stock";
import {
  MoreVertical,
  Edit,
  Copy,
  RefreshCcw,
  Trash2,
  Info,
} from "lucide-react";

import MutateModal from "./MutateModal";
import DuplicateModal from "./DuplicateModal";
import DeleteConfirmModal from "./DeleteConfirm";
import type { GasSheetContext } from "@/lib/gas";

export interface RowActionsProps {
  row: StockRow;
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
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded px-3 text-[11px] font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
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
            onClick={() => {
              setMenuOpen(false);
              onEdit(row);
            }}
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
            <RefreshCcw size={15} /> Terpakai / Refill / Support
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

      {/* Mutasi IN / OUT */}
      <MutateModal
        open={mutateOpen}
        sheet={sheet}
        context={context}
        row={row}
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
