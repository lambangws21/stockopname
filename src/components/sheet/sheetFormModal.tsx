"use client";

import { useSheetStore } from "./useSheetStore";
import { motion } from "framer-motion";
import { useState, useEffect, startTransition } from "react";
import { PriceItem } from "@/types/priceItem";
import { Button } from "@/components/ui/button";

export function SheetFormModal() {
  const { isFormOpen, editItem, closeModals, createData, updateData } =
    useSheetStore();

  const [form, setForm] = useState<PriceItem>({
    no: 0,
    rumahSakit: "",
    system: "",
    product: "",
    type: "",
    qty: 1,
    hargaNett: 0,
    hargaNettPPN: 0,
  });

  useEffect(() => {
    if (!editItem) return;
    startTransition(() => {
      setForm(editItem);
    });
  }, [editItem]);

  if (!isFormOpen) return null;

  const submit = async () => {
    if (editItem) await updateData(form);
    else await createData(form);
    closeModals();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="bg-white p-6 rounded-lg w-full max-w-md space-y-4"
      >
        <h2 className="text-xl font-bold">
          {editItem ? "Edit Data Harga" : "Tambah Data Harga"}
        </h2>

        <div className="space-y-3">
          <input
            className="w-full border p-2 rounded"
            placeholder="Rumah Sakit"
            value={form.rumahSakit}
            onChange={(e) =>
              setForm({ ...form, rumahSakit: e.target.value })
            }
          />

          <input
            className="w-full border p-2 rounded"
            placeholder="System"
            value={form.system}
            onChange={(e) =>
              setForm({ ...form, system: e.target.value })
            }
          />

          <input
            className="w-full border p-2 rounded"
            placeholder="Product"
            value={form.product}
            onChange={(e) =>
              setForm({ ...form, product: e.target.value })
            }
          />

          <input
            className="w-full border p-2 rounded"
            placeholder="Type"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value })
            }
          />

          <input
            type="number"
            className="w-full border p-2 rounded"
            placeholder="Qty"
            value={form.qty}
            onChange={(e) =>
              setForm({ ...form, qty: Number(e.target.value) })
            }
          />

          <input
            type="number"
            className="w-full border p-2 rounded"
            placeholder="Harga Nett"
            value={form.hargaNett}
            onChange={(e) =>
              setForm({ ...form, hargaNett: Number(e.target.value) })
            }
          />

          <input
            type="number"
            className="w-full border p-2 rounded"
            placeholder="Harga Nett + PPN"
            value={form.hargaNettPPN}
            onChange={(e) =>
              setForm({ ...form, hargaNettPPN: Number(e.target.value) })
            }
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="secondary" onClick={closeModals}>
            Cancel
          </Button>
          <Button onClick={submit}>Save</Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
