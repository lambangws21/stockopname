"use client";

import { useMemo, useState } from "react";
import { ExternalLink, RefreshCcw, Sheet, X } from "lucide-react";

type ExternalSheetSlideProps = {
  sourceUrl: string;
  title?: string;
  initialOpen?: boolean;
};

function parseSpreadsheetId(url: string) {
  const match = String(url || "").match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match && match[1] ? match[1] : "";
}

function parseGid(url: string) {
  const match = String(url || "").match(/[?&#]gid=(\d+)/);
  return match && match[1] ? match[1] : "";
}

function toEmbedUrl(sourceUrl: string) {
  const raw = String(sourceUrl || "").trim();
  if (!raw) return "";

  if (raw.includes("/pubhtml")) {
    const hasQuery = raw.includes("?");
    const suffix = [
      raw.includes("single=") ? "" : "single=true",
      raw.includes("widget=") ? "" : "widget=true",
      raw.includes("headers=") ? "" : "headers=false",
    ]
      .filter(Boolean)
      .join("&");

    if (!suffix) return raw;
    return `${raw}${hasQuery ? "&" : "?"}${suffix}`;
  }

  if (raw.includes("/preview")) return raw;

  const id = parseSpreadsheetId(raw);
  if (!id) return raw;

  const gid = parseGid(raw);
  const q = new URLSearchParams();
  if (gid) q.set("gid", gid);
  q.set("single", "true");

  return `https://docs.google.com/spreadsheets/d/${id}/preview?${q.toString()}`;
}

export default function ExternalSheetSlide({
  sourceUrl,
  title = "Sheet External",
  initialOpen = false,
}: ExternalSheetSlideProps) {
  const [open, setOpen] = useState(initialOpen);
  const [frameKey, setFrameKey] = useState(0);

  const embedUrl = useMemo(() => toEmbedUrl(sourceUrl), [sourceUrl]);

  if (!String(sourceUrl || "").trim()) return null;

  return (
    <section className="rounded-xl border bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
          <Sheet size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="text-[11px] text-zinc-500">
            Preview data sumber
          </div>
        </div>
        <span className="rounded-lg border px-3 py-2 text-xs font-semibold">
          Buka
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[10000] flex justify-end bg-zinc-950/55 backdrop-blur-sm">
          <button
            type="button"
            aria-label="Tutup preview sheet"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-full flex-col bg-white shadow-2xl dark:bg-zinc-900 sm:max-w-3xl">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-bold sm:text-base">{title}</h2>
                <p className="text-[11px] text-zinc-500">Preview langsung dari Google Sheet</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                <X size={17} />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b px-4 py-2 sm:px-5">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
            >
              <ExternalLink size={12} />
              Buka Link Asli
            </a>
            <button
              type="button"
              onClick={() => setFrameKey((v) => v + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
            >
              <RefreshCcw size={12} />
              Reload
            </button>
          </div>

          <div className="min-h-0 flex-1 bg-zinc-100 p-2 dark:bg-zinc-950 sm:p-3">
            <iframe
              key={frameKey}
              src={embedUrl}
              title={title}
              className="h-full w-full rounded-lg border bg-white"
              loading="lazy"
            />
          </div>
          </aside>
        </div>
      )}
    </section>
  );
}
