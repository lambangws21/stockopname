"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  onClickStep?: () => void;  // ← handler disini bro
}

export function StepCard({
  number,
  title,
  description,
  icon,
  color,
  onClickStep,
}: StepCardProps) {
  return (
    <motion.button
      onClick={onClickStep}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.25 }}
      className="flex w-full items-center rounded-2xl bg-white shadow-md overflow-hidden cursor-pointer text-left"
    >
      {/* LEFT COLOR BOX */}
      <div
        className={`flex flex-col justify-center px-6 py-6 text-white w-40 ${color}`}
      >
        <span className="text-sm font-semibold tracking-wide">STEP</span>
        <span className="text-4xl font-bold leading-tight">{number}</span>
      </div>

      {/* CONTENT */}
      <div className="flex-1 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="text-gray-700">{icon}</div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>

        <p className="text-gray-600 mt-1 text-sm">{description}</p>
      </div>
    </motion.button>
  );
}
