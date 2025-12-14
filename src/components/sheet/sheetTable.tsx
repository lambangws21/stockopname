"use client";

import { useSheetStore } from "./useSheetStore";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";

export function SheetTable() {
  const { data, loading, filterSystem, setFilterSystem } = useSheetStore();

  if (loading)
    return (
      <div className="text-center py-10">
        <div className="animate-pulse text-lg">Loading data...</div>
      </div>
    );

  // ambil unique system
  const systems = Array.from(new Set(data.map((d) => d.system)));

  // filter hasil data
  const filtered = filterSystem === "ALL"
    ? data
    : data.filter((d) => d.system === filterSystem);

  // fungsi share item
  function handleShare(item: typeof data[number]) {
    const text = `
${item.product}
System: ${item.system}
Type: ${item.type}
Harga Nett: Rp ${item.hargaNett.toLocaleString("id-ID")}
Harga + PPN: Rp ${item.hargaNettPPN.toLocaleString("id-ID")}
`;

    navigator.clipboard.writeText(text);
    alert("Data berhasil di-copy!");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* FILTER */}
      <div className="flex items-center gap-2">
        <label className="font-medium">Filter System:</label>
        <select
          className="border rounded p-2"
          value={filterSystem}
          onChange={(e) => setFilterSystem(e.target.value)}
        >
          <option value="ALL">Semua</option>
          {systems.map((sys) => (
            <option key={sys} value={sys}>
              {sys}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-full border rounded-lg text-sm">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="p-2 text-left">No</th>
              <th className="p-2 text-left">System</th>
              <th className="p-2 text-left">Product</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Qty</th>
              <th className="p-2 text-left">Harga Nett</th>
              <th className="p-2 text-left">Harga Nett + PPN</th>
              <th className="p-2 text-left">Action</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, index) => (
              <tr
                key={`${item.no}-${index}`}
                className="border-b hover:bg-gray-50 transition-colors"
              >
                <td className="p-2">{item.no}</td>
                <td className="p-2">{item.system}</td>
                <td className="p-2">{item.product}</td>
                <td className="p-2">{item.type}</td>
                <td className="p-2">{item.qty}</td>

                <td className="p-2">
                  {Number(item.hargaNett || 0).toLocaleString("id-ID")}
                </td>

                <td className="p-2">
                  {Number(item.hargaNettPPN || 0).toLocaleString("id-ID")}
                </td>

                {/* SHARE BUTTON */}
                <td className="p-2">
                  <button
                    onClick={() => handleShare(item)}
                    className="px-2 py-1 border rounded flex items-center gap-1 hover:bg-gray-100"
                  >
                    <Share2 size={16} />
                    Share
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
