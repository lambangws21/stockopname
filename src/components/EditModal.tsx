"use client";

import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertTriangle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";

import { StockRow } from "@/types/stock";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  STOCK_IMPLANT_CATEGORY_LABELS,
  STOCK_PROCEDURE_CATEGORIES,
  STOCK_COMPONENT_CATEGORIES,
} from "@/lib/stockCategories";

function toSafeNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(/\s+/g, "")
      .replace(/\.(?=\d{3}(?:\D|$))/g, "")
      .replace(/,(?=\d{3}(?:\D|$))/g, "")
      .replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeRow(row: StockRow | null): StockRow {
  const source = row || EMPTY_ROW;
  const latestKet =
    String(source.KET ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .at(-1) || "";
  return {
    No: toSafeNumber(source.No),
    NoStok: String(source.NoStok ?? ""),
    Deskripsi: String(source.Deskripsi ?? ""),
    Implant: source.Implant ?? "",
    Brand: source.Brand ?? "",
    Batch: String(source.Batch ?? ""),
    Qty: toSafeNumber(source.Qty),
    TotalQty: toSafeNumber(source.TotalQty),
    TERPAKAI: toSafeNumber(source.TERPAKAI),
    REFILL: toSafeNumber(source.REFILL),
    KET: latestKet,
  };
}

/* ================= TYPES ================= */
type Props = {
  open: boolean;
  row: StockRow | null;
  onClose: () => void;
  onSave: (row: StockRow) => Promise<void>;
  onMovement?: (row: StockRow) => void;
};

const EMPTY_ROW: StockRow = {
  No: 0,
  NoStok: "",
  Deskripsi: "",
  Implant: "",
  Brand: "",
  Batch: "",
  Qty: 0,
  TotalQty: 0,
  TERPAKAI: 0,
  REFILL: 0,
  KET: "",
};

/* ================= ROOT ================= */
export default function EditModal({
  open,
  row,
  onClose,
  onSave,
  onMovement,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-9999 bg-black/40 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <ModalContent
            key={row?.No ?? "new"}
            row={row}
            onClose={onClose}
            onSave={onSave}
            onMovement={onMovement}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ================= MODAL CONTENT ================= */
function ModalContent({
  row,
  onClose,
  onSave,
  onMovement,
}: {
  row: StockRow | null;
  onClose: () => void;
  onSave: (row: StockRow) => Promise<void>;
  onMovement?: (row: StockRow) => void;
}) {
  const isCreate = !row || row.No === 0;

  const [form, setForm] = useState<StockRow>(normalizeRow(row));
  const [step, setStep] = useState<"edit" | "approve">("edit");
  const [saving, setSaving] = useState(false);
  const [shake, setShake] = useState(false);

  /* ================= AUTO CALC ================= */
  const calculatedTotalQty = toSafeNumber(form.Qty);

  useEffect(() => {
    if (form.TotalQty !== calculatedTotalQty) {
      setForm((f) => ({ ...f, TotalQty: toSafeNumber(calculatedTotalQty) }));
    }
  }, [calculatedTotalQty, form.TotalQty]);

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

  /* ================= VALIDATION ================= */
  const validateForm = () => {
    // ⬅️ SEKARANG BOLEH KOSONG
    return null;
  };

  /* ================= SAVE ================= */
  const handleSave = async () => {
    const error = validateForm();

    if (error) {
      toast.error(error);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    const t = toast.loading("Menyimpan data...");

    try {
      setSaving(true);
      await onSave(form);

      toast.success(
        isCreate
          ? "Data stock berhasil ditambahkan"
          : "Data stock berhasil diperbarui",
        { id: t }
      );

      onClose();
    } catch {
      toast.error("Gagal menyimpan data", { id: t });
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
      animate={
        shake
          ? { x: [-10, 10, -8, 8, -4, 4, 0], opacity: 1, scale: 1 }
          : { x: 0, opacity: 1, scale: 1 }
      }
      transition={{ duration: 0.35 }}
      exit={{ y: 40, opacity: 0, scale: 0.96 }}
      className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-xl shadow-2xl"
    >
      {/* HEADER */}
      <div className="cursor-move px-5 py-3 border-b flex justify-between items-center">
        <h3 className="font-semibold text-sm">
          {isCreate
            ? "➕ Tambah Data Stock"
            : step === "edit"
            ? "✏️ Edit Data Stock"
            : "🛡️ Approval Perubahan"}
        </h3>
        <button onClick={onClose}>
          <X />
        </button>
      </div>

      {/* BODY */}
      <div className="px-5 py-4 max-h-[65vh] overflow-y-auto space-y-4">
        {step === "edit" && (
          <>
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

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Implant"
                value={form.Implant}
                options={[
                  ...STOCK_PROCEDURE_CATEGORIES.map((category) => ({
                    value: category,
                    label: STOCK_IMPLANT_CATEGORY_LABELS[category],
                    group: "Tindakan utama",
                  })),
                  ...STOCK_COMPONENT_CATEGORIES.map((category) => ({
                    value: category,
                    label: STOCK_IMPLANT_CATEGORY_LABELS[category],
                    group: "Komponen implant",
                  })),
                ]}
                onChange={(v) =>
                  setForm({
                    ...form,
                    Implant: v as StockRow["Implant"],
                  })
                }
              />
              <SelectField
                label="Brand"
                value={form.Brand}
                options={["ZIMMER", "NORMMED"]}
                onChange={(v) =>
                  setForm({
                    ...form,
                    Brand: v as StockRow["Brand"],
                  })
                }
              />
            </div>

            <Field
              label="Batch / LOT"
              value={form.Batch}
              onChange={(v) => setForm({ ...form, Batch: v })}
            />

            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Qty / Stok Aktual"
                value={form.Qty}
                onChange={(v) => setForm({ ...form, Qty: v })}
              />
              <NumberField
                label="Terpakai"
                value={form.TERPAKAI}
                onChange={(v) =>
                  setForm({ ...form, TERPAKAI: v })
                }
              />
              <NumberField
                label="Refill"
                value={form.REFILL}
                onChange={(v) => setForm({ ...form, REFILL: v })}
              />

              <div className="space-y-1">
                <Label>Total Qty (Mengikuti Qty)</Label>
                <Input value={toSafeNumber(form.TotalQty)} disabled />
              </div>
            </div>

            <Field
              label="Keterangan"
              value={form.KET}
              onChange={(v) => setForm({ ...form, KET: v })}
            />
          </>
        )}

        {step === "approve" && (
          <div className="space-y-3 text-sm">
            {changes.map((c) => (
              <div
                key={String(c.key)}
                className="flex items-start gap-2 border rounded p-2"
              >
                <AlertTriangle size={16} className="text-yellow-500 mt-0.5" />
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
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="flex flex-wrap justify-end gap-2 border-t px-5 py-3">
        {step === "edit" ? (
          <>
            {!isCreate && onMovement ? (
              <Button
                variant="outline"
                className="mr-auto w-full border-blue-200 text-blue-700 hover:bg-blue-50 sm:w-auto"
                onClick={() => {
                  onClose();
                  onMovement(row || form);
                }}
              >
                <RefreshCcw size={15} className="mr-1.5" />
                Pergerakan Stok
              </Button>
            ) : null}
            <Button variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              onClick={() => (isCreate ? handleSave() : setStep("approve"))}
            >
              {isCreate ? "Simpan" : "Review Perubahan"}
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" onClick={() => setStep("edit")}>
              Kembali
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={16} className="mr-1" />
              {saving ? "Menyimpan..." : "Setujui & Simpan"}
            </Button>
          </>
        )}
      </div>
    </motion.div>
  );
}

/* ================= FIELDS ================= */

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

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<
    string | { value: string; label: string; group?: string }
  >;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
      >
        <option value="">Pilih {label}</option>
        {Array.from(
          new Set(
            options
              .filter(
                (
                  option
                ): option is {
                  value: string;
                  label: string;
                  group?: string;
                } => typeof option !== "string" && Boolean(option.group)
              )
              .map((option) => option.group as string)
          )
        ).length > 0
          ? Array.from(
              new Set(
                options
                  .filter(
                    (option): option is {
                      value: string;
                      label: string;
                      group?: string;
                    } => typeof option !== "string"
                  )
                  .map((option) => option.group || "")
              )
            ).map((group) => (
              <optgroup key={group} label={group}>
                {options
                  .filter(
                    (option): option is {
                      value: string;
                      label: string;
                      group?: string;
                    } =>
                      typeof option !== "string" &&
                      (option.group || "") === group
                  )
                  .map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </optgroup>
            ))
          : options.map((option) => {
          const optionValue =
            typeof option === "string" ? option : option.value;
          const optionLabel =
            typeof option === "string" ? option : option.label;
          return (
            <option key={optionValue} value={optionValue}>
              {optionLabel}
            </option>
          );
        })}
      </select>
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
        value={toSafeNumber(value)}
        onChange={(e) => onChange(toSafeNumber(e.target.value))}
      />
    </div>
  );
}
