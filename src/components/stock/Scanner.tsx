"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { parseGS1 } from "@/utils/GS1Parser";

interface ScannerProps {
  onDetected: (data: { ref: string; lot: string; exp?: string }) => void;
}

export default function Scanner({ onDetected }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [raw, setRaw] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    const video = videoRef.current;
    if (!video) return;

    let active = true;

    reader.decodeFromVideoDevice(
      null,
      video,
      (result) => {
        if (!result || !active) return;

        const text = result.getText();
        setRaw(text);

        const parsed = parseGS1(text);

        onDetected({
          ref: parsed.gtin ? convertGTINtoREF(parsed.gtin) : "",
          lot: parsed.lot ?? "",
          exp: parsed.exp ?? "",
        });
      }
    );

    return () => {
      active = false;

      // ✅ STOP ZXING DECODER
      reader.reset();

      // ✅ STOP CAMERA STREAM
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="space-y-2">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full rounded-xl border"
      />

      {raw && (
        <p className="text-xs text-green-600 break-all">
          Scanned: {raw}
        </p>
      )}
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
