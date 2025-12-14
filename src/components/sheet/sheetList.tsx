"use client";

import { useSheetStore } from "./useSheetStore";
import { motion } from "framer-motion";
import { PriceCard } from "./PriceCard";
import { PriceItem } from "@/types/priceItem";

export function SheetList() {
  const { data, loading, filterSystem, setFilterSystem } = useSheetStore();

  const systems = Array.from(new Set(data.map((d) => d.system)));

  const filtered: PriceItem[] =
    filterSystem === "ALL"
      ? data
      : data.filter((d) => d.system === filterSystem);

  const handleShare = (item: PriceItem) => {
    const text = `
${item.product}
System: ${item.system}
Type: ${item.type}
Harga Nett: Rp ${item.hargaNett.toLocaleString("id-ID")}
PPN: Rp ${item.hargaNettPPN.toLocaleString("id-ID")}
    `.trim();

    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  if (loading)
    return (
      <div className="text-center py-10">
        <div className="animate-pulse text-lg">Loading...</div>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex gap-2 items-center">
        <label className="font-medium">Filter System:</label>

        <select
          className="border rounded p-2"
          value={filterSystem}
          onChange={(e) => setFilterSystem(e.target.value)}
        >
          <option value="ALL">All</option>
          {systems.map((sys) => (
            <option key={sys} value={sys}>
              {sys}
            </option>
          ))}
        </select>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filtered.map((item) => (
          <PriceCard key={item.no} item={item} onShare={handleShare} />
        ))}
      </motion.div>
    </div>
  );
}
