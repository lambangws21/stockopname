"use client";

import React, { useEffect, useMemo, useState } from "react";

/* =========================
   Types
========================= */
export type SeriesRef = {
  StudyInstanceUID: string;
  SeriesInstanceUID: string;
  SeriesDescription?: string;
  Modality?: string;
};

export type MeasurementItem = {
  uid: string;
  label: string; // e.g. "Length", "Angle", "ROI"
  valueText?: string; // e.g. "32.1 mm"
  referenceSeriesUID: string;
  createdAt?: number;
  locked?: boolean;
};

export type TrackingEvents =
  | { type: "TRACKED_SERIES_CHANGED"; trackedSeries: string[] }
  | { type: "TRACKING_ENABLED" }
  | { type: "TRACKING_DISABLED" };

export interface TrackedMeasurementsServiceLike {
  getTrackedSeries(): string[];
  isTrackingEnabled(): boolean;
  addTrackedSeries(seriesUID: string): void;
  removeTrackedSeries(seriesUID: string): void;
  clear(): void;
  subscribe(cb: (evt: TrackingEvents) => void): () => void;
}

export interface MeasurementServiceLike {
  getMeasurements(): MeasurementItem[];
  setLocked(uid: string, locked: boolean): void;
  remove(uid: string): void;
  subscribe(cb: () => void): () => void; // fire when measurements change
}

/* =========================
   Minimal in-memory services
========================= */
export function createInMemoryTrackedMeasurementsService(
  initial: string[] = []
): TrackedMeasurementsServiceLike {
  let tracked = [...initial];
  let enabled = tracked.length > 0;
  const listeners = new Set<(evt: TrackingEvents) => void>();

  const emit = (evt: TrackingEvents) => {
    listeners.forEach((l) => l(evt));
  };

  return {
    getTrackedSeries() {
      return tracked;
    },
    isTrackingEnabled() {
      return enabled;
    },
    addTrackedSeries(seriesUID) {
      if (tracked.includes(seriesUID)) return;

      tracked = [...tracked, seriesUID];
      const prevEnabled = enabled;
      enabled = tracked.length > 0;

      emit({ type: "TRACKED_SERIES_CHANGED", trackedSeries: tracked });
      if (!prevEnabled && enabled) emit({ type: "TRACKING_ENABLED" });
    },
    removeTrackedSeries(seriesUID) {
      const next = tracked.filter((s) => s !== seriesUID);
      if (next.length === tracked.length) return;

      tracked = next;
      const prevEnabled = enabled;
      enabled = tracked.length > 0;

      emit({ type: "TRACKED_SERIES_CHANGED", trackedSeries: tracked });
      if (prevEnabled && !enabled) emit({ type: "TRACKING_DISABLED" });
    },
    clear() {
      const prevEnabled = enabled;
      tracked = [];
      enabled = false;

      emit({ type: "TRACKED_SERIES_CHANGED", trackedSeries: tracked });
      if (prevEnabled) emit({ type: "TRACKING_DISABLED" });
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

export function createInMemoryMeasurementService(
  initial: MeasurementItem[] = []
): MeasurementServiceLike {
  let items = [...initial];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    getMeasurements() {
      return items;
    },
    setLocked(uid, locked) {
      items = items.map((m) => (m.uid === uid ? { ...m, locked } : m));
      emit();
    },
    remove(uid) {
      items = items.filter((m) => m.uid !== uid);
      emit();
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
  };
}

/* =========================
   Hook: useMeasurementTracking
========================= */
function useMeasurementTracking(params: {
  series: SeriesRef;
  trackedService: TrackedMeasurementsServiceLike;
  measurementService: MeasurementServiceLike;
}) {
  const { series, trackedService, measurementService } = params;

  const [trackedSeries, setTrackedSeries] = useState<string[]>(
    trackedService.getTrackedSeries()
  );
  const [trackingEnabled, setTrackingEnabled] = useState<boolean>(
    trackedService.isTrackingEnabled()
  );
  const [, setMeasurementsVersion] = useState<number>(0);

  useEffect(() => {
    const unsubTrack = trackedService.subscribe((evt) => {
      if (evt.type === "TRACKED_SERIES_CHANGED") setTrackedSeries(evt.trackedSeries);
      if (evt.type === "TRACKING_ENABLED") setTrackingEnabled(true);
      if (evt.type === "TRACKING_DISABLED") setTrackingEnabled(false);
    });

    const unsubMeas = measurementService.subscribe(() => {
      setMeasurementsVersion((v) => v + 1);
    });

    return () => {
      unsubTrack();
      unsubMeas();
    };
  }, [trackedService, measurementService]);

  const isTracked = trackedSeries.includes(series.SeriesInstanceUID);

  const trackedMeasurements = measurementService
    .getMeasurements()
    .filter((m) => m.referenceSeriesUID === series.SeriesInstanceUID)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return {
    trackingEnabled,
    trackedSeries,
    isTracked,
    trackedMeasurements,

    track() {
      trackedService.addTrackedSeries(series.SeriesInstanceUID);
    },
    untrack() {
      trackedService.removeTrackedSeries(series.SeriesInstanceUID);
    },
    clearAll() {
      trackedService.clear();
    },
    lock(uid: string, locked: boolean) {
      measurementService.setLocked(uid, locked);
    },
    remove(uid: string) {
      measurementService.remove(uid);
    },
  };
}

/* =========================
   UI Component
========================= */
export default function MeasurementTrackingPanel(props: {
  activeSeries: SeriesRef;
  seriesCatalog?: SeriesRef[];
  trackedService: TrackedMeasurementsServiceLike;
  measurementService: MeasurementServiceLike;
  onExportSR?: (seriesUID: string) => void;
}) {
  const { activeSeries, trackedService, measurementService, seriesCatalog, onExportSR } =
    props;

  const tracking = useMeasurementTracking({
    series: activeSeries,
    trackedService,
    measurementService,
  });

  const [query, setQuery] = useState<string>("");

  const filteredMeasurements = useMemo(() => {
    if (!query.trim()) return tracking.trackedMeasurements;
    const q = query.toLowerCase();
    return tracking.trackedMeasurements.filter((m) => {
      return (
        m.label.toLowerCase().includes(q) ||
        (m.valueText ?? "").toLowerCase().includes(q) ||
        m.uid.toLowerCase().includes(q)
      );
    });
  }, [query, tracking.trackedMeasurements]);

  const trackedSeriesDetails = useMemo(() => {
    const list = tracking.trackedSeries;

    if (!seriesCatalog?.length) return list.map((uid) => ({ uid, title: uid }));

    const map = new Map(seriesCatalog.map((s) => [s.SeriesInstanceUID, s]));
    return list.map((uid) => {
      const s = map.get(uid);
      const title =
        s?.SeriesDescription
          ? `${s.SeriesDescription}${s.Modality ? ` • ${s.Modality}` : ""}`
          : uid;
      return { uid, title };
    });
  }, [tracking.trackedSeries, seriesCatalog]);

  return (
    <div className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-neutral-200 p-4">
        <div>
          <div className="text-sm font-semibold text-neutral-900">
            Measurement Tracking
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            Active Series:{" "}
            <span className="font-mono">{activeSeries.SeriesInstanceUID}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!tracking.isTracked ? (
            <button
              onClick={tracking.track}
              className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
            >
              Track series
            </button>
          ) : (
            <button
              onClick={tracking.untrack}
              className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
            >
              Untrack
            </button>
          )}

          <button
            onClick={tracking.clearAll}
            className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* Tracking status */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="text-xs text-neutral-600">
          Tracking:{" "}
          <span
            className={
              tracking.trackingEnabled
                ? "font-semibold text-emerald-700"
                : "font-semibold text-neutral-500"
            }
          >
            {tracking.trackingEnabled ? "Enabled" : "Disabled"}
          </span>
          <span className="mx-2 text-neutral-300">•</span>
          This series:{" "}
          <span
            className={
              tracking.isTracked
                ? "font-semibold text-emerald-700"
                : "font-semibold text-neutral-500"
            }
          >
            {tracking.isTracked ? "Tracked" : "Not tracked"}
          </span>
        </div>

        <button
          onClick={() => onExportSR?.(activeSeries.SeriesInstanceUID)}
          className="rounded-xl bg-neutral-100 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-200"
        >
          Export SR
        </button>
      </div>

      {/* Tracked series list */}
      <div className="px-4 pb-3">
        <div className="text-xs font-semibold text-neutral-700">
          Tracked series
        </div>

        {trackedSeriesDetails.length === 0 ? (
          <div className="mt-2 rounded-xl border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
            No series tracked. Click <b>Track series</b> to start.
          </div>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {trackedSeriesDetails.map((s) => (
              <span
                key={s.uid}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
                  s.uid === activeSeries.SeriesInstanceUID
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-neutral-800"
                }`}
                title={s.uid}
              >
                {s.title}
                <button
                  type="button"
                  onClick={() => trackedService.removeTrackedSeries(s.uid)}
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    s.uid === activeSeries.SeriesInstanceUID
                      ? "bg-white/15 hover:bg-white/25"
                      : "bg-neutral-100 hover:bg-neutral-200"
                  }`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Measurements */}
      <div className="border-t border-neutral-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs font-semibold text-neutral-700">
            Measurements ({tracking.trackedMeasurements.length})
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search measurement..."
            className="w-48 rounded-xl border border-neutral-300 px-3 py-2 text-xs outline-none focus:border-neutral-900"
          />
        </div>

        {!tracking.isTracked ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
            Series ini belum di-track. Track dulu biar panel ini fokus ke
            measurements series aktif.
          </div>
        ) : filteredMeasurements.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 p-3 text-xs text-neutral-500">
            Belum ada measurement untuk series ini (atau filter kamu kosong).
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {filteredMeasurements.map((m) => (
              <div
                key={m.uid}
                className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-xs font-semibold text-neutral-900">
                    {m.label}
                    {m.valueText ? (
                      <span className="font-normal text-neutral-600">
                        {" "}
                        • {m.valueText}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 truncate font-mono text-[10px] text-neutral-500">
                    {m.uid}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => tracking.lock(m.uid, !m.locked)}
                    className="rounded-xl border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-50"
                  >
                    {m.locked ? "Unlock" : "Lock"}
                  </button>

                  <button
                    type="button"
                    onClick={() => tracking.remove(m.uid)}
                    className="rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
