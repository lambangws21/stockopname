// app/hybrideUi/page.tsx
"use client";
import KpiCards from "@/components/dashboard/KpiCard";
// import Navbar from "@/components/dashboard/Navbar";
// import QuickSearch from "@/components/QuickSearch";
import StockTablePremium from "@/components/TableDesktop";
// import { StockRow } from "@/types/stock";
// import { useState } from "react";

export default function Page() {
  // const [quickSearchOpen, setQuickSearchOpen] = useState(false);
  // const [open, setOpen] = useState(false);

  // const handleSelect = (row: StockRow) => {
  //   console.log("Selected:", row);
  //   setQuickSearchOpen(false);
  // };

  return (
    <main className="p-6 space-y-6">
       {/* BUTTON / HOTKEY TRIGGER */}
       {/* <button
        onClick={() => setQuickSearchOpen(true)}
        className="px-3 py-2 rounded border"
      >
        ⌘K Quick Search
      </button> */}


      {/* <Navbar onOpenSearch={() => setQuickSearchOpen(true)} /> */}

      <h1 className="text-2xl font-bold">📊 Stock Management</h1>

      <KpiCards sheet="Sheet1" />

      <StockTablePremium sheet="Sheet1" />

    </main>
  );
}
 