// src/components/digitalTemplating/Toolbar.tsx
"use client";

import { motion } from "framer-motion";
import {
  ImplantLibraryItem,
  STEM_LIBRARY,
} from "@/components/digitalTemplating/implantLibrary";

export type ToolbarProps = {
  onAddImplant: (item: ImplantLibraryItem) => void;
  onLockToggle: () => void;

  onFlip?: () => void;
  onSavePlanning?: () => void;
  onExportPNG?: () => void;
};

export default function Toolbar({
  onAddImplant,
  onLockToggle,
  onFlip,
  onSavePlanning,
  onExportPNG,
}: ToolbarProps) {
  return (
    <motion.div
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-24 bg-gray-800 p-2 flex flex-col gap-2"
    >
      {/* ===== TITLE ===== */}
      <p className="text-xs text-white text-center font-semibold">
        ML Taper
      </p>

      {/* ===== IMPLANT LIST ===== */}
      {STEM_LIBRARY.map((stem) => (
        <motion.button
          key={stem.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onAddImplant(stem)}
          className="bg-gray-700 hover:bg-gray-600 text-white text-[11px] py-1 rounded"
        >
          {stem.label}
        </motion.button>
      ))}

      {/* ===== LOCK RATIO ===== */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLockToggle}
        className="bg-blue-600 hover:bg-blue-500 text-white text-xs py-1 rounded mt-2"
      >
        Lock Ratio
      </motion.button>

      {/* ===== FLIP ===== */}
      {onFlip && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onFlip}
          className="bg-orange-600 hover:bg-orange-500 text-white text-[11px] py-1 rounded"
        >
          Flip
        </motion.button>
      )}

      {/* ===== SAVE ===== */}
      {onSavePlanning && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onSavePlanning}
          className="bg-green-600 hover:bg-green-500 text-white text-[11px] py-1 rounded"
        >
          Save
        </motion.button>
      )}

      {/* ===== EXPORT ===== */}
      {onExportPNG && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExportPNG}
          className="bg-purple-600 hover:bg-purple-500 text-white text-[11px] py-1 rounded"
        >
          Export
        </motion.button>
      )}
    </motion.div>
  );
}
