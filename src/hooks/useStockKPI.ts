"use client";

import { useCallback, useEffect, useState } from "react";
import { gasKPI } from "@/lib/gas";

/* ================= TYPES ================= */
export interface StockKPI {
  totalItems: number;
  lowStock: number;
  sumStock: number;
}

/* ================= HOOK ================= */
export function useStockKPI(sheet: string) {
  const [data, setData] = useState<StockKPI | null>(null);
  const [loading, setLoading] = useState(false);

  /* 🔄 SAFE FETCH (async external event) */
  const fetchKPI = useCallback(async () => {
    setLoading(true);

    const res = await gasKPI(sheet);
    if (res?.kpi) {
      setData(res.kpi as StockKPI);
    }

    setLoading(false);
  }, [sheet]);

  /* 🚀 INITIAL + INTERVAL (ESLINT SAFE) */
  useEffect(() => {
    const timer = setTimeout(fetchKPI, 0); // ✅ FIX ESLINT

    const interval = setInterval(fetchKPI, 90000); // 1 menit

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [fetchKPI]);

  /* ⚡ OPTIMISTIC HELPERS */
  const optimisticAdd = () =>
    setData((p) =>
      p ? { ...p, totalItems: p.totalItems + 1 } : p
    );

  const optimisticRemove = () =>
    setData((p) =>
      p ? { ...p, totalItems: Math.max(0, p.totalItems - 1) } : p
    );

  return {
    data,
    loading,
    refresh: fetchKPI,
    optimisticAdd,
    optimisticRemove,
  };
}
