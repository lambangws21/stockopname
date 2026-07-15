// digitalTemplating/components/ImplantLibraryModal.tsx
"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import type { ImplantLibraryItem } from "@/components/digitalTemplating/implantLibrary";
import { useMemo, useState } from "react";

export function ImplantLibraryModal({
  open,
  onClose,
  library,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  library: ImplantLibraryItem[];
  onSelect: (item: ImplantLibraryItem) => void;
}) {
  const [search, setSearch] = useState("");
  const [openType, setOpenType] = useState<Record<"stem" | "cup", boolean>>({
    stem: true,
    cup: false,
  });
  const [openSystem, setOpenSystem] = useState<Record<string, boolean>>({});

  const collapseVariants: Variants = {
    open: {
      height: "auto",
      opacity: 1,
      transition: { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] },
    },
    collapsed: {
      height: 0,
      opacity: 0,
      transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
    },
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return library.filter((item) =>
      `${item.label} ${item.system} ${item.size}`.toLowerCase().includes(q)
    );
  }, [library, search]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<"stem" | "cup", Record<string, ImplantLibraryItem[]>>>(
      (acc, item) => {
        if (!acc[item.type]) acc[item.type] = {};
        if (!acc[item.type][item.system]) acc[item.type][item.system] = [];
        acc[item.type][item.system].push(item);
        return acc;
      },
      { stem: {}, cup: {} }
    );
  }, [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-3">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border shadow-xl overflow-hidden">
        {/* HEADER */}
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <span className="text-sm font-semibold">Implant Library</span>
          <button onClick={onClose}>✕</button>
        </div>

        {/* SEARCH */}
        <div className="p-3 border-b">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search implant…"
            className="w-full rounded-lg px-3 py-2 text-xs border bg-white dark:bg-neutral-800"
          />
        </div>

        <div className="max-h-[65svh] overflow-y-auto">
          {/* STEM */}
          <button
            onClick={() => setOpenType((p) => ({ ...p, stem: !p.stem }))}
            className="w-full px-4 py-2 text-left text-xs font-semibold bg-gray-100 dark:bg-neutral-800"
          >
            🦴 Stem
          </button>

          <AnimatePresence initial={false}>
            {openType.stem && (
              <motion.div
                variants={collapseVariants}
                initial="collapsed"
                animate="open"
                exit="collapsed"
                className="overflow-hidden"
              >
                {Object.entries(grouped.stem).map(([system, items]) => (
                  <div key={system}>
                    <button
                      onClick={() =>
                        setOpenSystem((p) => ({ ...p, [system]: !p[system] }))
                      }
                      className="w-full px-6 py-2 text-left text-[11px] font-semibold text-gray-600 dark:text-gray-300 border"
                    >
                      {openSystem[system] ? "▾" : "▸"} {system}
                    </button>

                    <AnimatePresence initial={false}>
                      {openSystem[system] && (
                        <motion.div
                          variants={collapseVariants}
                          initial="collapsed"
                          animate="open"
                          exit="collapsed"
                          className="overflow-hidden"
                        >
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                onSelect(item);
                                onClose();
                              }}
                              className="w-full px-8 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-neutral-800"
                            >
                              {item.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* CUP */}
          <button
            onClick={() => setOpenType((p) => ({ ...p, cup: !p.cup }))}
            className="w-full px-4 py-2 mt-2 text-left text-xs font-semibold bg-gray-100 dark:bg-neutral-800"
          >
            Cup
          </button>

          <AnimatePresence initial={false}>
            {openType.cup && (
              <motion.div
                variants={collapseVariants}
                initial="collapsed"
                animate="open"
                exit="collapsed"
                className="overflow-hidden"
              >
                {Object.entries(grouped.cup).map(([system, items]) => (
                  <div key={system}>
                    <div className="px-6 py-1 text-[11px] text-gray-500">
                      {system}
                    </div>
                    {items.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        className="w-full px-8 py-2 text-left text-xs hover:bg-gray-100 dark:hover:bg-neutral-800"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
