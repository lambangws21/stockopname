"use client";

import { useMemo, useState } from "react";
import { StockRow } from "@/types/stock";

/* -------------------------------------------------------
   Tipe Sorting & Table Controls
------------------------------------------------------- */
export type SortField = keyof StockRow | null;
export type SortOrder = "asc" | "desc";

export interface UseStockTableResult {
  search: string;
  setSearch: (v: string) => void;

  batchFilter: string;
  setBatchFilter: (v: string) => void;

  sortField: SortField;
  sortOrder: SortOrder;
  setSortField: (f: SortField) => void;
  toggleSort: (f: SortField) => void;

  page: number;
  setPage: (p: number) => void;

  rowsPerPage: number;
  setRowsPerPage: (p: number) => void;

  filtered: StockRow[];
  sorted: StockRow[];
  paginated: StockRow[];
  totalPages: number;
}

/* -------------------------------------------------------
   useStockTable — SEARCH, FILTER, SORT, PAGINATION
------------------------------------------------------- */
export function useStockTable(data: StockRow[]): UseStockTableResult {
  /* 🔍 FILTER STATES */
  const [search, setSearch] = useState<string>("");
  const [batchFilter, setBatchFilter] = useState<string>("");

  /* 🔽 SORT STATES */
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  /* 📄 PAGINATION */
  const [page, setPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  /* -------------------------------------------------------
     1️⃣ FILTERED DATA
  ------------------------------------------------------- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const batchQ = batchFilter.trim().toLowerCase();

    return data.filter((row) => {
      const matchSearch =
        !q ||
        row.Deskripsi.toLowerCase().includes(q) ||
        row.NoStok.toLowerCase().includes(q) ||
        String(row.No).includes(q);

      const matchBatch =
        !batchQ || row.Batch.toLowerCase().includes(batchQ);

      return matchSearch && matchBatch;
    });
  }, [data, search, batchFilter]);

  /* -------------------------------------------------------
     2️⃣ SORTED DATA
  ------------------------------------------------------- */
  const sorted = useMemo(() => {
    const collator = new Intl.Collator("id-ID", {
      numeric: true,
      sensitivity: "base",
    });
    const compareIdentity = (a: StockRow, b: StockRow) =>
      collator.compare(String(a.Deskripsi || ""), String(b.Deskripsi || "")) ||
      collator.compare(String(a.NoStok || ""), String(b.NoStok || "")) ||
      collator.compare(String(a.Batch || ""), String(b.Batch || "")) ||
      Number(a.No || 0) - Number(b.No || 0);

    if (!sortField) return [...filtered].sort(compareIdentity);

    return [...filtered].sort((a, b) => {
      const A = a[sortField] ?? "";
      const B = b[sortField] ?? "";

      const numA = Number(A);
      const numB = Number(B);

      // numeric sort
      if (!isNaN(numA) && !isNaN(numB)) {
        const result = sortOrder === "asc" ? numA - numB : numB - numA;
        return result || compareIdentity(a, b);
      }

      // string sort
      const result = sortOrder === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
      return result || compareIdentity(a, b);
    });
  }, [filtered, sortField, sortOrder]);

  /* -------------------------------------------------------
     3️⃣ PAGINATION
  ------------------------------------------------------- */
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));

  const paginated = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return sorted.slice(start, start + rowsPerPage);
  }, [sorted, page, rowsPerPage]);

  /* -------------------------------------------------------
     SORTING TOGGLE HANDLER
  ------------------------------------------------------- */
  const toggleSort = (field: SortField) => {
    if (!field) return;

    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return {
    search,
    setSearch,

    batchFilter,
    setBatchFilter,

    sortField,
    sortOrder,
    setSortField,
    toggleSort,

    page,
    setPage,

    rowsPerPage,
    setRowsPerPage,

    filtered,
    sorted,
    paginated,
    totalPages,
  };
}
