import { RefObject } from "react";

interface StageProps {
  children: React.ReactNode;
  stageRef: RefObject<HTMLDivElement | null>;
  onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}

export function Stage({
  children,
  stageRef,
  onPointerMove,
  onPointerUp,
  onPointerDown,
}: StageProps) {
  return (
    <div
      ref={stageRef}
      className="absolute inset-0"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerDown={onPointerDown}
    >
      {children}
    </div>
  );
}
