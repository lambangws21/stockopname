"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  Hospital,
  LayoutGrid,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
  Search,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import {
  listOnlineHandovers,
  settleOnlineHandover,
} from "@/lib/handover";
import type { HandoverItem, OnlineHandover } from "@/types/handover";

type ItemEntry = { item: HandoverItem; itemIndex: number };

export default function HospitalStockPage() {
  const [documents, setDocuments] = useState<OnlineHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [hospitalFilter, setHospitalFilter] = useState("ALL");
  const [documentId, setDocumentId] = useState("");
  const [usedKeys, setUsedKeys] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [visibleCount, setVisibleCount] = useState(20);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [lotConfirmed, setLotConfirmed] = useState(false);
  const [completionNote, setCompletionNote] = useState("");
  const [clockNow, setClockNow] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [isIphone, setIsIphone] = useState(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocuments(await listOnlineHandovers());
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Stock rumah sakit gagal dimuat"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setClockNow(Date.now());
    const iphone = /iPhone/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsIphone(iphone);
    setIsStandalonePwa(standalone);
    if (iphone && typeof Notification !== "undefined") setNotificationPermission(Notification.permission);
    const timer = window.setInterval(() => setClockNow(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const documentsWithStock = useMemo(
    () =>
      documents.filter(
        (document) =>
          Boolean(document.InventoryPostedAt) &&
          document.Items.some((item) => getRemaining(item) > 0)
      ),
    [documents]
  );

  const dueProcedures = useMemo(() => documentsWithStock.filter((document) => {
    if (document.Status !== "DITERIMA" || document.ProcedureCompletedAt) return false;
    const scheduledAt = operationTimestamp(document);
    return Boolean(clockNow && scheduledAt && scheduledAt <= clockNow);
  }), [clockNow, documentsWithStock]);

  useEffect(() => {
    if (!isIphone || !isStandalonePwa || !dueProcedures.length || notificationPermission !== "granted") return;
    dueProcedures.forEach((document) => {
      const notificationKey = `operation-reminder-${document.ID || document.Hospital}`;
      if (localStorage.getItem(notificationKey)) return;
      void navigator.serviceWorker.ready.then((registration) => registration.showNotification("Tindakan operasi perlu diselesaikan", {
        body: `${document.Hospital || "Rumah sakit"} · ${document.Procedure} · ${document.Surgeon || "Dokter belum diisi"}`,
        icon: "/favicon.ico",
        tag: notificationKey,
        data: { url: `/rumah-sakit?document=${encodeURIComponent(document.ID || "")}` },
      })).then(() => localStorage.setItem(notificationKey, new Date().toISOString())).catch(() => undefined);
    });
  }, [dueProcedures, isIphone, isStandalonePwa, notificationPermission]);

  async function enableNotifications() {
    if (!isIphone) return toast.error("Notifikasi perangkat dibatasi khusus iPhone");
    if (!isStandalonePwa) return toast.error("Tambahkan NEX Stock ke Home Screen iPhone terlebih dahulu");
    if (typeof Notification === "undefined") return toast.error("Browser ini tidak mendukung notifikasi");
    if (!("serviceWorker" in navigator)) return toast.error("Service worker tidak tersedia pada browser ini");
    await navigator.serviceWorker.register("/sw.js");
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === "granted") toast.success("Notifikasi jadwal operasi berhasil diaktifkan");
    else toast.error("Izin notifikasi belum diberikan");
  }

  const hospitalNames = useMemo(
    () =>
      Array.from(
        new Set(
          documentsWithStock
            .map((document) => String(document.Hospital || "").trim())
            .filter(Boolean)
        )
      ).sort(),
    [documentsWithStock]
  );

  const activeDocuments = useMemo(
    () =>
      documentsWithStock.filter((document) => {
        if (
          hospitalFilter !== "ALL" &&
          String(document.Hospital || "").trim() !== hospitalFilter
        ) {
          return false;
        }
        return true;
      }),
    [documentsWithStock, hospitalFilter]
  );

  const selectedDocument =
    activeDocuments.find((document) => document.ID === documentId) ||
    activeDocuments[0];

  const visibleItems = useMemo(() => {
    if (!selectedDocument) return [];
    const query = search.trim().toLowerCase();
    return selectedDocument.Items.map((item, itemIndex) => ({
      item,
      itemIndex,
    })).filter(({ item }) => {
      if (Number(item.hospitalQty || 0) <= 0) return false;
      if (getRemaining(item) <= 0) return false;
      if (!query) return true;
      return [item.partNumber, item.description, item.batch]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [search, selectedDocument]);

  const allActiveItems = useMemo<ItemEntry[]>(() => {
    if (!selectedDocument) return [];
    return selectedDocument.Items.map((item, itemIndex) => ({
      item,
      itemIndex,
    })).filter(({ item }) => getRemaining(item) > 0);
  }, [selectedDocument]);

  const renderedItems = visibleItems.slice(0, visibleCount);
  const hasMoreItems = visibleCount < visibleItems.length;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreItems) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((current) =>
            Math.min(current + 20, visibleItems.length)
          );
        }
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreItems, visibleItems.length]);

  const selectedUsedCount = allActiveItems.filter(({ itemIndex }) =>
    usedKeys.includes(itemKey(selectedDocument?.ID, itemIndex))
  ).length;
  const selectedVisibleCount = visibleItems.filter(({ itemIndex }) =>
    usedKeys.includes(itemKey(selectedDocument?.ID, itemIndex))
  ).length;
  const automaticReturnCount = allActiveItems.length - selectedUsedCount;
  const allItemsChecked =
    allActiveItems.length > 0 &&
    selectedUsedCount === allActiveItems.length;
  const allVisibleItemsChecked =
    visibleItems.length > 0 &&
    selectedVisibleCount === visibleItems.length;

  const procedurePlan = useMemo(() => {
    if (!selectedDocument) return null;
    const selectedSet = new Set(usedKeys);
    const active = selectedDocument.Items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => getRemaining(item) > 0);
    const selectedCement = active.find(({ item, itemIndex }) => isBoneCement(item) && selectedSet.has(itemKey(selectedDocument.ID, itemIndex)));
    const cement = selectedCement || active.find(({ item }) => isBoneCement(item));
    const used = active.flatMap(({ item, itemIndex }) => {
      const remaining = getRemaining(item);
      const isAutomaticCement = cement?.itemIndex === itemIndex;
      const quantity = isAutomaticCement ? Math.min(1, remaining) : !isBoneCement(item) && selectedSet.has(itemKey(selectedDocument.ID, itemIndex)) ? remaining : 0;
      return quantity > 0 ? [{ item, itemIndex, quantity, automatic: isAutomaticCement }] : [];
    });
    const usedByIndex = new Map(used.map((entry) => [entry.itemIndex, entry.quantity]));
    const items = selectedDocument.Items.map((item, itemIndex) => {
      const remaining = getRemaining(item);
      if (remaining <= 0) return item;
      const usedQuantity = usedByIndex.get(itemIndex) || 0;
      return {
        ...item,
        usedQty: Number(item.usedQty || 0) + usedQuantity,
        returnedQty: Number(item.returnedQty || 0) + Math.max(0, remaining - usedQuantity),
      };
    });
    return {
      cement,
      used,
      items,
      usedPieces: used.reduce((sum, entry) => sum + entry.quantity, 0),
      returnPieces: active.reduce((sum, { item }) => sum + getRemaining(item), 0) - used.reduce((sum, entry) => sum + entry.quantity, 0),
      missingLots: used.filter(({ item }) => !hasValidLot(item.batch)),
    };
  }, [selectedDocument, usedKeys]);

  function chooseDocument(nextId: string) {
    setDocumentId(nextId);
    setUsedKeys([]);
    setSearch("");
    setVisibleCount(20);
  }

  function toggleUsed(itemIndex: number) {
    const key = itemKey(selectedDocument?.ID, itemIndex);
    setUsedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  }

  function toggleAllUsed() {
    if (allItemsChecked) {
      setUsedKeys([]);
      return;
    }
    setUsedKeys(
      allActiveItems.map(({ itemIndex }) =>
        itemKey(selectedDocument?.ID, itemIndex)
      )
    );
  }

  function setVisibleItemsUsed(used: boolean) {
    const visibleKeys = visibleItems.map(({ itemIndex }) =>
      itemKey(selectedDocument?.ID, itemIndex)
    );
    const visibleSet = new Set(visibleKeys);
    setUsedKeys((current) => {
      const outsideVisible = current.filter((key) => !visibleSet.has(key));
      return used ? [...outsideVisible, ...visibleKeys] : outsideVisible;
    });
  }

  function requestCompleteProcedure() {
    if (!selectedDocument?.ID) return;
    if (selectedDocument.Status !== "DITERIMA") {
      toast.error("Dokumen harus diterima sebelum tindakan diselesaikan");
      return;
    }
    if (selectedUsedCount === 0) return toast.error("Centang minimal satu implant yang terpakai");
    if (!procedurePlan?.cement) return toast.error("Bone Cement tidak ditemukan pada stock RS. Tambahkan Bone Cement sebelum menyelesaikan tindakan.");
    if (procedurePlan.missingLots.length > 0) return toast.error(`LOT belum lengkap pada ${procedurePlan.missingLots.length} implant terpakai`);
    setLotConfirmed(false);
    setCompletionNote("Tindakan selesai, pemakaian implant dan LOT telah dikonfirmasi.");
    setConfirmOpen(true);
  }

  async function completeProcedure() {
    if (!selectedDocument?.ID || !procedurePlan || !lotConfirmed) return;
    if (!completionNote.trim()) return toast.error("Catatan tindakan selesai wajib diisi");

    setSaving(true);
    try {
      const result = await settleOnlineHandover({
        ID: selectedDocument.ID,
        Items: procedurePlan.items,
        by: selectedDocument.Receiver || "Rumah Sakit",
        completionNote: completionNote.trim(),
      });
      if (result.data) {
        const updatedDocument = result.data;
        const nextDocuments = documents.map((document) =>
          document.ID === updatedDocument.ID ? updatedDocument : document
        );
        setDocuments(nextDocuments);
        const selectedHospital = String(
          selectedDocument.Hospital || ""
        ).trim();
        const hospitalStillHasStock = nextDocuments.some(
          (document) =>
            String(document.Hospital || "").trim() === selectedHospital &&
            Boolean(document.InventoryPostedAt) &&
            document.Items.some((item) => getRemaining(item) > 0)
        );
        if (!hospitalStillHasStock) setHospitalFilter("ALL");
      }
      setUsedKeys([]);
      setDocumentId("");
      setSearch("");
      toast.success(
        `${procedurePlan.usedPieces} pcs terpakai · ${procedurePlan.returnPieces} pcs kembali ke office`
      );
      setConfirmOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Tindakan gagal diselesaikan"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-28 text-zinc-950 dark:bg-zinc-950 dark:text-white">
      <header className="bg-[#0f172a] px-4 pb-5 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300"
            >
              <ArrowLeft size={15} /> Kembali
            </Link>
            <Link
              href="/serah-terima"
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-bold"
            >
              Serah terima baru
            </Link>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600">
              <Hospital size={20} />
            </span>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300">
                Proses setelah operasi
              </p>
              <h1 className="text-xl font-black">Stock Rumah Sakit</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-3 p-3 sm:p-6">
        {dueProcedures.length > 0 ? <section className="rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm dark:border-amber-800 dark:bg-amber-950/20"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500 text-white"><Bell size={18} /></span><div className="min-w-0 flex-1"><p className="text-sm font-black text-amber-950 dark:text-amber-100">{dueProcedures.length} tindakan perlu diselesaikan</p><p className="mt-1 text-[10px] leading-4 text-amber-800 dark:text-amber-300">{dueProcedures.slice(0, 2).map((document) => `${document.Hospital} · ${document.Procedure} · ${document.OperationTime || "jam belum diisi"}`).join(" • ")}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => { const first = dueProcedures[0]; setHospitalFilter(String(first.Hospital || "ALL")); setDocumentId(first.ID || ""); }} className="rounded-lg bg-amber-600 px-3 py-2 text-[10px] font-black text-white">Buka tindakan</button>{isIphone && notificationPermission !== "granted" ? <button type="button" onClick={() => void enableNotifications()} className="rounded-lg border border-amber-400 bg-white px-3 py-2 text-[10px] font-black text-amber-800">Aktifkan notifikasi iPhone</button> : null}<button type="button" onClick={() => { const document = dueProcedures[0]; window.open(`https://wa.me/?text=${encodeURIComponent(`Pengingat penyelesaian tindakan operasi\nRS: ${document.Hospital}\nDokter: ${document.Surgeon}\nTindakan: ${document.Procedure}\nJadwal: ${document.OperationDate || document.HandoverDate} ${document.OperationTime || ""}\nMohon catat implant terpakai dan konfirmasi LOT.`)}`, "_blank", "noopener,noreferrer"); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white"><MessageCircle size={13} /> Bagikan WA</button></div></div></div></section> : isIphone && notificationPermission !== "granted" ? <button type="button" onClick={() => void enableNotifications()} className="flex w-full items-center gap-3 rounded-2xl border bg-white p-3 text-left shadow-sm dark:bg-zinc-900"><span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600"><Bell size={16} /></span><span><b className="block text-xs">Aktifkan pengingat di iPhone</b><span className="text-[9px] text-zinc-500">{isStandalonePwa ? "Izinkan notifikasi jadwal operasi" : "Tambahkan aplikasi ke Home Screen terlebih dahulu"}</span></span></button> : null}
        <section className="rounded-2xl border bg-white p-3 shadow-sm dark:bg-zinc-900">
          <p className="text-[10px] font-black uppercase text-zinc-500">
            1. Pilih tindakan
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <SelectField
              value={hospitalFilter}
              onChange={(value) => {
                setHospitalFilter(value);
                setDocumentId("");
                setUsedKeys([]);
                setVisibleCount(20);
              }}
              options={[
                { value: "ALL", label: "Semua rumah sakit" },
                ...hospitalNames.map((hospital) => ({
                  value: hospital,
                  label: hospital,
                })),
              ]}
            />
            <SelectField
              value={selectedDocument?.ID || ""}
              onChange={chooseDocument}
              options={activeDocuments.map((document) => ({
                value: document.ID || "",
                label: `${document.Hospital || "RS"} · ${document.Procedure} · ${document.Brand}`,
              }))}
              placeholder="Tidak ada tindakan aktif"
            />
          </div>

          {selectedDocument && (
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-slate-50 p-1 dark:bg-zinc-800">
              <Metric label="Di RS" value={allActiveItems.length} />
              <Metric label="Dipakai" value={selectedUsedCount} tone="red" />
              <Metric
                label="Auto Return"
                value={automaticReturnCount}
                tone="emerald"
              />
            </div>
          )}
        </section>

        {selectedDocument && (
          <section className="rounded-2xl border bg-white p-3 shadow-sm dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase text-zinc-500">
                  2. Centang yang dipakai
                </p>
                <p className="mt-1 text-[9px] text-zinc-400">
                  Item yang tidak dicentang otomatis kembali ke office.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className={`flex h-10 cursor-pointer items-center gap-2 rounded-xl border px-2.5 text-[9px] font-black ${
                  allItemsChecked
                    ? "border-red-300 bg-red-50 text-red-700"
                    : "bg-white text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={allItemsChecked}
                    onChange={toggleAllUsed}
                    className="size-4 accent-red-600"
                  />
                  Semua
                </label>
                <div className="grid grid-cols-2 rounded-xl border bg-slate-50 p-1 dark:bg-zinc-800">
                  <button
                    type="button"
                  onClick={() => setViewMode("card")}
                    className={`flex size-8 items-center justify-center rounded-lg ${
                      viewMode === "card"
                        ? "bg-[#0f172a] text-white"
                        : "text-zinc-500"
                    }`}
                    aria-label="Card view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                  <button
                    type="button"
                  onClick={() => setViewMode("table")}
                    className={`flex size-8 items-center justify-center rounded-lg ${
                      viewMode === "table"
                        ? "bg-[#0f172a] text-white"
                        : "text-zinc-500"
                    }`}
                    aria-label="Table view"
                  >
                    <Table2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <label className="relative mt-3 block">
              <Search
                size={16}
                className="absolute left-3 top-3.5 text-zinc-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleCount(20);
                }}
                placeholder="Cari REF, LOT, atau nama implant..."
                className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm"
              />
            </label>
            <div className="mt-3 hidden items-center justify-between gap-3 rounded-xl border bg-slate-50 p-2 md:flex dark:bg-zinc-800/60">
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3 py-2 text-[10px] font-black shadow-sm dark:bg-zinc-900">
                  <input
                    type="checkbox"
                    checked={allVisibleItemsChecked}
                    onChange={(event) =>
                      setVisibleItemsUsed(event.target.checked)
                    }
                    className="size-4 accent-red-600"
                  />
                  Pilih semua hasil ({visibleItems.length})
                </label>
                <span className="text-[10px] text-zinc-500">
                  {selectedVisibleCount} dipilih dari hasil pencarian
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={visibleItems.length === 0}
                  onClick={() => setVisibleItemsUsed(true)}
                  className="rounded-lg bg-red-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-40"
                >
                  Tandai Dipakai
                </button>
                <button
                  type="button"
                  disabled={visibleItems.length === 0}
                  onClick={() => setVisibleItemsUsed(false)}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-40"
                >
                  Tandai Return
                </button>
              </div>
            </div>
          </section>
        )}

        {loading ? (
          <HospitalStockSkeleton />
        ) : !selectedDocument ? (
          <EmptyState />
        ) : visibleItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-sm text-zinc-500 dark:bg-zinc-900">
            Implant tidak ditemukan.
          </div>
        ) : viewMode === "card" ? (
          <section className="grid gap-2 lg:grid-cols-2">
            {renderedItems.map(({ item, itemIndex }) => (
              <ImplantCard
                key={itemKey(selectedDocument.ID, itemIndex)}
                item={item}
                checked={usedKeys.includes(
                  itemKey(selectedDocument.ID, itemIndex)
                )}
                onToggle={() => toggleUsed(itemIndex)}
              />
            ))}
          </section>
        ) : (
          <ImplantTable
            document={selectedDocument}
            entries={renderedItems}
            usedKeys={usedKeys}
            onToggle={toggleUsed}
            allVisibleChecked={allVisibleItemsChecked}
            onToggleAllVisible={setVisibleItemsUsed}
          />
        )}

        {selectedDocument && hasMoreItems && (
          <div
            ref={loadMoreRef}
            className="py-2"
          >
            <HospitalStockSkeleton compact />
          </div>
        )}
      </div>

      {selectedDocument && allActiveItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-10px_30px_rgba(15,23,42,0.14)] backdrop-blur dark:bg-zinc-950/95">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <div className="grid min-w-28 grid-cols-2 rounded-xl bg-slate-100 p-1 text-center dark:bg-zinc-800">
              <div>
                <b className="block text-sm text-red-600">{selectedUsedCount}</b>
                <span className="text-[7px] font-bold">DIPAKAI</span>
              </div>
              <div>
                <b className="block text-sm text-emerald-600">
                  {automaticReturnCount}
                </b>
                <span className="text-[7px] font-bold">RETURN</span>
              </div>
            </div>
            {selectedDocument.Status === "DITERIMA" ? (
              <button
                type="button"
                disabled={saving}
                onClick={requestCompleteProcedure}
                className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white disabled:opacity-50"
              >
                {saving ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Selesaikan Tindakan
              </button>
            ) : (
              <Link
                href={`/serah-terima?id=${selectedDocument.ID}`}
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-amber-500 px-3 text-center text-[10px] font-black text-white"
              >
                Terima Dokumen Dahulu
              </Link>
            )}
          </div>
        </div>
      )}

      {confirmOpen && selectedDocument && procedurePlan ? <div className="fixed inset-0 z-[120] flex items-end bg-slate-950/65 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Konfirmasi implant terpakai">
        <button type="button" className="absolute inset-0" onClick={() => !saving && setConfirmOpen(false)} aria-label="Tutup konfirmasi" />
        <section className="relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:max-w-xl sm:rounded-3xl">
          <header className="border-b px-4 py-4"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 text-red-600"><PackageCheck size={19} /></span><div className="min-w-0"><p className="font-black">Konfirmasi Implant Terpakai</p><p className="mt-0.5 text-[10px] text-zinc-500">{selectedDocument.Hospital} · {selectedDocument.Procedure} · dr. {selectedDocument.Surgeon || "-"}</p></div></div></header>
          <div className="overflow-y-auto p-4">
            <div className="grid grid-cols-2 gap-2"><Metric label="Terpakai" value={procedurePlan.usedPieces} tone="red" /><Metric label="Auto Return" value={procedurePlan.returnPieces} tone="emerald" /></div>
            <div className="mt-4 space-y-2">{procedurePlan.used.map(({ item, itemIndex, quantity, automatic }) => <article key={`confirm-${item.partNumber}-${item.batch}-${itemIndex}`} className={`rounded-xl border p-3 ${automatic ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20" : "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/10"}`}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-xs font-black leading-4">{item.description}</p><div className="mt-2 flex flex-wrap gap-1"><span className="rounded-md bg-white px-2 py-1 text-[9px] font-black text-blue-700">REF {item.partNumber || "-"}</span><span className="rounded-md bg-white px-2 py-1 text-[9px] font-black text-slate-700">LOT {item.batch}</span>{automatic ? <span className="rounded-md bg-amber-500 px-2 py-1 text-[9px] font-black text-white">BONE CEMENT OTOMATIS</span> : null}</div></div><b className="shrink-0 rounded-lg bg-red-600 px-2.5 py-1.5 text-xs text-white">{quantity} pcs</b></div></article>)}</div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-blue-200 bg-blue-50 p-3 text-blue-950"><input type="checkbox" checked={lotConfirmed} onChange={(event) => setLotConfirmed(event.target.checked)} className="mt-0.5 size-5 shrink-0 accent-blue-600" /><span><b className="block text-xs">Saya sudah mencocokkan REF dan LOT fisik</b><span className="mt-1 block text-[10px] leading-4 text-blue-700">Pastikan nomor LOT pada box sama dengan ringkasan di atas. Setelah dikonfirmasi, implant lain otomatis kembali ke office.</span></span></label>
            <label className="mt-3 block text-[10px] font-black text-zinc-600">Catatan tindakan selesai<textarea value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} rows={3} placeholder="Contoh: Tindakan selesai, implant dan LOT sudah sesuai." className="mt-1.5 w-full resize-none rounded-xl border bg-transparent p-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[10px] leading-4 text-amber-800"><AlertTriangle size={15} className="mt-0.5 shrink-0" /> Bone Cement otomatis dicatat tepat 1 pcs. Sisa Bone Cement dan implant yang tidak dipilih akan dikembalikan ke office.</div>
          </div>
          <footer className="grid grid-cols-2 gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"><button type="button" disabled={saving} onClick={() => setConfirmOpen(false)} className="h-12 rounded-xl border text-sm font-bold disabled:opacity-50">Periksa Lagi</button><button type="button" disabled={saving || !lotConfirmed || !completionNote.trim()} onClick={() => void completeProcedure()} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-40">{saving ? <LoaderCircle size={17} className="animate-spin" /> : <CheckCircle2 size={17} />} Konfirmasi & Simpan</button></footer>
        </section>
      </div> : null}
    </main>
  );
}

function ImplantCard({
  item,
  checked,
  onToggle,
}: {
  item: HandoverItem;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 shadow-sm transition ${
        checked
          ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
          : "bg-white dark:bg-zinc-900"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-1 size-6 shrink-0 accent-red-600"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap gap-1">
          <b className="rounded-md bg-blue-50 px-2 py-1 text-[9px] text-blue-700">
            {item.partNumber}
          </b>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            LOT {item.batch || "-"}
          </span>
        </span>
        <b className="mt-2 block text-xs leading-4">{item.description}</b>
        <span className="mt-2 flex items-center justify-between text-[9px]">
          <span className="text-zinc-500">
            Tersedia di RS: {getRemaining(item)} pcs
          </span>
          <span
            className={`rounded-full px-2 py-1 font-black ${
              checked
                ? "bg-red-600 text-white"
                : "bg-emerald-50 text-emerald-700"
            }`}
          >
            {checked ? "DIPAKAI" : "AUTO RETURN"}
          </span>
        </span>
      </span>
    </label>
  );
}

function ImplantTable({
  document,
  entries,
  usedKeys,
  onToggle,
  allVisibleChecked,
  onToggleAllVisible,
}: {
  document: OnlineHandover;
  entries: ItemEntry[];
  usedKeys: string[];
  onToggle: (index: number) => void;
  allVisibleChecked: boolean;
  onToggleAllVisible: (used: boolean) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-xs">
          <thead className="bg-slate-100 text-[9px] uppercase text-zinc-500 dark:bg-zinc-800">
            <tr>
              <th className="px-3 py-3">
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allVisibleChecked}
                    onChange={(event) =>
                      onToggleAllVisible(event.target.checked)
                    }
                    className="size-4 accent-red-600"
                  />
                  Dipakai
                </label>
              </th>
              <th className="px-3 py-3">REF</th>
              <th className="px-3 py-3">Deskripsi</th>
              <th className="px-3 py-3">LOT</th>
              <th className="px-3 py-3 text-center">Di RS</th>
              <th className="px-3 py-3">Keputusan</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ item, itemIndex }) => {
              const checked = usedKeys.includes(
                itemKey(document.ID, itemIndex)
              );
              return (
                <tr
                  key={itemKey(document.ID, itemIndex)}
                  className={checked ? "bg-red-50/60 dark:bg-red-950/10" : ""}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggle(itemIndex)}
                      className="size-5 accent-red-600"
                    />
                  </td>
                  <td className="px-3 py-3 font-black">{item.partNumber}</td>
                  <td className="max-w-80 px-3 py-3 text-[10px]">
                    {item.description}
                  </td>
                  <td className="px-3 py-3">{item.batch || "-"}</td>
                  <td className="px-3 py-3 text-center font-black">
                    {getRemaining(item)}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-black ${
                        checked
                          ? "bg-red-100 text-red-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {checked ? "DIPAKAI" : "AUTO RETURN"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SelectField({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full appearance-none rounded-xl border bg-transparent px-3 pr-9 text-xs font-semibold"
      >
        {options.length === 0 && (
          <option value="">{placeholder || "Tidak tersedia"}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-3.5 text-zinc-400"
      />
    </label>
  );
}

function Metric({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: number;
  tone?: "zinc" | "red" | "emerald";
}) {
  const colors = {
    zinc: "text-zinc-900 dark:text-white",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="rounded-lg bg-white px-2 py-2 text-center dark:bg-zinc-900">
      <b className={`block text-lg ${colors[tone]}`}>{value}</b>
      <span className="text-[8px] font-bold uppercase text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-white p-10 text-center dark:bg-zinc-900">
      <PackageCheck className="mx-auto text-zinc-300" />
      <p className="mt-3 text-sm font-bold">Tidak ada tindakan aktif</p>
      <p className="mt-1 text-xs text-zinc-500">
        Semua implant sudah diproses atau belum ada serah-terima.
      </p>
    </div>
  );
}

function HospitalStockSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <section className="grid gap-2 lg:grid-cols-2" aria-label="Memuat implant">
      {Array.from({ length: compact ? 2 : 6 }).map((_item, index) => (
        <div
          key={index}
          className="animate-pulse rounded-2xl border bg-white p-3 dark:bg-zinc-900"
        >
          <div className="flex gap-3">
            <div className="size-6 rounded bg-slate-200 dark:bg-zinc-800" />
            <div className="flex-1">
              <div className="flex gap-2">
                <div className="h-5 w-24 rounded bg-slate-200 dark:bg-zinc-800" />
                <div className="h-5 w-20 rounded bg-slate-100 dark:bg-zinc-800" />
              </div>
              <div className="mt-3 h-3 w-4/5 rounded bg-slate-200 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-2/5 rounded bg-slate-100 dark:bg-zinc-800" />
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}

function itemKey(documentId: string | undefined, itemIndex: number) {
  return `${documentId || "document"}-${itemIndex}`;
}

function getRemaining(item: HandoverItem) {
  return Math.max(
    0,
    Number(item.hospitalQty || 0) -
      Number(item.usedQty || 0) -
      Number(item.returnedQty || 0)
  );
}

function isBoneCement(item: HandoverItem) {
  const text = `${item.partNumber || ""} ${item.description || ""}`.toUpperCase();
  return text.includes("BONE CEMENT") || text.includes("REFOBACIN");
}

function hasValidLot(value: unknown) {
  const lot = String(value ?? "").trim().toUpperCase();
  return Boolean(lot && lot !== "-" && lot !== "N/A" && lot !== "BELUM DIINPUT");
}

function operationTimestamp(document: OnlineHandover) {
  const date = String(document.OperationDate || document.HandoverDate || "").trim();
  const time = String(document.OperationTime || "").trim();
  if (!date || !time) return 0;
  const timestamp = new Date(`${date}T${time}:00`).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}
