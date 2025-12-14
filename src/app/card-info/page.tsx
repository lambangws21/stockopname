"use client";

import { useEffect, useMemo, useState } from "react";
import StepCard from "@/components/sheet/new-step";
import type { PriceItem } from "@/app/api/price-list/route";
import { Input } from "@/components/ui/input";


export default function StepsPage() {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ FILTER STATE
  const [search, setSearch] = useState("");
  const [filterRS, setFilterRS] = useState("all");
  const [filterSystem, setFilterSystem] = useState("all");

  useEffect(() => {
    fetch("/api/price-list")
      .then((res) => res.json())
      .then((json) => {
        setItems(json.data);
        setLoading(false);
      });
  }, []);

  // ✅ AUTO OPTIONS
  const rsOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.rumahSakit).filter(Boolean));
    return Array.from(set) as string[];
  }, [items]);

  const systemOptions = useMemo(() => {
    const set = new Set(items.map((i) => i.system));
    return Array.from(set);
  }, [items]);

  // ✅ FILTERED DATA
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        search === "" ||
        item.product.toLowerCase().includes(search.toLowerCase()) ||
        item.type.toLowerCase().includes(search.toLowerCase());

      const matchRS =
        filterRS === "all" || item.rumahSakit === filterRS;

      const matchSystem =
        filterSystem === "all" || item.system === filterSystem;

      return matchSearch && matchRS && matchSystem;
    });
  }, [items, search, filterRS, filterSystem]);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-4 flex flex-col gap-4 max-w-5xl mx-auto">
      {/* ✅ FILTER BAR */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Input
          placeholder="Cari produk / type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="border rounded-md px-3 py-2 bg-white text-black"
          value={filterRS}
          onChange={(e) => setFilterRS(e.target.value)}
        >
          <option value="all">Semua Rumah Sakit</option>
          {rsOptions.map((rs) => (
            <option key={rs} value={rs}>
              {rs}
            </option>
          ))}
        </select>

        <select
          className="border rounded-md px-3 py-2 bg-white text-black"
          value={filterSystem}
          onChange={(e) => setFilterSystem(e.target.value)}
        >
          <option value="all">Semua Sistem</option>
          {systemOptions.map((sys) => (
            <option key={sys} value={sys}>
              {sys}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ LIST CARD */}
      <div className="flex flex-col gap-6 mt-4">
        {filteredItems.map((item) => (
          <StepCard key={item.no} item={item} />
        ))}
      </div>
    </div>
  );
}
