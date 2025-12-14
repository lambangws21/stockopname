"use client";

import { useState } from "react";
import Scanner from "./Scanner";
import { RawPriceRow } from "@/types/implant-stock";

interface Props {
  open: boolean;
  data?: RawPriceRow | null;
  onClose: () => void;
  onSaved: () => void;
}

export function StockModal({ open, data, onClose, onSaved }: Props) {
  const isEdit = !!data;

  const [form, setForm] = useState<RawPriceRow>({
    No: data?.No ?? "",
    NoStok: data?.NoStok ?? "",
    Deskripsi: data?.Deskripsi ?? "",
    Batch: data?.Batch ?? "",
    Qty: data?.Qty ?? "",
    TotalQty: data?.TotalQty ?? "",
    TERPAKAI: data?.TERPAKAI ?? "",
    REFILL: data?.REFILL ?? "",
    KET: data?.KET ?? "",
  });

  const handleChange = (k: keyof RawPriceRow, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  const save = async () => {
    await fetch("/api/super-sheet", {
      method: isEdit ? "PUT" : "POST",
      body: JSON.stringify(form),
    });

    onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl w-[95%] md:w-[450px] shadow-xl space-y-3">

        <h2 className="text-lg font-bold">
          {isEdit ? "Edit Data" : "Tambah Data"}
        </h2>

        {/* Input fields */}
        {(
          [
            ["NoStok", "No Stock"],
            ["Deskripsi", "Deskripsi"],
            ["Batch", "Batch"],
            ["Qty", "Qty"],
            ["TERPAKAI", "Terpakai"],
            ["REFILL", "Refill"],
            ["KET", "Keterangan"],
          ] as [keyof RawPriceRow, string][]
        ).map(([key, label]) => (
          <input
            key={key}
            value={form[key] ?? ""}
            onChange={(e) => handleChange(key, e.target.value)}
            placeholder={label}
            className="w-full px-3 py-2 border rounded-lg dark:bg-zinc-800"
          />
        ))}

        {/* SCANNER */}
        <Scanner
          onDetected={(scan) => {
            handleChange("NoStok", scan.ref);
            handleChange("Batch", scan.lot);
            handleChange("KET", scan.exp ?? "");
          }}
        />

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-zinc-300">
            Batal
          </button>

          <button
            onClick={save}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
