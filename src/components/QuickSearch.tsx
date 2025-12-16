"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X, Clock } from "lucide-react";
import { StockRow } from "@/types/stock";

/* ================= TYPES ================= */
interface Props {
  data: StockRow[];
  onSelect: (row: StockRow) => void;
}

const RECENT_KEY = "quick-search-recent";

/* ================= HELPERS ================= */
function fuzzyMatch(text: string, query: string) {
  let ti = 0;
  let qi = 0;

  const t = text.toLowerCase();
  const q = query.toLowerCase();

  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

function highlight(text: string, query: string) {
  if (!query) return text;

//   const t = text.toLowerCase();
  const q = query.toLowerCase();
  let qi = 0;

  return Array.from(text).map((char, i) => {
    if (qi < q.length && char.toLowerCase() === q[qi]) {
      qi++;
      return (
        <mark
          key={i}
          className="bg-yellow-300/60 dark:bg-yellow-500/30 rounded px-0.5"
        >
          {char}
        </mark>
      );
    }
    return <span key={i}>{char}</span>;
  });
}

/* ================= COMPONENT ================= */
export default function QuickSearch({ data, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // ✅ SINGLE SOURCE OF TRUTH (LAZY INIT)
  const [recent, setRecent] = useState<StockRow[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  /* ================= HOTKEY ================= */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  /* ================= SAVE RECENT ================= */
  const saveRecent = (row: StockRow) => {
    const updated = [
      row,
      ...recent.filter((r) => r.No !== row.No),
    ].slice(0, 5);

    setRecent(updated);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  };

  /* ================= FUZZY FILTER ================= */
  const results = useMemo(() => {
    if (!query) return [];

    return data
      .filter((r) =>
        [r.No, r.NoStok, r.Batch, r.Deskripsi]
          .map((v) => String(v ?? ""))
          .some((v) => fuzzyMatch(v, query))
      )
      .slice(0, 10);
  }, [query, data]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-9999 bg-black/30 flex items-start justify-center pt-[18vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white dark:bg-zinc-900 w-full max-w-xl rounded-xl shadow-xl animate-box-open"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center gap-2 px-4 py-3 border-b">
          <Search size={18} className="text-zinc-400" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari REF, LOT, Nama, No…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button onClick={() => setOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {/* RECENT */}
        {!query && recent.length > 0 && (
          <div className="border-b">
            <div className="px-4 py-2 text-xs text-zinc-500 flex items-center gap-1">
              <Clock size={12} /> Recent
            </div>

            {recent.map((r) => (
              <button
                key={r.No}
                onClick={() => {
                  saveRecent(r);
                  onSelect(r);
                  setOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <div className="text-sm font-medium">
                  {r.Deskripsi}
                </div>
                <div className="text-xs text-zinc-500">
                  REF: {r.NoStok} • LOT: {r.Batch}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* RESULTS */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query && results.length === 0 && (
            <div className="p-4 text-sm text-zinc-400">
              Tidak ada hasil
            </div>
          )}

          {results.map((r) => (
            <button
              key={r.No}
              onClick={() => {
                saveRecent(r);
                onSelect(r);
                setOpen(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 border-b last:border-b-0"
            >
              <div className="font-medium text-sm">
                {highlight(r.Deskripsi, query)}
              </div>
              <div className="text-xs text-zinc-500">
                REF: {highlight(r.NoStok, query)} • LOT:{" "}
                {highlight(r.Batch, query)}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
