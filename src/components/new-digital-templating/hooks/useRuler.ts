// digitalTemplating/hooks/useRuler.ts
"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { Point, RulerObject } from "../types";

type HitPart = "none" | "line" | "a" | "b";
export type RulerMode = "none" | "draw" | "edit";

function dist(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function pointToSegmentDistance(p: Point, a: Point, b: Point) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = p.x - a.x;
  const apy = p.y - a.y;

  const abLen2 = abx * abx + aby * aby;
  if (abLen2 === 0) return dist(p, a);

  const t = clamp((apx * abx + apy * aby) / abLen2, 0, 1);
  const proj = { x: a.x + abx * t, y: a.y + aby * t };
  return dist(p, proj);
}

export function useRuler(mmPerPixel: number | null) {
  const [rulers, setRulers] = useState<RulerObject[]>([]);
  const [activeRulerId, setActiveRulerId] = useState<string | null>(null);
  const [mode, setMode] = useState<RulerMode>("none");

  const active = useMemo(
    () => rulers.find((r) => r.id === activeRulerId) ?? null,
    [rulers, activeRulerId]
  );

  const drawingRef = useRef<{ drawing: boolean; start: Point | null }>({
    drawing: false,
    start: null,
  });

  const dragRef = useRef<{ dragging: boolean; part: HitPart; last: Point }>({
    dragging: false,
    part: "none",
    last: { x: 0, y: 0 },
  });

  const formatDistance = useCallback(
    (px: number) => {
      if (!mmPerPixel) return `${px.toFixed(1)} px`;
      return `${(px * mmPerPixel).toFixed(1)} mm`;
    },
    [mmPerPixel]
  );

  const labelFor = useCallback(
    (r: RulerObject) => formatDistance(dist(r.a, r.b)),
    [formatDistance]
  );

  const hitTest = useCallback(
    (p: Point): { id: string | null; part: HitPart } => {
      const HANDLE_R = 10;
      const LINE_T = 8;

      for (let i = rulers.length - 1; i >= 0; i--) {
        const r = rulers[i];
        if (dist(p, r.a) <= HANDLE_R) return { id: r.id, part: "a" };
        if (dist(p, r.b) <= HANDLE_R) return { id: r.id, part: "b" };
        if (pointToSegmentDistance(p, r.a, r.b) <= LINE_T)
          return { id: r.id, part: "line" };
      }
      return { id: null, part: "none" };
    },
    [rulers]
  );

  const addRuler = useCallback((a: Point, b: Point) => {
    const id = crypto.randomUUID();
    setRulers((p) => [...p, { id, type: "ruler", a, b }]);
    setActiveRulerId(id);
    return id;
  }, []);

  const deleteActiveRuler = useCallback(() => {
    if (!activeRulerId) return;
    setRulers((p) => p.filter((r) => r.id !== activeRulerId));
    setActiveRulerId(null);
  }, [activeRulerId]);

  const clearRulers = useCallback(() => {
    setRulers([]);
    setActiveRulerId(null);
  }, []);

  const startDraw = useCallback((p: Point) => {
    drawingRef.current.drawing = true;
    drawingRef.current.start = p;
    setMode("draw");
    setActiveRulerId(null);
  }, []);

  const updateDraw = useCallback(
    (p: Point) => {
      if (!drawingRef.current.drawing || !drawingRef.current.start) return;

      const start = drawingRef.current.start;

      // create once then update
      if (!activeRulerId) {
        addRuler(start, p);
        return;
      }

      setRulers((prev) =>
        prev.map((r) => (r.id === activeRulerId ? { ...r, a: start, b: p } : r))
      );
    },
    [activeRulerId, addRuler]
  );

  const endDraw = useCallback(() => {
    drawingRef.current.drawing = false;
    drawingRef.current.start = null;
    setMode("none");
  }, []);

  const beginDragOrEdit = useCallback(
    (p: Point) => {
      const hit = hitTest(p);
      if (!hit.id) {
        setActiveRulerId(null);
        return false;
      }
      setActiveRulerId(hit.id);
      dragRef.current.dragging = true;
      dragRef.current.part = hit.part;
      dragRef.current.last = p;
      setMode("edit");
      return true;
    },
    [hitTest]
  );

  const moveDragOrEdit = useCallback(
    (p: Point) => {
      if (!dragRef.current.dragging || !activeRulerId) return;

      const dx = p.x - dragRef.current.last.x;
      const dy = p.y - dragRef.current.last.y;

      setRulers((prev) =>
        prev.map((r) => {
          if (r.id !== activeRulerId) return r;

          if (dragRef.current.part === "line") {
            return {
              ...r,
              a: { x: r.a.x + dx, y: r.a.y + dy },
              b: { x: r.b.x + dx, y: r.b.y + dy },
            };
          }
          if (dragRef.current.part === "a") {
            return { ...r, a: { x: r.a.x + dx, y: r.a.y + dy } };
          }
          if (dragRef.current.part === "b") {
            return { ...r, b: { x: r.b.x + dx, y: r.b.y + dy } };
          }
          return r;
        })
      );

      dragRef.current.last = p;
    },
    [activeRulerId]
  );

  const endDragOrEdit = useCallback(() => {
    dragRef.current.dragging = false;
    dragRef.current.part = "none";
    setMode("none");
  }, []);

  const rulersWithLabels = useMemo(() => {
    return rulers.map((r) => ({ ...r, label: labelFor(r) }));
  }, [rulers, labelFor]);

  return {
    rulers: rulersWithLabels,
    activeRulerId,
    activeRuler: active ? { ...active, label: labelFor(active) } : null,
    mode,

    setActiveRulerId,
    addRuler,
    deleteActiveRuler,
    clearRulers,

    startDraw,
    updateDraw,
    endDraw,

    beginDragOrEdit,
    moveDragOrEdit,
    endDragOrEdit,
  };
}
