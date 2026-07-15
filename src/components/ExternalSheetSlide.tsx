"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, RefreshCcw } from "lucide-react";

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
    <section className="rounded-xl border bg-white dark:bg-zinc-900 p-4 space-y-3 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3"
      >
        <div className="text-left">
          <div className="font-semibold text-sm md:text-base">{title}</div>
          <div className="text-xs text-zinc-500">
            Preview live dari Google Sheet (slide panel)
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {open ? "Tutup" : "Buka"}
        </span>
      </button>

      <div
        className={`grid transition-all duration-300 ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
            >
              <ExternalLink size={12} />
              Buka Link Asli
            </a>
            <button
              type="button"
              onClick={() => setFrameKey((v) => v + 1)}
              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
            >
              <RefreshCcw size={12} />
              Reload
            </button>
          </div>

          <div className="rounded-xl border overflow-hidden bg-zinc-100 dark:bg-zinc-950">
            <iframe
              key={frameKey}
              src={embedUrl}
              title={title}
              className="w-full h-[420px] md:h-[560px] bg-white"
              loading="lazy"
            />
          </div>

          <p className="text-[11px] text-zinc-500">
            Jika kosong, pastikan sheet sumber punya akses view / publish.
          </p>
        </div>
      </div>
    </section>
  );
}

