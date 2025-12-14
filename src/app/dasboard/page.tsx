"use client";

import { useEffect } from "react";
import { SheetTable } from "@/components/sheet/sheetTable";
import { SheetFormModal } from "@/components/sheet/sheetFormModal";
import { SheetDeleteModal } from "@/components/sheet/sheetDeleteModal";
import { useSheetStore } from "@/components/sheet/useSheetStore";
import { Button } from "@/components/ui/button";
import { SheetList } from "@/components/sheet/sheetList";

export default function DashboardPage() {
  const { fetchData, openAddModal } = useSheetStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard Biaya</h1>

        <Button onClick={openAddModal}>+ Tambah Data</Button>
      </div>

      {/* <SheetTable /> */}
      <SheetList/>

      <SheetFormModal />
      <SheetDeleteModal />
    </div>
  );
}
