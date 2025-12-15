"use client";

import { StockColumn } from "@/types/column";

type Props = {
  columns: StockColumn[];
  setColumns: React.Dispatch<React.SetStateAction<StockColumn[]>>;
};


// type Column = {
//   key: string;
//   label: string;
//   visible: boolean;
// };


export default function ColumnToggle({ columns, setColumns }: Props) {
  return (
    <div className="flex flex-wrap gap-2 text-xs">
      {columns.map((c) => (
        <label key={c.key} className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={c.visible}
            onChange={() =>
              setColumns(
                columns.map((col) =>
                  col.key === c.key
                    ? { ...col, visible: !col.visible }
                    : col
                )
              )
            }
          />
          {c.label}
        </label>
      ))}
    </div>
  );
}
