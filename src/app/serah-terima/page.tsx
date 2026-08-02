"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  ClipboardSignature,
  Copy,
  ChevronDown,
  Clock3,
  Eraser,
  ExternalLink,
  Hospital,
  LoaderCircle,
  MessageCircle,
  PackageCheck,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { gasGET } from "@/lib/gas";
import {
  createBackgroundTransaction,
  updateBackgroundTransaction,
} from "@/lib/background-transactions";
import {
  appendOnlineHandoverSupplement,
  deleteOnlineHandovers,
  listOnlineHandovers,
  saveOnlineHandover,
  settleOnlineHandover,
} from "@/lib/handover";
import type { StockRow } from "@/types/stock";
import type {
  HandoverInstrument,
  HandoverItem,
  HandoverProcedure,
  HandoverSignatureAudit,
  OnlineHandover,
} from "@/types/handover";

const PROCEDURES: HandoverProcedure[] = ["TKR", "THR", "BIPOLAR"];
const BRANDS = ["NORMMED", "ZIMMER"] as const;
type HandoverBrand = (typeof BRANDS)[number];

export default function OnlineHandoverPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-slate-50">
          <LoaderCircle className="animate-spin text-blue-600" />
        </main>
      }
    >
      <OnlineHandoverContent />
    </Suspense>
  );
}

function OnlineHandoverContent() {
  const searchParams = useSearchParams();
  const requestedId = searchParams.get("id") || "";
  const requestedToken = searchParams.get("token") || "";
  const [mobileItemsOpen, setMobileItemsOpen] = useState(true);
  const [localSavedAt, setLocalSavedAt] = useState("");
  const [printing, setPrinting] = useState(false);
  const [mobileStep, setMobileStep] = useState<"info" | "items" | "signature">(
    "info"
  );
  const [stock, setStock] = useState<StockRow[]>([]);
  const [documents, setDocuments] = useState<OnlineHandover[]>([]);
  const [form, setForm] = useState<OnlineHandover>(() => emptyHandover("TKR"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [visibleItemCount, setVisibleItemCount] = useState(30);
  const [accessoryModalOpen, setAccessoryModalOpen] = useState(false);
  const [accessorySearch, setAccessorySearch] = useState("");
  const [accessoryBrandFilter, setAccessoryBrandFilter] = useState<
    "ALL" | HandoverBrand
  >("ALL");
  const [accessorySelection, setAccessorySelection] = useState<string[]>([]);
  const [visibleAccessoryCount, setVisibleAccessoryCount] = useState(30);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [documentSelectMode, setDocumentSelectMode] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [deletingDocuments, setDeletingDocuments] = useState(false);
  const [supplementBase, setSupplementBase] = useState<OnlineHandover | null>(null);
  const [supplementRequestId, setSupplementRequestId] = useState("");
  const itemLoadMoreRef = useRef<HTMLDivElement>(null);
  const accessoryLoadMoreRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stockResult, requestedDocuments] = await Promise.all([
        gasGET("Sheet1"),
        requestedId
          ? listOnlineHandovers(requestedId)
          : Promise.resolve([] as OnlineHandover[]),
      ]);
      const stockRows = stockResult.data ?? [];
      setStock(stockRows);
      const requested = requestedDocuments[0];
      if (
        requested?.VerificationToken &&
        requestedToken &&
        requested.VerificationToken !== requestedToken
      ) {
        throw new Error("Token verifikasi dokumen tidak valid");
      }
      if (requested) {
        const normalized = normalizeHandoverDocument(requested);
        setForm(
          normalized.Status === "DRAFT"
            ? refreshDraftStock(normalized, stockRows)
            : normalized
        );
      }
      else {
        const localDraft = readLocalHandoverDraft();
        setForm(
          localDraft || buildHandoverFromStock("TKR", "NORMMED", stockRows)
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data gagal dimuat");
    } finally {
      setLoading(false);
    }

    // Riwayat dokumen bukan data utama form. Muat setelah katalog tampil agar
    // halaman tidak menunggu respons Apps Script kedua.
    void listOnlineHandovers()
      .then(setDocuments)
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Riwayat gagal dimuat"
        )
      );
  }, [requestedId, requestedToken]);

  async function openSavedDocument(document: OnlineHandover) {
    setSupplementBase(null);
    setSupplementRequestId("");
    if (!document.ID) {
      setForm(document);
      return;
    }
    try {
      const detail = await listOnlineHandovers(document.ID);
      const normalized = normalizeHandoverDocument(detail[0] || document);
      setForm(
        normalized.Status === "DRAFT"
          ? refreshDraftStock(normalized, stock)
          : normalized
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Detail dokumen gagal dibuka"
      );
    }
  }

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (loading || requestedId || form.Status !== "DRAFT") return;
    const timeout = window.setTimeout(() => {
      localStorage.setItem("implant-handover-autosave-v1", JSON.stringify(form));
      setLocalSavedAt(new Date().toISOString());
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [form, loading, requestedId]);

  const filteredItems = useMemo(() => {
    const query = itemSearch.trim().toLowerCase();
    return form.Items.map((item, index) => ({ item, index })).filter(
      ({ item }) =>
        !query ||
        [item.partNumber, item.description, item.batch]
          .join(" ")
          .toLowerCase()
          .includes(query)
    );
  }, [form.Items, itemSearch]);

  const selectedItems = form.Items.filter((item) => item.selected);
  const renderedItems = filteredItems.slice(0, visibleItemCount);
  const hasMoreItems = visibleItemCount < filteredItems.length;
  const issuedTotal = selectedItems.reduce(
    (total, item) => total + Number(item.qtyIssued || 0),
    0
  );
  const additionalStockItems = useMemo(() => {
    const currentRows = new Set(
      form.Items
        .map((item) => Number(item.stockRow || 0))
        .filter((row) => row > 0)
    );
    return stock.filter(
      (row) => !currentRows.has(Number(row.No || 0))
    );
  }, [form.Items, stock]);
  const filteredAdditionalStockItems = useMemo(() => {
    const query = accessorySearch.trim().toLowerCase();
    return additionalStockItems.filter((row) => {
      if (
        accessoryBrandFilter !== "ALL" &&
        normalizeBrand(row.Brand) !== accessoryBrandFilter
      ) {
        return false;
      }
      return (
        !query ||
        [row.NoStok, row.Deskripsi, row.Batch, row.Implant, row.Brand]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [accessoryBrandFilter, accessorySearch, additionalStockItems]);
  const allAdditionalVisibleSelected =
    filteredAdditionalStockItems.length > 0 &&
    filteredAdditionalStockItems.every((row) =>
      accessorySelection.includes(stockItemKey(row))
    );
  const renderedAdditionalStockItems = filteredAdditionalStockItems.slice(
    0,
    visibleAccessoryCount
  );
  const hasMoreAdditionalItems =
    visibleAccessoryCount < filteredAdditionalStockItems.length;

  useEffect(() => {
    const target = itemLoadMoreRef.current;
    if (!target || !hasMoreItems) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleItemCount((current) =>
            Math.min(current + 30, filteredItems.length)
          );
        }
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredItems.length, hasMoreItems]);

  useEffect(() => {
    const target = accessoryLoadMoreRef.current;
    if (!target || !hasMoreAdditionalItems || !accessoryModalOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleAccessoryCount((current) =>
            Math.min(current + 30, filteredAdditionalStockItems.length)
          );
        }
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [
    accessoryModalOpen,
    filteredAdditionalStockItems.length,
    hasMoreAdditionalItems,
  ]);

  function toggleAdditionalItem(key: string) {
    setAccessorySelection((current) =>
      current.includes(key)
        ? current.filter((selectedKey) => selectedKey !== key)
        : [...current, key]
    );
  }

  function toggleAllAdditionalVisible(checked: boolean) {
    const visibleKeys = filteredAdditionalStockItems.map(stockItemKey);
    const visibleSet = new Set(visibleKeys);
    setAccessorySelection((current) => {
      const outsideVisible = current.filter((key) => !visibleSet.has(key));
      return checked ? [...outsideVisible, ...visibleKeys] : outsideVisible;
    });
  }

  function addSelectedStockItems() {
    const selectedSet = new Set(accessorySelection);
    const rows = additionalStockItems.filter((row) =>
      selectedSet.has(stockItemKey(row))
    );
    if (rows.length === 0) return;
    setForm((current) => ({
      ...current,
      Items: [
        ...current.Items,
        ...rows.map((row) => stockRowToHandoverItem(row)),
      ],
    }));
    setAccessorySelection([]);
    setAccessorySearch("");
    setAccessoryModalOpen(false);
    toast.success(`${rows.length} item ditambahkan ke checklist`);
  }

  function changeProcedure(procedure: HandoverProcedure) {
    const brand = normalizeBrand(form.Brand);
    const next = buildHandoverFromStock(procedure, brand, stock);
    setForm({
      ...next,
      Hospital: form.Hospital,
      Surgeon: form.Surgeon,
      ApprovedBy: form.ApprovedBy,
      HandoverDate: form.HandoverDate,
      Sender: form.Sender,
      Checker1: form.Checker1,
      Checker2: form.Checker2,
      AcknowledgedBy: form.AcknowledgedBy,
    });
    setVisibleItemCount(30);
  }

  function changeBrand(brand: HandoverBrand) {
    const next = buildHandoverFromStock(form.Procedure, brand, stock);
    setForm({
      ...next,
      Hospital: form.Hospital,
      Surgeon: form.Surgeon,
      ApprovedBy: form.ApprovedBy,
      HandoverDate: form.HandoverDate,
      Sender: form.Sender,
      Checker1: form.Checker1,
      Checker2: form.Checker2,
      AcknowledgedBy: form.AcknowledgedBy,
    });
    setVisibleItemCount(30);
  }

  async function persist(status: "DRAFT" | "DIKIRIM") {
    if (supplementBase) {
      if (status === "DIKIRIM") await submitSupplementShipment();
      else toast.info("Kiriman tambahan langsung ditambahkan ke dokumen utama saat dikirim");
      return;
    }
    if (status === "DIKIRIM" && (!form.Hospital || !form.Sender)) {
      toast.error("Hospital dan nama pengirim wajib diisi");
      return;
    }
    if (status === "DIKIRIM" && !form.SenderSignature) {
      toast.error("Tanda tangan pengirim wajib diisi");
      return;
    }
    setSaving(true);
    const stableForm = {
      ...form,
      ID: form.ID || `ST-${crypto.randomUUID()}`,
      Status: status,
      VerificationToken:
        form.VerificationToken || createVerificationToken(),
    } as OnlineHandover;
    // ID disimpan sebelum request agar retry manual tidak menggandakan
    // pengurangan stok bila respons pertama terlambat.
    setForm(stableForm);
    const transaction = createBackgroundTransaction({
      documentId: stableForm.ID!,
      expectedStatus: status,
      label:
        status === "DIKIRIM"
          ? "Mengirim serah terima"
          : "Menyimpan draft BAST",
    });
    toast.info("Proses penyimpanan berjalan. Anda boleh membuka halaman lain.");
    void saveOnlineHandover(stableForm).then((result) => {
      if (result.data) setForm(normalizeHandoverDocument(result.data));
      updateBackgroundTransaction(transaction.id, {
        status: "SUCCESS",
        message: "Data sudah dikonfirmasi tersimpan di Google Sheet.",
      });
      toast.success(
        status === "DIKIRIM"
          ? "Dokumen dikirim untuk diterima"
          : "Draft berhasil disimpan"
      );
      if (status === "DIKIRIM") {
        localStorage.removeItem("implant-handover-autosave-v1");
        setShareModalOpen(true);
        void Promise.all([gasGET("Sheet1"), listOnlineHandovers()])
          .then(([latestStock, updated]) => {
            setStock(latestStock.data ?? []);
            setDocuments(updated);
          })
          .catch(() => {
            // Pengiriman sudah berhasil; kegagalan refresh tidak boleh
            // mengubahnya menjadi pesan gagal simpan.
          });
      } else {
        void listOnlineHandovers().then(setDocuments).catch(() => undefined);
      }
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Gagal menyimpan";
      if (isAmbiguousTransactionError(message)) {
        updateBackgroundTransaction(transaction.id, {
          status: "PROCESSING",
          message:
            "Respons membutuhkan waktu. Sistem sedang memeriksa hasil langsung dari Google Sheet.",
        });
        toast.warning("Respons belum diterima. Status transaksi tetap diperiksa.");
      } else {
        updateBackgroundTransaction(transaction.id, {
          status: "FAILED",
          message,
        });
        toast.error(message);
      }
    }).finally(() => {
      setSaving(false);
    });
  }

  async function accept() {
    if (!form.Receiver.trim()) {
      toast.error("Nama penerima wajib diisi");
      return;
    }
    if (!form.ReceiverSignature) {
      toast.error("Tanda tangan penerima wajib diisi");
      return;
    }
    setSaving(true);
    const transaction = createBackgroundTransaction({
      documentId: form.ID!,
      expectedStatus: "DITERIMA",
      label: "Menyimpan penerimaan BAST",
    });
    toast.info("Penerimaan diproses. Anda boleh membuka halaman lain.");
    void saveOnlineHandover(
        { ...form, Status: "DITERIMA" },
        true
      ).then((result) => {
      if (result.data) setForm(normalizeHandoverDocument(result.data));
      localStorage.removeItem("implant-handover-autosave-v1");
      updateBackgroundTransaction(transaction.id, {
        status: "SUCCESS",
        message: "Penerimaan sudah dikonfirmasi tersimpan di Google Sheet.",
      });
      toast.success("Serah terima berhasil diterima");
    }).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Gagal menerima";
      if (isAmbiguousTransactionError(message)) {
        updateBackgroundTransaction(transaction.id, {
          status: "PROCESSING",
          message: "Respons membutuhkan waktu. Status penerimaan sedang diperiksa ulang.",
        });
      } else {
        updateBackgroundTransaction(transaction.id, {
          status: "FAILED",
          message,
        });
        toast.error(message);
      }
    }).finally(() => {
      setSaving(false);
    });
  }

  async function saveHospitalUsage() {
    if (!form.ID) return;
    setSaving(true);
    try {
      const result = await settleOnlineHandover({
        ID: form.ID,
        Items: form.Items,
        by: form.Receiver || "Rumah Sakit",
      });
      if (result.data) setForm(normalizeHandoverDocument(result.data));
      toast.success("Pemakaian dan pengembalian implant berhasil disimpan");
      const latestStock = await gasGET("Sheet1");
      setStock(latestStock.data ?? []);
      const updated = await listOnlineHandovers();
      setDocuments(updated);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Pergerakan implant gagal disimpan"
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleDocumentSelection(document: OnlineHandover) {
    if (!document.ID || !canDeleteHandover(document)) return;
    setSelectedDocumentIds((current) =>
      current.includes(document.ID!)
        ? current.filter((id) => id !== document.ID)
        : [...current, document.ID!]
    );
  }

  async function deleteSelectedDocuments() {
    if (!selectedDocumentIds.length) return;
    if (
      !window.confirm(
        `Hapus permanen ${selectedDocumentIds.length} dokumen serah terima beserta tanda tangannya?\n\nSemua stok RS pada dokumen ini sudah harus berstatus TERPAKAI atau RETURN. Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }
    setDeletingDocuments(true);
    try {
      const result = await deleteOnlineHandovers(selectedDocumentIds);
      const deleted = result.data?.deleted || result.deleted || selectedDocumentIds.length;
      toast.success(`${deleted} dokumen serah terima berhasil dihapus`);
      const updated = await listOnlineHandovers();
      setDocuments(updated);
      if (form.ID && selectedDocumentIds.includes(form.ID)) {
        setForm(buildHandoverFromStock("TKR", "NORMMED", stock));
      }
      setSelectedDocumentIds([]);
      setDocumentSelectMode(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Dokumen serah terima gagal dihapus"
      );
    } finally {
      setDeletingDocuments(false);
    }
  }

  const sharePath = form.ID
    ? `/serah-terima?id=${form.ID}&token=${form.VerificationToken || ""}`
    : "";

  function getShareUrl() {
    return `${window.location.origin}${sharePath}`;
  }

  async function printDocument() {
    if (!form.ID) {
      toast.error("Simpan dokumen terlebih dahulu sebelum mencetak");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup diblokir. Izinkan popup untuk mencetak dokumen");
      return;
    }
    printWindow.document.write(
      '<!doctype html><title>Menyiapkan PDF...</title><body style="font-family:Arial;padding:40px;text-align:center">Menyiapkan Berita Acara dan QR Code...</body>'
    );
    printWindow.document.close();
    setPrinting(true);
    try {
      const { printHandoverDocument } = await import(
        "@/lib/handover-pdf"
      );
      await printHandoverDocument(form, getShareUrl(), printWindow);
    } catch (error) {
      printWindow.close();
      toast.error(error instanceof Error ? error.message : "PDF gagal dibuat");
    } finally {
      setPrinting(false);
    }
  }

  function getWhatsAppMessage() {
    const implantCount = form.Items.filter(
      (item) => item.selected && Number(item.qtyIssued || 0) > 0
    ).length;
    const instrumentCount = form.Instruments.filter(
      (item) => item.selected
    ).length;
    return [
      "Informasi pengiriman implant & instrument",
      "",
      `Logistik: ${form.Sender || "-"}`,
      `Rumah Sakit: ${form.Hospital || "-"}`,
      `Tindakan: ${form.Procedure}`,
      `Brand: ${normalizeBrand(form.Brand)}`,
      `Implant: ${implantCount} item`,
      `Instrument: ${instrumentCount} item`,
      "",
      "Implant dan instrument telah dikirim oleh tim logistik.",
      "Silakan buka link berikut untuk melihat detail dan melakukan penerimaan:",
      getShareUrl(),
    ].join("\n");
  }

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      toast.success("Link serah-terima berhasil disalin");
    } catch {
      toast.error("Link gagal disalin");
    }
  }

  function shareToWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(getWhatsAppMessage())}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function createSupplementShipment() {
    if (!form.ID) return;
    const original = normalizeHandoverDocument(form);
    const originalId = original.ID!;
    const next = buildHandoverFromStock(
      form.Procedure,
      normalizeBrand(form.Brand),
      stock
    );
    setSupplementBase(original);
    setSupplementRequestId(crypto.randomUUID());
    setForm({
      ...next,
      ID: originalId,
      Hospital: form.Hospital,
      Surgeon: form.Surgeon,
      ApprovedBy: form.ApprovedBy,
      HandoverDate: new Date().toISOString().slice(0, 10),
      SetName: `${form.SetName || form.Procedure} · Tambahan`,
      Sender: form.Sender,
      Checker1: form.Checker1,
      Checker2: form.Checker2,
      AcknowledgedBy: form.AcknowledgedBy,
      SenderSignature: original.SenderSignature,
      SenderSignatureMeta: original.SenderSignatureMeta,
      Receiver: original.Receiver,
      ReceiverSignature: original.ReceiverSignature,
      ReceiverSignatureMeta: original.ReceiverSignatureMeta,
      VerificationToken: original.VerificationToken,
      AcceptanceNote: `Kiriman tambahan untuk dokumen ${originalId}`,
      Items: next.Items.map((item) => ({
        ...item,
        selected: false,
        qtyIssued: 0,
      })),
      Instruments: next.Instruments.map((instrument) => ({
        ...instrument,
        selected: false,
      })),
    });
    setItemSearch("");
    setVisibleItemCount(30);
    setMobileItemsOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
    toast.success(
      `Mode kiriman tambahan aktif. Pilih implant yang kurang untuk ${originalId}`
    );
  }

  async function submitSupplementShipment() {
    if (!supplementBase?.ID) return;
    const selectedImplants = form.Items.filter(
      (item) => item.selected && Number(item.qtyIssued || 0) > 0
    );
    const selectedInstruments = form.Instruments.filter(
      (item) => item.selected && Number(item.qty || 0) > 0
    );
    if (!selectedImplants.length && !selectedInstruments.length) {
      toast.error("Pilih minimal satu implant atau instrument tambahan");
      return;
    }
    setSaving(true);
    try {
      const result = await appendOnlineHandoverSupplement({
        ID: supplementBase.ID,
        Items: selectedImplants,
        Instruments: selectedInstruments,
        by: form.Sender || supplementBase.Sender || "Logistik",
        requestId: supplementRequestId || crypto.randomUUID(),
      });
      if (result.data) setForm(normalizeHandoverDocument(result.data));
      setSupplementBase(null);
      setSupplementRequestId("");
      toast.success("Kiriman tambahan masuk ke dokumen serah terima yang sama");
      setShareModalOpen(true);
      const [latestStock, updatedDocuments] = await Promise.all([
        gasGET("Sheet1"),
        listOnlineHandovers(),
      ]);
      setStock(latestStock.data ?? []);
      setDocuments(updatedDocuments);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Kiriman tambahan gagal disimpan"
      );
    } finally {
      setSaving(false);
    }
  }

  function goToMobileStep(step: "info" | "items" | "signature") {
    setMobileStep(step);
    document
      .getElementById(`handover-${step}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-28 text-zinc-950 dark:bg-zinc-950 dark:text-white sm:pb-10">
      <header className="sticky top-0 z-40 bg-[#0f172a] px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-lg shadow-slate-950/10 sm:px-6">
        <div className="mx-auto max-w-[1600px]">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <ArrowLeft size={15} /> Kembali ke stok
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!form.ID || printing || Boolean(supplementBase)}
                onClick={() => void printDocument()}
                className="hidden h-10 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 text-[10px] font-bold disabled:opacity-40 sm:inline-flex"
              >
                {printing ? <LoaderCircle size={15} className="animate-spin" /> : <Printer size={15} />}
                Cetak PDF
              </button>
              <button
                type="button"
                disabled={saving || form.Status !== "DRAFT" || Boolean(supplementBase)}
                onClick={() => void persist("DRAFT")}
                className="hidden h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-[10px] font-black shadow-lg shadow-blue-950/20 disabled:opacity-40 sm:inline-flex"
              >
                {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
                Simpan Dokumen
              </button>
              <Link
                href="/rumah-sakit"
                className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-[10px] font-bold"
              >
                Stock RS
              </Link>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white/10">
              <ClipboardSignature size={21} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-blue-300">Dokumen digital</p>
              <h1 className="text-xl font-black">Serah Terima Online</h1>
              <p className="mt-1 truncate text-[10px] text-slate-400">
                {form.ID || "Dokumen baru"}
              </p>
            </div>
            <DocumentStatusBadge status={form.Status} />
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center py-20"><LoaderCircle className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="mx-auto grid max-w-[1600px] gap-4 px-3 py-3 sm:p-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="order-1 min-w-0 space-y-4 xl:order-2">
            {supplementBase && (
              <section className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Plus size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black">Kiriman tambahan · dokumen yang sama</p>
                  <p className="mt-0.5 truncate text-[9px]">
                    Item akan digabungkan ke {supplementBase.ID}, bukan membuat dokumen baru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForm(supplementBase);
                    setSupplementBase(null);
                    setSupplementRequestId("");
                  }}
                  className="h-9 shrink-0 rounded-lg border border-blue-200 bg-white px-3 text-[9px] font-black text-blue-700"
                >
                  Batal
                </button>
              </section>
            )}
            <nav className="sticky top-[118px] z-30 -mx-1 grid grid-cols-3 gap-1 rounded-2xl border bg-white/95 p-1.5 shadow-lg backdrop-blur sm:hidden dark:bg-zinc-900/95">
              {[
                ["info", "1. Info RS"],
                ["items", `2. Item (${form.Items.length})`],
                ["signature", "3. TTD"],
              ].map(([step, label]) => (
                <button
                  key={step}
                  type="button"
                  onClick={() =>
                    goToMobileStep(
                      step as "info" | "items" | "signature"
                    )
                  }
                  className={`h-10 rounded-xl text-[9px] font-black transition ${
                    mobileStep === step
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-zinc-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </nav>

            <section id="handover-info" className="scroll-mt-44 rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
                {PROCEDURES.map((procedure) => (
                  <button
                    key={procedure}
                    type="button"
                    disabled={Boolean(form.ID)}
                    onClick={() => changeProcedure(procedure)}
                    className={`h-10 rounded-lg px-3 text-xs font-black transition ${
                      form.Procedure === procedure
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-zinc-500 hover:bg-white dark:hover:bg-zinc-700"
                    }`}
                  >
                    {procedure}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-end">
                <div>
                <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                  Brand implant
                </p>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
                  {BRANDS.map((brand) => (
                    <button
                      key={brand}
                      type="button"
                      disabled={Boolean(form.ID)}
                      onClick={() => changeBrand(brand)}
                      className={`h-10 rounded-lg text-xs font-black transition ${
                        normalizeBrand(form.Brand) === brand
                          ? brand === "NORMMED"
                            ? "bg-emerald-600 text-white shadow-sm"
                            : "bg-violet-600 text-white shadow-sm"
                          : "text-zinc-500"
                      }`}
                    >
                      {brand === "NORMMED" ? "Normmed" : "Zimmer"}
                    </button>
                  ))}
                </div>
                </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <TextField label="Hospital" value={form.Hospital} onChange={(Hospital) => setForm({ ...form, Hospital })} />
                <TextField label="Surgeon / Dokter" value={form.Surgeon} onChange={(Surgeon) => setForm({ ...form, Surgeon })} />
                <TextField label="Approved by" value={form.ApprovedBy} onChange={(ApprovedBy) => setForm({ ...form, ApprovedBy })} />
                <TextField label="Tanggal" type="date" value={form.HandoverDate} onChange={(HandoverDate) => setForm({ ...form, HandoverDate })} />
                <TextField label="Set / Box" value={form.SetName} onChange={(SetName) => setForm({ ...form, SetName })} />
                <div className="rounded-xl border bg-slate-50 px-3 py-2 dark:bg-zinc-800">
                  <p className="text-[10px] font-bold text-zinc-500">Kelompok data</p>
                  <p className="mt-1 text-sm font-black">
                    {form.Procedure} · {normalizeBrand(form.Brand)}
                  </p>
                </div>
              </div>
              </div>
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.8fr)]">
              <div className="min-w-0 space-y-4">
            <section id="handover-items" className="scroll-mt-44 overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
              <div className="flex flex-col gap-3 border-b p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <div>
                  <button
                    type="button"
                    onClick={() => setMobileItemsOpen((current) => !current)}
                    className="flex w-full items-center gap-2 text-left lg:pointer-events-none"
                  >
                    <h2 className="text-sm font-black">Checklist Implant {form.Procedure}</h2>
                    <ChevronDown
                      size={16}
                      className={`ml-auto transition lg:hidden ${mobileItemsOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <p className="text-[10px] text-zinc-500">{selectedItems.length} dipilih · {issuedTotal} pcs dikeluarkan</p>
                </div>
                <div className={`${mobileItemsOpen ? "grid" : "hidden"} w-full grid-cols-[auto_auto_1fr] gap-1.5 sm:flex sm:w-auto sm:flex-wrap sm:justify-end`}>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        Items: form.Items.map((item) =>
                          toggleHandoverItem(item, true)
                        ),
                      })
                    }
                    className="h-11 rounded-xl border px-2 text-[9px] font-bold"
                  >
                    Pilih semua
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        Items: form.Items.map((item) =>
                          toggleHandoverItem(item, false)
                        ),
                      })
                    }
                    className="h-11 rounded-xl border px-2 text-[9px] font-bold text-red-600"
                  >
                    Kosongkan
                  </button>
                  <label className="relative min-w-0 sm:w-64">
                    <Search className="absolute left-3 top-3.5 text-zinc-400" size={14} />
                    <input value={itemSearch} onChange={(event) => {
                      setItemSearch(event.target.value);
                      setVisibleItemCount(30);
                    }} placeholder="Cari REF..." className="h-11 w-full rounded-xl border bg-transparent pl-9 pr-2 text-xs" />
                  </label>
                  <button
                    type="button"
                    disabled={Boolean(form.ID) && !supplementBase}
                    onClick={() => {
                      setVisibleAccessoryCount(30);
                      setAccessoryModalOpen(true);
                    }}
                    className="col-span-3 inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border bg-white px-3 text-[10px] font-bold text-blue-700 disabled:opacity-40 sm:col-span-1 dark:bg-zinc-900"
                  >
                    <Plus size={14} /> Tambah aksesori
                  </button>
                </div>
              </div>

              <div className={`${mobileItemsOpen ? "space-y-2 p-2" : "hidden"} lg:hidden`}>
                {renderedItems.map(({ item, index }) => (
                  <HandoverItemCard
                    key={`${item.partNumber}-${item.batch}-${index}`}
                    item={item}
                    onChange={(next) => updateItem(setForm, index, next)}
                  />
                ))}
                {filteredItems.length === 0 && (
                  <div className="rounded-xl border border-dashed p-8 text-center text-xs text-zinc-500">
                    Implant tidak ditemukan.
                  </div>
                )}
              </div>

              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[920px] text-left text-xs">
                  <thead className="bg-slate-100 text-[9px] uppercase text-zinc-500 dark:bg-zinc-800">
                    <tr>
                      <th className="px-3 py-3">Pilih</th><th className="px-3 py-3">Part Number</th><th className="px-3 py-3">Description</th><th className="px-3 py-3">Batch</th><th className="px-3 py-3">Kebutuhan RS</th><th className="px-3 py-3">Stok Office</th><th className="px-3 py-3">Dikirim</th>
                    </tr>
                  </thead>
                  <tbody>
                    {renderedItems.map(({ item, index }) => (
                      <HandoverItemRow key={`${item.partNumber}-${item.batch}-${index}`} item={item} onChange={(next) => updateItem(setForm, index, next)} />
                    ))}
                  </tbody>
                </table>
              </div>
              {hasMoreItems && (
                <div
                  ref={itemLoadMoreRef}
                  className="flex h-16 items-center justify-center border-t"
                >
                  <LoaderCircle
                    size={20}
                    className="animate-spin text-blue-600"
                  />
                  <span className="ml-2 text-[10px] font-bold text-zinc-500">
                    Memuat implant berikutnya...
                  </span>
                </div>
              )}
            </section>

            {form.InventoryPostedAt && (
              <HospitalInventorySection
                items={form.Items}
                hospital={form.Hospital}
                editable={form.Status === "DITERIMA"}
                saving={saving}
                onChange={(Items) => setForm({ ...form, Items })}
                onSave={() => void saveHospitalUsage()}
              />
            )}

            <InstrumentSection
              instruments={form.Instruments}
              disabled={form.Status === "DITERIMA"}
              onChange={(Instruments) => setForm({ ...form, Instruments })}
            />
              </div>

              <div className="min-w-0 space-y-4 lg:sticky lg:top-28">
            <section id="handover-signature" className="scroll-mt-44 rounded-2xl border bg-white p-3 shadow-sm dark:bg-zinc-900 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black">Pihak Serah Terima</h2>
                  <p className="mt-0.5 text-[9px] text-zinc-500">
                    Identitas dan tanda tangan tersimpan dalam audit dokumen.
                  </p>
                </div>
                {localSavedAt && form.Status === "DRAFT" && (
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-[8px] font-bold text-emerald-700">
                    Draft lokal tersimpan
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <TextField label="Pengirim" value={form.Sender} onChange={(Sender) => setForm({ ...form, Sender })} />
                <TextField label="Checker I" value={form.Checker1} onChange={(Checker1) => setForm({ ...form, Checker1 })} />
                <TextField label="Checker II" value={form.Checker2} onChange={(Checker2) => setForm({ ...form, Checker2 })} />
                <TextField label="Mengetahui" value={form.AcknowledgedBy} onChange={(AcknowledgedBy) => setForm({ ...form, AcknowledgedBy })} />
                <TextField label="Penerima" value={form.Receiver} onChange={(Receiver) => setForm({ ...form, Receiver })} />
                <TextField label="Catatan penerimaan" value={form.AcceptanceNote} onChange={(AcceptanceNote) => setForm({ ...form, AcceptanceNote })} />
              </div>
              <div className="mt-4 grid gap-4 border-t pt-4">
                <SignaturePad
                  label="Tanda tangan pengirim"
                  name={form.Sender || "Pengirim"}
                  value={form.SenderSignature || ""}
                  disabled={form.Status !== "DRAFT"}
                  onChange={(SenderSignature) =>
                    setForm({
                      ...form,
                      SenderSignature,
                      SenderSignatureMeta: signatureAudit(
                        form.Sender,
                        form.SenderSignatureMeta,
                        SenderSignature
                      ),
                    })
                  }
                />
                <SignaturePad
                  label="Tanda tangan penerima"
                  name={form.Receiver || "Penerima"}
                  value={form.ReceiverSignature || ""}
                  disabled={form.Status !== "DIKIRIM"}
                  onChange={(ReceiverSignature) =>
                    setForm({
                      ...form,
                      ReceiverSignature,
                      ReceiverSignatureMeta: signatureAudit(
                        form.Receiver,
                        form.ReceiverSignatureMeta,
                        ReceiverSignature
                      ),
                    })
                  }
                />
              </div>
            </section>

            <HandoverActivityTimeline handover={form} />
              </div>
            </div>

            <div className="hidden grid-cols-3 gap-2 sm:grid">
              <button disabled={saving || form.Status !== "DRAFT" || Boolean(supplementBase)} onClick={() => void persist("DRAFT")} className="inline-flex h-12 items-center justify-center gap-1 rounded-xl border bg-white px-1 text-[10px] font-bold disabled:opacity-40 dark:bg-zinc-900 sm:gap-2 sm:text-xs"><Save size={15} /> <span className="sm:hidden">Draft</span><span className="hidden sm:inline">Simpan draft</span></button>
              <button disabled={saving || form.Status !== "DRAFT"} onClick={() => void persist("DIKIRIM")} className="inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-blue-600 px-1 text-[10px] font-bold text-white disabled:opacity-40 sm:gap-2 sm:text-xs"><Send size={15} /> <span className="sm:hidden">Kirim</span><span className="hidden sm:inline">{supplementBase ? "Tambahkan ke dokumen" : "Kirim ke penerima"}</span></button>
              <button disabled={saving || form.Status !== "DIKIRIM"} onClick={() => void accept()} className="inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-1 text-[10px] font-bold text-white disabled:opacity-40 sm:gap-2 sm:text-xs"><PackageCheck size={15} /> <span className="sm:hidden">Terima</span><span className="hidden sm:inline">Terima & setujui</span></button>
            </div>

            {sharePath && form.Status !== "DRAFT" && (
              <div className="grid gap-2 sm:grid-cols-3">
                <button type="button" onClick={createSupplementShipment} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white">
                  <Plus size={16} /> Kiriman Tambahan
                </button>
                <button type="button" onClick={() => setShareModalOpen(true)} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-bold text-white"><MessageCircle size={16} /> Buka link & bagikan ke WhatsApp</button>
                <button type="button" disabled={printing} onClick={() => void printDocument()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-white text-xs font-bold text-slate-800 disabled:opacity-50 dark:bg-zinc-900 dark:text-white">
                  {printing ? <LoaderCircle size={16} className="animate-spin" /> : <Printer size={16} />} Cetak Berita Acara (PDF)
                </button>
              </div>
            )}
          </div>

          <aside className="order-2 h-fit rounded-2xl border bg-white p-3 shadow-sm dark:bg-zinc-900 xl:order-1 xl:sticky xl:top-28">
            <div className="flex items-center justify-between gap-2 px-1">
              <div>
                <h2 className="text-sm font-black">Dokumen Terbaru</h2>
                <p className="mt-0.5 text-[9px] text-zinc-400">
                  {documents.length} dokumen tersimpan
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setDocumentSelectMode((value) => !value);
                    setSelectedDocumentIds([]);
                  }}
                  className={`rounded-lg border px-2 py-1.5 text-[9px] font-bold ${
                    documentSelectMode
                      ? "border-red-200 bg-red-50 text-red-700"
                      : ""
                  }`}
                >
                  {documentSelectMode ? "Batal" : "Pilih"}
                </button>
                <button type="button" onClick={() => setForm(buildHandoverFromStock("TKR", "NORMMED", stock))} className="text-[10px] font-bold text-blue-600">+ Baru</button>
              </div>
            </div>
            {documentSelectMode && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-[9px] leading-4 text-amber-800">
                Draft dapat langsung dihapus. Dokumen diterima hanya dapat dihapus setelah seluruh implant ditandai <b>TERPAKAI</b> atau <b>RETURN</b>. Dokumen yang masih dikirim tidak dapat dihapus.
              </div>
            )}
            <div className="mt-3 space-y-2">
              {documents.slice(0, 10).map((document, index) => (
                <div
                  key={document.ID || `draft-${index}`}
                  className="flex items-start gap-2"
                >
                  {documentSelectMode && (
                    <button
                      type="button"
                      disabled={!document.ID || !canDeleteHandover(document)}
                      onClick={() => toggleDocumentSelection(document)}
                      className={`mt-3 flex size-5 shrink-0 items-center justify-center rounded border text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-30 ${
                        document.ID && selectedDocumentIds.includes(document.ID)
                          ? "border-red-600 bg-red-600 text-white"
                          : "bg-white"
                      }`}
                      aria-label={`Pilih ${document.ID || "dokumen"}`}
                      title={
                        canDeleteHandover(document)
                          ? "Pilih dokumen"
                          : document.Status === "DIKIRIM"
                            ? "Dokumen masih dalam pengiriman"
                            : "Masih ada implant yang belum ditandai terpakai atau return"
                      }
                    >
                      {document.ID && selectedDocumentIds.includes(document.ID)
                        ? "✓"
                        : ""}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <DocumentSummaryCard
                      document={document}
                      active={form.ID === document.ID}
                      onClick={() =>
                        documentSelectMode
                          ? toggleDocumentSelection(document)
                          : void openSavedDocument(document)
                      }
                    />
                  </div>
                </div>
              ))}
              {documents.length === 0 && (
                <p className="rounded-xl border border-dashed p-5 text-center text-[10px] text-zinc-500">
                  Belum ada dokumen tersimpan.
                </p>
              )}
            </div>
            {documentSelectMode && (
              <button
                type="button"
                disabled={!selectedDocumentIds.length || deletingDocuments}
                onClick={() => void deleteSelectedDocuments()}
                className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-[10px] font-black text-white disabled:opacity-40"
              >
                {deletingDocuments ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
                Hapus Dokumen ({selectedDocumentIds.length})
              </button>
            )}
          </aside>
        </div>
      )}

      {!loading && (
        <div className="fixed inset-x-0 bottom-0 z-[70] grid grid-cols-3 gap-2 border-t bg-white/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_25px_rgba(15,23,42,0.12)] backdrop-blur sm:hidden dark:border-zinc-800 dark:bg-zinc-950/95">
          <button
            type="button"
            disabled={saving || form.Status !== "DRAFT" || Boolean(supplementBase)}
            onClick={() => void persist("DRAFT")}
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border bg-white text-[10px] font-black disabled:opacity-40 dark:bg-zinc-900"
          >
            {saving ? <LoaderCircle size={15} className="animate-spin" /> : <Save size={15} />}
            Simpan BAST
          </button>
          <button
            type="button"
            disabled={
              saving ||
              (form.Status === "DITERIMA")
            }
            onClick={() =>
              form.Status === "DRAFT"
                ? void persist("DIKIRIM")
                : void accept()
            }
            className={`inline-flex h-12 items-center justify-center gap-1.5 rounded-xl text-[10px] font-black text-white disabled:opacity-40 ${
              form.Status === "DIKIRIM" ? "bg-emerald-600" : "bg-blue-600"
            }`}
          >
            {form.Status === "DIKIRIM" ? <PackageCheck size={15} /> : <Send size={15} />}
            {supplementBase ? "Kirim Tambahan" : form.Status === "DIKIRIM" ? "Terima" : form.Status === "DITERIMA" ? "Selesai" : "Kirim"}
          </button>
          <button
            type="button"
            disabled={!form.ID || printing || Boolean(supplementBase)}
            onClick={() => void printDocument()}
            className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-[10px] font-black text-white disabled:opacity-40 dark:bg-white dark:text-zinc-900"
            aria-label="Cetak PDF"
            title="Cetak PDF"
          >
            {printing ? <LoaderCircle size={16} className="animate-spin" /> : <Printer size={16} />}
            Cetak PDF
          </button>
        </div>
      )}

      {accessoryModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Tambah aksesori"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setAccessoryModalOpen(false);
            }
          }}
        >
          <section className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-2xl">
            <header className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-sm font-black">
                  Tambah Aksesori / Item Lainnya
                </h2>
                <p className="mt-0.5 text-[10px] text-zinc-500">
                  Semua brand · pilih beberapa item sekaligus
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAccessoryModalOpen(false)}
                className="flex size-10 items-center justify-center rounded-xl border"
                aria-label="Tutup modal"
              >
                <X size={18} />
              </button>
            </header>

            <div className="space-y-3 border-b p-3 sm:p-4">
              <label className="relative block">
                <Search
                  size={16}
                  className="absolute left-3 top-3.5 text-zinc-400"
                />
                <input
                  autoFocus
                  value={accessorySearch}
                  onChange={(event) => {
                    setAccessorySearch(event.target.value);
                    setVisibleAccessoryCount(30);
                  }}
                  placeholder="Cari REF, LOT, kategori, atau nama item..."
                  className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm"
                />
              </label>
              <div className="grid grid-cols-3 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
                {(["ALL", "NORMMED", "ZIMMER"] as const).map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      setAccessoryBrandFilter(brand);
                      setVisibleAccessoryCount(30);
                    }}
                    className={`h-9 rounded-lg text-[10px] font-black ${
                      accessoryBrandFilter === brand
                        ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-900"
                        : "text-zinc-500"
                    }`}
                  >
                    {brand === "ALL" ? "Semua Brand" : brand}
                  </button>
                ))}
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[10px] font-black dark:bg-zinc-800">
                <input
                  type="checkbox"
                  checked={allAdditionalVisibleSelected}
                  onChange={(event) =>
                    toggleAllAdditionalVisible(event.target.checked)
                  }
                  className="size-5 accent-blue-600"
                />
                Pilih semua hasil ({filteredAdditionalStockItems.length})
              </label>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
              {renderedAdditionalStockItems.map((row) => {
                const key = stockItemKey(row);
                const selected = accessorySelection.includes(key);
                return (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${
                      selected
                        ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20"
                        : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleAdditionalItem(key)}
                      className="mt-1 size-5 shrink-0 accent-blue-600"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap gap-1">
                        <b className="rounded-md bg-slate-100 px-2 py-1 text-[9px] dark:bg-zinc-800">
                          {row.NoStok}
                        </b>
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                          LOT {row.Batch || "-"}
                        </span>
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                          Stok {Number(row.Qty || 0)}
                        </span>
                        <span
                          className={`rounded-md px-2 py-1 text-[9px] font-black ${
                            normalizeBrand(row.Brand) === "ZIMMER"
                              ? "bg-violet-50 text-violet-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {normalizeBrand(row.Brand)}
                        </span>
                      </span>
                      <b className="mt-2 block text-xs">{row.Deskripsi}</b>
                      <span className="mt-1 block text-[9px] text-zinc-500">
                        {row.Implant || "Kategori belum diisi"}
                      </span>
                    </span>
                  </label>
                );
              })}
              {filteredAdditionalStockItems.length === 0 && (
                <div className="rounded-xl border border-dashed p-10 text-center text-xs text-zinc-500">
                  Tidak ada item tambahan yang ditemukan.
                </div>
              )}
              {hasMoreAdditionalItems && (
                <div
                  ref={accessoryLoadMoreRef}
                  className="flex h-14 items-center justify-center"
                >
                  <LoaderCircle
                    size={18}
                    className="animate-spin text-blue-600"
                  />
                  <span className="ml-2 text-[10px] font-bold text-zinc-500">
                    Memuat item berikutnya...
                  </span>
                </div>
              )}
            </div>

            <footer className="flex items-center gap-2 border-t bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:bg-zinc-900 sm:p-4">
              <span className="min-w-24 text-center text-xs font-black text-blue-600">
                {accessorySelection.length} dipilih
              </span>
              <button
                type="button"
                disabled={accessorySelection.length === 0}
                onClick={addSelectedStockItems}
                className="h-12 flex-1 rounded-xl bg-blue-600 px-4 text-xs font-black text-white disabled:opacity-40"
              >
                Tambahkan ke Checklist
              </button>
            </footer>
          </section>
        </div>
      )}

      {shareModalOpen && form.ID && (
        <div
          className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Bagikan serah terima"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShareModalOpen(false);
          }}
        >
          <section className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-2xl">
            <header className="flex items-start justify-between bg-[#0f172a] p-4 text-white">
              <div className="flex gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500">
                  <Send size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-black">Pengiriman Berhasil</h2>
                  <p className="mt-1 text-[10px] text-slate-300">
                    Link siap dikirim kepada penerima.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="flex size-9 items-center justify-center rounded-xl border border-white/15 bg-white/10"
                aria-label="Tutup modal"
              >
                <X size={17} />
              </button>
            </header>

            <div className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 text-[10px] dark:bg-zinc-800">
                <ShareInfo label="Rumah Sakit" value={form.Hospital || "-"} />
                <ShareInfo label="Tindakan" value={form.Procedure} />
                <ShareInfo
                  label="Brand"
                  value={normalizeBrand(form.Brand)}
                />
                <ShareInfo label="Dikirim oleh" value={form.Sender || "-"} />
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-black uppercase text-zinc-500">
                  Link serah-terima
                </p>
                <div className="flex items-center gap-2 rounded-xl border bg-slate-50 p-2 dark:bg-zinc-800">
                  <span className="min-w-0 flex-1 truncate px-1 text-[10px] text-zinc-600 dark:text-zinc-300">
                    {getShareUrl()}
                  </span>
                  <button
                    type="button"
                    onClick={() => void copyShareLink()}
                    className="flex h-9 shrink-0 items-center gap-1 rounded-lg border bg-white px-2 text-[9px] font-black dark:bg-zinc-900"
                  >
                    <Copy size={13} /> Salin
                  </button>
                </div>
              </div>

              <p className="rounded-xl bg-blue-50 p-3 text-[10px] leading-4 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                Saat link dibuka, penerima langsung melihat dokumen,
                daftar implant, instrument yang dikirim, dan area tanda tangan
                penerimaan.
              </p>
            </div>

            <footer className="grid grid-cols-2 gap-2 border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
              <button
                type="button"
                onClick={() =>
                  window.open(getShareUrl(), "_blank", "noopener,noreferrer")
                }
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border text-xs font-black"
              >
                <ExternalLink size={16} /> Buka Link
              </button>
              <button
                type="button"
                onClick={shareToWhatsApp}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xs font-black text-white"
              >
                <MessageCircle size={16} /> Kirim WhatsApp
              </button>
            </footer>
          </section>
        </div>
      )}

      <div className="fixed bottom-24 right-3 z-40 flex flex-col gap-2 sm:bottom-5 sm:right-5">
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex size-11 items-center justify-center rounded-full border bg-white/95 text-zinc-700 shadow-lg backdrop-blur dark:bg-zinc-900/95 dark:text-white"
          aria-label="Kembali ke atas"
          title="Ke atas"
        >
          <ArrowUp size={18} />
        </button>
        <button
          type="button"
          onClick={() =>
            window.scrollTo({
              top: document.documentElement.scrollHeight,
              behavior: "smooth",
            })
          }
          className="flex size-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg"
          aria-label="Pergi ke bawah"
          title="Ke bawah"
        >
          <ArrowDown size={18} />
        </button>
      </div>
    </main>
  );
}

function TextField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  const inputValue = type === "date" ? normalizeDateInput(value) : value || "";
  return <label className="text-[10px] font-bold text-zinc-500">{label}<input type={type} value={inputValue} onChange={(event) => onChange(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm font-medium text-zinc-900 dark:text-white" /></label>;
}

function ShareInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <span className="block text-[8px] font-bold uppercase text-zinc-400">
        {label}
      </span>
      <b className="mt-1 block truncate text-[10px]">{value}</b>
    </div>
  );
}

function normalizeHandoverDocument(document: OnlineHandover): OnlineHandover {
  return {
    ...document,
    HandoverDate: normalizeDateInput(document.HandoverDate),
  };
}

function canDeleteHandover(document: OnlineHandover) {
  if (document.Status === "DRAFT") return true;
  if (document.Status !== "DITERIMA") return false;
  return document.Items.every((item) => {
    const sent = Math.max(
      0,
      Number(
        item.hospitalQty === undefined ? item.qtyIssued : item.hospitalQty
      ) || 0
    );
    if (sent <= 0) return true;
    const accounted =
      Math.max(0, Number(item.usedQty || 0)) +
      Math.max(0, Number(item.returnedQty || 0));
    return accounted >= sent;
  });
}

function normalizeDateInput(value: string | undefined) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

function HandoverItemRow({ item, onChange }: { item: HandoverItem; onChange: (item: HandoverItem) => void }) {
  const officeStock = itemOfficeStock(item);
  const stockWarning = officeStock < item.stdQty;
  return <tr className={`border-t ${stockWarning ? "bg-[#FEF2F2] text-red-900 outline outline-1 -outline-offset-1 outline-red-300 dark:bg-red-950/25 dark:text-red-100 dark:outline-red-800" : item.selected ? "" : "opacity-45"}`}><td className="px-3 py-2"><input type="checkbox" checked={item.selected} disabled={officeStock <= 0} onChange={(event) => onChange(toggleHandoverItem(item, event.target.checked))} className="size-5 accent-blue-600 disabled:cursor-not-allowed" /></td><td className="px-3 py-2 font-black">{item.partNumber}{stockWarning && <span className="ml-2 rounded-full bg-red-600 px-2 py-1 text-[8px] text-white">{officeStock <= 0 ? "STOK HABIS" : "STOK KURANG"}</span>}</td><td className="max-w-80 px-3 py-2 text-[10px]">{item.description}</td><td className="px-3 py-2">{item.batch || "-"}</td>{(["stdQty", "qtyChecked", "qtyIssued"] as const).map((field) => <td key={field} className="px-3 py-2"><input type="number" min={0} max={field === "qtyIssued" ? Math.min(item.qtyChecked, item.stdQty) : undefined} disabled={field !== "qtyIssued" || !item.selected || officeStock <= 0} value={field === "qtyChecked" ? officeStock : item[field]} onChange={(event) => onChange(changeItemQuantity(item, field, Number(event.target.value) || 0))} className={`h-9 w-20 rounded-lg border bg-transparent px-2 text-center font-bold disabled:bg-slate-50 disabled:text-zinc-500 dark:disabled:bg-zinc-800 ${field === "qtyChecked" && stockWarning ? "border-red-500 bg-red-100 text-red-700 ring-2 ring-red-200 dark:bg-red-950/40" : ""}`} /></td>)}</tr>;
}

function HandoverItemCard({
  item,
  onChange,
}: {
  item: HandoverItem;
  onChange: (item: HandoverItem) => void;
}) {
  const officeStock = itemOfficeStock(item);
  const fields = [
    ["stdQty", "Kebutuhan"],
    ["qtyChecked", "Stok Office"],
    ["qtyIssued", "Dikirim"],
  ] as const;

  return (
    <article
      className={`overflow-hidden rounded-xl border ${
        officeStock < item.stdQty
          ? `border-2 border-red-400 bg-[#FEF2F2] shadow-sm shadow-red-100 dark:border-red-800 dark:bg-red-950/20 dark:shadow-none ${
              officeStock <= 0 ? "border-l-[6px] border-l-red-600" : ""
            }`
          : item.selected
          ? "border-blue-200 bg-white dark:border-blue-900 dark:bg-zinc-900"
          : "bg-slate-50 opacity-55 dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-start gap-3 p-3">
        <input
          type="checkbox"
          checked={item.selected}
          disabled={officeStock <= 0}
          onChange={(event) =>
            onChange(toggleHandoverItem(item, event.target.checked))
          }
          className="mt-0.5 size-5 shrink-0 accent-blue-600"
          aria-label={`Pilih ${item.partNumber}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 flex-1 text-xs font-black leading-4">
              {item.description || "Tanpa deskripsi"}
            </p>
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[8px] font-black ${
                officeStock <= 0
                  ? "bg-red-600 text-white"
                  : officeStock < item.stdQty
                    ? "bg-amber-100 text-amber-700"
                    : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {officeStock <= 0
                ? "HABIS"
                : officeStock < item.stdQty
                  ? "KURANG"
                  : "TERSEDIA"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              REF {item.partNumber || "-"}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              LOT {item.batch || "-"}
            </span>
            <span
              className={`rounded-md px-2 py-1 text-[9px] font-black ${
                officeStock <= 0
                  ? "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : officeStock < item.stdQty
                    ? "bg-amber-50 text-amber-700"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              OFFICE {officeStock} PCS
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-px border-t bg-slate-200 dark:bg-zinc-800">
        {fields.map(([field, label]) => (
          <label
            key={field}
            className="bg-slate-50 px-1.5 py-2 text-center dark:bg-zinc-900"
          >
            <span className="block text-[8px] font-bold uppercase text-zinc-500">
              {label}
            </span>
            <input
              type="number"
              min={0}
              max={
                field === "qtyIssued"
                  ? Math.min(item.qtyChecked, item.stdQty)
                  : undefined
              }
              disabled={field !== "qtyIssued" || !item.selected}
              value={field === "qtyChecked" ? officeStock : item[field]}
              onChange={(event) =>
                onChange(
                  changeItemQuantity(
                    item,
                    field,
                    Number(event.target.value) || 0
                  )
                )
              }
              className={`mt-1 h-9 w-full rounded-lg border bg-white px-1 text-center text-sm font-black disabled:bg-slate-100 disabled:text-zinc-500 dark:bg-zinc-950 dark:disabled:bg-zinc-800 ${
                field === "qtyChecked" && officeStock < item.stdQty
                  ? "border-red-500 bg-red-50 text-red-700 ring-2 ring-red-100"
                  : ""
              }`}
            />
          </label>
        ))}
      </div>
    </article>
  );
}

function changeItemQuantity(
  item: HandoverItem,
  field: "stdQty" | "qtyChecked" | "qtyIssued" | "qtyReturned",
  rawValue: number
) {
  const value = Math.max(0, rawValue);
  if (field === "qtyChecked") {
    return {
      ...item,
      qtyChecked: value,
      qtyIssued: Math.min(item.qtyIssued, value),
    };
  }
  if (field === "qtyIssued") {
    return {
      ...item,
      qtyIssued: Math.min(value, item.qtyChecked, item.stdQty),
    };
  }
  return { ...item, [field]: value };
}

function toggleHandoverItem(item: HandoverItem, selected: boolean) {
  if (item.qtyChecked <= 0) {
    return { ...item, selected: false, qtyIssued: 0 };
  }
  return {
    ...item,
    selected,
    qtyIssued: selected
      ? Math.min(item.stdQty, item.qtyChecked)
      : 0,
  };
}

function InstrumentSection({
  instruments,
  disabled,
  onChange,
}: {
  instruments: HandoverInstrument[];
  disabled?: boolean;
  onChange: (items: HandoverInstrument[]) => void;
}) {
  function update(index: number, patch: Partial<HandoverInstrument>) {
    onChange(
      instruments.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    );
  }

  function addItem() {
    onChange([
      ...instruments,
      {
        selected: true,
        code: "",
        name: "",
        qty: 1,
        unit: "PC",
        condition: "BAIK",
        note: "",
      },
    ]);
  }

  return (
    <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-black">Tanda Terima Instrument</h2>
          <p className="text-[10px] text-zinc-500">
            {instruments.length} item · kode, jumlah, kondisi, dan
            keterangan dapat disesuaikan.
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white sm:w-auto"
          >
            <Plus size={15} /> Tambah item
          </button>
        )}
      </div>

      <div className="space-y-3 p-3">
        {instruments.map((item, index) => (
          <article
            key={`instrument-${index}`}
            className={`rounded-xl border p-3 sm:p-4 ${
              item.selected
                ? "bg-blue-50/40 dark:bg-blue-950/10"
                : "opacity-55"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={item.selected}
                disabled={disabled}
                onChange={(event) =>
                  update(index, { selected: event.target.checked })
                }
                className="size-5 accent-blue-600"
                aria-label={`Pilih instrument ${index + 1}`}
              />
              <p className="flex-1 text-xs font-black">
                Item instrument {index + 1}
              </p>
              {!disabled && (
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      instruments.filter(
                        (_value, itemIndex) => itemIndex !== index
                      )
                    )
                  }
                  className="inline-flex size-9 items-center justify-center rounded-lg border bg-white text-red-600"
                  aria-label={`Hapus instrument ${index + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <InstrumentField
                label="Nama instrument"
                value={item.name}
                disabled={disabled}
                wrapperClassName="col-span-2 lg:col-span-2"
                onChange={(name) => update(index, { name })}
              />
              <InstrumentField
                label="Kode barang"
                value={item.code}
                disabled={disabled}
                onChange={(code) => update(index, { code })}
              />
              <label className="text-[10px] font-bold text-zinc-500">
                Jumlah
                <div className="mt-1 grid grid-cols-[1fr_88px] gap-2">
                  <input
                    type="number"
                    min={0}
                    value={item.qty}
                    disabled={disabled}
                    onChange={(event) =>
                      update(index, {
                        qty: Math.max(0, Number(event.target.value) || 0),
                      })
                    }
                    className="h-11 min-w-0 rounded-xl border bg-transparent px-3 text-sm font-bold"
                  />
                  <select
                    value={item.unit}
                    disabled={disabled}
                    onChange={(event) =>
                      update(index, { unit: event.target.value })
                    }
                    className="h-11 rounded-xl border bg-white px-2 text-xs dark:bg-zinc-900"
                  >
                    <option>PC</option>
                    <option>SET</option>
                    <option>TRAY</option>
                    <option>BOX</option>
                    <option>UNIT</option>
                  </select>
                </div>
              </label>
              <InstrumentField
                label="Kondisi"
                value={item.condition}
                disabled={disabled}
                wrapperClassName="col-span-2 sm:col-span-1"
                onChange={(condition) => update(index, { condition })}
              />
              <div className="col-span-2 sm:col-span-1 lg:col-span-3">
                <InstrumentField
                  label="Keterangan tambahan"
                  value={item.note || ""}
                  disabled={disabled}
                  placeholder="Contoh: lengkap, steril, kabel disertakan..."
                  onChange={(note) => update(index, { note })}
                />
              </div>
            </div>
          </article>
        ))}

        {instruments.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-xs text-zinc-500">
            Belum ada instrument. Tekan “Tambah item” untuk membuat data baru.
          </div>
        )}
      </div>
    </section>
  );
}

function HospitalInventorySection({
  items,
  hospital,
  editable,
  saving,
  onChange,
  onSave,
}: {
  items: HandoverItem[];
  hospital: string;
  editable: boolean;
  saving: boolean;
  onChange: (items: HandoverItem[]) => void;
  onSave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const hospitalItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => Number(item.hospitalQty || 0) > 0);
  const query = search.trim().toLowerCase();
  const visibleHospitalItems = hospitalItems.filter(
    ({ item }) =>
      !query ||
      [item.partNumber, item.description, item.batch]
        .join(" ")
        .toLowerCase()
        .includes(query)
  );
  const selectableVisibleIndexes = visibleHospitalItems
    .filter(({ item }) => getHospitalRemaining(item) > 0)
    .map(({ index }) => index);
  const allVisibleSelected =
    selectableVisibleIndexes.length > 0 &&
    selectableVisibleIndexes.every((index) => selectedIndexes.includes(index));
  const unresolvedCount = hospitalItems.filter(
    ({ item }) => getHospitalRemaining(item) > 0
  ).length;

  function toggleSelected(index: number) {
    setSelectedIndexes((current) =>
      current.includes(index)
        ? current.filter((itemIndex) => itemIndex !== index)
        : [...current, index]
    );
  }

  function toggleAllVisible(checked: boolean) {
    const visibleSet = new Set(selectableVisibleIndexes);
    setSelectedIndexes((current) => {
      const outsideVisible = current.filter((index) => !visibleSet.has(index));
      return checked
        ? [...outsideVisible, ...selectableVisibleIndexes]
        : outsideVisible;
    });
  }

  function updateSelected(field: "usedQty" | "returnedQty") {
    const selectedSet = new Set(selectedIndexes);
    onChange(
      items.map((item, index) => {
        if (!selectedSet.has(index)) return item;
        const remaining = getHospitalRemaining(item);
        if (remaining <= 0) return item;
        return {
          ...item,
          [field]: Number(item[field] || 0) + remaining,
        };
      })
    );
    setSelectedIndexes([]);
  }

  function update(
    index: number,
    field: "usedQty" | "returnedQty",
    rawValue: number
  ) {
    const current = items[index];
    const hospitalQty = Math.max(0, Number(current.hospitalQty || 0));
    const other =
      field === "usedQty"
        ? Number(current.returnedQty || 0)
        : Number(current.usedQty || 0);
    const value = Math.min(
      Math.max(0, Number(rawValue || 0)),
      Math.max(0, hospitalQty - other)
    );
    onChange(
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-zinc-900">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 bg-blue-50 p-4 text-left transition hover:bg-blue-100/70 dark:bg-blue-950/30 dark:hover:bg-blue-950/50"
        aria-expanded={open}
      >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Hospital size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-black">Stock di Rumah Sakit</h2>
            <p className="mt-0.5 text-[10px] text-zinc-500">
              {hospital || "Rumah sakit"} · {hospitalItems.length} item ·{" "}
              {unresolvedCount} belum diselesaikan
            </p>
          </div>
          <span
            className={`rounded-full px-2 py-1 text-[8px] font-black ${
              unresolvedCount > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {unresolvedCount > 0 ? `${unresolvedCount} DI RS` : "SELESAI"}
          </span>
          <ChevronDown
            size={18}
            className={`shrink-0 text-blue-600 transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
      </button>

      {open && (
        <>
      <div className="space-y-2 p-2 sm:p-4">
        <div className="sticky top-2 z-20 rounded-xl border bg-white/95 p-2 shadow-sm backdrop-blur dark:bg-zinc-900/95">
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-3.5 text-zinc-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari REF, LOT, atau nama implant di RS..."
              className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-sm"
            />
          </label>

          {editable && (
            <div className="mt-2 hidden items-center justify-between gap-3 md:flex">
              <label className="flex cursor-pointer items-center gap-2 text-[10px] font-black">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                  className="size-5 accent-blue-600"
                />
                Pilih semua hasil ({selectableVisibleIndexes.length})
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">
                  {selectedIndexes.length} item dipilih
                </span>
                <button
                  type="button"
                  disabled={selectedIndexes.length === 0}
                  onClick={() => updateSelected("usedQty")}
                  className="rounded-lg bg-red-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-40"
                >
                  Tandai Terpakai
                </button>
                <button
                  type="button"
                  disabled={selectedIndexes.length === 0}
                  onClick={() => updateSelected("returnedQty")}
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-black text-white disabled:opacity-40"
                >
                  Return ke Office
                </button>
              </div>
            </div>
          )}
        </div>

        {visibleHospitalItems.map(({ item, index }) => {
          const hospitalQty = Number(item.hospitalQty || 0);
          const usedQty = Number(item.usedQty || 0);
          const returnedQty = Number(item.returnedQty || 0);
          const remaining = Math.max(
            0,
            hospitalQty - usedQty - returnedQty
          );
          return (
            <article
              key={`hospital-${item.partNumber}-${item.batch}-${index}`}
              className={`rounded-xl border p-3 ${
                selectedIndexes.includes(index)
                  ? "border-blue-400 bg-blue-50/40 dark:bg-blue-950/10"
                  : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                {editable && remaining > 0 && (
                  <input
                    type="checkbox"
                    checked={selectedIndexes.includes(index)}
                    onChange={() => toggleSelected(index)}
                    aria-label={`Pilih ${item.partNumber}`}
                    className="mt-1 hidden size-5 shrink-0 accent-blue-600 md:block"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-1">
                    <span className="rounded-md bg-slate-100 px-2 py-1 text-[9px] font-black text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                      {item.partNumber}
                    </span>
                    <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-700">
                      LOT {item.batch || "-"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold leading-4">
                    {item.description}
                  </p>
                  <p className="mt-1 text-[9px] font-semibold text-zinc-400">
                    Office setelah kirim: {Number(item.officeAfter || 0)} pcs
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-lg px-2 py-1 text-[9px] font-black ${
                    remaining > 0
                      ? "bg-blue-50 text-blue-700"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {remaining > 0 ? "DI RS" : "SELESAI"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-1 rounded-xl bg-slate-50 p-1 dark:bg-zinc-800">
                <HospitalMetric label="Dikirim" value={hospitalQty} />
                <HospitalMetric label="Sisa RS" value={remaining} tone="blue" />
                <HospitalMetric label="Terpakai" value={usedQty} tone="red" />
                <HospitalMetric
                  label="Kembali"
                  value={returnedQty}
                  tone="emerald"
                />
              </div>

              {editable && remaining > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      update(index, "usedQty", usedQty + remaining)
                    }
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-red-50 px-2 text-[10px] font-black text-red-700"
                  >
                    Tandai Terpakai
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      update(index, "returnedQty", returnedQty + remaining)
                    }
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-50 px-2 text-[10px] font-black text-emerald-700"
                  >
                    Return ke Office
                  </button>
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="text-[10px] font-bold text-zinc-500">
                  Dipakai operasi
                  <input
                    type="number"
                    min={Number(item.usedQty || 0)}
                    max={hospitalQty - returnedQty}
                    value={usedQty}
                    disabled={!editable}
                    onChange={(event) =>
                      update(index, "usedQty", Number(event.target.value))
                    }
                    className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-center text-base font-black text-red-600 disabled:opacity-60"
                  />
                </label>
                <label className="text-[10px] font-bold text-zinc-500">
                  Kembali ke office
                  <input
                    type="number"
                    min={Number(item.returnedQty || 0)}
                    max={hospitalQty - usedQty}
                    value={returnedQty}
                    disabled={!editable}
                    onChange={(event) =>
                      update(index, "returnedQty", Number(event.target.value))
                    }
                    className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-center text-base font-black text-emerald-600 disabled:opacity-60"
                  />
                </label>
              </div>
            </article>
          );
        })}

        {visibleHospitalItems.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-xs text-zinc-500">
            Implant tidak ditemukan.
          </div>
        )}
      </div>

      <div className="border-t p-3">
        {editable ? (
          <button
            type="button"
            disabled={saving || hospitalItems.length === 0}
            onClick={onSave}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-bold text-white disabled:opacity-50"
          >
            {saving ? (
              <LoaderCircle size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Simpan pemakaian & pengembalian
          </button>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-3 text-center text-[10px] font-bold text-amber-700">
            Penerima harus menekan “Terima & setujui” sebelum mencatat
            pemakaian.
          </p>
        )}
      </div>
        </>
      )}
    </section>
  );
}

function HospitalMetric({
  label,
  value,
  tone = "zinc",
}: {
  label: string;
  value: number;
  tone?: "zinc" | "blue" | "red" | "emerald";
}) {
  const colors = {
    zinc: "text-zinc-800 dark:text-white",
    blue: "text-blue-600",
    red: "text-red-600",
    emerald: "text-emerald-600",
  };
  return (
    <div className="rounded-lg bg-white px-1 py-2 text-center dark:bg-zinc-900">
      <b className={`block text-base ${colors[tone]}`}>{value}</b>
      <span className="text-[8px] font-bold uppercase text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function getHospitalRemaining(item: HandoverItem) {
  return Math.max(
    0,
    Number(item.hospitalQty || 0) -
      Number(item.usedQty || 0) -
      Number(item.returnedQty || 0)
  );
}

function InstrumentField({
  label,
  value,
  disabled,
  placeholder,
  wrapperClassName,
  onChange,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  placeholder?: string;
  wrapperClassName?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className={`text-[10px] font-bold text-zinc-500 ${wrapperClassName || ""}`}>
      {label}
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-sm font-medium text-zinc-900 disabled:opacity-70 dark:text-white"
      />
    </label>
  );
}

function StatusBadge({ status }: { status: OnlineHandover["Status"] }) {
  const style = status === "DITERIMA" ? "bg-emerald-50 text-emerald-700" : status === "DIKIRIM" ? "bg-blue-50 text-blue-700" : "bg-zinc-100 text-zinc-600";
  return <span className={`rounded-full px-2 py-1 text-[8px] font-black ${style}`}>{status}</span>;
}

function DocumentStatusBadge({
  status,
}: {
  status: OnlineHandover["Status"];
}) {
  const config =
    status === "DITERIMA"
      ? {
          label: "Selesai",
          className: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
        }
      : status === "DIKIRIM"
        ? {
            label: "Menunggu tanda tangan",
            className: "border-amber-300/30 bg-amber-300/15 text-amber-100",
          }
        : {
            label: "Draft",
            className: "border-slate-300/25 bg-white/10 text-slate-200",
          };
  return (
    <span
      className={`shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-wide ${config.className}`}
    >
      {config.label}
    </span>
  );
}

function HandoverActivityTimeline({
  handover,
}: {
  handover: OnlineHandover;
}) {
  const events = [
    handover.CreatedAt && {
      label: "Draft dibuat",
      by: handover.By || handover.Sender || "Sistem",
      time: handover.CreatedAt,
    },
    handover.UpdatedAt &&
      handover.UpdatedAt !== handover.CreatedAt && {
        label: "Dokumen diperbarui",
        by: handover.By || handover.Sender || "Sistem",
        time: handover.UpdatedAt,
      },
    handover.SenderSignatureMeta?.signedAt && {
      label: "Ditandatangani pengirim",
      by: handover.SenderSignatureMeta.fullName || handover.Sender,
      time: handover.SenderSignatureMeta.signedAt,
    },
    handover.SentAt && {
      label: "Dikirim ke penerima",
      by: handover.Sender || "Logistik",
      time: handover.SentAt,
    },
    handover.ReceiverSignatureMeta?.signedAt && {
      label: "Ditandatangani penerima",
      by: handover.ReceiverSignatureMeta.fullName || handover.Receiver,
      time: handover.ReceiverSignatureMeta.signedAt,
    },
    handover.AcceptedAt && {
      label: "Serah terima selesai",
      by: handover.Receiver || "Penerima",
      time: handover.AcceptedAt,
    },
  ].filter(Boolean) as Array<{ label: string; by: string; time: string }>;

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900">
      <div className="flex items-center gap-2">
        <Clock3 size={16} className="text-blue-600" />
        <h2 className="text-sm font-black">Riwayat Aktivitas</h2>
      </div>
      {events.length ? (
        <ol className="mt-4 space-y-0">
          {events.map((event, index) => (
            <li key={`${event.label}-${event.time}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="mt-1 size-2.5 rounded-full bg-blue-600 ring-4 ring-blue-50 dark:ring-blue-950" />
                {index < events.length - 1 && (
                  <span className="min-h-10 w-px flex-1 bg-slate-200 dark:bg-zinc-700" />
                )}
              </div>
              <div className="pb-4">
                <p className="text-xs font-black">{event.label}</p>
                <p className="mt-0.5 text-[9px] text-zinc-500">
                  {event.by || "-"} · {formatDateTime(event.time)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed p-4 text-center text-[10px] text-zinc-500">
          Aktivitas akan tercatat setelah draft disimpan.
        </p>
      )}
    </section>
  );
}

function DocumentSummaryCard({
  document,
  active,
  onClick,
}: {
  document: OnlineHandover;
  active: boolean;
  onClick: () => void;
}) {
  const selectedItems = document.Items.filter(
    (item) => item.selected && Number(item.qtyIssued || 0) > 0
  );
  const sentQty = selectedItems.reduce(
    (total, item) => total + Number(item.qtyIssued || 0),
    0
  );
  const statusTime =
    document.Status === "DITERIMA"
      ? document.AcceptedAt
      : document.Status === "DIKIRIM"
        ? document.SentAt
        : document.UpdatedAt || document.CreatedAt;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full overflow-hidden rounded-xl border text-left transition ${
        active
          ? "border-blue-300 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20"
          : "hover:bg-slate-50 dark:hover:bg-zinc-800"
      }`}
    >
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-xs font-black leading-4">
              {document.Hospital || "Rumah sakit belum diisi"}
            </h3>
            <p className="mt-1 text-[9px] font-bold text-zinc-400">
              {document.Procedure} · {document.Brand}
            </p>
          </div>
          <StatusBadge status={document.Status} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-slate-200 dark:bg-zinc-700">
          <div className="bg-slate-50 px-2 py-2 dark:bg-zinc-800">
            <span className="block text-[8px] font-bold uppercase text-zinc-400">
              Implant
            </span>
            <b className="mt-0.5 block text-[10px]">
              {selectedItems.length} item · {sentQty} pcs
            </b>
          </div>
          <div className="bg-slate-50 px-2 py-2 dark:bg-zinc-800">
            <span className="block text-[8px] font-bold uppercase text-zinc-400">
              Tanggal
            </span>
            <b className="mt-0.5 block text-[10px]">
              {formatDateOnly(document.HandoverDate)}
            </b>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[8px] text-zinc-400">
          <span>
            {document.Status === "DITERIMA"
              ? "Diterima"
              : document.Status === "DIKIRIM"
                ? "Dikirim"
                : "Disimpan"}
          </span>
          <b className="text-zinc-500">{formatDateTime(statusTime)}</b>
        </div>
      </div>
    </button>
  );
}

function formatDateOnly(value: string | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return "-";
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return raw;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatDateTime(value: string | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Makassar",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(",", " ·");
}

function SignaturePad({
  label,
  name,
  value,
  disabled,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (!value) return;
    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = value;
  }, [value]);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    drawingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = point(event);
    context.beginPath();
    context.moveTo(current.x, current.y);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#0f172a";
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    const context = event.currentTarget.getContext("2d");
    if (!context) return;
    const current = point(event);
    context.lineTo(current.x, current.y);
    context.stroke();
  }

  function finish(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || disabled) return;
    drawingRef.current = false;
    const canvas = event.currentTarget;
    canvas.getContext("2d")?.closePath();
    onChange(canvas.toDataURL("image/webp", 0.7));
  }

  function clear() {
    if (disabled) return;
    canvasRef.current
      ?.getContext("2d")
      ?.clearRect(0, 0, 640, 200);
    onChange("");
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div>
          <p className="text-[10px] font-black uppercase text-zinc-500">{label}</p>
          <p className="text-xs font-bold">{name}</p>
        </div>
        {!disabled && (
          <button type="button" onClick={clear} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 text-[10px] font-bold text-red-600 shadow-sm hover:bg-red-50">
            <Eraser size={14} /> Hapus
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={640}
        height={200}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={finish}
        onPointerCancel={finish}
        className={`h-44 min-h-[176px] w-full bg-white touch-none ${disabled ? "cursor-default" : "cursor-crosshair"}`}
        aria-label={label}
      />
      <p className="px-3 py-2 text-[9px] text-zinc-500">
        {value
          ? disabled
            ? "Tanda tangan tersimpan dan sudah dikunci"
            : "Tanda tangan siap disimpan"
          : "Gunakan jari atau mouse pada area putih"}
      </p>
    </div>
  );
}

function updateItem(setForm: React.Dispatch<React.SetStateAction<OnlineHandover>>, index: number, item: HandoverItem) {
  setForm((current) => ({ ...current, Items: current.Items.map((value, itemIndex) => itemIndex === index ? item : value) }));
}

function emptyAudit(fullName = ""): HandoverSignatureAudit {
  return {
    fullName,
    employeeId: "",
    position: "",
  };
}

function getDeviceId() {
  if (typeof window === "undefined") return "";
  const key = "implant-device-id-v1";
  let value = localStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(key, value);
  }
  return value;
}

function signatureAudit(
  fullName: string,
  current: HandoverSignatureAudit | undefined,
  signature: string
): HandoverSignatureAudit {
  return {
    ...emptyAudit(fullName),
    ...current,
    fullName,
    signedAt: signature ? new Date().toISOString() : undefined,
    deviceId: signature ? getDeviceId() : current?.deviceId,
    userAgent:
      signature && typeof navigator !== "undefined"
        ? navigator.userAgent
        : current?.userAgent,
  };
}

function createVerificationToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 20);
}

function isAmbiguousTransactionError(message: string) {
  return /timeout|terlalu lama|belum menerima respons|504|koneksi/i.test(
    message
  );
}

function readLocalHandoverDraft(): OnlineHandover | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("implant-handover-autosave-v1");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnlineHandover;
    if (!parsed || parsed.Status !== "DRAFT" || !Array.isArray(parsed.Items)) {
      return null;
    }
    return normalizeHandoverDocument(parsed);
  } catch {
    return null;
  }
}

function emptyHandover(procedure: HandoverProcedure, brand: HandoverBrand = "NORMMED"): OnlineHandover {
  return { Procedure: procedure, Brand: brand, Hospital: "", Surgeon: "", ApprovedBy: "", HandoverDate: new Date().toISOString().slice(0, 10), SetName: procedure === "TKR" ? "BOX – 1" : "", Items: [], Instruments: defaultInstruments(procedure, brand), Sender: "", Checker1: "", Checker2: "", AcknowledgedBy: "", Receiver: "", Status: "DRAFT", AcceptanceNote: "", SenderSignature: "", ReceiverSignature: "" };
}

function buildHandoverFromStock(procedure: HandoverProcedure, brand: HandoverBrand, rows: StockRow[]) {
  const base = emptyHandover(procedure, brand);
  base.Items = rows
    .filter(
      (row) =>
        normalizeBrand(row.Brand) === brand && matchesProcedure(row, procedure)
    )
    .map(stockRowToHandoverItem);
  return base;
}

function stockAvailable(row: StockRow) {
  const total = Number(row.TotalQty);
  return Math.max(
    0,
    Number.isFinite(total) ? total : Number(row.Qty || 0)
  );
}

function itemOfficeStock(item: HandoverItem) {
  if (item.officeAfter !== undefined && item.officeAfter !== null) {
    return Math.max(0, Number(item.officeAfter) || 0);
  }
  return Math.max(0, Number(item.qtyChecked) || 0);
}

function refreshDraftStock(
  document: OnlineHandover,
  rows: StockRow[]
): OnlineHandover {
  const byRow = new Map(rows.map((row) => [Number(row.No), row]));
  const byKey = new Map(
    rows.map((row) => [
      `${String(row.NoStok).trim()}::${String(row.Batch).trim()}`,
      row,
    ])
  );
  return {
    ...document,
    Items: document.Items.map((item) => {
      const stockRow =
        byRow.get(Number(item.stockRow || 0)) ||
        byKey.get(
          `${String(item.partNumber).trim()}::${String(item.batch).trim()}`
        );
      if (!stockRow) return item;
      const available = stockAvailable(stockRow);
      return {
        ...item,
        stockRow: stockRow.No,
        qtyChecked: available,
        selected: available > 0 ? item.selected : false,
        qtyIssued:
          available > 0
            ? Math.min(Number(item.qtyIssued || 0), available, item.stdQty)
            : 0,
      };
    }),
  };
}

function stockRowToHandoverItem(row: StockRow): HandoverItem {
  const handoverQty = isBoneCement(row) ? 2 : 1;
  const availableStock = stockAvailable(row);
  return {
    selected: availableStock > 0,
    stockRow: row.No,
    partNumber: row.NoStok,
    description: row.Deskripsi,
    batch: row.Batch,
    stdQty: handoverQty,
    qtyChecked: availableStock,
    qtyIssued: Math.min(handoverQty, availableStock),
    qtyReturned: 0,
  };
}

function stockItemKey(row: StockRow) {
  return String(row.No || `${row.NoStok}::${row.Batch}`);
}

function isBoneCement(row: StockRow) {
  return (
    String(row.Implant || "").trim().toUpperCase() === "BONE CEMENT" ||
    /BONE\s*CEMENT|CEMENT TULANG/.test(
      String(row.Deskripsi || "").toUpperCase()
    )
  );
}

function normalizeBrand(brand: unknown): HandoverBrand {
  return String(brand || "").trim().toUpperCase() === "ZIMMER"
    ? "ZIMMER"
    : "NORMMED";
}

function matchesProcedure(row: StockRow, procedure: HandoverProcedure) {
  const category = normalizeImplantCategory(row.Implant);
  const description = String(row.Deskripsi || "").toUpperCase();
  const isAccessory =
    category === "AKSESORIS" ||
    /AKSESORIS|ACCESSOR(?:Y|IES)|CABLE|ADAPTER/.test(description);
  const isCement = isBoneCement(row);

  // Aksesoris dan Bone Cement digunakan pada ketiga jenis tindakan.
  if (isAccessory || isCement) return true;
  // Head Metal harus tetap masuk Bipolar meski kategori data lama masih THR.
  if (
    procedure === "BIPOLAR" &&
    (category === "HEAD METAL" || /HEAD\s*METAL|METAL\s*HEAD/.test(description))
  ) {
    return true;
  }
  const categories: Record<HandoverProcedure, string[]> = {
    THR: [
      "THR",
      "STEM FEMUR",
      "CUP ACETABULUM",
      "HEAD METAL",
      "HEAD CERAMIC",
      "BONE SCREW",
      "LINER CUP",
      "AKSESORIS",
      "BONE CEMENT",
    ],
    BIPOLAR: [
      "STEM FEMUR",
      "BIPOLAR",
      "AKSESORIS",
      "HEAD METAL",
      "HEAD CERAMIC",
      "LINER BIPOLAR",
      "BONE CEMENT",
    ],
    TKR: [
      "FEMORAL COMPONENT",
      "TIBIAL COMPONENT",
      "TKR",
      "AKSESORIS",
      "STEM TKR",
      "INSERT TKR",
      "BONE CEMENT",
    ],
  };

  if (categories[procedure].includes(category)) return true;
  // Fallback hanya untuk baris lama yang kategori implant-nya belum diisi.
  if (category) return false;
  if (procedure === "TKR") {
    return /KNEE|TIBIAL|FEMORAL COMPONENT|INSERT/.test(description);
  }
  if (procedure === "THR") {
    return /ACETABULAR|FEMORAL HEAD|TOTAL HIP/.test(description);
  }
  return /BIPOLAR/.test(description);
}

function normalizeImplantCategory(value: unknown) {
  const category = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
  const aliases: Record<string, string> = {
    BIPLAR: "BIPOLAR",
    "ACETABULUM CUP": "CUP ACETABULUM",
    "LINNER CUP": "LINER CUP",
    "LINNER BIPOLAR": "LINER BIPOLAR",
    "FEMORAL KOMPONEN": "FEMORAL COMPONENT",
    "TIBIA KOMPONEN": "TIBIAL COMPONENT",
    "TIBIAL KOMPONEN": "TIBIAL COMPONENT",
    "TIBIA COMPONENT": "TIBIAL COMPONENT",
  };
  return aliases[category] || category;
}

function defaultInstruments(procedure: HandoverProcedure, brand: HandoverBrand): HandoverInstrument[] {
  const shared = [
    { selected: true, code: "INSTRUMENT", name: "SAW BLADE", qty: 2, unit: "PC", condition: "SET" },
    { selected: true, code: "INSTRUMENT", name: "POWERTOOLS", qty: 1, unit: "SET", condition: "SET" },
    { selected: true, code: "INSTRUMENT", name: "BATTERY", qty: 3, unit: "PC", condition: "SET" },
    { selected: true, code: "INSTRUMENT", name: "CHARGER", qty: 1, unit: "PC", condition: "SET" },
  ];
  if (procedure === "TKR") return [{ selected: true, code: "INSTRUMENT", name: `TKR ${brand}`, qty: 3, unit: "TRAY", condition: "SET" }, ...shared];
  if (procedure === "THR") return [
    { selected: true, code: "INSTRUMENT", name: `BIPOLAR ${brand}`, qty: 1, unit: "TRAY", condition: "SET" },
    { selected: true, code: "INSTRUMENT", name: `THR ${brand}`, qty: 1, unit: "TRAY", condition: "SET" },
    { selected: true, code: "INSTRUMENT", name: `STEM ${brand}`, qty: 1, unit: "TRAY", condition: "SET" },
    ...shared,
  ];
  return [
    { selected: true, code: "INSTRUMENT", name: `BIPOLAR ${brand}`, qty: 1, unit: "TRAY", condition: "SET" },
    { selected: true, code: "INSTRUMENT", name: `STEM ${brand}`, qty: 1, unit: "TRAY", condition: "SET" },
    ...shared,
  ];
}
