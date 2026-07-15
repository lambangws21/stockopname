"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Bell,
  Sun,
  Moon,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  Box,
} from "lucide-react";

export default function Navbar({
  onOpenSearch,
}: {
  onOpenSearch?: () => void;
}) {
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const toggleDark = () => {
    document.documentElement.classList.toggle("dark");
    setDark(!dark);
  };

  return (
    <header className="sticky top-0 z-50">
      <div className="backdrop-blur bg-white/70 dark:bg-zinc-900/70 border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* LEFT */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMenuOpen(true)}
              className="md:hidden p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2 font-bold text-sm">
              <Box className="text-blue-600" />
              Stock<span className="text-blue-600">Hub</span>
            </div>
          </div>

          {/* CENTER */}
          <button
            onClick={onOpenSearch}
            className="
              hidden md:flex items-center gap-2
              px-3 py-1.5 rounded-lg border
              text-sm text-zinc-500
              hover:bg-zinc-100 dark:hover:bg-zinc-800
            "
          >
            <Search size={14} />
            Quick Search
            <kbd className="ml-2 text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700">
              ⌘K
            </kbd>
          </button>

          {/* RIGHT */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button className="p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 relative">
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
            </button>

            {/* USER */}
            <div className="relative">
              <button
                onClick={() => setUserOpen((x) => !x)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <div className="w-7 h-7 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-xs">
                  LS
                </div>
              </button>

              <AnimatePresence>
                {userOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 mt-2 w-44 rounded-xl border bg-white dark:bg-zinc-900 shadow-lg overflow-hidden"
                  >
                    <MenuItem icon={User} label="Profile" />
                    <MenuItem icon={Settings} label="Settings" />
                    <div className="border-t" />
                    <MenuItem icon={LogOut} label="Logout" danger />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-zinc-900 border-r z-50 p-4"
          >
            <div className="flex justify-between mb-6">
              <div className="font-bold">Menu</div>
              <button onClick={() => setMenuOpen(false)}>
                <X />
              </button>
            </div>

            <nav className="space-y-2">
              <NavItem label="Dashboard" />
              <NavItem label="Stock" />
              <NavItem label="History" />
              <NavItem label="Reports" />
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ================= SMALL ================= */

function NavItem({ label }: { label: string }) {
  return (
    <div className="px-3 py-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm cursor-pointer">
      {label}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";

function MenuItem({
  icon: Icon,
  label,
  danger,
}: {
  icon: LucideIcon;
  label: string;
  danger?: boolean;
}) {
  return (
    <button
      className={`w-full px-3 py-2 flex items-center gap-2 text-sm
        ${
          danger
            ? "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }
      `}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

