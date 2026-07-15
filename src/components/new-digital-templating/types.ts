// digitalTemplating/types.ts
export type Point = { x: number; y: number };

export type ScaleDir = "top" | "bottom" | "left" | "right";

export type RulerObject = {
  id: string;
  type: "ruler";
  a: Point;
  b: Point;
  label?: string;
};

export type ImplantCanvasObject = {
  id: string;
  type: "implant";
  name: string;
  imageSrc: string;
  position: Point;
  scaleX: number;
  scaleY: number;
  flipX?: 1 | -1;
  flipY?: 1 | -1;
  rotation: number;
  opacity: number;
  locked: boolean;
  realLengthMm?: number;
};

export type CanvasObject = ImplantCanvasObject | RulerObject;
