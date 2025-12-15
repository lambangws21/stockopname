"use client";

import { useMemo } from "react";
import { HistoryRow } from "@/types/history";
import { filterHistory } from "@/lib/historyFilter";

export type HistoryFilter = {
  No?: number;
  action?: string;
  from?: string;
  to?: string;
};

export function useFilteredHistory(
  rows: HistoryRow[],
  filter: HistoryFilter
) {
  return useMemo(() => {
    return filterHistory(rows, filter);
  }, [rows, filter]);
}
