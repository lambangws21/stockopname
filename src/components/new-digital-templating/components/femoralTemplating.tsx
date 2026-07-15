"use client";

import Image from "next/image";
import React, { useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };

type Calibration = {
  mm: number;       // real distance in mm (entered by user)
  pixels: number;   // distance between two clicked points in px (screen space)
  pxPerMm: number;  // pixels per mm
};

type FemoralSize = 1 | 2 | 3 | 4 | 5 | 6;

const FEMORAL_SIZES: Record<FemoralSize, { widthML: number; lengthAP: number }> = {
  1: { widthML: 56.0, lengthAP: 45.3 },
  2: { widthML: 60.5, lengthAP: 49.25 },
  3: { widthML: 64.15, lengthAP: 52.3 },
  4: { widthML: 68.0, lengthAP: 54.4 },
  5: { widthML: 72.6, lengthAP: 57.1 },
  6: { widthML: 77.0, lengthAP: 59.65 },
};

const OVERLAY_IMAGE_DIMENSIONS: Record<FemoralSize, { width: number; height: number }> = {
  1: { width: 959, height: 838 },
  2: { width: 1036, height: 911 },
  3: { width: 1098, height: 967 },
  4: { width: 1164, height: 1006 },
  5: { width: 1243, height: 1056 },
  6: { width: 1318, height: 1103 },
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dist(a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * IMPORTANT:
 * - We scale the overlay based on AP length (vertical dimension in this AP template).
 * - This assumes the PNG template height corresponds to AP length.
 *   (sesuai gambar: "Length" vertikal, "Width" horizontal)
 */
export default function FemoralAPTemplating() {
  // ==== SOURCES ====
  
  const [size, setSize] = useState<FemoralSize>(4);

  const overlaySrc = `/images/implant/normed-femoral/femoral_AP_template_size_${size}.png`;
  const xraySrc = `/images/implant/xray/knee-ap-sample.png`;

  // ==== OVERLAY STATE ====
  const [pos, setPos] = useState<Point>({ x: 320, y: 260 });
  const [opacity, setOpacity] = useState<number>(0.72);
  const [rotate, setRotate] = useState<number>(0);
  const [mirror, setMirror] = useState<boolean>(false);

  // Base overlay displayed pixel height (before auto-scale). We set a stable base.
  // The overlay will be drawn with Image height = OVERLAY_BASE_PX (CSS pixels),
  // then scaled via transform to match mm.
  const OVERLAY_BASE_PX = 420;

  // ==== DRAG LOGIC ====
  const dragging = useRef(false);
  const last = useRef<Point | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !last.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setPos((p) => ({ x: p.x + dx, y: p.y + dy }));
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = false;
    last.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  // ==== CALIBRATION (CLICK 2 POINTS ON RULER) ====
  const stageRef = useRef<HTMLDivElement>(null);
  const [calibPoints, setCalibPoints] = useState<Point[]>([]);
  const [calibMm, setCalibMm] = useState<number>(50); // default 50mm (5cm)
  const [calibration, setCalibration] = useState<Calibration | null>(null);

  function getLocalPoint(e: React.MouseEvent<HTMLDivElement>): Point {
    const el = stageRef.current;
    if (!el) return { x: 0, y: 0 };
    const rect = el.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    // Note: this is in CSS pixels of the displayed container.
  }

  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    // Only calibrate when holding SHIFT (to avoid accidental clicks while dragging overlay)
    if (!e.shiftKey) return;

    const p = getLocalPoint(e);
    setCalibPoints((prev) => {
      if (prev.length >= 2) return [p];
      return [...prev, p];
    });
  }

  // recompute calibration when points or mm changes
  React.useEffect(() => {
    if (calibPoints.length !== 2) return;
    const px = dist(calibPoints[0], calibPoints[1]);
    const mm = clamp(calibMm, 1, 1000);
    setCalibration({ mm, pixels: px, pxPerMm: px / mm });
  }, [calibPoints, calibMm]);

  // ==== AUTO SCALE (mm -> px) ====
  // We assume overlay base pixel height corresponds to the AP length of *that PNG*.
  // Because each PNG is already scaled by ML/AP table, we just need absolute scale using ruler.
  const autoScale = useMemo(() => {
    if (!calibration) return 1;

    const apMm = FEMORAL_SIZES[size].lengthAP;
    const desiredPxHeight = apMm * calibration.pxPerMm;

    // overlay rendered at OVERLAY_BASE_PX, scale to match desired px height
    return desiredPxHeight / OVERLAY_BASE_PX;
  }, [calibration, size]);

  const transform = useMemo(() => {
    const sx = mirror ? -autoScale : autoScale;
    const sy = autoScale;
    return `translate(${pos.x}px, ${pos.y}px) rotate(${rotate}deg) scale(${sx}, ${sy})`;
  }, [pos.x, pos.y, rotate, autoScale, mirror]);

  const showCalib = calibPoints.length > 0;
  const overlayImageDimensions = OVERLAY_IMAGE_DIMENSIONS[size];

  return (
    <div className="mx-auto max-w-7xl p-4">
      {/* =================== TOP BAR =================== */}
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border p-3">
        <div className="text-sm font-semibold">Femoral AP Templating (Ruler calibrated)</div>

        <div className="flex items-center gap-2">
          <span className="text-sm opacity-70">Size</span>
          <select
            className="rounded-lg border px-2 py-1 text-sm"
            value={size}
            onChange={(e) => setSize(Number(e.target.value) as FemoralSize)}
          >
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <option key={s} value={s}>
                Size {s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Opacity</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
          />
          <span className="tabular-nums">{opacity.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Rotate</span>
          <input
            type="range"
            min={-45}
            max={45}
            step={1}
            value={rotate}
            onChange={(e) => setRotate(Number(e.target.value))}
          />
          <span className="tabular-nums">{rotate}°</span>
        </div>

        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-sm"
          onClick={() => setMirror((v) => !v)}
        >
          Mirror: {mirror ? "ON" : "OFF"}
        </button>

        <div className="h-6 w-px bg-black/10" />

        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-70">Calib mm</span>
          <input
            className="w-24 rounded-lg border px-2 py-1 text-sm"
            type="number"
            min={1}
            max={1000}
            value={calibMm}
            onChange={(e) => setCalibMm(Number(e.target.value))}
          />
          <span className="opacity-70">(hold SHIFT + click 2 points on ruler)</span>
        </div>

        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-sm"
          onClick={() => {
            setCalibPoints([]);
            setCalibration(null);
          }}
        >
          Reset calib
        </button>

        <button
          type="button"
          className="rounded-xl border px-3 py-2 text-sm"
          onClick={() => {
            setPos({ x: 320, y: 260 });
            setOpacity(0.72);
            setRotate(0);
            setMirror(false);
          }}
        >
          Reset overlay
        </button>

        {calibration ? (
          <div className="ml-auto rounded-xl border px-3 py-2 text-xs">
            <div className="font-semibold">Scale OK</div>
            <div className="tabular-nums opacity-80">{calibration.pxPerMm.toFixed(2)} px/mm</div>
            <div className="tabular-nums opacity-80">
              AutoScale: {autoScale.toFixed(3)}×
            </div>
          </div>
        ) : (
          <div className="ml-auto rounded-xl border px-3 py-2 text-xs opacity-70">
            Calibrate dulu (SHIFT + 2 clicks) agar ukuran mm akurat.
          </div>
        )}
      </div>

      {/* =================== STAGE =================== */}
      <div
        ref={stageRef}
        className="relative aspect-4/3 w-full overflow-hidden rounded-2xl border bg-black"
        onClick={onStageClick}
      >
        {/* X-RAY */}
        <Image src={xraySrc} alt="X-ray AP knee" fill className="object-contain" priority />

        {/* Calibration markers/line */}
        {showCalib ? (
          <>
            {calibPoints.map((p, i) => (
              <div
                key={i}
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow"
                style={{ left: p.x, top: p.y }}
              />
            ))}
            {calibPoints.length === 2 ? (
              <svg className="absolute inset-0 h-full w-full">
                <line
                  x1={calibPoints[0].x}
                  y1={calibPoints[0].y}
                  x2={calibPoints[1].x}
                  y2={calibPoints[1].y}
                  stroke="red"
                  strokeWidth={2}
                />
              </svg>
            ) : null}
          </>
        ) : null}

        {/* OVERLAY (draggable) */}
        <div
          className="absolute left-0 top-0"
          style={{
            transform,
            transformOrigin: "top left",
            opacity,
            touchAction: "none",
            cursor: "grab",
            userSelect: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <Image
            src={overlaySrc}
            alt={`Femoral AP template size ${size}`}
            width={overlayImageDimensions.width}
            height={overlayImageDimensions.height}
            draggable={false}
            className="pointer-events-none select-none"
            style={{ height: OVERLAY_BASE_PX, width: "auto" }}
          />
        </div>
      </div>

      <div className="mt-3 text-xs opacity-70">
        Cara pakai: set <b>Calib mm</b> (misal 50), tahan <b>SHIFT</b> lalu klik 2 titik di ruler (jarak 50mm),
        setelah itu pilih size dan geser overlay. Ukuran akan mengikuti mm pada X-ray.
      </div>
    </div>
  );
}
