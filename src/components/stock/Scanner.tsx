"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  DecodeHintType,
} from "@zxing/library";
import { parseGS1 } from "@/utils/GS1Parser";

interface ScannerProps {
  onDetected: (data: { ref: string; lot: string; exp?: string; raw?: string }) => void;
}

type ImageMode = "none" | "contrast" | "threshold";

function createDecodeHints(oneDOnly = false) {
  const hints = new Map();
  hints.set(DecodeHintType.TRY_HARDER, true);
  const oneDFormats = [
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93,
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
  ];
  const allFormats = [
    ...oneDFormats,
    BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX,
    BarcodeFormat.PDF_417,
  ];
  hints.set(DecodeHintType.POSSIBLE_FORMATS, oneDOnly ? oneDFormats : allFormats);
  return hints;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function loadImage(url: string) {
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gagal memuat gambar"));
    img.src = url;
  });
}

function renderCandidate(
  img: HTMLImageElement,
  rect: { x: number; y: number; w: number; h: number },
  mode: ImageMode
) {
  const sx = clamp(Math.round(rect.x * img.naturalWidth), 0, img.naturalWidth - 1);
  const sy = clamp(Math.round(rect.y * img.naturalHeight), 0, img.naturalHeight - 1);
  const sw = clamp(Math.round(rect.w * img.naturalWidth), 1, img.naturalWidth - sx);
  const sh = clamp(Math.round(rect.h * img.naturalHeight), 1, img.naturalHeight - sy);

  const maxWidth = 1400;
  const scale = sw > maxWidth ? maxWidth / sw : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  if (mode !== "none") {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;

      let lum = gray;
      if (mode === "contrast") {
        lum = clamp((gray - 128) * 1.9 + 128, 0, 255);
      } else if (mode === "threshold") {
        const boosted = clamp((gray - 128) * 2.1 + 128, 0, 255);
        lum = boosted > 140 ? 255 : 0;
      }

      data[i] = lum;
      data[i + 1] = lum;
      data[i + 2] = lum;
      data[i + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
  }

  return canvas.toDataURL("image/png");
}

function buildImageCandidates(img: HTMLImageElement, originalUrl: string) {
  const plans: Array<{
    rect: { x: number; y: number; w: number; h: number };
    mode: ImageMode;
  }> = [
    { rect: { x: 0, y: 0, w: 1, h: 1 }, mode: "none" },
    { rect: { x: 0.02, y: 0.30, w: 0.96, h: 0.45 }, mode: "none" },
    { rect: { x: 0.02, y: 0.37, w: 0.96, h: 0.30 }, mode: "contrast" },
    { rect: { x: 0.02, y: 0.42, w: 0.96, h: 0.22 }, mode: "threshold" },
  ];
  const candidates: string[] = [originalUrl];

  for (const plan of plans) {
    const dataUrl = renderCandidate(img, plan.rect, plan.mode);
    if (dataUrl) candidates.push(dataUrl);
  }

  return Array.from(new Set(candidates));
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return Promise.race([
    promise,
    new Promise<T>(function (_, reject) {
      setTimeout(function () {
        reject(new Error("DECODE_TIMEOUT"));
      }, timeoutMs);
    }),
  ]);
}

async function tryDecodeImageUrl(imageUrl: string, oneDOnly: boolean) {
  const reader = new BrowserMultiFormatReader(createDecodeHints(oneDOnly), 250);
  try {
    const result = await withTimeout(reader.decodeFromImageUrl(imageUrl), 1300);
    const text = String(result.getText() ?? "").trim();
    return text || null;
  } catch {
    return null;
  } finally {
    reader.reset();
  }
}

export default function Scanner({ onDetected }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const lastPayloadRef = useRef("");
  const lastEmitAtRef = useRef(0);

  const [raw, setRaw] = useState("");
  const [scannerError, setScannerError] = useState("");
  const [imageDecodeLoading, setImageDecodeLoading] = useState(false);

  const playBeep = useCallback(async () => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as Window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioRef.current) {
        audioRef.current = new AudioCtx();
      }
      const ctx = audioRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.13, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.17);
    } catch {
      // ignore audio errors (browser policy / device limitations)
    }
  }, []);

  const emitDecodedText = useCallback(
    (text: string) => {
      const clean = String(text ?? "").trim();
      if (!clean) return;

      const now = Date.now();
      if (
        clean === lastPayloadRef.current &&
        now - lastEmitAtRef.current < 1500
      ) {
        return;
      }

      lastPayloadRef.current = clean;
      lastEmitAtRef.current = now;
      setRaw(clean);
      setScannerError("");

      const parsed = parseGS1(clean);
      const fallbackRef = extractRefFromRaw(clean) || clean;
      const lotFromRaw = extractLotFromRaw(clean);

      void playBeep();
      onDetected({
        ref: parsed.gtin ? convertGTINtoREF(parsed.gtin) : fallbackRef,
        lot: parsed.lot ?? lotFromRaw ?? "",
        exp: parsed.exp ?? "",
        raw: clean,
      });
    },
    [onDetected, playBeep]
  );

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return () => {};

    const hints = createDecodeHints();
    const reader = new BrowserMultiFormatReader(hints, 300);

    let active = true;

    const decodeCallback = (
      result: { getText: () => string } | undefined,
      error?: { name?: string; message?: string }
    ) => {
      if (!active) return;

      if (result) {
        emitDecodedText(result.getText());
        return;
      }

      if (!error?.name) return;
      const transientErrors = new Set([
        "NotFoundException",
        "ChecksumException",
        "FormatException",
      ]);
      if (transientErrors.has(error.name)) return;

      if (error.name === "NotAllowedError") {
        setScannerError("Akses kamera ditolak. Izinkan kamera di browser.");
        return;
      }
      if (error.name === "NotReadableError") {
        setScannerError("Kamera sedang dipakai aplikasi lain.");
        return;
      }
      setScannerError(error.message || "Scanner gagal membaca barcode.");
    };

    const startScan = async () => {
      try {
        await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          video,
          decodeCallback
        );
      } catch {
        try {
          await reader.decodeFromVideoDevice(null, video, decodeCallback);
        } catch {
          if (active) {
            setScannerError("Tidak bisa memulai kamera scanner.");
          }
        }
      }
    };

    void startScan();

    return () => {
      active = false;
      reader.reset();
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [emitDecodedText]);

  const handleImageDecode = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setImageDecodeLoading(true);
    setScannerError("");

    try {
      const image = await loadImage(url);
      const candidates = buildImageCandidates(image, url);
      let decodedText: string | null = null;

      for (const candidate of candidates) {
        decodedText = await tryDecodeImageUrl(candidate, true);
        if (decodedText) break;
      }

      if (!decodedText) {
        // fallback all-format: cukup 2 kandidat awal supaya tetap cepat
        for (const candidate of candidates.slice(0, 2)) {
          decodedText = await tryDecodeImageUrl(candidate, false);
          if (decodedText) break;
        }
      }

      if (!decodedText) {
        throw new Error("NOT_DECODED");
      }

      emitDecodedText(decodedText);
    } catch {
      setScannerError(
        "Gagal baca dari foto. Coba crop area barcode saja, ambil foto lebih dekat, lalu ulangi."
      );
    } finally {
      URL.revokeObjectURL(url);
      setImageDecodeLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full rounded-xl border"
      />

      <label className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded border cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
        <span>{imageDecodeLoading ? "Membaca foto..." : "Scan dari foto (fallback)"}</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageDecode}
          disabled={imageDecodeLoading}
        />
      </label>

      {scannerError ? (
        <p className="text-xs text-red-600 break-all">{scannerError}</p>
      ) : null}

      {raw && !scannerError ? (
        <p className="text-xs text-green-600 break-all">Scanned: {raw}</p>
      ) : null}

      {!scannerError ? (
        <p className="text-[11px] text-zinc-500">
          Bunyi notifikasi akan berbunyi saat barcode berhasil dibaca.
        </p>
      ) : null}
    </div>
  );
}

/* ================= UTIL ================= */

function convertGTINtoREF(gtin: string): string {
  if (gtin.length === 14) {
    return `${gtin.substring(2, 6)}-${gtin.substring(6, 9)}-${gtin.substring(
      9,
      11
    )}-${gtin.substring(11, 14)}`;
  }
  return gtin;
}

function extractRefFromRaw(raw: string): string {
  const cleaned = raw.replace(/\u001D/g, "").replace(/\*/g, "").trim();

  const refLabelMatch = cleaned.match(
    /(?:\bREF(?:ERENCE)?(?:\s*NUMBER)?\b)\s*[:#]?\s*([A-Z0-9-]{4,})/i
  );
  if (refLabelMatch?.[1]) return refLabelMatch[1];

  const primary = cleaned.split("/")[0];
  if (primary.startsWith("+")) {
    const token = primary.slice(1).replace(/[^A-Z0-9]/gi, "");
    if (token.length > 6) {
      const productWithCheck = token.slice(4);
      if (productWithCheck.length > 1) {
        return productWithCheck.slice(0, -1);
      }
    }
  }

  return "";
}

function extractLotFromRaw(raw: string): string {
  const cleaned = raw.replace(/\u001D/g, " ").trim();
  const lotMatch = cleaned.match(
    /(?:\bLOT\b|\bBATCH\b)\s*[:#]?\s*([A-Z0-9-]{3,})/i
  );
  return lotMatch?.[1] ?? "";
}
