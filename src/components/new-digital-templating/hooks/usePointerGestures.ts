"use client";

import { useRef } from "react";
import type { ScaleDir, Point } from "../types";

export type RotateDragState = {
  x: number; // clientX saat start
  active: boolean;
  startRotation: number; // rotasi awal saat pointer down
};

export type ScaleDragState = {
  startY: number; // clientY saat start
  startScaleX: number;
  startScaleY: number;
  dir: ScaleDir | null;
};

export function usePointerGestures() {
  // drag implant
  const lastRef = useRef<Point>({ x: 0, y: 0 });
  const draggingRef = useRef(false);

  // rotate handle
  const rotateDragRef = useRef<RotateDragState>({
    x: 0,
    active: false,
    startRotation: 0,
  });

  // scale handles
  const scaleDragRef = useRef<ScaleDragState>({
    startY: 0,
    startScaleX: 1,
    startScaleY: 1,
    dir: null,
  });

  return { lastRef, draggingRef, rotateDragRef, scaleDragRef };
}
