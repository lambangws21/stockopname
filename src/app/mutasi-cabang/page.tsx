"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  Camera,
  CheckCircle2,
  LoaderCircle,
  MapPin,
  Package,
  Printer,
  Save,
  Search,
  RefreshCcw,
  Send,
  Truck,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { gasGET } from "@/lib/gas";
import {
  correctBranchTransfer,
  listInventoryLocations,
  listBranchTransfers,
  saveBranchTransfer,
  syncInventoryLocations,
} from "@/lib/branch-transfer";
import type { StockRow } from "@/types/stock";
import type {
  BranchTransfer,
  BranchTransferItem,
  BranchTransferStatus,
} from "@/types/branch-transfer";
import { isDiscontinuedStock, isSupportCenterStock } from "@/lib/stockStatus";
import type { InventoryLocationBalance } from "@/types/inventory-location";

const DESTINATIONS = ["Cabang 1", "Cabang 2", "Cabang 3"];

function emptyTransfer(): BranchTransfer {
  return {
    Status: "DRAFT",
    Origin: "Office Denpasar",
    Destination: "",
    Items: [],
    Note: "",
    Sender: "",
    Receiver: "",
    TransferType: "MUTASI_KELUAR",
  };
}

export default function BranchTransferPage() {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [documents, setDocuments] = useState<BranchTransfer[]>([]);
  const [form, setForm] = useState<BranchTransfer>(emptyTransfer);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [correcting, setCorrecting] = useState(false);
  const [correctionOriginal, setCorrectionOriginal] = useState<BranchTransfer | null>(null);
  const [locationBalances, setLocationBalances] = useState<InventoryLocationBalance[]>([]);
  const [syncingLocations, setSyncingLocations] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [stockResult, transferResult, locationResult] = await Promise.all([
        gasGET("Sheet1"),
        listBranchTransfers(),
        listInventoryLocations().catch(() => []),
      ]);
      setStock(stockResult.data ?? []);
      setDocuments(transferResult);
      setLocationBalances(locationResult);
      const requestedId = new URLSearchParams(window.location.search).get("id");
      const requested = requestedId
        ? transferResult.find((transfer) => transfer.ID === requestedId)
        : undefined;
      if (requested) setForm(requested);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Data gagal dimuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sourceStock = useMemo<StockRow[]>(() => {
    if (form.TransferType !== "RETURN_CABANG") return stock;
    return locationBalances
      .filter((item) => item.Location === form.Origin.trim().toUpperCase() && item.Condition === "AVAILABLE" && Number(item.Qty || 0) > 0)
      .map((item) => ({
        No: Number(item.StockRow), NoStok: item.NoStok, Deskripsi: item.Description,
        Implant: item.Implant, Brand: item.Brand, Batch: item.Batch,
        Qty: Number(item.Qty), TotalQty: Number(item.Qty), TERPAKAI: 0, REFILL: 0,
        KET: `Saldo ${item.Location}`,
      } as StockRow));
  }, [form.Origin, form.TransferType, locationBalances, stock]);

  const catalog = useMemo(() => {
    const query = search.trim().toLowerCase();
    return sourceStock.filter((row) => {
      const returnedQty = correctionOriginal?.Items
        .filter((item) => item.stockRow === row.No)
        .reduce((sum, item) => sum + item.qty, 0) || 0;
      const available = Number(row.TotalQty || row.Qty || 0) + returnedQty;
      return (
        !isDiscontinuedStock(row) &&
        !isSupportCenterStock(row) &&
        available > 0 &&
        (!query ||
          [row.NoStok, row.Deskripsi, row.Batch, row.Brand, row.Implant]
            .join(" ")
            .toLowerCase()
            .includes(query))
      );
    });
  }, [correctionOriginal, search, sourceStock]);

  const locked = form.Status !== "DRAFT" && !correcting;
  const receiving = form.Status === "DIKIRIM" || form.Status === "DITERIMA_SEBAGIAN";
  const totalQty = form.Items.reduce((sum, item) => sum + item.qty, 0);
  const locationSummary = useMemo(() => {
    const grouped = new Map<string, { qty: number; variants: number }>();
    locationBalances.forEach((item) => {
      const current = grouped.get(item.Location) || { qty: 0, variants: 0 };
      current.qty += Number(item.Qty || 0);
      current.variants += 1;
      grouped.set(item.Location, current);
    });
    return Array.from(grouped.entries()).map(([location, value]) => ({ location, ...value }));
  }, [locationBalances]);

  async function syncLocations() {
    setSyncingLocations(true);
    try {
      await syncInventoryLocations();
      setLocationBalances(await listInventoryLocations());
      toast.success("Saldo Office Denpasar dan lokasi berhasil disinkronkan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sinkronisasi lokasi gagal");
    } finally {
      setSyncingLocations(false);
    }
  }

  function toggleItem(row: StockRow) {
    if (locked) return;
    const found = form.Items.some((item) => item.stockRow === row.No);
    const correctionReturn = correctionOriginal?.Items
      .filter((item) => item.stockRow === row.No)
      .reduce((sum, item) => sum + item.qty, 0) || 0;
    const available = Number(row.TotalQty || row.Qty || 0) + correctionReturn;
    const next = found
      ? form.Items.filter((item) => item.stockRow !== row.No)
      : [
          ...form.Items,
          {
            stockRow: row.No,
            ref: String(row.NoStok || ""),
            description: String(row.Deskripsi || ""),
            batch: String(row.Batch || ""),
            qty: 1,
            availableAtSend: available,
          },
        ];
    setForm({ ...form, Items: next });
  }

  function updateQty(stockRow: number, qty: number) {
    const row = sourceStock.find((item) => item.No === stockRow);
    const correctionReturn = correctionOriginal?.Items
      .filter((item) => item.stockRow === stockRow)
      .reduce((sum, item) => sum + item.qty, 0) || 0;
    const available = Number(row?.TotalQty || row?.Qty || 0) + correctionReturn;
    setForm({
      ...form,
      Items: form.Items.map((item) =>
        item.stockRow === stockRow
          ? {
              ...item,
              qty: Math.max(1, Math.min(qty || 1, available)),
            }
          : item
      ),
    });
  }

  function updateReceivedQty(stockRow: number, qty: number) {
    setForm({
      ...form,
      Items: form.Items.map((item) =>
        item.stockRow === stockRow
          ? { ...item, receivedQty: Math.max(0, Math.min(qty || 0, item.qty)) }
          : item
      ),
    });
  }

  async function handlePhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Lampiran harus berupa gambar");
      return;
    }
    try {
      const photoDataUrl = await compressImage(file);
      setForm({ ...form, PhotoDataUrl: photoDataUrl });
    } catch {
      toast.error("Gambar gagal diproses");
    }
  }

  async function persist(status: BranchTransferStatus) {
    if (!form.Destination.trim()) {
      toast.error("Pilih atau tuliskan cabang tujuan");
      return;
    }
    if (!form.Items.length) {
      toast.error("Pilih minimal satu implant");
      return;
    }
    if (status === "DIKIRIM" && !form.Sender.trim()) {
      toast.error("Nama pengirim wajib diisi");
      return;
    }
    if ((status === "DITERIMA" || status === "DITERIMA_SEBAGIAN") && !form.Receiver.trim()) {
      toast.error("Nama penerima wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const request = {
        ...form,
        Status: status,
        Items: status === "DITERIMA"
          ? form.Items.map((item) => ({ ...item, receivedQty: item.qty }))
          : form.Items,
        By: status === "DITERIMA" || status === "DITERIMA_SEBAGIAN" ? form.Receiver : form.Sender,
      };
      const result = correcting
        ? await correctBranchTransfer({ ...request, Status: "DIKIRIM" })
        : await saveBranchTransfer(request);
      if (result.data) setForm(result.data);
      toast.success(
        correcting
          ? "REF, LOT, jumlah, dan foto support berhasil dikoreksi"
          : status === "DRAFT"
          ? "Draft mutasi tersimpan"
          : status === "DIKIRIM"
            ? "Mutasi dikirim dan stok office sudah dikurangi"
            : "Barang dikonfirmasi diterima cabang"
      );
      await load();
      if (result.data) setForm(result.data);
      setCorrecting(false);
      setCorrectionOriginal(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Mutasi gagal disimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 pb-28 text-slate-950 dark:bg-zinc-950 dark:text-white sm:pb-8">
      <header className="sticky top-0 z-40 bg-slate-950 px-4 pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] text-white shadow-xl print:static print:bg-white print:text-black print:shadow-none">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <Link href="/logistik" className="flex size-10 items-center justify-center rounded-xl bg-white/10 print:hidden" aria-label="Kembali ke logistik">
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-300 print:text-slate-500">Logistik implant</p>
            <h1 className="truncate text-lg font-black">Mutasi Antar Cabang</h1>
            <p className="text-[9px] text-slate-400 print:text-slate-500">{form.ID ? `${form.Origin} → ${form.Destination}` : "Dokumen baru"}</p>
          </div>
          <StatusBadge status={form.Status} />
          <button type="button" onClick={() => window.print()} disabled={!form.ID} className="hidden h-10 items-center gap-2 rounded-xl border border-white/20 px-3 text-[10px] font-bold disabled:opacity-40 sm:inline-flex print:hidden">
            <Printer size={15} /> Cetak surat
          </button>
        </div>
      </header>

      {loading ? (
        <TransferSkeleton />
      ) : (
        <div className="mx-auto grid max-w-7xl gap-4 p-3 sm:p-5 lg:grid-cols-[260px_minmax(0,1fr)] print:block print:p-0">
          <aside className="hidden rounded-2xl border bg-white p-3 shadow-sm lg:block print:hidden dark:bg-zinc-900">
            <div className="flex items-center justify-between">
              <div><h2 className="text-sm font-black">Riwayat Mutasi</h2><p className="text-[9px] text-zinc-500">{documents.length} dokumen</p></div>
              <button type="button" onClick={() => setForm(emptyTransfer())} className="text-[10px] font-black text-blue-600">+ Baru</button>
            </div>
            <div className="mt-3 space-y-2">
              {documents.slice(0, 12).map((document) => (
                <button key={document.ID} type="button" onClick={() => setForm(document)} className={`w-full rounded-xl border p-3 text-left ${form.ID === document.ID ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : ""}`}>
                  <div className="flex items-center justify-between gap-2"><b className="truncate text-[10px]">{document.Destination}</b><StatusBadge status={document.Status} compact /></div>
                  <p className="mt-1 text-[9px] text-zinc-500">{document.Items.length} item · {document.Items.reduce((sum, item) => sum + item.qty, 0)} pcs</p>
                  <p className="mt-1 truncate text-[8px] text-zinc-400">{document.Origin} → {document.Destination}</p>
                </button>
              ))}
            </div>
          </aside>

          <div className="min-w-0 space-y-4">
            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
              <div className="flex items-center justify-between gap-3 border-b p-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><MapPin size={16} /></span>
                  <div><h2 className="text-xs font-black">Saldo Inventory per Lokasi</h2><p className="text-[8px] text-zinc-500">Office, perjalanan, dan cabang tujuan</p></div>
                </div>
                <button type="button" onClick={() => void syncLocations()} disabled={syncingLocations} className="inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[9px] font-black disabled:opacity-50">
                  <RefreshCcw size={13} className={syncingLocations ? "animate-spin" : ""} /> Sinkronkan
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto p-3">
                {locationSummary.map((item) => <div key={item.location} className="min-w-36 rounded-xl border bg-slate-50 p-3 dark:bg-zinc-800"><p className="truncate text-[9px] font-black">{item.location}</p><p className="mt-1 text-lg font-black text-emerald-700">{item.qty} pcs</p><p className="text-[8px] text-zinc-500">{item.variants} REF/LOT</p></div>)}
                {!locationSummary.length && <p className="w-full p-3 text-center text-[10px] text-zinc-500">Belum ada saldo lokasi. Tekan Sinkronkan untuk membuat saldo awal.</p>}
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/30"><Building2 size={18} /></span><div><h2 className="text-sm font-black">1. Tujuan Mutasi</h2><p className="text-[9px] text-zinc-500">Tentukan lokasi asal dan cabang penerima.</p></div></div>
              {!form.ID && <div className="mt-4 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-zinc-800">
                <button type="button" onClick={() => setForm({ ...emptyTransfer(), TransferType: "MUTASI_KELUAR" })} className={`h-10 rounded-lg text-[9px] font-black ${form.TransferType !== "RETURN_CABANG" ? "bg-white text-blue-700 shadow-sm dark:bg-zinc-700" : "text-zinc-500"}`}>Kirim ke cabang</button>
                <button type="button" onClick={() => setForm({ ...emptyTransfer(), TransferType: "RETURN_CABANG", Origin: locationSummary.find((item) => item.location !== "OFFICE DENPASAR" && !item.location.startsWith("DALAM PERJALANAN"))?.location || "", Destination: "Office Denpasar" })} className={`h-10 rounded-lg text-[9px] font-black ${form.TransferType === "RETURN_CABANG" ? "bg-white text-emerald-700 shadow-sm dark:bg-zinc-700" : "text-zinc-500"}`}>Return ke office</button>
              </div>}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {form.TransferType === "RETURN_CABANG" && !locked ? (
                  <label className="text-[10px] font-bold text-zinc-500">Cabang asal
                    <select value={form.Origin} onChange={(event) => setForm({ ...form, Origin: event.target.value, Items: [] })} className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 text-xs font-bold text-zinc-900 dark:bg-zinc-900 dark:text-white">
                      <option value="">Pilih cabang</option>
                      {locationSummary.filter((item) => item.location !== "OFFICE DENPASAR" && !item.location.startsWith("DALAM PERJALANAN")).map((item) => <option key={item.location} value={item.location}>{item.location} · {item.qty} pcs</option>)}
                    </select>
                  </label>
                ) : <Field label="Lokasi asal" value={form.Origin} disabled={locked} onChange={(Origin) => setForm({ ...form, Origin })} />}
                <div>
                  <p className="mb-1.5 text-[10px] font-bold text-zinc-500">Cabang tujuan</p>
                  <div className={`grid grid-cols-3 gap-1.5 ${form.TransferType === "RETURN_CABANG" ? "hidden" : ""}`}>
                    {DESTINATIONS.map((destination) => <button key={destination} type="button" disabled={locked} onClick={() => setForm({ ...form, Destination: destination })} className={`h-10 rounded-xl border text-[9px] font-black ${form.Destination === destination ? "border-blue-600 bg-blue-600 text-white" : ""}`}>{destination}</button>)}
                  </div>
                  <input value={form.Destination} disabled={locked || form.TransferType === "RETURN_CABANG"} onChange={(event) => setForm({ ...form, Destination: event.target.value })} placeholder="Atau ketik nama cabang..." className="mt-2 h-11 w-full rounded-xl border bg-transparent px-3 text-xs" />
                </div>
                <Field label="Nama pengirim" value={form.Sender} disabled={locked} onChange={(Sender) => setForm({ ...form, Sender })} />
                <Field label="Nama penerima" value={form.Receiver} disabled={form.Status === "DITERIMA"} onChange={(Receiver) => setForm({ ...form, Receiver })} />
              </div>
            </section>

            {form.Status === "DIKIRIM" && !correcting && (
              <button
                type="button"
                onClick={() => {
                  setCorrectionOriginal(form);
                  setCorrecting(true);
                }}
                className="h-12 w-full rounded-xl border border-amber-300 bg-amber-50 text-xs font-black text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"
              >
                Koreksi REF, LOT, Jumlah & Foto
              </button>
            )}
            {correcting && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/20">
                <p className="min-w-0 flex-1 text-[10px] font-bold leading-4 text-amber-800 dark:text-amber-200">
                  Mode koreksi aktif. Batch lama akan dikembalikan, lalu batch pengganti dikurangi saat disimpan.
                </p>
                <button type="button" onClick={() => { if (correctionOriginal) setForm(correctionOriginal); setCorrecting(false); setCorrectionOriginal(null); }} className="h-9 rounded-lg border bg-white px-3 text-[9px] font-black dark:bg-zinc-900">Batal</button>
              </div>
            )}

            <section className="overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-zinc-900">
              <div className="border-b p-4"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Package size={18} /></span><div className="min-w-0 flex-1"><h2 className="text-sm font-black">2. Pilih REF dan Batch</h2><p className="text-[9px] text-zinc-500">{form.Items.length} item · {totalQty} pcs dipilih</p></div></div>{!locked && <label className="relative mt-3 block"><Search size={15} className="absolute left-3 top-3.5 text-zinc-400"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari REF, nama implant, atau batch..." className="h-11 w-full rounded-xl border bg-transparent pl-10 pr-3 text-xs"/></label>}</div>
              {!locked ? <div className="max-h-[480px] space-y-2 overflow-y-auto p-3">{catalog.slice(0, 100).map((row) => { const selected = form.Items.find((item) => item.stockRow === row.No); const returnedQty = correctionOriginal?.Items.filter((item) => item.stockRow === row.No).reduce((sum,item)=>sum+item.qty,0) || 0; const available = Number(row.TotalQty || row.Qty || 0) + returnedQty; return <article key={row.No} className={`rounded-xl border p-3 ${selected ? "border-blue-400 bg-blue-50 dark:bg-blue-950/20" : ""}`}><div className="flex items-start gap-3"><input type="checkbox" checked={Boolean(selected)} onChange={() => toggleItem(row)} className="mt-1 size-5 accent-blue-600"/><button type="button" onClick={() => toggleItem(row)} className="min-w-0 flex-1 text-left"><div className="flex flex-wrap gap-1"><b className="rounded-md bg-slate-100 px-2 py-1 text-[9px] dark:bg-zinc-800">REF {row.NoStok}</b><span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">BATCH {row.Batch || "-"}</span><span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">TERSEDIA {available}</span></div><p className="mt-2 text-[10px] font-black leading-4">{row.Deskripsi}</p></button>{selected && <input type="number" min={1} max={available} value={selected.qty} onChange={(event) => updateQty(row.No, Number(event.target.value))} className="h-10 w-16 rounded-lg border bg-white text-center text-xs font-black dark:bg-zinc-900" aria-label={`Jumlah ${row.NoStok}`}/>}</div></article>;})}</div> : <SelectedItems items={form.Items} receiving={receiving} onReceivedQty={updateReceivedQty} />}
            </section>

            <section className="rounded-2xl border bg-white p-4 shadow-sm dark:bg-zinc-900">
              <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Camera size={18} /></span><div><h2 className="text-sm font-black">3. Bukti & Keterangan</h2><p className="text-[9px] text-zinc-500">Foto opsional sebagai referensi pengiriman.</p></div></div>
              <textarea value={form.Note} disabled={locked} onChange={(event) => setForm({ ...form, Note: event.target.value })} placeholder="Nomor kendaraan, nama kurir, kondisi kemasan, atau catatan lain..." className="mt-3 min-h-24 w-full rounded-xl border bg-transparent p-3 text-xs"/>
              {!locked && <label className="mt-3 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed text-[10px] font-black text-blue-700"><Camera size={16}/> Upload / ambil foto<input type="file" accept="image/*" capture="environment" onChange={(event) => void handlePhoto(event.target.files?.[0])} className="hidden"/></label>}
              {(form.PhotoDataUrl || form.PhotoUrl) && <div className="relative mt-3 h-64 overflow-hidden rounded-xl border"><Image unoptimized fill sizes="(max-width: 768px) 100vw, 720px" src={form.PhotoDataUrl || form.PhotoUrl || ""} alt="Bukti mutasi" className="object-contain"/>{!locked && <button type="button" onClick={() => setForm({ ...form, PhotoDataUrl: "", PhotoUrl: "", PhotoFileId: "" })} className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-lg bg-white text-red-600 shadow"><X size={16}/></button>}</div>}
            </section>

            <section className="hidden print:block">
              <h2 className="text-center text-xl font-black">SURAT MUTASI BARANG KELUAR</h2><p className="mt-1 text-center text-sm">{form.Origin} → {form.Destination}</p><div className="mt-8 grid grid-cols-2 gap-4 text-sm"><p>Dari: <b>{form.Origin}</b></p><p>Tujuan: <b>{form.Destination}</b></p><p>Pengirim: <b>{form.Sender}</b></p><p>Penerima: <b>{form.Receiver || "-"}</b></p></div><table className="mt-6 w-full border-collapse text-xs"><thead><tr>{["No","REF","Deskripsi","Batch","Qty"].map((label) => <th key={label} className="border p-2">{label}</th>)}</tr></thead><tbody>{form.Items.map((item,index)=><tr key={`${item.stockRow}-${index}`}><td className="border p-2 text-center">{index+1}</td><td className="border p-2">{item.ref}</td><td className="border p-2">{item.description}</td><td className="border p-2">{item.batch}</td><td className="border p-2 text-center">{item.qty}</td></tr>)}</tbody></table><p className="mt-6 text-sm">Catatan: {form.Note || "-"}</p><div className="mt-20 grid grid-cols-2 text-center text-sm"><div><p>Yang menyerahkan,</p><p className="mt-20 font-bold">{form.Sender || "(........................)"}</p></div><div><p>Yang menerima,</p><p className="mt-20 font-bold">{form.Receiver || "(........................)"}</p></div></div>
            </section>
          </div>
        </div>
      )}

      {!loading && (
        <div className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-3 gap-2 border-t bg-white/95 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(15,23,42,.12)] backdrop-blur print:hidden dark:bg-zinc-950 sm:static sm:mx-auto sm:mt-1 sm:max-w-7xl sm:border-0 sm:bg-transparent sm:shadow-none">
          <button type="button" disabled={saving || locked || correcting} onClick={() => void persist("DRAFT")} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl border bg-white text-[10px] font-black disabled:opacity-40 dark:bg-zinc-900">
            {saving ? <LoaderCircle size={15} className="animate-spin"/> : <Save size={15}/>} Draft
          </button>
          {correcting ? (
            <button type="button" disabled={saving || !form.Items.length} onClick={() => void persist("DIKIRIM")} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-1 text-[9px] font-black text-white disabled:opacity-40">
              {saving ? <LoaderCircle size={15} className="animate-spin"/> : <Save size={15}/>} Simpan Koreksi
            </button>
          ) : form.Status === "DRAFT" ? (
            <button type="button" disabled={saving} onClick={() => void persist("DIKIRIM")} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-blue-600 text-[10px] font-black text-white disabled:opacity-40"><Send size={15}/>Kirim</button>
          ) : receiving ? (
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" disabled={saving || !form.Items.some((item) => Number(item.receivedQty || 0) > 0)} onClick={() => void persist("DITERIMA_SEBAGIAN")} className="inline-flex h-12 items-center justify-center rounded-xl bg-amber-500 px-1 text-[8px] font-black text-white disabled:opacity-40">Terima sebagian</button>
              <button type="button" disabled={saving} onClick={() => void persist("DITERIMA")} className="inline-flex h-12 items-center justify-center gap-1 rounded-xl bg-emerald-600 px-1 text-[8px] font-black text-white disabled:opacity-40"><CheckCircle2 size={14}/>Semua</button>
            </div>
          ) : (
            <button disabled className="h-12 rounded-xl bg-emerald-600 text-[10px] font-black text-white">Selesai</button>
          )}
          <button type="button" disabled={!form.ID} onClick={() => window.print()} className="inline-flex h-12 items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-[10px] font-black text-white disabled:opacity-40 dark:bg-white dark:text-black"><Printer size={15}/>PDF</button>
        </div>
      )}

      <button type="button" onClick={() => setHistoryOpen(true)} className="fixed bottom-24 right-4 flex size-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-xl lg:hidden print:hidden" aria-label="Buka riwayat"><Truck size={19}/></button>
      {historyOpen && <div className="fixed inset-0 z-[80] flex items-end bg-slate-950/50 lg:hidden" onMouseDown={(event)=>{if(event.target===event.currentTarget)setHistoryOpen(false)}}><div className="max-h-[80dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-4 dark:bg-zinc-900"><div className="flex items-center justify-between"><h2 className="text-sm font-black">Riwayat Mutasi</h2><button onClick={()=>setHistoryOpen(false)} className="flex size-10 items-center justify-center rounded-xl border"><X size={17}/></button></div><button type="button" onClick={()=>{setForm(emptyTransfer());setHistoryOpen(false)}} className="mt-3 h-11 w-full rounded-xl bg-blue-600 text-xs font-black text-white">+ Mutasi Baru</button><div className="mt-3 space-y-2">{documents.map((document)=><button key={document.ID} type="button" onClick={()=>{setForm(document);setHistoryOpen(false)}} className="w-full rounded-xl border p-3 text-left"><div className="flex justify-between gap-2"><b className="text-xs">{document.Destination}</b><StatusBadge status={document.Status} compact/></div><p className="mt-1 text-[9px] text-zinc-500">{document.Items.length} item · {document.Items.reduce((sum,item)=>sum+item.qty,0)} pcs</p></button>)}</div></div></div>}
    </main>
  );
}

function Field({ label, value, disabled, onChange }: { label: string; value: string; disabled?: boolean; onChange: (value: string) => void }) {
  return <label className="text-[10px] font-bold text-zinc-500">{label}<input value={value} disabled={disabled} onChange={(event)=>onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border bg-transparent px-3 text-xs font-bold text-zinc-900 disabled:bg-slate-50 dark:text-white dark:disabled:bg-zinc-800"/></label>;
}

function StatusBadge({ status, compact=false }: { status: BranchTransferStatus; compact?: boolean }) {
  const style = status === "DITERIMA" ? "bg-emerald-100 text-emerald-700" : status === "DIKIRIM" ? "bg-blue-100 text-blue-700" : status === "DITERIMA_SEBAGIAN" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700";
  return <span className={`${style} shrink-0 rounded-full font-black ${compact ? "px-2 py-1 text-[7px]" : "px-2.5 py-1.5 text-[8px]"}`}>{status === "DITERIMA_SEBAGIAN" ? "SEBAGIAN" : status}</span>;
}

function SelectedItems({ items, receiving=false, onReceivedQty }: { items: BranchTransferItem[]; receiving?: boolean; onReceivedQty?: (stockRow: number, qty: number) => void }) {
  return <div className="space-y-2 p-3">{items.map((item,index)=><article key={`${item.stockRow}-${index}`} className="rounded-xl border p-3"><div className="flex flex-wrap gap-1"><b className="rounded-md bg-slate-100 px-2 py-1 text-[9px] dark:bg-zinc-800">REF {item.ref}</b><span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">BATCH {item.batch || "-"}</span><span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700">KIRIM {item.qty}</span>{Number(item.receivedQty || 0) > 0 && <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">DITERIMA {item.receivedQty}</span>}</div><div className="mt-2 flex items-center gap-3"><p className="min-w-0 flex-1 text-[10px] font-black">{item.description}</p>{receiving && <label className="text-[8px] font-bold text-zinc-500">Terima<input type="number" min={Number(item.receivedQty || 0)} max={item.qty} value={item.receivedQty || 0} onChange={(event)=>onReceivedQty?.(item.stockRow,Number(event.target.value))} className="mt-1 block h-9 w-16 rounded-lg border text-center text-xs font-black dark:bg-zinc-900"/></label>}</div></article>)}</div>;
}

function TransferSkeleton() {
  return <div className="mx-auto max-w-7xl animate-pulse space-y-4 p-4"><div className="h-36 rounded-2xl bg-slate-200 dark:bg-zinc-800"/><div className="h-80 rounded-2xl bg-slate-200 dark:bg-zinc-800"/><div className="h-40 rounded-2xl bg-slate-200 dark:bg-zinc-800"/></div>;
}

async function compressImage(file: File) {
  const source = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result||"")); reader.onerror=reject; reader.readAsDataURL(file); });
  const image = await new Promise<HTMLImageElement>((resolve,reject)=>{const element=new window.Image();element.onload=()=>resolve(element);element.onerror=reject;element.src=source;});
  const max = 1280;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas"); canvas.width=Math.round(image.width*scale); canvas.height=Math.round(image.height*scale);
  canvas.getContext("2d")?.drawImage(image,0,0,canvas.width,canvas.height);
  return canvas.toDataURL("image/jpeg",0.72);
}
