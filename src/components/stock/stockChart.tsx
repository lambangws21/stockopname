"use client";

import { useEffect, useMemo, useState } from "react";
import { ImplantStockItem } from "@/types/implant-stock";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface StockChartProps {
  reloadKey?: number;
}

interface ChartRow {
  name: string;
  total: number;
  terpakai: number;
}

export function StockChart({ reloadKey }: StockChartProps) {
  const [data, setData] = useState<ImplantStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/get-implant-stock");
        const json = await res.json();

        const safeData: ImplantStockItem[] = Array.isArray(json?.data)
          ? json.data
          : [];

        setData(safeData);
      } catch (error) {
        console.error("Gagal load data chart:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [reloadKey]);

  const chartData: ChartRow[] = useMemo(() => {
    const map = new Map<string, ChartRow>();

    data.forEach((item) => {
      const key = item.description;
      const current = map.get(key);

      if (current) {
        current.total += item.totalQty;
        current.terpakai += item.used;
      } else {
        map.set(key, {
          name: key,
          total: item.totalQty,
          terpakai: item.used,
        });
      }
    });

    return Array.from(map.values());
  }, [data]);

  if (loading) {
    return (
      <div className="p-4 rounded-xl shadow bg-white dark:bg-zinc-900 text-sm text-zinc-500">
        Memuat chart stok...
      </div>
    );
  }

  if (chartData.length === 0) {
    return (
      <div className="p-4 rounded-xl shadow bg-white dark:bg-zinc-900 text-sm text-zinc-500">
        Belum ada data untuk ditampilkan.
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl shadow bg-white dark:bg-zinc-900">
      <h3 className="text-sm text-zinc-500 mb-2">
        Perbandingan Total Qty vs Terpakai
      </h3>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Bar dataKey="total" name="Total Qty" />
            <Bar dataKey="terpakai" name="Terpakai" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
