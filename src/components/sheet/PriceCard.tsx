"use client";

import { useRef, useCallback } from "react";
import * as htmlToImage from "html-to-image";
import { PriceItem } from "@/types/priceItem";
import { Share2, ClipboardCopy } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

interface PriceCardProps {
  item: PriceItem;
  onShare?: (item: PriceItem) => void;
}

export function PriceCard({ item, onShare }: PriceCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleShareImage = useCallback(async () => {
    if (!cardRef.current) return;

    const dataUrl = await htmlToImage.toPng(cardRef.current, {
      quality: 1,
      backgroundColor: "#ffffff",
      cacheBust: true,
    });

    const blob = await (await fetch(dataUrl)).blob();
    const file = new File([blob], `Price-${item.no}.png`, {
      type: "image/png",
    });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: item.product, files: [file] });
      return;
    }

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `Price-${item.no}.png`;
    link.click();
  }, [item]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.15 }}
      className="group relative border rounded-xl shadow-md bg-white p-4 w-full max-w-sm hover:shadow-lg transition-shadow"
    >
      {/* CARD CAPTURE AREA */}
      <div
        ref={cardRef}
        className="rounded-xl overflow-hidden shadow-sm bg-white border border-gray-100"
      >
        {/* IMAGE */}
        <div className="relative">
          <Image
            src="https://via.placeholder.com/400x250?text=Product+Image"
            alt="Product image"
            width={400}
            height={250}
            className="w-full h-48 object-cover"
            unoptimized
            crossOrigin="anonymous"
          />

          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* CONTENT */}
        <div className="p-4 space-y-2">
          {/* ITEM ID */}
          <p className="text-xs text-gray-500">ID #{item.no}</p>

          {/* TITLE */}
          <h2 className="text-lg font-bold text-gray-900 leading-tight">
            {item.product}
          </h2>

          {/* BADGES */}
          <div className="flex gap-2 mt-1">
            <span className="px-2 py-0.5 bg-gray-100 text-xs rounded-md text-gray-700">
              {item.type}
            </span>
            <span className="px-2 py-0.5 bg-blue-100 text-xs rounded-md text-blue-600 font-medium">
              System: {item.system}
            </span>
          </div>

          {/* PRICING */}
          <div className="border-t pt-3 mt-3 space-y-1">
            <p className="text-sm">
              <span className="font-semibold text-green-700">Harga Nett:</span>{" "}
              <span className="text-gray-800 font-medium">
                Rp {item.hargaNett.toLocaleString("id-ID")}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-blue-700">Harga + PPN:</span>{" "}
              <span className="text-gray-900 font-semibold">
                Rp {item.hargaNettPPN.toLocaleString("id-ID")}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="mt-4 space-y-2">
        {onShare && (
          <button
            onClick={() => onShare(item)}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <ClipboardCopy size={18} /> Copy Text
          </button>
        )}

        <button
          onClick={handleShareImage}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Share2 size={18} /> Share Image
        </button>
      </div>
    </motion.div>
  );
}
