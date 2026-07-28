"use client";

import { FormEvent, ReactNode, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

const ACCESS_CODE = "Denpasar.2026";
const SESSION_KEY = "customer-mapping-access";
const ACCESS_EVENT = "customer-mapping-access-change";

function subscribeAccess(callback: () => void) {
  window.addEventListener(ACCESS_EVENT, callback);
  return () => window.removeEventListener(ACCESS_EVENT, callback);
}

function getAccessSnapshot() {
  return sessionStorage.getItem(SESSION_KEY) === "granted";
}

export default function CustomerMappingAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const unlocked = useSyncExternalStore(
    subscribeAccess,
    getAccessSnapshot,
    () => false
  );
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (code === ACCESS_CODE) {
      sessionStorage.setItem(SESSION_KEY, "granted");
      window.dispatchEvent(new Event(ACCESS_EVENT));
      setError("");
      return;
    }

    setError("Kode akses tidak sesuai.");
  };

  if (unlocked) return children;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 dark:bg-zinc-950">
      <section className="w-full max-w-sm overflow-hidden rounded-3xl border bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
        <div className="bg-linear-to-br from-slate-950 via-blue-950 to-indigo-900 px-6 py-8 text-center text-white">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20">
            <LockKeyhole size={26} />
          </div>
          <h1 className="mt-4 text-xl font-bold">Customer Mapping</h1>
          <p className="mt-1 text-xs leading-5 text-blue-100">
            Masukkan kode akses untuk membuka data customer.
          </p>
        </div>

        <form onSubmit={unlock} className="space-y-4 p-5 sm:p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-zinc-700 dark:text-zinc-200">
              Kode akses
            </span>
            <input
              type="password"
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              autoFocus
              autoComplete="current-password"
              placeholder="Masukkan kode"
              className="h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:bg-zinc-950"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!code.trim()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ShieldCheck size={17} />
            Buka Customer Mapping
          </button>

          <Link
            href="/"
            className="inline-flex h-10 w-full items-center justify-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
          >
            <ArrowLeft size={14} />
            Kembali ke Stock
          </Link>
        </form>
      </section>
    </main>
  );
}
