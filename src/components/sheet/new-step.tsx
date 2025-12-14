"use client";

import { ReactNode, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import type { PriceItem } from "@/app/api/price-list/route";

// ===============================
// ✅ BACKGROUND BY TYPE
// ===============================
function getBackgroundByType(type: string): string {
  const t = type.toLowerCase().trim();

  if (t.includes("persona")) return "/images/backgrounds/Persona.png";
  if (t.includes("uka") || t.includes("uni")) return "/images/backgrounds/uka.png";
  if (t.includes("vanguard")) return "/images/backgrounds/vanguard-bg.png";

  if (
    t.includes("ps") ||
    t.includes("cr") ||
    t.includes("mc") ||
    t.includes("uc") ||
    t.includes("knee") ||
    t.includes("tkr")
  ) {
    return "/images/backgrounds/nexgen.png";
  }

  if (t.includes("hip") || t.includes("thr"))
    return "/images/backgrounds/trilogy.png";

  return "/images/backgrounds/implant-bg.png";
}

// ===============================
// ✅ GENERATE SHARE IMAGE + DATE WATERMARK
// ===============================
async function generateShareImage(item: PriceItem, bg: string): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const img = new window.Image();
  img.crossOrigin = "anonymous";
  img.src = bg;

  await new Promise((resolve) => (img.onload = resolve));

  // BACKGROUND
  ctx.drawImage(img, 0, 0, 1200, 630);

  // OVERLAY
  const grd = ctx.createLinearGradient(0, 0, 1200, 630);
  grd.addColorStop(0, "rgba(0,76,151,0.92)");
  grd.addColorStop(1, "rgba(0,115,230,0.88)");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 1200, 630);

  // TEXT CONTENT
  ctx.fillStyle = "#fff";
  ctx.font = "bold 48px Arial";
  ctx.fillText(item.product, 50, 120);

  ctx.font = "26px Arial";
  ctx.fillText(item.system, 50, 170);
  ctx.fillText(`Type: ${item.type}`, 50, 210);

  ctx.font = "bold 36px Arial";
  ctx.fillText(`Harga: Rp ${item.hargaNett.toLocaleString("id-ID")}`, 50, 300);

  ctx.fillStyle = "#67E8F9";
  ctx.fillText(
    `Harga + PPN: Rp ${item.hargaNettPPN.toLocaleString("id-ID")}`,
    50,
    360
  );

  // ✅ DATE WATERMARK (AUTO)
  const today = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  ctx.font = "20px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(`Generated: ${today}`, 50, 590);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

// ===============================
// ✅ STEP CARD COMPONENT
// ===============================
export default function StepCard({
  item,
  icon,
}: {
  item: PriceItem;
  icon?: ReactNode;
}) {
  const bg = getBackgroundByType(item.type);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // ✅ PREVIEW GENERATOR
  async function handlePreview() {
    const blob = await generateShareImage(item, bg);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    setPreviewOpen(true);
  }

  // ✅ FINAL SHARE
  async function handleShare() {
    if (!previewUrl) return;

    const res = await fetch(previewUrl);
    const blob = await res.blob();

    const file = new File([blob], `${item.product}.png`, {
      type: "image/png",
    });

    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({
        title: item.product,
        text: "Zimmer Biomet Price Info",
        files: [file],
      });
    } else {
      const a = document.createElement("a");
      a.href = previewUrl;
      a.download = file.name;
      a.click();
    }
  }

  return (
    <>
      {/* ✅ CARD */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="
          relative w-full max-w-3xl mx-auto
          rounded-3xl overflow-hidden
          shadow-[0_20px_60px_rgba(0,80,180,0.35)]
          border border-white/30
          backdrop-blur-xl
        "
      >
        <Image src={bg} alt="Implant Background" fill className="object-cover" />

        <div className="absolute inset-0 bg-linear-to-br from-[#004C97]/90 via-[#0073E6]/87 to-[#0A2540]/80" />
        <div className="absolute inset-0 ring-1 ring-cyan-400/40 rounded-3xl" />

        {/* ✅ RESPONSIVE CONTENT */}
        <div className="relative z-10 flex flex-col md:flex-row gap-4 p-4 items-center">
          {/* BADGE */}
          <div className="relative w-28 h-28 md:w-40 md:h-32   rounded-e-full overflow-hidden shrink-0">
            <Image src={bg} alt="Badge" fill className="object-cover" />
            <div className="absolute inset-0 bg-linear-to-br from-[#0050B3]/50 to-[#0073E6]/50" />

            <div className="relative z-10 flex flex-col items-center justify-center h-full text-white text-center px-2">
              <span className="text-[10px] tracking-widest">TYPE</span>
              <span className="text-sm font-extrabold mt-1">{item.type}</span>
            </div>
          </div>

          {/* INFO */}
          <div className="flex-1 text-white text-center md:text-left">
            <h3 className="text-lg md:text-xl font-bold drop-shadow">
              {item.product}
            </h3>
            <p className="text-sm opacity-95">{item.system}</p>

            <p className="mt-2 text-sm text-blue-100">
              Harga: Rp {item.hargaNett.toLocaleString("id-ID")}
            </p>

            <p className="font-extrabold text-cyan-300">
              Harga + PPN: Rp {item.hargaNettPPN.toLocaleString("id-ID")}
            </p>
          </div>

          {/* ✅ BUTTON */}
          <button
            onClick={handlePreview}
            className="
              mt-3 md:mt-0
              px-4 py-2 rounded-xl
              bg-cyan-500 hover:bg-cyan-400
              text-white font-semibold
              shadow-[0_0_20px_rgba(34,211,238,0.7)]
            "
          >
            Preview
          </button>

          {icon && <div className="text-cyan-300 text-4xl drop-shadow">{icon}</div>}
        </div>
      </motion.div>

      {/* ✅ PREVIEW MODAL */}
      {previewOpen && previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-900 rounded-2xl p-4 max-w-md w-full">
            <h3 className="text-white font-bold mb-3 text-center">
              Preview Share
            </h3>

            <div className="relative w-full aspect-1200/630 rounded-xl overflow-hidden">
              <Image src={previewUrl} alt="Preview" fill className="object-contain" />
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleShare}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg py-2 font-semibold"
              >
                Share Sekarang
              </button>
              <button
                onClick={() => setPreviewOpen(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
