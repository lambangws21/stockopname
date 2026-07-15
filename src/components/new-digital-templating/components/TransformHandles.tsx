// digitalTemplating/components/TransformHandles.tsx
"use client";

import { Rotate3d } from "lucide-react";
import type { ScaleDir } from "../types";

const HANDLES: { dir: ScaleDir; x: string; y: string }[] = [
  { dir: "top", x: "50%", y: "-4px" },
  { dir: "bottom", x: "50%", y: "100%" },
  { dir: "left", x: "-4px", y: "50%" },
  { dir: "right", x: "100%", y: "50%" },
];

export function TransformHandles({
  onRotateDown,
  onScaleDown,
}: {
  onRotateDown: (e: React.PointerEvent) => void;
  onScaleDown: (e: React.PointerEvent, dir: ScaleDir) => void;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* ROTATE */}
      <div
        onPointerDown={onRotateDown}
        className="pointer-events-auto absolute -top-10 left-1/2 -translate-x-1/2
        w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center
        cursor-ew-resize shadow-lg"
      >
        <Rotate3d />
      </div>

      {/* SCALE */}
      {HANDLES.map(({ dir, x, y }) => (
        <div
          key={dir}
          onPointerDown={(e) => onScaleDown(e, dir)}
          className={`pointer-events-auto absolute w-3 h-3 rounded-full
          bg-white border border-blue-700 ${
            dir === "left" || dir === "right" ? "cursor-ew-resize" : "cursor-ns-resize"
          }`}
          style={{
            left: x,
            top: y,
            transform: "translate(-50%, -50%)",
          }}
        />
      ))}
    </div>
  );
}
