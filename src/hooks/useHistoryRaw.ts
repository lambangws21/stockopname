// src/hooks/useHistoryRaw.ts
"use client";

import { useEffect, useState } from "react";
import { HistoryRow } from "@/types/history";

export function useHistoryRaw(query = "") {
  const [data, setData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetch(`/api/super-sheet?action=history${query}`)
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        setData(res.data ?? []);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setData([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [query]);

  return { data, loading, error };
}
