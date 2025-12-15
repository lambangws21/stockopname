"use client";

import { useState } from "react";
import { StockRow } from "@/types/stock";
import { Badge } from "@/components/ui/badge";
import RowActions from "@/components/RowActions";
import EditModal from "@/components/EditModal";

type Props = {
  row: StockRow;
  sheet: string;
  onReload: () => Promise<void>;
};

export default function MobileStockCard({
  row,
  sheet,
  onReload,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<StockRow | null>(null);

  return (
    <>
      {/* CARD */}
      <div className="rounded-xl border p-3 bg-white dark:bg-zinc-900 shadow-sm">
        <div className="font-semibold">{row.Deskripsi}</div>

        <div className="text-xs text-zinc-500 mt-1">
          REF {row.NoStok} • LOT {row.Batch}
        </div>

        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge>Qty {row.Qty}</Badge>
          <Badge variant="secondary">Total {row.TotalQty}</Badge>
          <Badge variant="destructive">Terpakai {row.TERPAKAI}</Badge>
          <Badge variant="outline">Refill {row.REFILL}</Badge>
        </div>

        <div className="mt-3 flex justify-end">
          <RowActions
            row={row}
            sheet={sheet}
            onReload={onReload}
            onEdit={(r) => {
              setSelectedRow(r);
              setEditOpen(true);
            }}
          />
        </div>
      </div>

      {/* EDIT MODAL */}
      <EditModal
        open={editOpen}
        row={selectedRow}
        onClose={() => setEditOpen(false)}
        onSave={async () => {
          setEditOpen(false);
          await onReload(); // 🔥 reload setelah save
        }}
      />
    </>
  );
}
