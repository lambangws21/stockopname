"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle } from "lucide-react";
import { StockRow } from "@/types/stock";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/* ================= TYPES ================= */
type Props = {
  open: boolean;
  row: StockRow | null;
  onClose: () => void;
  onSave: (row: StockRow) => Promise<void>;
};

const EMPTY_ROW: StockRow = {
  No: 0,
  NoStok: "",
  Deskripsi: "",
  Batch: "",
  Qty: 0,
  TotalQty: 0,
  TERPAKAI: 0,
  REFILL: 0,
  KET: "",
};

/* ================= COMPONENT ================= */
export default function EditModal({ open, row, onClose, onSave }: Props) {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <ModalContent
          key={row?.No ?? "new"}
          row={row}
          onClose={onClose}
          onSave={onSave}
        />
      </motion.div>
    </AnimatePresence>
  );
}

/* ================= MODAL CONTENT ================= */

function ModalContent({
  row,
  onClose,
  onSave,
}: {
  row: StockRow | null;
  onClose: () => void;
  onSave: (row: StockRow) => Promise<void>;
}) {
  const [form, setForm] = useState<StockRow>(row ? { ...row } : EMPTY_ROW);
  const [step, setStep] = useState<"edit" | "approve">("edit");
  const [saving, setSaving] = useState(false);

  /* ================= DIFF ================= */
  const changes = useMemo(() => {
    if (!row) return [];

    return (Object.keys(form) as (keyof StockRow)[])
      .filter((k) => row[k] !== form[k])
      .map((k) => ({
        key: k,
        before: row[k],
        after: form[k],
      }));
  }, [row, form]);

  /* ================= ACTIONS ================= */
  const handleApprove = async () => {
    try {
      setSaving(true);
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      drag
      dragElastic={0.15}
      dragMomentum={false}
      initial={{ y: 40, opacity: 0, scale: 0.96 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.96 }}
      className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl shadow-2xl"
    >
      {/* HEADER (DRAG HANDLE) */}
      <div className="cursor-move px-5 py-3 border-b flex justify-between items-center">
        <h3 className="font-semibold text-sm">
          {step === "edit"
            ? form.No === 0
              ? "➕ Tambah Data Stock"
              : "✏️ Edit Data Stock"
            : "🛡️ Approval Perubahan"}
        </h3>

        <button onClick={onClose}>
          <X />
        </button>
      </div>

      {/* BODY */}
      <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
        {step === "edit" && (
          <div className="space-y-4">
            <Field
              label="No Stok (REF)"
              value={form.NoStok}
              onChange={(v) => setForm({ ...form, NoStok: v })}
            />
            <Field
              label="Deskripsi"
              value={form.Deskripsi}
              onChange={(v) => setForm({ ...form, Deskripsi: v })}
            />
            <Field
              label="Batch / LOT"
              value={form.Batch}
              onChange={(v) => setForm({ ...form, Batch: v })}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Qty"
                value={form.Qty}
                onChange={(v) => setForm({ ...form, Qty: v })}
              />
              <NumberField
                label="Total Qty"
                value={form.TotalQty}
                onChange={(v) => setForm({ ...form, TotalQty: v })}
              />
              <NumberField
                label="Terpakai"
                value={form.TERPAKAI}
                onChange={(v) => setForm({ ...form, TERPAKAI: v })}
              />
              <NumberField
                label="Refill"
                value={form.REFILL}
                onChange={(v) => setForm({ ...form, REFILL: v })}
              />
            </div>

            <Field
              label="Keterangan"
              value={form.KET}
              onChange={(v) => setForm({ ...form, KET: v })}
            />
          </div>
        )}

        {step === "approve" && (
          <div className="space-y-3 text-sm">
            {changes.length === 0 ? (
              <div className="text-zinc-400 italic">
                Tidak ada perubahan data
              </div>
            ) : (
              changes.map((c) => (
                <div
                  key={String(c.key)}
                  className="flex items-start gap-2 border rounded p-2"
                >
                  <AlertTriangle className="text-yellow-500 mt-0.5" size={16} />
                  <div>
                    <div className="font-medium">{c.key}</div>
                    <div className="text-xs">
                      <span className="line-through text-red-500">
                        {String(c.before)}
                      </span>{" "}
                      →{" "}
                      <span className="text-green-600 font-semibold">
                        {String(c.after)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-5 py-3 border-t flex justify-end gap-2">
        {step === "edit" ? (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => setStep("approve")}
              disabled={changes.length === 0}
            >
              Review Changes
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep("edit")}>
              Back
            </Button>
            <Button
              onClick={handleApprove}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={16} className="mr-1" />
              Approve & Save
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ================= SMALL COMPONENTS ================= */

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
