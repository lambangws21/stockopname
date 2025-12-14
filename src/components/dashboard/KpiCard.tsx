"use client";

import { motion } from "framer-motion";
import { useStockKPI } from "@/hooks/useStockKPI";
import { Package, AlertTriangle, Layers } from "lucide-react";

export default function KPIBar({ sheet }: { sheet: string }) {
  const { data, loading } = useStockKPI(sheet);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-200 animate-pulse rounded-xl" />
        ))}
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
          layout
          className="bg-white dark:bg-zinc-900 border rounded-xl p-4 flex items-center gap-4 shadow"
        >
          <kpi.icon className={`w-8 h-8 ${kpi.color}`} />
          <div>
            <p className="text-xs text-zinc-500">{kpi.label}</p>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
