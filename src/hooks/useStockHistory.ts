"use client";

import { useEffect, useState } from "react";
import { gasGetHistory } from "@/lib/gas";
import { HistoryRow } from "@/types/history";
import { mergeHistory } from "@/lib/history";

interface UseStockHistoryResult {
  data: HistoryRow[];
  loading: boolean;
  error: string | null;
}

export function useStockHistory(sheet?: string, No?: number): UseStockHistoryResult {
  const [data, setData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);
      try {
        const res = await gasGetHistory(sheet, No);
        if (!active) return;

        // 🔥 MERGE DI CLIENT
        const merged = mergeHistory(res.data ?? []);
        setData(merged);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setData([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [sheet, No]);

  return { data, loading, error };
}
