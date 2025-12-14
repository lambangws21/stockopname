"use client";

import { useSheetStore } from "./useSheetStore";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function SheetDeleteModal() {
  const { isDeleteOpen, deleteId, closeModals, deleteData } = useSheetStore();

  if (!isDeleteOpen) return null;

  const confirm = async () => {
    if (deleteId) await deleteData(deleteId);
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
        className="bg-white p-6 rounded-lg w-full max-w-sm text-center space-y-4"
      >
        <h2 className="text-xl font-semibold">
          Hapus data No {deleteId}?
        </h2>

        <p className="text-gray-500">Data akan dihapus permanen.</p>

        <div className="flex justify-center space-x-3">
          <Button variant="secondary" onClick={closeModals}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={confirm}>
            Delete
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
