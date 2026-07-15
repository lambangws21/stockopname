"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import CustomerMappingPage from "@/app/customer-mapping/page";
// import KpiCards from "@/components/dashboard/KpiCard";
import StockTablePremium from "@/components/StockTablePremium";
import Scanner from "@/components/stock/Scanner";
import ExternalSheetSlide from "@/components/ExternalSheetSlide";
import { SwatchBookIcon, QrCode, Target, X } from "lucide-react";

type ScanPayload = {
  ref: string;
  lot?: string;
  exp?: string;
  raw?: string;
};

const EXTERNAL_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1yHHodOG94Fz7ugN2Qvom3l6ouulr3vIjiBfcejTUXoM/edit?gid=505336972#gid=505336972";
const EXTERNAL_SHEET_GID = "505336972";

export function StockManagementPage() {
  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanPayload | null>(null);
  const [useExternalSource, setUseExternalSource] = useState(false);

  return (
    <main className="px-4 py-4 md:px-6 md:py-6 space-y-6">
      {/* PAGE TITLE */}
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-xl md:text-2xl font-bold">
          <SwatchBookIcon className="w-16 h-16 text-purple-500" /> Stock <span className="text-purple-400 text-3xl">Management</span>
        </h1>
        <p className="text-xs md:text-sm text-zinc-500">
          Realtime KPI • CRUD • Mutasi • History
        </p>
        <Link
          href="/customer-mapping"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-500"
        >
          <Target size={16} /> Customer Mapping & Approval
        </Link>
      </header>

      {/* KPI SECTION */}
      <Suspense fallback={<KpiSkeleton />}>
        {/* <KpiCards sheet="Sheet1" /> */}
      </Suspense>

      <section className="rounded-xl border bg-white dark:bg-zinc-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <QrCode size={16} />
            Scan Barcode ke StockTablePremium
          </div>
          <button
            type="button"
            onClick={() => setScanOpen((v) => !v)}
            className="rounded-lg border px-3 py-1.5 text-xs"
          >
            {scanOpen ? "Tutup Scanner" : "Buka Scanner"}
          </button>
        </div>

        {scanOpen ? (
          <Scanner
            onDetected={(scan) => {
              setScanResult(scan);
            }}
          />
        ) : null}

        {scanResult ? (
          <div className="flex flex-wrap items-center gap-2 text-xs rounded-lg border px-3 py-2">
            <span className="font-semibold">REF:</span>
            <span>{scanResult.ref || "-"}</span>
            <span className="font-semibold">LOT:</span>
            <span>{scanResult.lot || "-"}</span>
            <button
              type="button"
              onClick={() => setScanResult(null)}
              className="ml-auto inline-flex items-center gap-1 rounded-md border px-2 py-1"
            >
              <X size={12} />
              Clear
            </button>
          </div>
        ) : null}
      </section>

      <ExternalSheetSlide
        sourceUrl={EXTERNAL_SHEET_URL}
        title="Referensi Sheet Eksternal"
      />

      <section className="rounded-xl border bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">
            Sumber Data StockTablePremium
          </div>
          <div className="inline-flex rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setUseExternalSource(false)}
              className={`px-3 py-1 text-xs rounded ${
                !useExternalSource ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""
              }`}
            >
              Internal
            </button>
            <button
              type="button"
              onClick={() => setUseExternalSource(true)}
              className={`px-3 py-1 text-xs rounded ${
                useExternalSource ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : ""
              }`}
            >
              External
            </button>
          </div>
        </div>
      </section>

      {/* TABLE SECTION */}
      <Suspense fallback={<TableSkeleton />}>
        <StockTablePremium
          sheet="Sheet1"
          externalScan={scanResult}
          title={
            useExternalSource
              ? "📦 Stock External (Editable)"
              : "📦 Stock Management"
          }
          context={
            useExternalSource
              ? {
                  sourceUrl: EXTERNAL_SHEET_URL,
                  sourceGid: EXTERNAL_SHEET_GID,
                }
              : undefined
          }
        />
      </Suspense>
    </main>
  );
}

export default function Page() {
  return <CustomerMappingPage />;
}

/* ================= SKELETONS ================= */

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"
        />
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="h-64 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
  );
}
