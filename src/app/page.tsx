import { Suspense } from "react";
// import KpiCards from "@/components/dashboard/KpiCard";
import StockTablePremium from "@/components/StockTablePremium";
import { SwatchBookIcon } from "lucide-react";

export default function Page() {
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
      </header>

      {/* KPI SECTION */}
      <Suspense fallback={<KpiSkeleton />}>
        {/* <KpiCards sheet="Sheet1" /> */}
      </Suspense>

      {/* TABLE SECTION */}
      <Suspense fallback={<TableSkeleton />}>
        <StockTablePremium sheet="Sheet1" />
      </Suspense>
    </main>
  );
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
