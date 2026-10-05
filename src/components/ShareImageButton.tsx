"use client";

import { Check, Download, Share2 } from "lucide-react";
import { useState } from "react";

const CONTACT = "+62 851-5633-1464";

export default function ShareImageButton({
  src,
  title,
  meta,
}: {
  src: string;
  title: string;
  meta?: string;
}) {
  const [status, setStatus] = useState<"idle" | "sharing" | "copied">("idle");

  async function shareCard() {
    if (status === "sharing") return;
    setStatus("sharing");
    const safeName =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") || "produk-implant";
    try {
      const blob = await createProductCard(
        new URL(src, window.location.origin).toString(),
        title,
        meta || "Orthopaedic product",
      );
      const file = new File([blob], `${safeName}-product-card.png`, {
        type: "image/png",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title,
          text: `${title}\nInformasi produk: Herlambang Wicaksono Bali · ${CONTACT}`,
          files: [file],
        });
      } else {
        downloadBlob(blob, file.name);
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(
            `${title}\n${meta || "Orthopaedic product"}\nInfo produk: ${CONTACT}`,
          );
          setStatus("copied");
          window.setTimeout(() => setStatus("idle"), 1800);
          return;
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setStatus("idle");
        return;
      }
      window.open(src, "_blank", "noopener,noreferrer");
    }
    setStatus("idle");
  }

  return (
    <button
      type="button"
      onClick={shareCard}
      disabled={status === "sharing"}
      aria-label={`Bagikan kartu informasi ${title}`}
      title={`Bagikan kartu informasi ${title}`}
      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-cyan-400 px-3 text-[10px] font-black text-[#06202a] shadow-lg transition hover:bg-cyan-300 disabled:opacity-60"
    >
      {status === "copied" ? (
        <Check size={14} />
      ) : status === "sharing" ? (
        <Download size={14} className="animate-bounce" />
      ) : (
        <Share2 size={14} />
      )}
      <span>
        {status === "copied"
          ? "Card tersimpan"
          : status === "sharing"
            ? "Membuat card"
            : "Bagikan card"}
      </span>
    </button>
  );
}

async function createProductCard(src: string, title: string, meta: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak tersedia");
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
  gradient.addColorStop(0, "#061923");
  gradient.addColorStop(0.58, "#0b3342");
  gradient.addColorStop(1, "#075f78");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.fillStyle = "#38d7f0";
  ctx.beginPath();
  ctx.arc(918, 100, 210, 0, Math.PI * 2);
  ctx.globalAlpha = 0.12;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 33px Arial, sans-serif";
  ctx.fillText("ORTHO BALI", 72, 92);
  ctx.fillStyle = "#7ddff1";
  ctx.font = "700 16px Arial, sans-serif";
  ctx.letterSpacing = "4px";
  ctx.fillText("IMPLANT PORTFOLIO", 72, 124);
  roundedRect(ctx, 54, 174, 972, 790, 42);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  const image = await loadImage(src);
  drawContainedImage(ctx, image, 94, 214, 892, 710);
  ctx.fillStyle = "#70e4f5";
  ctx.font = "800 19px Arial, sans-serif";
  ctx.letterSpacing = "2px";
  ctx.fillText(meta.toUpperCase(), 72, 1038);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 48px Arial, sans-serif";
  const titleBottom = drawWrappedText(ctx, title, 72, 1100, 920, 58, 2);
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(72, titleBottom + 30);
  ctx.lineTo(1008, titleBottom + 30);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.62)";
  ctx.font = "500 20px Arial, sans-serif";
  ctx.fillText(
    "Informasi produk · Herlambang Wicaksono · Bali",
    72,
    titleBottom + 74,
  );
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 23px Arial, sans-serif";
  ctx.fillText(CONTACT, 72, titleBottom + 110);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Gagal membuat card")),
      "image/png",
      0.94,
    ),
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
function drawContainedImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  );
}
function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = test;
  }
  if (line) lines.push(line);
  lines
    .slice(0, maxLines)
    .forEach((item, index) => ctx.fillText(item, x, y + index * lineHeight));
  return y + (Math.min(lines.length, maxLines) - 1) * lineHeight;
}
function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}
function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
