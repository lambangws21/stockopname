"use client";

import { useEffect, useState } from "react";
import { ImplantStockItem } from "@/types/implant-stock";

interface StockTotalProps {
  reloadKey?: number;
}

export default function StockTotal({ reloadKey }: StockTotalProps) {
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/get-implant-stock");
        const json = await res.json();

        // ✅ GUARD PALING PENTING
        const data: ImplantStockItem[] = Array.isArray(json?.data)
          ? json.data
          : [];

        const sum = data.reduce(
          (acc: number, item: ImplantStockItem) => acc + Number(item.qty || 0),
          0
        );

        setTotal(sum);
      } catch (error) {
        console.error("Gagal hitung total stok:", error);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reloadKey]);

  return (
    <div className="p-4 rounded-xl shadow bg-white dark:bg-zinc-900">
      <h3 className="text-sm text-zinc-500">Total Stok Implant</h3>
      <p className="mt-1 text-3xl font-bold">
        {loading ? "Loading..." : total}
      </p>
    </div>
  );
}
