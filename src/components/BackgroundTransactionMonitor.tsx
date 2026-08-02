"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, X, XCircle } from "lucide-react";
import { listOnlineHandovers } from "@/lib/handover";
import {
  dismissBackgroundTransaction,
  readBackgroundTransactions,
  subscribeBackgroundTransactions,
  updateBackgroundTransaction,
  type BackgroundTransaction,
} from "@/lib/background-transactions";

const STATUS_ORDER = { DRAFT: 0, DIKIRIM: 1, DITERIMA: 2 } as const;

export default function BackgroundTransactionMonitor() {
  const [transactions, setTransactions] = useState<BackgroundTransaction[]>([]);
  const refresh = useCallback(
    () => setTransactions(readBackgroundTransactions()),
    []
  );

  useEffect(() => {
    const initialRefresh = window.setTimeout(refresh, 0);
    const unsubscribe = subscribeBackgroundTransactions(refresh);
    return () => {
      window.clearTimeout(initialRefresh);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    const checkPending = async () => {
      const pending = readBackgroundTransactions().filter(
        (row) => row.status === "PROCESSING"
      );
      await Promise.all(
        pending.map(async (transaction) => {
          try {
            const rows = await listOnlineHandovers(transaction.documentId);
            const document = rows[0];
            if (
              document &&
              STATUS_ORDER[document.Status] >=
                STATUS_ORDER[transaction.expectedStatus]
            ) {
              updateBackgroundTransaction(transaction.id, {
                status: "SUCCESS",
                message: "Data sudah dikonfirmasi tersimpan di Google Sheet.",
              });
            } else if (
              !document &&
              Date.now() - new Date(transaction.createdAt).getTime() >
                10 * 60 * 1000
            ) {
              updateBackgroundTransaction(transaction.id, {
                status: "FAILED",
                message:
                  "Dokumen tidak ditemukan setelah 10 menit. Muat ulang data stock sebelum mencoba kembali.",
              });
            }
          } catch {
            // Koneksi sementara gagal: biarkan PROCESSING dan cek lagi.
          }
        })
      );
    };
    void checkPending();
    const timer = window.setInterval(checkPending, 6000);
    return () => window.clearInterval(timer);
  }, []);

  const visible = transactions.slice(-3).reverse();
  if (!visible.length) return null;

  return (
    <aside className="fixed bottom-[max(5.25rem,calc(env(safe-area-inset-bottom)+4.5rem))] right-3 z-[160] w-[min(360px,calc(100vw-24px))] space-y-2 sm:bottom-4">
      {visible.map((transaction) => (
        <div
          key={transaction.id}
          className={`rounded-2xl border bg-white p-3 shadow-2xl dark:bg-zinc-900 ${
            transaction.status === "FAILED"
              ? "border-red-200"
              : transaction.status === "SUCCESS"
                ? "border-emerald-200"
                : "border-blue-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {transaction.status === "PROCESSING" ? (
              <LoaderCircle className="mt-0.5 shrink-0 animate-spin text-blue-600" size={18} />
            ) : transaction.status === "SUCCESS" ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={18} />
            ) : (
              <XCircle className="mt-0.5 shrink-0 text-red-600" size={18} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black">{transaction.label}</p>
              <p className="mt-0.5 truncate text-[9px] text-zinc-500">
                {transaction.documentId}
              </p>
              <p className="mt-1 text-[9px] leading-4 text-zinc-500">
                {transaction.message ||
                  "Sedang divalidasi dan disimpan. Anda boleh membuka halaman lain."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissBackgroundTransaction(transaction.id)}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border"
              aria-label="Tutup status transaksi"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      ))}
    </aside>
  );
}
