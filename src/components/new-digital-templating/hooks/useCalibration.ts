// digitalTemplating/hooks/useCalibration.ts
"use client";

import { useCallback, useMemo, useState } from "react";
import type { Point } from "../types";

export function useCalibration(stageRef: React.RefObject<HTMLDivElement | null>) {

  const [background, setBackground] = useState<string | null>(null);
  const [xrayContrast, setXrayContrast] = useState(1);

  const [calStart, setCalStart] = useState<Point | null>(null);
  const [calEnd, setCalEnd] = useState<Point | null>(null);
  const [realMm, setRealMm] = useState(100);
  const [mmPerPixel, setMmPerPixel] = useState<number | null>(null);

  const toLocal = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = stageRef.current?.getBoundingClientRect();
      if (!rect) return { x: clientX, y: clientY };
      return { x: clientX - rect.left, y: clientY - rect.top };
    },
    [stageRef]
  );
  

  const uploadBackground = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setBackground(r.result as string);
    r.readAsDataURL(f);
  }, []);

  const startCalibration = useCallback(
    (clientX: number, clientY: number) => {
      setCalStart(toLocal(clientX, clientY));
      setCalEnd(null);
    },
    [toLocal]
  );

  const updateCalibrationEnd = useCallback(
    (clientX: number, clientY: number) => {
      if (!calStart) return;
      setCalEnd(toLocal(clientX, clientY));
    },
    [calStart, toLocal]
  );

  const applyCalibration = useCallback(() => {
    if (!calStart || !calEnd) return;
    const px = Math.hypot(calEnd.x - calStart.x, calEnd.y - calStart.y);
    if (px <= 0) return;

    setMmPerPixel(realMm / px);
    setCalStart(null);
    setCalEnd(null);
  }, [calStart, calEnd, realMm]);

  const calibrationLine = useMemo(() => {
    if (!calStart || !calEnd) return null;
    return { a: calStart, b: calEnd };
  }, [calStart, calEnd]);

  return {
    // xray
    background,
    xrayContrast,
    setXrayContrast,
    uploadBackground,

    // calibration
    realMm,
    setRealMm,
    mmPerPixel,
    calibrationLine,

    startCalibration,
    updateCalibrationEnd,
    applyCalibration,

    // helper
    toLocal,
  };
}
