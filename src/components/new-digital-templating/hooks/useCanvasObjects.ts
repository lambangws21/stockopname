// digitalTemplating/hooks/useCanvasObjects.ts
"use client";

import { useCallback, useState } from "react";
import type { ImplantCanvasObject } from "../types";
import { snapAngle } from "../utils/snapAngle";

export function useCanvasObjects() {
  const [objects, setObjects] = useState<ImplantCanvasObject[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const active = objects.find((o) => o.id === activeId) ?? null;

  const addObject = useCallback((obj: ImplantCanvasObject) => {
    setObjects((p) => [...p, obj]);
    setActiveId(obj.id);
  }, []);

  const moveActive = useCallback(
    (dx: number, dy: number) => {
      if (!active) return;
      setObjects((p) =>
        p.map((o) =>
          o.id === active.id
            ? { ...o, position: { x: o.position.x + dx, y: o.position.y + dy } }
            : o
        )
      );
    },
    [active]
  );

  const scaleActive = useCallback(
    (delta: number) => {
      if (!active) return;
      setObjects((p) =>
        p.map((o) =>
          o.id === active.id
            ? {
                ...o,
                scaleX: Math.max(0.05, o.scaleX + delta),
                scaleY: o.locked
                  ? Math.max(0.05, o.scaleX + delta)
                  : o.scaleY,
              }
            : o
        )
      );
    },
    [active]
  );

  const setActiveScale = useCallback(
    (v: number) => {
      if (!active) return;
      const clamped = Math.max(0.05, v);
      setObjects((p) =>
        p.map((o) =>
          o.id === active.id
            ? o.locked
              ? { ...o, scaleX: clamped, scaleY: clamped }
              : { ...o, scaleX: clamped }
            : o
        )
      );
    },
    [active]
  );

  const rotateActive = useCallback(
    (delta: number) => {
      if (!active) return;
      setObjects((p) =>
        p.map((o) =>
          o.id === active.id
            ? { ...o, rotation: snapAngle(o.rotation + delta) }
            : o
        )
      );
    },
    [active]
  );

  const setActiveRotation = useCallback(
    (v: number) => {
      if (!active) return;
      setObjects((p) =>
        p.map((o) => (o.id === active.id ? { ...o, rotation: v } : o))
      );
    },
    [active]
  );

  const deleteActive = useCallback(() => {
    if (!active) return;
    setObjects((p) => p.filter((o) => o.id !== active.id));
    setActiveId(null);
  }, [active]);

  const flipActiveX = useCallback(() => {
    if (!active) return;
    setObjects((p) =>
      p.map((o) =>
        o.id === active.id
          ? { ...o, flipX: ((o.flipX ?? 1) * -1) as 1 | -1 }
          : o
      )
    );
  }, [active]);

  const flipActiveY = useCallback(() => {
    if (!active) return;
    setObjects((p) =>
      p.map((o) =>
        o.id === active.id
          ? { ...o, flipY: ((o.flipY ?? 1) * -1) as 1 | -1 }
          : o
      )
    );
  }, [active]);

  const toggleLockActive = useCallback(() => {
    if (!active) return;
    setObjects((p) =>
      p.map((o) => (o.id === active.id ? { ...o, locked: !o.locked } : o))
    );
  }, [active]);

  const scaleActiveByMm = useCallback(
    (targetMm: number, mmPerPixel: number | null) => {
      if (!active || !mmPerPixel) return;

      const IMAGE_BASE_PX = 300; // sesuai <Image width={300} />
      const currentRealMm = IMAGE_BASE_PX * active.scaleX * mmPerPixel;
      if (currentRealMm <= 0) return;

      const factor = targetMm / currentRealMm;

      setObjects((p) =>
        p.map((o) =>
          o.id === active.id
            ? {
                ...o,
                scaleX: o.scaleX * factor,
                scaleY: o.scaleY * factor,
                realLengthMm: targetMm,
              }
            : o
        )
      );
    },
    [active]
  );

  return {
    objects,
    setObjects,
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
  };
}
