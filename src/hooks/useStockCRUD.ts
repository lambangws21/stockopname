"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import {
  gasGETWithContext,
  gasCreate,
  gasUpdate,
  gasDelete,
  GasSheetContext,
} from "@/lib/gas";
import { StockRow } from "@/types/stock";

type UseStockCRUDParams = {
  sheet: string;
  context?: GasSheetContext;
  pollIntervalMs?: number;
  onRemoteChange?: () => void;
};

type ReloadOptions = {
  silent?: boolean;
  source?: "manual" | "poll" | "local";
};

function buildSignature(rows: StockRow[]) {
  return JSON.stringify(
    rows.map((r) => [
      r.No,
      r.NoStok,
      r.Deskripsi,
      r.Batch,
      r.Qty,
      r.TotalQty,
      r.TERPAKAI,
      r.REFILL,
      r.KET,
    ])
  );
}

export function useStockCRUD({
  sheet,
  context,
  pollIntervalMs = 0,
  onRemoteChange,
}: UseStockCRUDParams) {
  const [data, setData] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const signatureRef = useRef("");
  const localMutationRef = useRef(false);

  /* ================= LOAD ================= */
  const reloadWithOptions = useCallback(async (options?: ReloadOptions) => {
    const opts = options || {};
    const silent = Boolean(opts.silent);
    const source = opts.source || "manual";

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const res = await gasGETWithContext(sheet, context);
      const rows = res.data ?? [];
      const nextSignature = buildSignature(rows);
      const hasChanged =
        initializedRef.current && signatureRef.current !== nextSignature;

      if (
        source === "poll" &&
        hasChanged &&
        !localMutationRef.current &&
        onRemoteChange
      ) {
        onRemoteChange();
      }

      signatureRef.current = nextSignature;
      initializedRef.current = true;
      setData(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      if (!initializedRef.current) {
        setData([]);
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [sheet, context, onRemoteChange]);

  const reload = useCallback(async () => {
    await reloadWithOptions({ source: "manual" });
  }, [reloadWithOptions]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (pollIntervalMs <= 0) return;

    const id = window.setInterval(() => {
      void reloadWithOptions({ silent: true, source: "poll" });
    }, pollIntervalMs);

    return () => window.clearInterval(id);
  }, [pollIntervalMs, reloadWithOptions]);

  /* ================= CREATE ================= */
  const createRow = async (row: StockRow) => {
    localMutationRef.current = true;
    try {
      await gasCreate({
        sheet,
        ...context,
        NoStok: row.NoStok,
        Deskripsi: row.Deskripsi,
        Batch: row.Batch,
        Qty: row.Qty,
        TERPAKAI: row.TERPAKAI,
        REFILL: row.REFILL,
        KET: row.KET,
      });

      await reloadWithOptions({ silent: true, source: "local" });
    } finally {
      localMutationRef.current = false;
    }
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

    localMutationRef.current = true;
    try {
      await gasUpdate({
        sheet,
        ...context,
        No: row.No,
        NoStok: row.NoStok,
        Deskripsi: row.Deskripsi,
        Batch: row.Batch,
        Qty: row.Qty,
        TERPAKAI: row.TERPAKAI,
        REFILL: row.REFILL,
        KET: row.KET,
      });
      await reloadWithOptions({ silent: true, source: "local" });
    } catch (err) {
      // rollback kalau gagal
      setData(prev);
      throw err;
    } finally {
      localMutationRef.current = false;
    }
  };

  /* ================= DELETE (OPTIMISTIC) ================= */
  const deleteRow = async (No: number) => {
    const prev = data;

    setData((curr) => curr.filter((r) => r.No !== No));

    localMutationRef.current = true;
    try {
      await gasDelete({ sheet, No, ...context });
      await reloadWithOptions({ silent: true, source: "local" });
    } catch (err) {
      setData(prev);
      throw err;
    } finally {
      localMutationRef.current = false;
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
