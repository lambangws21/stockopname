"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BarcodeFormat,
  BrowserMultiFormatReader,
  DecodeHintType,
} from "@zxing/library";
import { parseGS1 } from "@/utils/GS1Parser";
import { Camera, LoaderCircle, ScanText, Search } from "lucide-react";

interface ScannerProps {
  onDetected: (data: {
    ref: string;
    lot: string;
    exp?: string;
    raw?: string;
    searchField?: "REF" | "LOT";
  }) => void;
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
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrValue, setOcrValue] = useState("");
  const [ocrCandidates, setOcrCandidates] = useState<string[]>([]);
  const [ocrField, setOcrField] = useState<"REF" | "LOT">("LOT");

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

  const handleOcrImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setOcrLoading(true);
    setOcrProgress(0);
    setOcrCandidates([]);
    setOcrValue("");
    setScannerError("");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger(message) {
          if (message.status === "recognizing text") {
            setOcrProgress(Math.round((message.progress || 0) * 100));
          }
        },
      });

      await worker.setParameters({
        tessedit_char_whitelist:
          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-",
        preserve_interword_spaces: "1",
      });
      const result = await worker.recognize(file);
      await worker.terminate();

      const candidates = extractOcrCandidates(result.data.text);
      if (candidates.length === 0) {
        throw new Error("Angka tidak ditemukan");
      }

      setOcrCandidates(candidates);
      setOcrValue(candidates[0]);
    } catch (error) {
      setScannerError(
        error instanceof Error
          ? `${error.message}. Foto ulang dengan posisi dekat, lurus, dan cukup terang.`
          : "OCR gagal membaca angka."
      );
    } finally {
      setOcrLoading(false);
      event.target.value = "";
    }
  };

  const searchOcrValue = () => {
    const value = ocrValue.trim().toUpperCase();
    if (!value) return;

    onDetected({
      ref: ocrField === "REF" ? value : "",
      lot: ocrField === "LOT" ? value : "",
      raw: value,
      searchField: ocrField,
    });
    void playBeep();
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

      <div className="rounded-xl border bg-zinc-50 p-3 dark:bg-zinc-800/50">
        <div className="flex items-center gap-2">
          <ScanText size={17} className="text-violet-600" />
          <div>
            <p className="text-xs font-bold">Baca angka REF / LOT</p>
            <p className="text-[10px] text-zinc-500">
              Foto tulisan angka pada label implant
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          {(["REF", "LOT"] as const).map((field) => (
            <button
              type="button"
              key={field}
              onClick={() => setOcrField(field)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                ocrField === field
                  ? "border-violet-500 bg-violet-600 text-white"
                  : "bg-white dark:bg-zinc-900"
              }`}
            >
              Cari berdasarkan {field}
            </button>
          ))}
        </div>

        <label className="mt-2 inline-flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-zinc-900 px-3 text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900">
          {ocrLoading ? (
            <>
              <LoaderCircle size={15} className="animate-spin" />
              Membaca angka {ocrProgress}%
            </>
          ) : (
            <>
              <Camera size={15} />
              Foto angka dengan kamera
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleOcrImage}
            disabled={ocrLoading}
          />
        </label>

        {ocrCandidates.length > 0 && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {ocrCandidates.slice(0, 6).map((candidate) => (
                <button
                  type="button"
                  key={candidate}
                  onClick={() => setOcrValue(candidate)}
                  className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${
                    ocrValue === candidate
                      ? "border-violet-500 bg-violet-50 text-violet-700"
                      : "bg-white dark:bg-zinc-900"
                  }`}
                >
                  {candidate}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={ocrValue}
                onChange={(event) => setOcrValue(event.target.value)}
                inputMode="numeric"
                placeholder={`Periksa angka ${ocrField}`}
                className="h-10 min-w-0 flex-1 rounded-lg border bg-white px-3 text-sm font-bold outline-none focus:border-violet-500 dark:bg-zinc-900"
              />
              <button
                type="button"
                onClick={searchOcrValue}
                disabled={!ocrValue.trim()}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white disabled:opacity-50"
              >
                <Search size={14} /> Cari
              </button>
            </div>
            <p className="text-[10px] text-zinc-500">
              Periksa hasil OCR sebelum mencari. Ketuk angka lain jika hasil pertama kurang tepat.
            </p>
          </div>
        )}
      </div>

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

function extractOcrCandidates(raw: string) {
  const normalized = String(raw ?? "")
    .toUpperCase()
    .replace(/[|]/g, "1")
    .replace(/[–—]/g, "-");
  const tokens = normalized.match(/[A-Z0-9-]{3,}/g) ?? [];

  return Array.from(
    new Set(
      tokens
        .map((token) => token.replace(/^-+|-+$/g, ""))
        .filter((token) => token.length >= 3 && /\d/.test(token))
    )
  ).sort((a, b) => {
    const aNumeric = /^\d+$/.test(a) ? 1 : 0;
    const bNumeric = /^\d+$/.test(b) ? 1 : 0;
    return bNumeric - aNumeric || b.length - a.length;
  });
}

function extractLotFromRaw(raw: string): string {
  const cleaned = raw.replace(/\u001D/g, " ").trim();
  const lotMatch = cleaned.match(
    /(?:\bLOT\b|\bBATCH\b)\s*[:#]?\s*([A-Z0-9-]{3,})/i
  );
  return lotMatch?.[1] ?? "";
}
