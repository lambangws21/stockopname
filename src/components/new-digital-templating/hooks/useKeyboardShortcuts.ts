import { useEffect } from "react";
import { ImplantCanvasObject } from "@/components/new-digital-templating/utils/implantLibrary";

export function useKeyboardShortcuts(params: {
  active: ImplantCanvasObject | null;
  move: (dx: number, dy: number) => void;
  scale: (delta: number) => void;
  rotate: (delta: number) => void;
  remove: () => void;
  clearActive: () => void;
}) {
  const { active, move, scale, rotate, remove, clearActive } = params;

  useEffect(() => {
    if (!active) return;

    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey && !e.ctrlKey) {
        if (e.key === "ArrowUp") move(0, -2);
        if (e.key === "ArrowDown") move(0, 2);
        if (e.key === "ArrowLeft") move(-2, 0);
        if (e.key === "ArrowRight") move(2, 0);
      }

      if (e.shiftKey) {
        if (e.key === "ArrowUp") scale(0.01);
        if (e.key === "ArrowDown") scale(-0.01);
      }

      if (e.ctrlKey) {
        if (e.key === "ArrowLeft") rotate(-1);
        if (e.key === "ArrowRight") rotate(1);
      }

      if (e.key === "Delete" || e.key === "Backspace") remove();
      if (e.key === "Escape") clearActive();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, move, scale, rotate, remove, clearActive]);
}
