"use client";

import { useEffect, useState } from "react";
import { HistoryRow } from "@/types/history";
import { parseChanges } from "@/lib/history";

export default function HistoryTable() {
  const [data, setData] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/super-sheet?action=history", {
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json) => {
        if (!alive) return;
        setData(json.data ?? []);
        setError(null);
      })
      .catch((e) => {
        if (!alive) return;
        setError(e.message);
        setData([]);
      })
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <div className="p-4 text-sm">Loading history…</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }

  if (data.length === 0) {
    return <div className="p-4 text-sm text-zinc-500">Tidak ada history</div>;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
      <div className="px-4 py-2 border-b font-semibold text-sm">
        📜 History Log
      </div>

      <table className="w-full text-xs">
        <thead className="bg-zinc-100 dark:bg-zinc-800">
          <tr>
            <th className="px-3 py-2 text-left">Waktu</th>
            <th className="px-3 py-2 text-left">Action</th>
            <th className="px-3 py-2 text-left">Sheet</th>
            <th className="px-3 py-2 text-left">No</th>
            <th className="px-3 py-2 text-left">Perubahan</th>
            <th className="px-3 py-2 text-left">By</th>
          </tr>
        </thead>

        <tbody>
          {data.map((h, i) => {
            const changes = parseChanges(h.Changes);

            return (
              <tr
                key={`${h.Timestamp}-${i}`}
                className="border-t align-top"
              >
                <td className="px-3 py-2 whitespace-nowrap">
                  {new Date(h.Timestamp).toLocaleString()}
                </td>

                <td className="px-3 py-2 font-semibold">
                  {h.Action || "-"}
                </td>

                <td className="px-3 py-2">{h.Sheet || "-"}</td>

                <td className="px-3 py-2">{h.No || "-"}</td>

                <td className="px-3 py-2">
                  {changes.length === 0 ? (
                    <span className="italic text-zinc-400">
                      Tidak ada detail
                    </span>
                  ) : (
                    <ul className="space-y-1">
                      {changes.map((c, idx) => (
                        <li key={idx}>
                          <b>{c.field}</b>
                          {c.before && (
                            <>
                              :{" "}
                              <span className="line-through text-red-500">
                                {c.before}
                              </span>
                            </>
                          )}
                          {c.after && (
                            <>
                              {" → "}
                              <span className="text-green-600 font-semibold">
                                {c.after}
                              </span>
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </td>

                <td className="px-3 py-2">{h.By || "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
