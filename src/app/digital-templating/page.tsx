"use client";

import Image from "next/image";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Grab } from "lucide-react";

import {
  STEM_LIBRARY,
  type ImplantLibraryItem,
} from "@/components/digitalTemplating/implantLibrary";

import { useCanvasObjects } from "@/components/new-digital-templating/hooks/useCanvasObjects";
import { usePointerGestures } from "@/components/new-digital-templating/hooks/usePointerGestures";
import { useCalibration } from "@/components/new-digital-templating/hooks/useCalibration";
import { useRuler } from "@/components/new-digital-templating/hooks/useRuler";

import type { Point, ScaleDir } from "@/components/new-digital-templating/types";
import { snapAngle } from "@/components/new-digital-templating/utils/snapAngle";

import { ImplantObject } from "@/components/new-digital-templating/components/ImplantObject";
import { ToolbarDesktop } from "@/components/new-digital-templating/components/ToolbarDesktop";
import { ToolbarMobile } from "@/components/new-digital-templating/components/ToolbarMobile";
import { ImplantLibraryModal } from "@/components/new-digital-templating/components/ImplantLibraryModal";
import { RulerLayer } from "@/components/new-digital-templating/components/RulerLayer";

/* =========================
   Measurement Tracking Panel
========================= */
import MeasurementTrackingPanel, {
  createInMemoryMeasurementService,
  createInMemoryTrackedMeasurementsService,
  type MeasurementItem,
  type SeriesRef,
} from "@/components/new-digital-templating/components/MeasurementTrackingPanel";

/* =====================================================
   Helper: ruler minimal shape (NO any)
   Sesuaikan jika struktur ruler kamu beda.
===================================================== */
type RulerPoint = { x: number; y: number };
type RulerLike = {
  id: string;
  a: RulerPoint;
  b: RulerPoint;
  locked?: boolean;
  createdAt?: number;
};

function distPx(a: RulerPoint, b: RulerPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function formatMm(mm: number): string {
  // 1 decimal biar enak
  return `${mm.toFixed(1)} mm`;
}

export default function ImplantTemplatingCanvas() {
  // stage
  const stageRef = useRef<HTMLDivElement>(null);

  // left panel drag
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = useState({ x: 16, y: 16 });
  const panelDragRef = useRef({ dragging: false, x: 0, y: 0 });

  // toolbar drag
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [toolbarPos, setToolbarPos] = useState({ x: 0, y: 200 });
  const toolbarDragRef = useRef({ dragging: false, x: 0, y: 0 });

  // steps
  const [moveStep, setMoveStep] = useState(2);
  const [scaleStep, setScaleStep] = useState(0.01);
  const [rotateStep, setRotateStep] = useState(1);

  // modal
  const [openImplantModal, setOpenImplantModal] = useState(false);

  // ruler tool
  const [rulerEnabled, setRulerEnabled] = useState(false);

  const {
    objects,
    addObject,
    active,
    activeId,
    setActiveId,

    moveActive,
    scaleActive,
    rotateActive,
    deleteActive,

    flipActiveX,
    flipActiveY,
    toggleLockActive,

    setActiveScale,
    setActiveRotation,
    scaleActiveByMm,
  } = useCanvasObjects();

  const { lastRef, draggingRef, rotateDragRef, scaleDragRef } =
    usePointerGestures();

  const {
    background,
    xrayContrast,
    setXrayContrast,
    uploadBackground,

    realMm,
    setRealMm,
    mmPerPixel,
    calibrationLine,

    startCalibration,
    updateCalibrationEnd,
    applyCalibration,

    toLocal,
  } = useCalibration(stageRef);

  const ruler = useRuler(mmPerPixel);

  /* =========================
     Measurement bridge setup
     - trackedSvc: stable
     - measSvc: recreate when rulers change (simple & reliable)
  ========================= */
  const activeSeries: SeriesRef = useMemo(
    () => ({
      StudyInstanceUID: "STUDY_1",
      SeriesInstanceUID: "SERIES_ACTIVE",
      SeriesDescription: "Active Series",
      Modality: "XR",
    }),
    []
  );

  const trackedSvc = useMemo(() => createInMemoryTrackedMeasurementsService([]), []);

  // Convert rulers -> MeasurementItem[]
  const rulerMeasurements: MeasurementItem[] = useMemo(() => {
    // ruler.rulers harus array; kalau tidak, fallback kosong
    const list = (ruler.rulers ?? []) as unknown;

    // pastikan array of object
    if (!Array.isArray(list)) return [];

    const items: MeasurementItem[] = [];

    for (const it of list) {
      const r = it as Partial<RulerLike>;
      if (!r.id || !r.a || !r.b) continue;

      const px = distPx(r.a, r.b);

      let valueText: string | undefined;
      if (mmPerPixel && Number.isFinite(mmPerPixel)) {
        valueText = formatMm(px * mmPerPixel);
      } else {
        valueText = `${px.toFixed(1)} px`;
      }

      items.push({
        uid: `ruler-${r.id}`,
        label: "Ruler",
        valueText,
        referenceSeriesUID: activeSeries.SeriesInstanceUID,
        createdAt: r.createdAt,
        locked: r.locked ?? false,
      });
    }

    // terbaru di atas
    items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    return items;
  }, [ruler.rulers, mmPerPixel, activeSeries.SeriesInstanceUID]);

  // Recreate measurement service when rulers change (biar add/update gampang tanpa edit service)
  const measSvc = useMemo(() => {
    return createInMemoryMeasurementService(rulerMeasurements);
  }, [rulerMeasurements]);

  // Auto-track active series once (optional, tapi enak)
  useEffect(() => {
    trackedSvc.addTrackedSeries(activeSeries.SeriesInstanceUID);
  }, [trackedSvc, activeSeries.SeriesInstanceUID]);

  /* =========================
     Helpers
  ========================= */
  const createImplant = useCallback(
    (item: ImplantLibraryItem) => {
      addObject({
        id: crypto.randomUUID(),
        type: "implant",
        name: item.label,
        imageSrc: item.imageSrc,
        position: { x: 300, y: 200 },
        scaleX: 1,
        scaleY: 1,
        flipX: 1,
        flipY: 1,
        rotation: 0,
        opacity: 0.6,
        locked: true,
      });
    },
    [addObject]
  );

  const toggleRuler = useCallback(() => {
    setRulerEnabled((p) => !p);
  }, []);

  /* =========================
     IMPLANT DRAG
  ========================= */
  const beginDragImplant = useCallback(
    (e: React.PointerEvent, p: Point) => {
      if (!active) return;
      draggingRef.current = true;
      lastRef.current = { x: p.x, y: p.y };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [active, draggingRef, lastRef]
  );

  const moveDragImplant = useCallback(
    (p: Point) => {
      if (!draggingRef.current || !active) return;
      const dx = p.x - lastRef.current.x;
      const dy = p.y - lastRef.current.y;
      moveActive(dx, dy);
      lastRef.current = { x: p.x, y: p.y };
    },
    [active, moveActive, draggingRef, lastRef]
  );

  const endAllGestures = useCallback(
    (e: React.PointerEvent) => {
      rotateDragRef.current.active = false;
      scaleDragRef.current.dir = null;
      draggingRef.current = false;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    },
    [rotateDragRef, scaleDragRef, draggingRef]
  );

  /* =========================
     ROTATE HANDLE (WORKING)
  ========================= */
  const onRotateDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      if (!active) return;

      rotateDragRef.current = {
        x: e.clientX,
        active: true,
        startRotation: active.rotation,
      };

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [active, rotateDragRef]
  );

  const onRotateMoveGlobal = useCallback(
    (e: React.PointerEvent) => {
      if (!rotateDragRef.current.active) return;

      const dxTotal = e.clientX - rotateDragRef.current.x;
      const base = rotateDragRef.current.startRotation;

      const next = snapAngle(base + dxTotal * 0.5);
      setActiveRotation(next);
    },
    [rotateDragRef, setActiveRotation]
  );

  /* =========================
     SCALE HANDLES
  ========================= */
  const onScaleDown = useCallback(
    (e: React.PointerEvent, dir: ScaleDir) => {
      e.stopPropagation();
      if (!active) return;

      scaleDragRef.current = {
        startY: e.clientY,
        startScaleX: active.scaleX,
        startScaleY: active.scaleY,
        dir,
      };

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [active, scaleDragRef]
  );

  const applyScaleFromDrag = useCallback(
    (dy: number) => {
      if (!scaleDragRef.current.dir || !active) return;

      const sensitivity = 0.005;
      const factor = 1 + dy * sensitivity;
      const clamped = Math.max(0.05, factor);

      const dir = scaleDragRef.current.dir;

      if (dir === "left" || dir === "right") {
        const nextX = scaleDragRef.current.startScaleX * clamped;
        setActiveScale(nextX);
        return;
      }

      const nextY = scaleDragRef.current.startScaleY * clamped;
      setActiveScale(nextY);
    },
    [active, scaleDragRef, setActiveScale]
  );

  /* =========================
     STAGE EVENTS (RULER vs IMPLANT)
  ========================= */
  const onStagePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const p = toLocal(e.clientX, e.clientY);

      if (rulerEnabled) {
        const hit = ruler.beginDragOrEdit(p);
        if (!hit) ruler.startDraw(p);
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        return;
      }

      beginDragImplant(e, p);
    },
    [toLocal, rulerEnabled, ruler, beginDragImplant]
  );

  const onStagePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (rulerEnabled) {
        const p = toLocal(e.clientX, e.clientY);
        if (ruler.mode === "draw") ruler.updateDraw(p);
        else ruler.moveDragOrEdit(p);
        return;
      }

      updateCalibrationEnd(e.clientX, e.clientY);

      onRotateMoveGlobal(e);

      if (scaleDragRef.current.dir) {
        const dy = e.clientY - scaleDragRef.current.startY;
        applyScaleFromDrag(dy);
        return;
      }

      const p = toLocal(e.clientX, e.clientY);
      moveDragImplant(p);
    },
    [
      rulerEnabled,
      ruler,
      toLocal,
      updateCalibrationEnd,
      onRotateMoveGlobal,
      scaleDragRef,
      applyScaleFromDrag,
      moveDragImplant,
    ]
  );

  const onStagePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (rulerEnabled) {
        ruler.endDraw();
        ruler.endDragOrEdit();
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        return;
      }
      endAllGestures(e);
    },
    [rulerEnabled, ruler, endAllGestures]
  );

  const onStageMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.shiftKey) startCalibration(e.clientX, e.clientY);
    },
    [startCalibration]
  );

  /* =========================
     KEYBOARD SHORTCUTS
  ========================= */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "r") {
        toggleRuler();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && ruler.activeRulerId) {
        ruler.deleteActiveRuler();
        return;
      }

      if (!active) return;

      if (!e.shiftKey && !e.ctrlKey) {
        if (e.key === "ArrowUp") moveActive(0, -moveStep);
        if (e.key === "ArrowDown") moveActive(0, moveStep);
        if (e.key === "ArrowLeft") moveActive(-moveStep, 0);
        if (e.key === "ArrowRight") moveActive(moveStep, 0);
      }

      if (e.shiftKey) {
        if (e.key === "ArrowUp") scaleActive(scaleStep);
        if (e.key === "ArrowDown") scaleActive(-scaleStep);
      }

      if (e.ctrlKey) {
        if (e.key === "ArrowLeft") rotateActive(-rotateStep);
        if (e.key === "ArrowRight") rotateActive(rotateStep);
      }

      if (e.key === "Delete" || e.key === "Backspace") deleteActive();
      if (e.key === "Escape") setActiveId(null);
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    toggleRuler,
    ruler,
    active,
    moveActive,
    scaleActive,
    rotateActive,
    deleteActive,
    setActiveId,
    moveStep,
    scaleStep,
    rotateStep,
  ]);

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="relative w-full h-svh overflow-hidden bg-gray-100 text-gray-900 dark:bg-neutral-950 dark:text-gray-100 transition-colors">
      {/* ✅ Measurement Panel (posisi kanan, bisa kamu ubah) */}
      <div className="pointer-events-auto fixed right-4 bottom-4 z-50 hidden lg:block">
        <MeasurementTrackingPanel
          activeSeries={activeSeries}
          seriesCatalog={[activeSeries]}
          trackedService={trackedSvc}
          measurementService={measSvc}
          onExportSR={(seriesUID) => {
            console.log("Export SR for", seriesUID);
          }}
        />
      </div>

      {/* LEFT PANEL */}
      <div
        ref={panelRef}
        className="fixed z-30 select-none touch-none"
        style={{ left: panelPos.x, top: panelPos.y }}
        onPointerMove={(e) => {
          if (!panelDragRef.current.dragging) return;
          setPanelPos({
            x: e.clientX - panelDragRef.current.x,
            y: e.clientY - panelDragRef.current.y,
          });
        }}
        onPointerUp={(e) => {
          panelDragRef.current.dragging = false;
          panelRef.current?.releasePointerCapture(e.pointerId);
        }}
      >
        <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur rounded-2xl shadow-xl border border-gray-200 dark:border-neutral-700 w-56 max-w-[90vw]">
          <div
            className="cursor-move px-3 py-2 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between text-xs font-semibold"
            onPointerDown={(e) => {
              panelDragRef.current.dragging = true;
              panelDragRef.current.x = e.clientX - panelPos.x;
              panelDragRef.current.y = e.clientY - panelPos.y;
              panelRef.current?.setPointerCapture(e.pointerId);
            }}
          >
            <span className="text-xs font-semibold tracking-wide">X-ray Control</span>
            <span className="text-xs text-gray-400">
              <Grab />
            </span>
          </div>

          <div className="p-3 space-y-3 text-xs">
            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300">
                X-ray Background
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={uploadBackground}
                className="border rounded w-full px-2 py-1 text-xs bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-600"
              />
            </div>

            <button
              onClick={() => setOpenImplantModal(true)}
              className="w-full rounded-lg bg-black text-white py-1.5 text-xs hover:bg-gray-800 transition"
            >
              + Add Template
            </button>

            <button
              onClick={toggleRuler}
              className={`w-full rounded-lg py-1.5 text-xs transition ${
                rulerEnabled
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-gray-900 text-white hover:bg-black"
              }`}
              title="Ruler tool (shortcut: R)"
            >
              {rulerEnabled ? "📏 Ruler ON" : "📐 Ruler OFF"}
            </button>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300">
                X-ray Contrast
              </label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.05}
                value={xrayContrast}
                onChange={(e) => setXrayContrast(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="font-medium text-gray-700 dark:text-gray-300">
                Marker Length (mm)
              </label>
              <input
                type="number"
                value={realMm}
                onChange={(e) => setRealMm(Number(e.target.value))}
                className="border rounded w-full px-2 py-1 text-xs bg-white dark:bg-neutral-800 border-gray-300 dark:border-neutral-600"
              />
              <div className="text-[10px] text-gray-500 mt-1">
                Shift+Click drag line → Apply Calibration
              </div>
            </div>

            <button
              onClick={applyCalibration}
              className="w-full rounded-lg bg-gray-900 text-white py-1 text-xs hover:bg-black transition"
            >
              Apply Calibration
            </button>

            {mmPerPixel && (
              <div className="text-[10px] text-gray-500">
                Calibrated ✓ ({mmPerPixel.toFixed(3)} mm/px)
              </div>
            )}
          </div>
        </div>
      </div>

      {/* TOOLBARS */}
      {active && (
        <>
          <ToolbarDesktop
            active={active}
            mmPerPixel={mmPerPixel}
            moveStep={moveStep}
            setMoveStep={setMoveStep}
            scaleStep={scaleStep}
            setScaleStep={setScaleStep}
            rotateStep={rotateStep}
            setRotateStep={setRotateStep}
            moveActive={moveActive}
            scaleActive={scaleActive}
            rotateActive={rotateActive}
            deleteActive={deleteActive}
            flipActiveX={flipActiveX}
            flipActiveY={flipActiveY}
            toggleLockActive={toggleLockActive}
            setActiveScale={setActiveScale}
            setActiveRotation={setActiveRotation}
            scaleActiveByMm={scaleActiveByMm}
            rulerEnabled={rulerEnabled}
            toggleRuler={toggleRuler}
            deleteActiveRuler={ruler.deleteActiveRuler}
            toolbarPos={toolbarPos}
            setToolbarPos={setToolbarPos}
            toolbarRef={toolbarRef}
            toolbarDragRef={toolbarDragRef}
          />

          <ToolbarMobile
            moveStep={moveStep}
            scaleStep={scaleStep}
            rotateStep={rotateStep}
            moveActive={moveActive}
            scaleActive={scaleActive}
            rotateActive={rotateActive}
            deleteActive={deleteActive}
            rulerEnabled={rulerEnabled}
            toggleRuler={toggleRuler}
            deleteActiveRuler={ruler.deleteActiveRuler}
          />
        </>
      )}

      {/* STAGE */}
      <div
        ref={stageRef}
        className="absolute inset-0"
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onMouseDown={onStageMouseDown}
      >
        {background && (
          <Image
            src={background}
            alt="X-ray"
            fill
            unoptimized
            className="object-contain"
            style={{ filter: `contrast(${xrayContrast})` }}
          />
        )}

        {/* implants */}
        {objects.map((o) => (
          <ImplantObject
            key={o.id}
            object={o}
            active={o.id === activeId}
            onSelect={() => setActiveId(o.id)}
            onRotateDown={onRotateDown}
            onScaleDown={onScaleDown}
          />
        ))}

        {/* calibration line preview */}
        {calibrationLine && (
          <svg className="absolute inset-0 pointer-events-none">
            <line
              x1={calibrationLine.a.x}
              y1={calibrationLine.a.y}
              x2={calibrationLine.b.x}
              y2={calibrationLine.b.y}
              stroke="cyan"
              strokeWidth={2}
            />
          </svg>
        )}

        {/* ruler layer */}
        <RulerLayer rulers={ruler.rulers} activeId={ruler.activeRulerId} />
      </div>

      {/* MODAL */}
      <ImplantLibraryModal
        open={openImplantModal}
        onClose={() => setOpenImplantModal(false)}
        library={STEM_LIBRARY}
        onSelect={createImplant}
      />
    </div>
  );
}
