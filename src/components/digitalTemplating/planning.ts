import type { Point } from "./implantTypes";

export type ImplantPlanning = {
  id: string;
  imageSrc: string;
  position: Point;
  rotation: number;
  opacity: number;
  flipH: boolean;
};

export type PlanningResult = {
  createdAt: string;
  imageSrc: string;
  pxPerMm: number;
  implants: ImplantPlanning[];
};
