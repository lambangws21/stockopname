// components/dashboard/HistoryTable.tsx
"use client";

import { useStockHistory } from "@/hooks/useStockHistory";

export default function HistoryTable({
  sheet,
  No,
}: {
  sheet: string;
  No: number;
}) {
  const { data, loading, error } = useStockHistory(sheet, No);

  if (loading) return <div className="text-xs">Loading history…</div>;
  if (error) return <div className="text-xs text-red-500">{error}</div>;
  if (data.length === 0)
    return <div className="text-xs text-zinc-400">Tidak ada history</div>;

  return (
    <table className="min-w-full text-xs border rounded-md mt-2">
      <thead className="bg-zinc-100 dark:bg-zinc-800">
        <tr>
          <th className="px-3 py-2">Waktu</th>
          <th className="px-3 py-2">Aksi</th>
          <th className="px-3 py-2">User</th>
          <th className="px-3 py-2">Before</th>
          <th className="px-3 py-2">After</th>
        </tr>
      </thead>
      <tbody>
        {data.map((h, i) => (
          <tr key={`${h.Timestamp}-${i}`} className="border-t">
            <td className="px-3 py-2">
              {new Date(h.Timestamp).toLocaleString()}
            </td>
            <td className="px-3 py-2 font-semibold">{h.Action}</td>
            <td className="px-3 py-2">{h.By}</td>
            <td className="px-3 py-2">
              <pre className="bg-zinc-100 p-2 rounded max-w-xs overflow-auto">
                {JSON.stringify(JSON.parse(h.Before || "{}"), null, 2)}
              </pre>
            </td>
            <td className="px-3 py-2">
              <pre className="bg-zinc-100 p-2 rounded max-w-xs overflow-auto">
                {JSON.stringify(JSON.parse(h.After || "{}"), null, 2)}
              </pre>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
