"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
} from "framer-motion";

const ACTION_SELECTOR =
  'button:not(:disabled), a[href], [role="button"]:not([aria-disabled="true"]), summary';

export default function GlobalMotionProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const pressAction = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const action = target.closest<HTMLElement>(ACTION_SELECTOR);
      if (!action || action.dataset.motionDisabled === "true") return;

      void animate(
        action,
        { scale: [1, 0.97, 1] },
        { duration: 0.18, ease: "easeOut" }
      );
    };

    document.addEventListener("pointerdown", pressAction, { capture: true });
    return () => document.removeEventListener("pointerdown", pressAction, { capture: true });
  }, []);

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="min-h-dvh"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}
