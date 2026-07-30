"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  LoaderCircle,
  MessageCircle,
  PackagePlus,
  RefreshCcw,
  Stethoscope,
  Truck,
} from "lucide-react";
import { gasGET, gasGetHistory } from "@/lib/gas";
import { parseChanges } from "@/lib/history";
import type { HistoryRow } from "@/types/history";
import type { StockRow } from "@/types/stock";

type MovementReason =
  | "OPERASI"
  | "REFILL"
  | "MOBILISASI_KELUAR"
  | "MOBILISASI_MASUK";

type MovementEntry = {
  key: string;
  reason: MovementReason;
  timestamp: string;
  qty: number;
  before: number;
  after: number;
  note: string;
  row?: StockRow;
};

type UsedSummary = {
  key: string;
  row?: StockRow;
  totalUsed: number;
  operationCount: number;
  suggestedRefill: number;
  lastUsedAt: string;
};

const REASONS = new Set<MovementReason>([
  "OPERASI",
  "REFILL",
  "MOBILISASI_KELUAR",
  "MOBILISASI_MASUK",
]);

export default function LogisticsMovementSummary() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [historyResult, stockResult] = await Promise.all([
        gasGetHistory("Sheet1"),
        gasGET("Sheet1"),
      ]);
      setHistory(historyResult.data ?? []);
      setStock(stockResult.data ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Pergerakan stok gagal dimuat"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const movements = useMemo(
    () => buildMovementEntries(history, stock, days),
    [days, history, stock]
  );
  const usedSummary = useMemo(
    () => buildUsedSummary(movements),
    [movements]
  );
  const totals = useMemo(
    () => ({
      used: sumReason(movements, "OPERASI"),
      refill: sumReason(movements, "REFILL"),
      supportOut: sumReason(movements, "MOBILISASI_KELUAR"),
      supportIn: sumReason(movements, "MOBILISASI_MASUK"),
    }),
    [movements]
  );

  const shareText = useMemo(
    () => buildRefillRequestMessage(usedSummary, days),
    [days, usedSummary]
  );

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
            Terintegrasi Stock Management
          </p>
          <h2 className="mt-1 text-base font-black">
            Pergerakan & Permintaan Refill
          </h2>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            Ringkasan operasi, refill, dan support cabang.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
            className="h-10 rounded-xl border bg-white px-3 text-xs font-bold dark:bg-zinc-900"
          >
            <option value={7}>7 hari</option>
            <option value={30}>30 hari</option>
            <option value={90}>90 hari</option>
            <option value={0}>Semua</option>
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex size-10 items-center justify-center rounded-xl border"
            aria-label="Muat ulang pergerakan"
          >
            <RefreshCcw size={15} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
          <LoaderCircle size={18} className="animate-spin text-blue-600" />
          Memuat pergerakan…
        </div>
      ) : error ? (
        <div className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-px bg-zinc-200 dark:bg-zinc-800 sm:grid-cols-4">
            <MovementMetric
              icon={<Stethoscope size={16} />}
              label="Terpakai operasi"
              value={totals.used}
              tone="red"
            />
            <MovementMetric
              icon={<ArrowDownToLine size={16} />}
              label="Refill masuk"
              value={totals.refill}
              tone="emerald"
            />
            <MovementMetric
              icon={<Truck size={16} />}
              label="Support keluar"
              value={totals.supportOut}
              tone="amber"
            />
            <MovementMetric
              icon={<ArrowUpFromLine size={16} />}
              label="Support kembali"
              value={totals.supportIn}
              tone="blue"
            />
          </div>

          <div className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black">
                  Ringkasan Implant Terpakai
                </h3>
                <p className="text-[10px] text-zinc-500">
                  Saran refill mengikuti jumlah yang terpakai untuk operasi.
                </p>
              </div>
              <button
                type="button"
                disabled={usedSummary.length === 0}
                onClick={() =>
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(shareText)}`,
                    "_blank",
                    "noopener,noreferrer"
                  )
                }
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white disabled:opacity-40"
              >
                <MessageCircle size={15} />
                Bagikan permintaan
              </button>
            </div>

            {usedSummary.length === 0 ? (
              <div className="mt-3 rounded-xl border border-dashed p-6 text-center text-xs text-zinc-400">
                Belum ada implant terpakai pada periode ini.
              </div>
            ) : (
              <div className="mt-3 overflow-hidden rounded-xl border">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[780px] text-left text-xs">
                    <thead className="bg-slate-100 text-[9px] uppercase tracking-wide text-zinc-500 dark:bg-zinc-800">
                      <tr>
                        <th className="px-3 py-2.5">REF / Implant</th>
                        <th className="px-3 py-2.5">Brand</th>
                        <th className="px-3 py-2.5">LOT</th>
                        <th className="px-3 py-2.5 text-center">Operasi</th>
                        <th className="px-3 py-2.5 text-center">Terpakai</th>
                        <th className="px-3 py-2.5 text-center">Stok saat ini</th>
                        <th className="px-3 py-2.5 text-center">Saran refill</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usedSummary.map((item) => (
                        <tr key={item.key} className="border-t">
                          <td className="max-w-72 px-3 py-3">
                            <p className="font-black">
                              {item.row?.NoStok || `Baris ${item.key}`}
                            </p>
                            <p className="mt-0.5 line-clamp-2 text-[10px] text-zinc-500">
                              {item.row?.Deskripsi || "Deskripsi tidak tersedia"}
                            </p>
                          </td>
                          <td className="px-3 py-3 font-bold">
                            {item.row?.Brand || "-"}
                          </td>
                          <td className="px-3 py-3">
                            {item.row?.Batch || "-"}
                          </td>
                          <td className="px-3 py-3 text-center font-bold">
                            {item.operationCount}
                          </td>
                          <td className="px-3 py-3 text-center font-black text-red-600">
                            {item.totalUsed}
                          </td>
                          <td className="px-3 py-3 text-center font-black">
                            {Number(item.row?.TotalQty || 0)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 font-black text-blue-700">
                              <PackagePlus size={12} />
                              {item.suggestedRefill}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <SupportSummary movements={movements} />
          </div>
        </>
      )}
    </section>
  );
}

function SupportSummary({ movements }: { movements: MovementEntry[] }) {
  const support = movements
    .filter(
      (item) =>
        item.reason === "MOBILISASI_KELUAR" ||
        item.reason === "MOBILISASI_MASUK"
    )
    .slice(0, 8);
  if (support.length === 0) return null;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-black">Aktivitas Support Cabang</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {support.map((item) => (
          <article
            key={item.key}
            className="flex items-start gap-3 rounded-xl border p-3"
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
                item.reason === "MOBILISASI_KELUAR"
                  ? "bg-amber-50 text-amber-600"
                  : "bg-blue-50 text-blue-600"
              }`}
            >
              {item.reason === "MOBILISASI_KELUAR" ? (
                <Truck size={16} />
              ) : (
                <ArrowUpFromLine size={16} />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black">
                {item.row?.NoStok || `Baris #${item.key}`}
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-zinc-500">
                {item.reason === "MOBILISASI_KELUAR"
                  ? "Support keluar"
                  : "Kembali dari support"}{" "}
                · {item.qty} pcs
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] text-zinc-400">
                {item.note || item.row?.Deskripsi || "-"}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function MovementMetric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "red" | "emerald" | "amber" | "blue";
}) {
  const tones = {
    red: "text-red-600",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    blue: "text-blue-600",
  };
  return (
    <div className="bg-white p-3 dark:bg-zinc-900">
      <div className={`flex items-center justify-between ${tones[tone]}`}>
        {icon}
        <b className="text-xl">{value}</b>
      </div>
      <p className="mt-2 text-[9px] font-bold uppercase text-zinc-500">
        {label}
      </p>
    </div>
  );
}

function buildMovementEntries(
  history: HistoryRow[],
  stock: StockRow[],
  days: number
) {
  const stockByNo = new Map(stock.map((row) => [Number(row.No), row]));
  const cutoff = days
    ? Date.now() - days * 24 * 60 * 60 * 1000
    : Number.NEGATIVE_INFINITY;

  return history
    .filter((entry) => REASONS.has(entry.Action as MovementReason))
    .filter((entry) => {
      const time = new Date(entry.Timestamp).getTime();
      return Number.isNaN(time) || time >= cutoff;
    })
    .map((entry, index): MovementEntry => {
      const reason = entry.Action as MovementReason;
      const changes = parseChanges(entry.Changes);
      const total = changes.find((change) => change.field === "TotalQty");
      const before = toNumber(total?.before);
      const after = toNumber(total?.after);
      const counterField = reason === "OPERASI" ? "TERPAKAI" : "REFILL";
      const counter = changes.find((change) => change.field === counterField);
      const counterDelta = Math.abs(
        toNumber(counter?.after) - toNumber(counter?.before)
      );
      const qty = counterDelta || Math.abs(after - before);
      const note = String(
        changes.find((change) => change.field === "KET")?.after || ""
      );
      return {
        key: `${entry.Timestamp}-${entry.No}-${reason}-${index}`,
        reason,
        timestamp: entry.Timestamp,
        qty,
        before,
        after,
        note,
        row: stockByNo.get(Number(entry.No)),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
}

function buildUsedSummary(movements: MovementEntry[]): UsedSummary[] {
  const grouped = new Map<string, UsedSummary>();
  movements
    .filter((item) => item.reason === "OPERASI")
    .forEach((item) => {
      const key = item.row
        ? `${item.row.NoStok}:${item.row.Batch}`
        : String(item.key);
      const current = grouped.get(key) || {
        key,
        row: item.row,
        totalUsed: 0,
        operationCount: 0,
        suggestedRefill: 0,
        lastUsedAt: item.timestamp,
      };
      current.totalUsed += item.qty;
      current.operationCount += 1;
      current.suggestedRefill = current.totalUsed;
      if (
        new Date(item.timestamp).getTime() >
        new Date(current.lastUsedAt).getTime()
      ) {
        current.lastUsedAt = item.timestamp;
      }
      grouped.set(key, current);
    });
  return Array.from(grouped.values()).sort(
    (a, b) => b.totalUsed - a.totalUsed
  );
}

function sumReason(entries: MovementEntry[], reason: MovementReason) {
  return entries
    .filter((entry) => entry.reason === reason)
    .reduce((total, entry) => total + entry.qty, 0);
}

function buildRefillRequestMessage(items: UsedSummary[], days: number) {
  const lines = [
    "📦 *PERMINTAAN REFILL IMPLANT*",
    `Periode: ${days ? `${days} hari terakhir` : "Semua riwayat"}`,
    "",
  ];
  items.forEach((item, index) => {
    lines.push(
      `${index + 1}. ${item.row?.NoStok || item.key} | ${
        item.row?.Deskripsi || "-"
      }`,
      `   ${item.row?.Brand || "-"} | ${item.row?.Implant || "-"} | LOT ${
        item.row?.Batch || "-"
      }`,
      `   Terpakai: ${item.totalUsed} pcs | Stok: ${Number(
        item.row?.TotalQty || 0
      )} pcs | Permintaan refill: ${item.suggestedRefill} pcs`
    );
  });
  lines.push("", "Mohon diproses untuk menjaga ketersediaan kebutuhan operasi.");
  return lines.join("\n");
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
