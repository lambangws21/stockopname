import { NextRequest, NextResponse } from "next/server";

const GAS_DEFAULT_URL =
  process.env.GAS_SUPER_SHEET_URL ||
  "https://script.google.com/macros/s/AKfycbzYixMvNT2jkoKl-P0973ijFkM0XCQRb8oEMyFKTB-BmbKd_HyirtYvdgO-v84xgVF3mA/exec";
const GAS_EXTERNAL_URL = process.env.GAS_SUPER_SHEET_EXTERNAL_URL || "";
const GAS_READ_TIMEOUT_MS = 25_000;
const GAS_WRITE_TIMEOUT_MS = 45_000;
const GAS_TRANSACTION_TIMEOUT_MS = 90_000;
const GAS_READ_CACHE_MS = 10_000;
const GAS_STALE_CACHE_MS = 5 * 60_000;

type ReadCacheEntry = {
  value: unknown;
  expiresAt: number;
  staleUntil: number;
};

const readCache = new Map<string, ReadCacheEntry>();
const readsInFlight = new Map<string, Promise<unknown>>();

export const maxDuration = 120;

class GasProxyError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "GasProxyError";
    this.status = status;
  }
}

async function fetchGasJson(
  url: string,
  init?: RequestInit,
  retrySafe = false,
  timeoutMs = GAS_READ_TIMEOUT_MS
) {
  const attempts = retrySafe ? 2 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        cache: "no-store",
        signal: controller.signal,
      });
      const text = await response.text();

      if (!response.ok) {
        throw new GasProxyError(
          `Google Apps Script merespons HTTP ${response.status}`,
          response.status >= 500 ? 502 : response.status
        );
      }

      try {
        return JSON.parse(text) as unknown;
      } catch {
        const isHtml = /<!doctype|<html/i.test(text);
        throw new GasProxyError(
          isHtml
            ? "Google Apps Script mengembalikan halaman HTML. Pastikan Web App sudah di-deploy dan aksesnya diatur ke Anyone."
            : "Respons Google Apps Script bukan JSON yang valid."
        );
      }
    } catch (error) {
      lastError = error;
      if (attempt + 1 >= attempts) break;
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof GasProxyError) throw lastError;
  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new GasProxyError(
      "Google Apps Script merespons terlalu lama. Snapshot terakhir tetap digunakan bila tersedia; coba muat ulang beberapa saat lagi.",
      504
    );
  }
  throw new GasProxyError(
    lastError instanceof Error
      ? `Google Apps Script tidak dapat dihubungi: ${lastError.message}`
      : "Google Apps Script tidak dapat dihubungi."
  );
}

function refreshGasRead(url: string) {
  const existing = readsInFlight.get(url);
  if (existing) return existing;

  const request = fetchGasJson(url, undefined, true)
    .then((value) => {
      const now = Date.now();
      readCache.set(url, {
        value,
        expiresAt: now + GAS_READ_CACHE_MS,
        staleUntil: now + GAS_STALE_CACHE_MS,
      });
      return value;
    })
    .finally(() => readsInFlight.delete(url));

  readsInFlight.set(url, request);
  return request;
}

async function fetchGasRead(url: string) {
  const cached = readCache.get(url);
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  if (cached && cached.staleUntil > now) {
    void refreshGasRead(url).catch(() => undefined);
    return cached.value;
  }

  try {
    return await refreshGasRead(url);
  } catch (error) {
    const fallback = readCache.get(url);
    if (fallback && fallback.staleUntil > Date.now()) return fallback.value;
    throw error;
  }
}

function clearReadCache() {
  readCache.clear();
}

function gasErrorResponse(error: unknown) {
  const status = error instanceof GasProxyError ? error.status : 500;
  const message =
    error instanceof Error ? error.message : "Terjadi kesalahan pada server.";

  console.error("[super-sheet]", error);
  return NextResponse.json({ status: "error", message }, { status });
}

function hasExternalParams(params: URLSearchParams) {
  return Boolean(
    params.get("sourceUrl") ||
      params.get("sourceId") ||
      params.get("sourceSheet") ||
      params.get("sourceGid")
  );
}

function hasExternalBody(body: Record<string, unknown>) {
  return Boolean(
    body?.sourceUrl ||
      body?.sourceId ||
      body?.sourceSheet ||
      body?.sourceGid
  );
}

function pickGasUrlForGet(req: NextRequest) {
  const isExternal = hasExternalParams(req.nextUrl.searchParams);
  if (isExternal && GAS_EXTERNAL_URL) return GAS_EXTERNAL_URL;
  return GAS_DEFAULT_URL;
}

function pickGasUrlForBody(body: Record<string, unknown>) {
  const isExternal = hasExternalBody(body);
  if (isExternal && GAS_EXTERNAL_URL) return GAS_EXTERNAL_URL;
  return GAS_DEFAULT_URL;
}

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function scoreMatch(
  row: Record<string, unknown>,
  ref: string,
  lot: string
) {
  const rowRef = normalizeToken(row.NoStok);
  const rowLot = normalizeToken(row.Batch);
  let score = 0;

  if (!rowRef || !ref) return 0;

  if (rowRef === ref) score += 100;
  else if (rowRef.includes(ref) || ref.includes(rowRef)) score += 60;

  if (lot) {
    if (rowLot === lot) score += 40;
    else if (rowLot.includes(lot) || lot.includes(rowLot)) score += 20;
  }

  return score;
}

export async function GET(req: NextRequest) {
  try {
    const action = req.nextUrl.searchParams.get("action");
    const gasUrl = pickGasUrlForGet(req);

    if (action === "scanLookup") {
      const sheet = req.nextUrl.searchParams.get("sheet") || "Sheet1";
      const refRaw = req.nextUrl.searchParams.get("ref") || "";
      const lotRaw = req.nextUrl.searchParams.get("lot") || "";
      const sourceUrl = req.nextUrl.searchParams.get("sourceUrl") || "";
      const sourceId = req.nextUrl.searchParams.get("sourceId") || "";
      const sourceSheet = req.nextUrl.searchParams.get("sourceSheet") || "";
      const sourceGid = req.nextUrl.searchParams.get("sourceGid") || "";
      const ref = normalizeToken(refRaw);
      const lot = normalizeToken(lotRaw);

      if (!ref) {
        return NextResponse.json(
          { status: "error", message: "Missing ref for scanLookup" },
          { status: 400 }
        );
      }

      const upstreamQuery = new URLSearchParams({ sheet });
      if (sourceUrl) upstreamQuery.set("sourceUrl", sourceUrl);
      if (sourceId) upstreamQuery.set("sourceId", sourceId);
      if (sourceSheet) upstreamQuery.set("sourceSheet", sourceSheet);
      if (sourceGid) upstreamQuery.set("sourceGid", sourceGid);

      const raw = (await fetchGasRead(
        `${gasUrl}?${upstreamQuery.toString()}`
      )) as { data?: Array<Record<string, unknown>> };
    const rows = Array.isArray(raw?.data)
      ? (raw.data as Array<Record<string, unknown>>)
      : [];

    const ranked = rows
      .map((row) => ({ row, _score: scoreMatch(row, ref, lot) }))
      .filter((item) => item._score > 0)
      .sort((a, b) => b._score - a._score);

      return NextResponse.json({
        status: "success",
        found: ranked.length > 0,
        best: ranked.length > 0 ? { ...ranked[0].row, _score: ranked[0]._score } : null,
        data: ranked.slice(0, 20).map((item) => ({ ...item.row, _score: item._score })),
        query: { sheet, ref: refRaw, lot: lotRaw, sourceUrl, sourceId, sourceSheet, sourceGid },
      });
    }

    const qs = req.nextUrl.searchParams.toString();
    return NextResponse.json(
      await fetchGasRead(`${gasUrl}?${qs}`)
    );
  } catch (error) {
    return gasErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const gasUrl = pickGasUrlForBody(body);
    const action = String(body.action || "");
    const transactionActions = new Set([
      "handoverSave",
      "handoverAccept",
      "handoverSettle",
      "handoverSupplement",
      "branchTransferSave",
      "branchTransferCorrect",
      "stockOpnamePost",
      "inventoryLocationSync",
      "inventoryConditionPost",
    ]);
    const timeoutMs = transactionActions.has(action)
      ? GAS_TRANSACTION_TIMEOUT_MS
      : GAS_WRITE_TIMEOUT_MS;
    clearReadCache();
    if (transactionActions.has(action)) {
      const forwardedFor = req.headers.get("x-forwarded-for");
      body.RequestMeta = {
        ipAddress:
          forwardedFor?.split(",")[0]?.trim() ||
          req.headers.get("x-real-ip") ||
          "Tidak tersedia",
        userAgent: req.headers.get("user-agent") || "Tidak tersedia",
      };
      if (
        body.SenderSignatureMeta &&
        typeof body.SenderSignatureMeta === "object"
      ) {
        body.SenderSignatureMeta = {
          ...(body.SenderSignatureMeta as Record<string, unknown>),
          ...(body.RequestMeta as Record<string, unknown>),
        };
      }
      if (
        body.ReceiverSignatureMeta &&
        typeof body.ReceiverSignatureMeta === "object"
      ) {
        body.ReceiverSignatureMeta = {
          ...(body.ReceiverSignatureMeta as Record<string, unknown>),
          ...(body.RequestMeta as Record<string, unknown>),
        };
      }
    }
    const result = await fetchGasJson(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, false, timeoutMs);
    clearReadCache();
    return NextResponse.json(result);
  } catch (error) {
    return gasErrorResponse(error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const gasUrl = pickGasUrlForBody(body);
    clearReadCache();
    const result = await fetchGasJson(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sheet: body.sheet ?? "Sheet1",
        No: body.No,
        ...body,
        methodOverride: "PUT",
      }),
    });
    clearReadCache();
    return NextResponse.json(result);
  } catch (error) {
    return gasErrorResponse(error);
  }
}


export async function DELETE(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const gasUrl = pickGasUrlForBody(body);
    clearReadCache();
    const result = await fetchGasJson(gasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, methodOverride: "DELETE" }),
    });
    clearReadCache();
    return NextResponse.json(result);
  } catch (error) {
    return gasErrorResponse(error);
  }
}
