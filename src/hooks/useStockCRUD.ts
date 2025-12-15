"use client";

import { useEffect, useCallback, useState } from "react";
import {
  gasGET,
  gasCreate,
  gasUpdate,
  gasDelete,
} from "@/lib/gas";
import { StockRow } from "@/types/stock";

export function useStockCRUD({ sheet }: { sheet: string }) {
  const [data, setData] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ================= LOAD ================= */
  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await gasGET(sheet);
      setData(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [sheet]);

  useEffect(() => {
    reload();
  }, [reload]);

  /* ================= CREATE ================= */
  const createRow = async (row: StockRow) => {
    await gasCreate({
      sheet,
      NoStok: row.NoStok,
      Deskripsi: row.Deskripsi,
      Batch: row.Batch,
      Qty: row.Qty,
      TERPAKAI: row.TERPAKAI,
      REFILL: row.REFILL,
      KET: row.KET,
    });

    // CREATE wajib reload → ambil No baru dari GAS
    await reload();
  };

  /* ================= UPDATE (OPTIMISTIC) ================= */
  const updateRow = async (row: StockRow) => {
    if (!row.No || row.No === 0) {
      throw new Error("Invalid No for update");
    }

    const prev = data;

    // ⚡ optimistic update
    setData((curr) =>
      curr.map((r) => (r.No === row.No ? { ...row } : r))
    );

    try {
      await gasUpdate({
        sheet,
        No: row.No,
        NoStok: row.NoStok,
        Deskripsi: row.Deskripsi,
        Batch: row.Batch,
        Qty: row.Qty,
        TERPAKAI: row.TERPAKAI,
        REFILL: row.REFILL,
        KET: row.KET,
      });
    } catch (err) {
      // rollback kalau gagal
      setData(prev);
      throw err;
    }
  };

  /* ================= DELETE (OPTIMISTIC) ================= */
  const deleteRow = async (No: number) => {
    const prev = data;

    setData((curr) => curr.filter((r) => r.No !== No));

    try {
      await gasDelete({ sheet, No });
    } catch (err) {
      setData(prev);
      throw err;
    }
  };

  return {
    data,
    loading,
    error,
    reload,
    createRow,
    updateRow,
    deleteRow,
  };
}
