// digitalTemplating/components/ToolbarDesktop.tsx
"use client";

import {
  FlipHorizontal,
  FlipVertical,
  Grab,
  RotateCcwIcon,
  RotateCw,
  Trash,
} from "lucide-react";
import type { ImplantCanvasObject } from "../types";

function TB({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm
        ${
          danger
            ? "bg-red-50 text-red-600 hover:bg-red-100"
            : "bg-gray-100 hover:bg-gray-200 text-gray-700"
        }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-px bg-gray-500 my-1" />;
}

export function ToolbarDesktop({
  active,
  mmPerPixel,
  moveStep,
  setMoveStep,
  scaleStep,
  setScaleStep,
  rotateStep,
  setRotateStep,

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

  rulerEnabled,
  toggleRuler,
  deleteActiveRuler,

  toolbarPos,
  setToolbarPos,
  toolbarRef,
  toolbarDragRef,
}: {
  active: ImplantCanvasObject;

  mmPerPixel: number | null;

  moveStep: number;
  setMoveStep: (v: number) => void;

  scaleStep: number;
  setScaleStep: (v: number) => void;

  rotateStep: number;
  setRotateStep: (v: number) => void;

  moveActive: (dx: number, dy: number) => void;
  scaleActive: (delta: number) => void;
  rotateActive: (delta: number) => void;
  deleteActive: () => void;

  flipActiveX: () => void;
  flipActiveY: () => void;
  toggleLockActive: () => void;

  setActiveScale: (v: number) => void;
  setActiveRotation: (v: number) => void;

  scaleActiveByMm: (targetMm: number, mmPerPixel: number | null) => void;

  rulerEnabled: boolean;
  toggleRuler: () => void;
  deleteActiveRuler: () => void;

  toolbarPos: { x: number; y: number };
  setToolbarPos: (p: { x: number; y: number }) => void;

  // ✅ FIX: nullable ref biar cocok dengan useRef<HTMLDivElement | null>(null)
  toolbarRef: React.RefObject<HTMLDivElement | null>;
  toolbarDragRef: React.MutableRefObject<{ dragging: boolean; x: number; y: number }>;
}) {
  return (
    <div
      ref={toolbarRef}
      className="hidden md:block fixed z-40 select-none touch-none"
      style={{ left: toolbarPos.x, top: toolbarPos.y }}
      onPointerMove={(e) => {
        if (!toolbarDragRef.current.dragging) return;
        setToolbarPos({
          x: e.clientX - toolbarDragRef.current.x,
          y: e.clientY - toolbarDragRef.current.y,
        });
      }}
      onPointerUp={(e) => {
        toolbarDragRef.current.dragging = false;
        toolbarRef.current?.releasePointerCapture(e.pointerId);
      }}
    >
      <div className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur rounded-2xl shadow-xl border border-gray-200 dark:border-neutral-700 w-32">
        {/* HEADER */}
        <div
          className="cursor-move px-3 py-2 border-b border-gray-200 dark:border-neutral-700 text-xs font-semibold gap-2 select-none touch-none"
          onPointerDown={(e) => {
            toolbarDragRef.current.dragging = true;
            toolbarDragRef.current.x = e.clientX - toolbarPos.x;
            toolbarDragRef.current.y = e.clientY - toolbarPos.y;
            toolbarRef.current?.setPointerCapture(e.pointerId);
          }}
        >
          Implant Tool{" "}
          <span className="text-gray-400 inline-block align-middle">
            <Grab className="inline-block" />
          </span>
        </div>

        {/* CONTENT */}
        <div className="p-3 space-y-4 text-xs">
          {/* MOVE */}
          <div>
            <label className="font-medium">Move (px)</label>
            <input
              type="number"
              value={moveStep}
              onChange={(e) => setMoveStep(Number(e.target.value))}
              className="border rounded w-full px-2 py-1 mb-1"
            />

            <div className="grid grid-cols-3 gap-0 place-items-center">
              <div />
              <TB onClick={() => moveActive(0, -moveStep)}>↑</TB>
              <div />

              <TB onClick={() => moveActive(-moveStep, 0)}>←</TB>
              <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-neutral-800 text-[10px] text-gray-400 dark:text-gray-500 flex items-center justify-center">
                MOVE
              </div>
              <TB onClick={() => moveActive(moveStep, 0)}>→</TB>

              <div />
              <TB onClick={() => moveActive(0, moveStep)}>↓</TB>
              <div />
            </div>
          </div>

          <Divider />

          {/* SCALE */}
          <div>
            <label className="font-medium">Scale</label>

            <input
              type="range"
              min={0.1}
              max={3}
              step={0.01}
              value={active.scaleX}
              onChange={(e) => {
                const v = Number(e.target.value);
                setActiveScale(v);
                setScaleStep(Number((v - active.scaleX).toFixed(3)) || scaleStep);
              }}
              className="w-full"
            />

            {mmPerPixel && (
              <div className="mt-2 space-y-1">
                <label className="font-medium text-[11px]">Real Length (mm)</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={active.realLengthMm ?? ""}
                  onChange={(e) => scaleActiveByMm(Number(e.target.value), mmPerPixel)}
                  className="border rounded w-full px-2 py-1 text-xs"
                />
                <div className="text-[10px] text-gray-500">
                  Calibrated ✓ ({mmPerPixel.toFixed(3)} mm/px)
                </div>
              </div>
            )}

            <input
              type="number"
              step={0.01}
              value={active.scaleX}
              onChange={(e) => {
                const v = Number(e.target.value);
                setActiveScale(v);
                setScaleStep(Number((v - active.scaleX).toFixed(3)) || scaleStep);
              }}
              className="border rounded w-full px-2 py-1 mt-1"
            />

            <div className="flex gap-1 mt-1">
              <TB onClick={() => scaleActive(scaleStep)}>＋</TB>
              <TB onClick={() => scaleActive(-scaleStep)}>－</TB>
            </div>
          </div>

          <Divider />

          {/* ROTATE */}
          <div>
            <label className="font-medium">Rotate (°)</label>

            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={active.rotation}
              onChange={(e) => {
                const v = Number(e.target.value);
                setActiveRotation(v);
                setRotateStep(v - active.rotation || rotateStep);
              }}
              className="w-full"
            />

            <input
              type="number"
              step={1}
              value={active.rotation}
              onChange={(e) => {
                const v = Number(e.target.value);
                setActiveRotation(v);
                setRotateStep(v - active.rotation || rotateStep);
              }}
              className="border rounded w-full px-2 py-1 mt-1"
            />

            <div className="flex gap-1 mt-1">
              <TB onClick={() => rotateActive(rotateStep)}>
                <RotateCw />
              </TB>
              <TB onClick={() => rotateActive(-rotateStep)}>
                <RotateCcwIcon />
              </TB>
            </div>
          </div>

          <Divider />

          {/* FLIP */}
          <div className="flex gap-1">
            <TB onClick={flipActiveX}>
              <FlipHorizontal />
            </TB>
            <TB onClick={flipActiveY}>
              <FlipVertical />
            </TB>
          </div>

          <Divider />

          {/* RULER */}
          <div className="flex gap-1">
            <TB onClick={toggleRuler}>{rulerEnabled ? "📏 ON" : "📏"}</TB>
            <TB danger onClick={deleteActiveRuler}>
              R✕
            </TB>
          </div>

          <Divider />

          {/* LOCK + DELETE */}
          <div className="items-center flex justify-start gap-2">
            <TB onClick={toggleLockActive}>
              {active.locked ? "🔒 Lock" : "🔓 Unlock"}
            </TB>
            <TB danger onClick={deleteActive}>
              <Trash />
            </TB>
          </div>
        </div>
      </div>
    </div>
  );
}
