// digitalTemplating/components/ImplantObject.tsx
"use client";

import Image from "next/image";
import type { ImplantCanvasObject, ScaleDir } from "../types";
import { TransformHandles } from "./TransformHandles";

export function ImplantObject({
  object,
  active,
  onSelect,
  onRotateDown,
  onScaleDown,
}: {
  object: ImplantCanvasObject;
  active: boolean;
  onSelect: () => void;
  onRotateDown: (e: React.PointerEvent) => void;
  onScaleDown: (e: React.PointerEvent, dir: ScaleDir) => void;
}) {
  return (
    <div
      onMouseDown={onSelect}
      style={{
        transform: `
          translate(${object.position.x}px, ${object.position.y}px)
          scale(
            ${object.scaleX * (object.flipX ?? 1)},
            ${object.scaleY * (object.flipY ?? 1)}
          )
          rotate(${object.rotation}deg)
        `,
        transformOrigin: "center",
        opacity: object.opacity,
      }}
      className={`absolute ${active ? "ring-2 ring-blue-500" : ""}`}
    >
      {active && (
        <TransformHandles onRotateDown={onRotateDown} onScaleDown={onScaleDown} />
      )}

      <Image
        src={object.imageSrc}
        alt={object.name}
        width={300}
        height={300}
        unoptimized
        className="pointer-events-none p-8"
        style={{ mixBlendMode: "screen", width: "auto", height: "auto" }}
      />
    </div>
  );
}
