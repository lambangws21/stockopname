"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Package, AlertTriangle, Layers } from "lucide-react";

type KPI = {
  totalItems: number;
  lowStock: number;
  sumStock: number;
};

export default function KPIBar({ sheet }: { sheet: string }) {
  const [data, setData] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/super-sheet?action=kpi&sheet=${sheet}`, {
          cache: "no-store",
        });

        const json = await res.json();

        console.log("🔥 KPI RAW RESPONSE:", json);

        if (!active) return;

        if (!json?.kpi) {
          throw new Error("KPI tidak ditemukan di response");
        }

        setData(json.kpi);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : String(err));
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [sheet]);

  /* ================= UI ================= */

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-zinc-200 dark:bg-zinc-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 border rounded-xl bg-red-50">
        ❌ {error}
      </div>
    );
  }

  if (!data) return null;

  const items = [
    {
      label: "Total Item",
      value: data.totalItems,
      icon: Package,
      color: "text-blue-600",
    },
    {
      label: "Low Stock",
      value: data.lowStock,
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      label: "Total Stock",
      value: data.sumStock,
      icon: Layers,
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {items.map((kpi) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 shadow"
        >
          <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
          <div>
            <p className="text-xs text-zinc-500">{kpi.label}</p>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
          <div className="mt-10 flex justify-center">
            <div className="animate-shake bg-red-500 text-white px-6 py-3 rounded">
              SHAKE TEST
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
