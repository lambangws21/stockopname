"use client";

import {
  gasMutasi,
  gasDuplicate,
  gasDelete,
  GasSheetContext,
} from "@/lib/gas";

/**
 * Hook khusus MUTATION (mutasi, duplicate, delete)
 * Sesuai arsitektur BARU:
 * UI → gas.ts → Route Handler → GAS
 */
export function useStockMutation(
  sheet: string,
  context?: GasSheetContext
) {
  /* ================= MUTASI IN ================= */
  const mutateIn = async (
    No: number,
    qty: number,
    movementReason: "REFILL" | "MOBILISASI_MASUK",
    note: string
  ) => {
    if (!No || qty <= 0) {
      throw new Error("Invalid mutateIn payload");
    }

    const result = await gasMutasi({
      sheet,
      ...context,
      No,
      qty,
      type: "in",
      movementReason,
      note,
    });
    if (result.status === "error") {
      throw new Error(result.message || "Gagal menambah stok");
    }
    return result;
  };

  /* ================= MUTASI OUT ================= */
  const mutateOut = async (
    No: number,
    qty: number,
    movementReason: "OPERASI" | "MOBILISASI_KELUAR",
    note: string
  ) => {
    if (!No || qty <= 0) {
      throw new Error("Invalid mutateOut payload");
    }

    const result = await gasMutasi({
      sheet,
      ...context,
      No,
      qty,
      type: "out",
      movementReason,
      note,
    });
    if (result.status === "error") {
      throw new Error(result.message || "Gagal mengurangi stok");
    }
    return result;
  };

  /* ================= DUPLICATE ================= */
  const duplicateRow = async (No: number) => {
    if (!No) {
      throw new Error("Invalid No for duplicate");
    }

    return gasDuplicate({
      sheet,
      ...context,
      No,
    });
  };

  /* ================= DELETE ================= */
  const deleteRow = async (No: number) => {
    if (!No) {
      throw new Error("Invalid No for delete");
    }

    return gasDelete({
      sheet,
      ...context,
      No,
    });
  };

  return {
    mutateIn,
    mutateOut,
    duplicateRow,
    deleteRow,
  };
}
