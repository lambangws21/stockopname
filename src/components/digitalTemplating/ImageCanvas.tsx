"use client";

import React, { useReducer, useRef, useEffect } from "react";
import Image from "next/image";
import Toolbar from "@/components/digitalTemplating/Toolbar";
import { viewerReducer, initialViewerState } from "./viewerReducer";
import type { Point } from "./implantTypes";
import type { ImplantLibraryItem } from "@/components/digitalTemplating/implantLibrary";

const HIT_RADIUS = 40;
const ROTATE_HANDLE_OFFSET = 30;

export default function ImageCanvas({ image }: { image?: string }) {
  const [state, dispatch] = useReducer(viewerReducer, initialViewerState);
  const { canvasObjects, pxPerMm, calibration, activeTool } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const selectedId = useRef<string | null>(null);
  const activeHandle = useRef<"move" | "rotate" | null>(null);


  const onLockToggle = () => {
    if (!selectedId.current) return;
  
    const implant = canvasObjects.find(
      (o) => o.id === selectedId.current
    );
  
    if (!implant) return;
  
    dispatch({
      type: "UPDATE_IMPLANT",
      payload: {
        ...implant,
        locked: !implant.locked,
      },
    });
  };
  
  /* ================= ADD IMPLANT ================= */
  const addImplant = (item: ImplantLibraryItem) => {
    dispatch({
      type: "ADD_IMPLANT",
      payload: {
        id: crypto.randomUUID(),
        type: "implant",
        name: item.label,
        imageSrc: item.imageSrc,
        position: { x: 400, y: 400 },
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        opacity: 0.85,
        flipH: false,
        flipV: false,
        locked: false,
      },
    });
  };

  /* ================= DRAW ================= */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const el = containerRef.current;
    if (!canvas || !ctx || !el) return;

    canvas.width = el.clientWidth;
    canvas.height = el.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    /* ===== DRAW CALIBRATION ===== */
    if (calibration.points.length > 0) {
      const [a, b] = calibration.points;
      ctx.strokeStyle = "#00FFFF";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      if (b) ctx.lineTo(b.x, b.y);
      ctx.stroke();

      if (b) {
        const px = Math.hypot(b.x - a.x, b.y - a.y);
        ctx.fillStyle = "#00FFFF";
        ctx.fillText(`${px.toFixed(1)} px`, (a.x + b.x) / 2, (a.y + b.y) / 2);
      }
    }

    /* ===== DRAW IMPLANTS ===== */
    canvasObjects.forEach((o) => {
      if (o.type !== "implant") return;

      const img = new window.Image();
      img.src = o.imageSrc;
      if (!img.complete) return;

      ctx.save();
      ctx.translate(o.position.x, o.position.y);
      ctx.rotate((o.rotation * Math.PI) / 180);

      const scale = pxPerMm ?? 1;
      ctx.scale(o.scaleX * scale * (o.flipH ? -1 : 1), o.scaleY * scale);

      ctx.globalAlpha = o.opacity;
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      if (selectedId.current === o.id) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#00FFCC";
        ctx.strokeRect(-img.width / 2, -img.height / 2, img.width, img.height);

        ctx.beginPath();
        ctx.arc(0, -img.height / 2 - ROTATE_HANDLE_OFFSET, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#FFD700";
        ctx.fill();
      }

      ctx.restore();
    });
  }, [canvasObjects, calibration, pxPerMm]);

  /* ================= COORD ================= */
  const getPos = (e: React.MouseEvent): Point => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  /* ================= MOUSE ================= */
  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);

    /* CALIBRATION */
    if (activeTool === "calibration") {
      dispatch({
        type: "ADD_CALIBRATION_POINT",
        payload: pos,
      });
      return;
    }

    /* IMPLANT HIT */
    for (const o of [...canvasObjects].reverse()) {
      if (o.type !== "implant") continue;

      const dist = Math.hypot(pos.x - o.position.x, pos.y - o.position.y);
      if (dist < HIT_RADIUS) {
        selectedId.current = o.id;
        activeHandle.current = "move";
        return;
      }
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!selectedId.current || !activeHandle.current) return;

    const pos = getPos(e);
    const implant = canvasObjects.find((o) => o.id === selectedId.current);
    if (!implant || implant.locked) return;

    if (activeHandle.current === "move") {
      dispatch({
        type: "UPDATE_IMPLANT",
        payload: { ...implant, position: pos },
      });
    }
  };

  const onMouseUp = () => {
    activeHandle.current = null;
  };

  return (
    <div className="flex w-full h-[900px] bg-black">
      <Toolbar
  onAddImplant={addImplant}
  onLockToggle={onLockToggle}
/>


      <div
        ref={containerRef}
        className="relative flex-1"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
      >
        {image && (
          <Image
            src={image}
            alt="xray"
            fill
            className="object-contain pointer-events-none"
          />
        )}
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
