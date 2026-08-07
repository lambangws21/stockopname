"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { ArrowLeft, Barcode, Camera, CheckCircle2, LoaderCircle, Printer, QrCode, Save, Search, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import type { StockRow } from "@/types/stock";
import type { StockWarningRow } from "@/types/logistics";
import Scanner from "@/components/stock/Scanner";

const MutateModal = dynamic(() => import("@/components/MutateModal"), { ssr: false });

type ScanPayload = { ref: string; lot: string; gtin?: string; raw?: string; searchField?: "REF" | "LOT" };
type AliasRow = { RawCode: string; Ref: string; Lot: string; Description?: string; Brand?: string };

const normalize = (value: unknown) => String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");

export default function UniversalScannerPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [warnings, setWarnings] = useState<StockWarningRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [savingAlias, setSavingAlias] = useState(false);
  const [query, setQuery] = useState("");
  const [rawCode, setRawCode] = useState("");
  const [selected, setSelected] = useState<StockRow | null>(null);
  const [recognizedAlias, setRecognizedAlias] = useState(false);
  const [teachMode, setTeachMode] = useState(false);
  const [mutateOpen, setMutateOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const initialUrlResolved = useRef(false);

  const loadStock = useCallback(async () => {
    setLoading(true);
    try {
      const [stockResponse, warningResponse] = await Promise.all([
        fetch("/api/super-sheet?sheet=Sheet1", { cache: "no-store" }),
        fetch("/api/super-sheet?action=warningList&includeResolved=false", { cache: "no-store" }),
      ]);
      const [stockJson, warningJson] = await Promise.all([stockResponse.json(), warningResponse.json()]);
      if (!stockResponse.ok || stockJson.status === "error") throw new Error(stockJson.message || "Gagal mengambil stok");
      setStock(Array.isArray(stockJson.data) ? stockJson.data : []);
      setWarnings(warningResponse.ok && Array.isArray(warningJson.data) ? warningJson.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengambil stok");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadStock(); }, [loadStock]);

  useEffect(() => {
    if (!scannerOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScannerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [scannerOpen]);

  const findExact = useCallback((ref: string, lot: string) => {
    const exact = stock.filter((row) => normalize(row.NoStok) === normalize(ref) && normalize(row.Batch) === normalize(lot));
    return exact.length === 1 ? exact[0] : null;
  }, [stock]);

  const findUniqueByLot = useCallback((lot: string) => {
    if (!normalize(lot)) return null;
    const matches = stock.filter((row) => normalize(row.Batch) === normalize(lot));
    return matches.length === 1 ? matches[0] : null;
  }, [stock]);

  useEffect(() => {
    if (initialUrlResolved.current || stock.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref") || "";
    const lot = params.get("lot") || "";
    if (!ref && !lot) {
      initialUrlResolved.current = true;
      return;
    }
    const found = findExact(ref, lot);
    setQuery([ref, lot].filter(Boolean).join(" "));
    if (found) setSelected(found);
    initialUrlResolved.current = true;
  }, [findExact, stock.length]);

  const resolveScan = useCallback(async (payload: ScanPayload) => {
    const raw = String(payload.raw || payload.ref || "").trim();
    setRawCode(raw);
    setQrDataUrl("");
    setTeachMode(false);
    setRecognizedAlias(false);
    setResolving(true);
    try {
      if (raw) {
        const response = await fetch(`/api/super-sheet?action=barcodeAliasLookup&raw=${encodeURIComponent(raw)}`);
        const json = await response.json();
        const alias = (Array.isArray(json.data) ? json.data[0] : null) as AliasRow | null;
        if (alias) {
          const found = findExact(alias.Ref, alias.Lot);
          if (found) {
            setSelected(found);
            setRecognizedAlias(true);
            setQuery(`${found.NoStok} ${found.Batch}`);
            return;
          }
        }
      }
      const found = findExact(payload.ref, payload.lot);
      if (found) {
        setSelected(found);
        setQuery(`${found.NoStok} ${found.Batch}`);
        return;
      }
      const foundByLot = findUniqueByLot(payload.lot);
      if (foundByLot) {
        setSelected(foundByLot);
        setQuery(`${foundByLot.NoStok} ${foundByLot.Batch}`);
        // QR pabrik umumnya tidak memuat REF internal. Pengguna dapat menyimpan
        // alias sekali agar scan berikutnya langsung menuju varian yang sama.
        setTeachMode(Boolean(raw));
        toast.success(`Implant ditemukan dari LOT ${foundByLot.Batch}`);
        return;
      }
      setSelected(null);
      setQuery([payload.ref, payload.lot || payload.gtin].filter(Boolean).join(" "));
      setTeachMode(Boolean(raw));
    } catch {
      const found = findExact(payload.ref, payload.lot) || findUniqueByLot(payload.lot);
      setSelected(found);
      setTeachMode(Boolean(raw) && (!found || Boolean(payload.gtin)));
    } finally {
      setResolving(false);
    }
  }, [findExact, findUniqueByLot]);

  const results = useMemo(() => {
    const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return stock.filter((row) => {
      const haystack = [row.NoStok, row.Batch, row.Deskripsi, row.Brand, row.Implant].join(" ").toLowerCase();
      return words.every((word) => haystack.includes(word));
    }).slice(0, 30);
  }, [query, stock]);
  const selectedWarning = useMemo(() => selected ? warnings.find((warning) => normalize(warning.NoStok) === normalize(selected.NoStok) && normalize(warning.Batch) === normalize(selected.Batch)) : undefined, [selected, warnings]);
  const isRequested = selectedWarning?.WorkflowStatus === "SEDANG DIPESAN" || selectedWarning?.WorkflowStatus === "DALAM PENGIRIMAN";

  function editSearch(value: string) {
    setQuery(value);
    setSelected(null);
    setRecognizedAlias(false);
    setQrDataUrl("");
    setTeachMode(Boolean(rawCode));
  }

  async function teachBarcode(row: StockRow) {
    if (!rawCode) return toast.error("Scan barcode terlebih dahulu");
    setSavingAlias(true);
    try {
      const response = await fetch("/api/super-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "barcodeAliasUpsert", sheet: "Sheet1", RawCode: rawCode, Ref: row.NoStok, Lot: row.Batch }),
      });
      const json = await response.json();
      if (!response.ok || json.status === "error") throw new Error(json.message || "Gagal menyimpan barcode");
      setSelected(row);
      setTeachMode(false);
      setRecognizedAlias(true);
      toast.success("Barcode tersimpan. Scan berikutnya akan langsung dikenali.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan barcode");
    } finally {
      setSavingAlias(false);
    }
  }

  async function makeQr() {
    if (!selected) return;
    const QRCode = await import("qrcode");
    setQrDataUrl(await QRCode.toDataURL(`IMP|${selected.NoStok}|${selected.Batch}`, { width: 360, margin: 2, errorCorrectionLevel: "M" }));
  }

  function printLabel() {
    if (!selected || !qrDataUrl) return;
    const popup = window.open("", "implant-label", "width=520,height=680");
    if (!popup) return toast.error("Izinkan pop-up browser untuk mencetak label");
    popup.document.write(`<!doctype html><html><head><title>Label Implant</title><style>body{font-family:Arial;padding:24px;text-align:center}.label{border:2px solid #111;border-radius:16px;padding:20px}img{width:240px}.name{font-weight:800;font-size:18px}.meta{font-size:16px;margin-top:8px}@media print{body{padding:0}}</style></head><body><div class="label"><div class="name">${selected.Deskripsi}</div><img src="${qrDataUrl}"/><div class="meta"><b>REF:</b> ${selected.NoStok} &nbsp; <b>LOT:</b> ${selected.Batch}</div><div class="meta">${selected.Brand} · ${selected.Implant}</div></div><script>onload=()=>{print();}</script></body></html>`);
    popup.document.close();
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-12 text-slate-950">
      <header className="sticky top-0 z-20 border-b bg-slate-950 px-4 py-3 text-white shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link href="/" className="grid size-10 place-items-center rounded-xl bg-white/10" aria-label="Kembali"><ArrowLeft size={19} /></Link>
          <div><p className="text-[10px] font-bold tracking-[.22em] text-blue-300">UNIVERSAL SCANNER</p><h1 className="text-lg font-black">Scan Box Implant</h1></div>
          <span className="ml-auto rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-bold text-emerald-300">Barcode · QR · OCR</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-4 p-3 sm:p-5">
        <section className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white"><Barcode size={22} /></div>
            <div className="min-w-0 flex-1"><h2 className="font-black">Scan barcode box implant</h2><p className="text-xs text-slate-500">Kamera hanya aktif ketika modal scanner dibuka.</p></div>
          </div>
          <button type="button" onClick={() => setScannerOpen(true)} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white shadow-sm hover:bg-blue-700"><Camera size={19} /> Buka Kamera Scanner</button>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border bg-white p-3 shadow-sm sm:p-4">
            <label className="text-xs font-bold text-slate-600">Pencarian manual</label>
            <div className="mt-2 flex items-center gap-2 rounded-xl border px-3 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"><Search size={18} className="shrink-0 text-slate-400" /><input value={query} onChange={(event) => editSearch(event.target.value)} className="h-12 min-w-0 flex-1 bg-transparent outline-none" placeholder="Nama, REF, LOT, brand..." aria-label="Cari dan ubah hasil scan" />{query ? <button type="button" onClick={() => editSearch("")} className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Hapus pencarian"><X size={17} /></button> : null}</div>
            {resolving || loading ? <div className="flex items-center gap-2 py-6 text-sm text-slate-500"><LoaderCircle className="animate-spin" size={18} /> Memeriksa database...</div> : null}

            {!selected && results.length > 0 && <div className="mt-3 max-h-80 space-y-2 overflow-auto">{results.map((row) => <button key={`${row.No}-${row.NoStok}-${row.Batch}`} onClick={() => { setSelected(row); setQuery(`${row.NoStok} ${row.Batch}`); }} className="w-full rounded-xl border p-3 text-left hover:border-blue-400 hover:bg-blue-50"><p className="line-clamp-2 text-sm font-bold">{row.Deskripsi}</p><p className="mt-1 text-xs text-slate-500">REF {row.NoStok} · LOT {row.Batch} · Stok {row.TotalQty}</p></button>)}</div>}
          </section>

          {selected && <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
            <div className="bg-blue-600 p-4 text-white"><div className="flex items-center gap-2 text-xs font-bold"><CheckCircle2 size={16} /> {recognizedAlias ? "BARCODE DIKENALI" : "IMPLANT DITEMUKAN"}</div><h2 className="mt-2 text-lg font-black leading-tight">{selected.Deskripsi}</h2></div>
            <div className="grid grid-cols-2 gap-2 p-4 text-sm"><div className="rounded-xl bg-slate-100 p-3"><span className="text-xs text-slate-500">REF</span><p className="font-black">{selected.NoStok || "-"}</p></div><div className="rounded-xl bg-slate-100 p-3"><span className="text-xs text-slate-500">LOT</span><p className="font-black">{selected.Batch || "-"}</p></div><div className={`rounded-xl p-3 ${Number(selected.TotalQty || 0) <= 0 ? "bg-red-50 text-red-700" : Number(selected.TotalQty || 0) <= 1 ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}><span className="text-xs">Stok tersedia</span><p className="text-xl font-black">{selected.TotalQty} pcs</p><p className="text-[9px] font-black">{Number(selected.TotalQty || 0) <= 0 ? "HABIS" : Number(selected.TotalQty || 0) <= 1 ? "TERBATAS" : "TERSEDIA"}</p></div><div className="rounded-xl bg-slate-100 p-3"><span className="text-xs text-slate-500">Kategori</span><p className="font-bold">{selected.Brand} · {selected.Implant}</p></div></div>
            <div className={`mx-4 mb-4 rounded-xl border p-3 ${isRequested ? "border-blue-300 bg-blue-50 text-blue-800" : selectedWarning ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><p className="text-[9px] font-black uppercase">Status Logistik</p><p className="mt-1 text-sm font-black">{isRequested ? selectedWarning?.WorkflowStatus : selectedWarning ? selectedWarning.WorkflowStatus || "Belum diproses" : "Belum ada permintaan"}</p>{selectedWarning?.PIC && <p className="mt-1 text-[10px]">PIC: {selectedWarning.PIC}</p>}</div>
            <div className="grid gap-2 border-t p-4 sm:grid-cols-2"><button onClick={() => setMutateOpen(true)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 text-sm font-bold text-white"><Wrench size={17} /> Aksi Stock</button>{teachMode && rawCode ? <button disabled={savingAlias} onClick={() => void teachBarcode(selected)} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-60">{savingAlias ? <LoaderCircle className="animate-spin" size={17} /> : <Save size={17} />} Ajarkan Barcode</button> : <button onClick={() => void makeQr()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold"><QrCode size={17} /> Buat QR Internal</button>}</div>
          </section>}

          {teachMode && !selected && <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="font-black text-amber-900">Barcode belum dikenal</p><p className="mt-1 text-sm text-amber-800">Cari implant yang benar, pilih hasilnya, lalu tekan “Ajarkan Barcode”. Kode ini akan tersimpan di Google Sheet dan berlaku di semua perangkat.</p></div>}

          {qrDataUrl && selected && <section className="rounded-2xl border bg-white p-4 text-center shadow-sm"><p className="font-black">Label QR Internal</p><p className="text-xs text-slate-500">Tempelkan pada box jika barcode pabrik sulit dibaca.</p><Image src={qrDataUrl} width={224} height={224} unoptimized alt={`QR ${selected.NoStok}`} className="mx-auto mt-2 size-56" /><button onClick={printLabel} className="mx-auto mt-2 inline-flex h-11 items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white"><Printer size={17} /> Cetak Label</button></section>}
        </div>
      </div>

      {scannerOpen ? <div className="fixed inset-0 z-[100] flex items-end bg-slate-950/70 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="Kamera scanner implant">
        <button type="button" className="absolute inset-0 cursor-default" onClick={() => setScannerOpen(false)} aria-label="Tutup kamera" />
        <section className="relative z-10 flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
          <header className="flex items-center gap-3 border-b px-4 py-3">
            <div className="grid size-10 place-items-center rounded-xl bg-blue-600 text-white"><Camera size={19} /></div>
            <div className="min-w-0 flex-1"><h2 className="font-black">Scan Box Implant</h2><p className="text-xs text-slate-500">Posisikan QR atau barcode di tengah kamera</p></div>
            <button type="button" onClick={() => setScannerOpen(false)} className="grid size-10 place-items-center rounded-xl border text-slate-600 hover:bg-slate-100" aria-label="Tutup kamera"><X size={20} /></button>
          </header>
          <div className="overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
            <Scanner onDetected={(payload) => { setScannerOpen(false); void resolveScan(payload); }} />
          </div>
        </section>
      </div> : null}

      <MutateModal open={mutateOpen} row={selected} variants={stock} sheet="Sheet1" onClose={() => setMutateOpen(false)} onSuccess={() => { setMutateOpen(false); void loadStock(); }} />
    </main>
  );
}
