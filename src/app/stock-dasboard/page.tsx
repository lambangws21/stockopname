"use client";

import { useState } from "react";
import StockTotal from "@/components/stock/StockTotal";
import StockTable from "@/components/stock/StockTable";
import { StockChart } from "@/components/stock/stockChart";
import { UploadStockExcel } from "@/components/stock/UploadStockExcel";

export default function ImplantStockPage() {
  const [reloadKey, setReloadKey] = useState(0);

  const triggerReload = () => {
    setReloadKey((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-zinc-50 p-4 md:p-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">Inventory</div>
          <h1 className="text-2xl font-bold tracking-tight">Stok Implant</h1>
          <p className="text-xs text-zinc-500">
            Kelola stok berdasarkan jenis implant, brand, komponen, dan batch.
          </p>
        </div>
        <UploadStockExcel onUploaded={triggerReload} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <StockTotal reloadKey={reloadKey} />
        <StockChart reloadKey={reloadKey} />
      </div>

      <StockTable reloadKey={reloadKey} />
      </div>
    </main>
  );
}
