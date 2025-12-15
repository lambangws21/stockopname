"use client";

import { useState } from "react";

type Props = {
  value: string | number;
  onSave: (v: string) => void;
};

export default function InlineEditCell({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value));

  if (!editing)
    return (
      <div
        onDoubleClick={() => setEditing(true)}
        className="cursor-pointer select-none"
      >
        {value}
      </div>
    );

  return (
    <input
      autoFocus
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        setEditing(false);
        onSave(val);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          setEditing(false);
          onSave(val);
        }
        if (e.key === "Escape") {
          setEditing(false);
          setVal(String(value));
        }
      }}
      className="w-full border rounded px-1 text-xs dark:bg-zinc-800"
    />
  );
}
