"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { PriceItem } from "@/app/api/price-list/route";

// =====================================================
// MODERN, SMALL, CENTERED SHARE MODAL
// =====================================================
function ShareModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: PriceItem | null;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;

    // Hindari setState langsung → gunakan requestAnimationFrame
    requestAnimationFrame(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 1200;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // BACKGROUND
      ctx.fillStyle = "#F7FAFC";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // HEADER GRADIENT
      const gradient = ctx.createLinearGradient(0, 0, 900, 240);
      gradient.addColorStop(0, "#0066C5");
      gradient.addColorStop(1, "#004E98");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 900, 260);

      ctx.fillStyle = "white";
      ctx.font = "700 48px Arial";
      ctx.fillText("Zimmer Biomet", 50, 110);

      ctx.font = "900 70px Arial";
      ctx.fillText(item.product, 50, 210);

      // BODY
      ctx.fillStyle = "#1E293B";
      ctx.font = "36px Arial";
      ctx.fillText(`System : ${item.system}`, 50, 360);
      ctx.fillText(`Type     : ${item.type}`, 50, 430);
      ctx.fillText(`Qty       : ${item.qty}`, 50, 500);

      ctx.fillStyle = "#005FAE";
      ctx.font = "46px Arial";
      ctx.fillText("Harga Nett", 50, 640);

      ctx.font = "62px Arial";
      ctx.fillText(`Rp ${item.hargaNett.toLocaleString("id-ID")}`, 50, 720);

      ctx.fillStyle = "#0A7D42";
      ctx.font = "46px Arial";
      ctx.fillText("Harga + PPN", 50, 820);

      ctx.font = "62px Arial";
      ctx.fillText(`Rp ${item.hargaNettPPN.toLocaleString("id-ID")}`, 50, 900);

      ctx.fillStyle = "#7C8695";
      ctx.font = "24px Arial";
      ctx.fillText("Zimmer Biomet • Confidential Pricing", 50, 1150);

      const url = canvas.toDataURL("image/png");
      setImageUrl(url);
    });
  }, [item]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl p-5 w-[90%] max-w-md"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Preview Share Card
        </h2>

        <div className="max-h-[420px] overflow-auto rounded-lg border">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt="preview"
              width={900}
              height={1200}
              className="rounded-lg"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-300 hover:bg-gray-400"
          >
            Close
          </button>

          {imageUrl && (
            <a
              href={imageUrl}
              download={`${item.product}-price.png`}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              Download
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ===========================================================
// MAIN PRICE TABLE PAGE
// ===========================================================
export default function PriceTablePage() {
  const [data, setData] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [systemFilter, setSystemFilter] = useState("All");

  const [page, setPage] = useState(1);
  const perPage = 10;

  // MODAL
  const [selectedItem, setSelectedItem] = useState<PriceItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // LOAD DATA
  useEffect(() => {
    fetch("/api/price-list", { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        setData(json.data);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    return data.filter((i) => {
      const s = search.toLowerCase();
      return (
        (i.product.toLowerCase().includes(s) ||
          i.type.toLowerCase().includes(s) ||
          i.system.toLowerCase().includes(s)) &&
        (systemFilter === "All" || i.system === systemFilter)
      );
    });
  }, [data, search, systemFilter]);

  const pages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading)
    return <div className="text-center p-10 text-gray-500">Loading...</div>;

  const uniqueSystems = ["All", ...new Set(data.map((d) => d.system))];

  return (
    <>
      <ShareModal
        open={modalOpen}
        item={selectedItem}
        onClose={() => setModalOpen(false)}
      />

      <motion.div
        className="p-6 max-w-7xl mx-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h1 className="text-3xl font-bold text-blue-700 mb-6">
          Zimmer Biomet • Price List
        </h1>

        {/* SEARCH & FILTER */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            className="border px-4 py-2 rounded-lg shadow-sm w-full md:w-1/2"
            placeholder="Search product, type, system…"
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />

          <select
            className="border px-4 py-2 rounded-lg shadow-sm"
            value={systemFilter}
            onChange={(e) => {
              setSystemFilter(e.target.value);
              setPage(1);
            }}
          >
            {uniqueSystems.map((sys) => (
              <option key={sys}>{sys}</option>
            ))}
          </select>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border shadow-md">
          <table className="min-w-full bg-white">
            <thead className="bg-blue-600 text-white text-sm">
              <tr>
                <th className="px-4 py-3 text-left">No</th>
                <th className="px-4 py-3 text-left">System</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-center">Qty</th>
                <th className="px-4 py-3 text-right">Harga Nett</th>
                <th className="px-4 py-3 text-right">Harga + PPN</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>

            <tbody>
              {paginated.map((item) => (
                <motion.tr
                  key={item.no}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">{item.no}</td>
                  <td className="px-4 py-3">{item.system}</td>
                  <td className="px-4 py-3 font-medium">{item.product}</td>
                  <td className="px-4 py-3">{item.type}</td>
                  <td className="px-4 py-3 text-center">{item.qty}</td>
                  <td className="px-4 py-3 text-right">
                    Rp {item.hargaNett.toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-right text-blue-700 font-semibold">
                    Rp {item.hargaNettPPN.toLocaleString("id-ID")}
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setModalOpen(true);
                      }}
                      className="px-3 py-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                      Preview
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 disabled:opacity-40"
          >
            Prev
          </button>

          <span className="font-medium text-gray-700">
            Page {page} of {pages}
          </span>

          <button
            disabled={page === pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            className="px-4 py-2 rounded-lg border hover:bg-gray-100 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </motion.div>
    </>
  );
}
