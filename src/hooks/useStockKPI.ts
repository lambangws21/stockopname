"use client";

import { useEffect, useState } from "react";

export type StockKPI = {
  totalItems: number;
  lowStock: number;
  sumStock: number;
};

export function useStockKPI(sheet: string) {
  const [data, setData] = useState<StockKPI | null>(null);

  useEffect(() => {
    if (!sheet) return;

    let active = true;

    fetch(`/api/super-sheet?action=kpi&sheet=${sheet}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((res) => {
        console.log("📊 KPI RAW RESPONSE:", res); // ✅ LOG DI SINI

        if (!active) return;

        setData(res?.kpi ?? null);
      })
      .catch((err) => {
        console.error("❌ KPI ERROR:", err); // optional
        if (!active) return;
        setData(null);
      });

    return () => {
      active = false;
    };
  }, [sheet]);

  return {
    data,
    loading: data === null,
  };
}
