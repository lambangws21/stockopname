// digitalTemplating/components/ToolbarMobile.tsx
"use client";

import { ArrowLeft, ArrowRight, Minus, Plus, RotateCw } from "lucide-react";

function MB({
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
      className={`w-11 h-11 rounded-full flex items-center justify-center text-lg
      ${danger ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-800"}`}
    >
      {children}
    </button>
  );
}

export function ToolbarMobile({
  moveStep,
  scaleStep,
  rotateStep,
  moveActive,
  scaleActive,
  rotateActive,
  deleteActive,

  rulerEnabled,
  toggleRuler,
  deleteActiveRuler,
}: {
  moveStep: number;
  scaleStep: number;
  rotateStep: number;

  moveActive: (dx: number, dy: number) => void;
  scaleActive: (delta: number) => void;
  rotateActive: (delta: number) => void;
  deleteActive: () => void;

  rulerEnabled: boolean;
  toggleRuler: () => void;
  deleteActiveRuler: () => void;
}) {
  return (
    <div className="md:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="bg-white/95 dark:bg-neutral-900/95 backdrop-blur rounded-xl shadow-xl px-4 py-3 flex gap-3 items-center border border-gray-200 dark:border-neutral-700">
        <MB onClick={() => moveActive(-moveStep, 0)}>
          <ArrowLeft />
        </MB>
        <MB onClick={() => moveActive(moveStep, 0)}>
          <ArrowRight />
        </MB>
        <MB onClick={() => scaleActive(scaleStep)}>
          <Plus />
        </MB>
        <MB onClick={() => scaleActive(-scaleStep)}>
          <Minus />
        </MB>
        <MB onClick={() => rotateActive(rotateStep)}>
          <RotateCw />
        </MB>

        <MB onClick={toggleRuler}>{rulerEnabled ? "📏" : "📐"}</MB>
        <MB danger onClick={deleteActiveRuler}>
          R✕
        </MB>

        <MB danger onClick={deleteActive}>
          🗑
        </MB>
      </div>
    </div>
  );
}
