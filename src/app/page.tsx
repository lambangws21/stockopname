"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
// import KpiCards from "@/components/dashboard/KpiCard";
import StockTablePremium from "@/components/StockTablePremium";
import Scanner from "@/components/stock/Scanner";
import {
  Boxes,
  QrCode,
  Target,
  X,
} from "lucide-react";

type ScanPayload = {
  ref: string;
  lot?: string;
  exp?: string;
  raw?: string;
  searchField?: "REF" | "LOT";
};

export function StockManagementPage() {
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanPayload | null>(null);

  return (
    <main className="min-h-screen bg-slate-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto max-w-[1680px] space-y-4 px-3 py-3 sm:px-5 sm:py-5 lg:space-y-5">
        <header className="flex flex-col gap-4 rounded-2xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm shadow-violet-200 dark:shadow-none">
              <Boxes size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">
                Stock Implant
              </h1>
              <p className="text-xs text-zinc-500">
                Stok, pergerakan, dan riwayat dalam satu halaman
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setScanOpen((value) => !value)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold transition hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <QrCode size={15} />
              {scanOpen ? "Tutup Scan" : "Scan Barcode"}
            </button>
            <Link
              href="/customer-mapping"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-500"
            >
              <Target size={15} />
              Customer Mapping
            </Link>
          </div>
        </header>

        <section>
          <div className="rounded-xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40">
                <QrCode size={17} />
              </span>
              <div>
                <p className="text-sm font-semibold">Barcode implant</p>
                <p className="text-[11px] text-zinc-500">
                  Cari REF dan batch secara cepat
                </p>
              </div>
            </div>

            {scanOpen && (
              <div className="mt-4 border-t pt-4">
                <Scanner onDetected={setScanResult} />
              </div>
            )}

            {scanResult && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-violet-50 px-3 py-2 text-xs dark:bg-violet-950/30">
                <span><b>REF:</b> {scanResult.ref || "-"}</span>
                <span><b>LOT:</b> {scanResult.lot || "-"}</span>
                {scanResult.searchField && (
                  <span className="rounded-full bg-white px-2 py-1 font-semibold text-violet-700">
                    Pencarian {scanResult.searchField}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setScanResult(null)}
                  className="ml-auto inline-flex items-center gap-1 font-semibold text-violet-700"
                >
                  <X size={12} /> Hapus
                </button>
              </div>
            )}
          </div>
        </section>

        <Suspense fallback={<TableSkeleton />}>
          <StockTablePremium
            sheet="Sheet1"
            externalScan={scanResult}
            title="Stock Management"
          />
        </Suspense>
      </div>
    </main>
  );
}

export default function Page() {
  return <StockManagementPage />;
}

/* ================= SKELETONS ================= */

function TableSkeleton() {
  return (
    <div className="h-64 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
  );
}
