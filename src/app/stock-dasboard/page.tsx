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
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stok Implant</h1>
          <p className="text-xs text-zinc-500">
            Upload stok dari Excel, lihat summary, dan kelola stok implant.
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
  );
}
