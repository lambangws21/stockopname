"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
} from "lucide-react";

type ParsedItem = {
  NoStok: string;
  Deskripsi: string;
  Batch: string;
  Qty: number;
  Implant: string;
};

type ParsedInstrument = {
  Code: string;
  Name: string;
  Qty: number;
  Uom: string;
  Condition: string;
};

type Preview = {
  fileName: string;
  sheetNames: string[];
  items: ParsedItem[];
  instruments: ParsedInstrument[];
};

type ImportResult = {
  inserted: number;
  updated: number;
  skipped: number;
  instrumentInserted: number;
  instrumentUpdated: number;
  instrumentSkipped: number;
};

export default function UploadStockExcelPage() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [brand, setBrand] = useState("ZIMMER");
  const [procedure, setProcedure] = useState("TKR");
  const [supplySource, setSupplySource] = useState("OFFICE");
  const [duplicateMode, setDuplicateMode] = useState("SKIP");
  const [replaceStock, setReplaceStock] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function chooseFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setParsing(true);
    setError("");
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/parse-stock-excel", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Excel tidak dapat dibaca");
      }
      setPreview(data as Preview);
    } catch (uploadError) {
      setPreview(null);
      setError(uploadError instanceof Error ? uploadError.message : "Upload gagal");
    } finally {
      setParsing(false);
    }
  }

  async function saveToGoogleSheet() {
    if (!preview) return;
    setSaving(true);
    setError("");
    setResult(null);
    try {
      const response = await fetch("/api/super-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "importStockExcel",
          sheet: "Sheet1",
          fileName: preview.fileName,
          Brand: brand,
          Procedure: procedure,
          SupplySource: supplySource,
          duplicateMode,
          replaceStock,
          items: preview.items,
          instruments: preview.instruments,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== "success") {
        throw new Error(data.message || "Google Sheet gagal diperbarui");
      }
      setResult(data as ImportResult);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Penyimpanan gagal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 px-3 py-4 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="rounded-3xl bg-slate-950 p-5 text-white shadow-xl sm:p-7">
          <Link href="/" className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white">
            <ArrowLeft size={15} /> Kembali ke Stock Management
          </Link>
          <div className="mt-5 flex items-start gap-3">
            <div className="rounded-2xl bg-blue-600 p-3"><FileSpreadsheet size={24} /></div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-300">Google Sheet Importer</p>
              <h1 className="mt-1 text-xl font-black sm:text-3xl">Upload Stock dari Excel</h1>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm">
                Sistem otomatis mencari tabel implant dan Tanda Terima Instrument meskipun header bukan di baris pertama.
              </p>
            </div>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <div className="space-y-4 rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50 p-5 text-center text-blue-700 transition hover:border-blue-500">
              {parsing ? <LoaderCircle className="animate-spin" size={28} /> : <UploadCloud size={30} />}
              <span className="mt-2 text-sm font-black">{parsing ? "Membaca Excel…" : "Pilih file Excel"}</span>
              <span className="mt-1 text-[10px] text-blue-500">Format .xlsx</span>
              <input type="file" accept=".xlsx" className="hidden" disabled={parsing || saving} onChange={chooseFile} />
            </label>

            <Select label="Brand" value={brand} onChange={setBrand} options={["ZIMMER", "NORMMED"]} />
            <Select label="Tindakan" value={procedure} onChange={setProcedure} options={["TKR", "UKA", "THR", "BIPOLAR"]} />
            <Select label="Lokasi sumber" value={supplySource} onChange={setSupplySource} options={["OFFICE", "SUPPORT PUSAT"]} />
            <Select label="Jika REF + Batch sudah ada" value={duplicateMode} onChange={setDuplicateMode} options={["SKIP", "UPDATE"]} labels={{ SKIP: "Lewati data lama", UPDATE: "Perbarui data lama" }} />

            {duplicateMode === "UPDATE" && (
              <label className="flex items-start gap-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <input type="checkbox" checked={replaceStock} onChange={(event) => setReplaceStock(event.target.checked)} className="mt-0.5 size-4 accent-amber-600" />
                <span><strong>Ganti jumlah stok lama.</strong> Matikan pilihan ini jika hanya ingin memperbarui nama, kategori, brand, dan sumber.</span>
              </label>
            )}

            <button type="button" onClick={saveToGoogleSheet} disabled={!preview || saving} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">
              {saving ? <LoaderCircle className="animate-spin" size={18} /> : <UploadCloud size={18} />}
              {saving ? "Menyimpan ke Google Sheet…" : "Simpan ke Google Sheet"}
            </button>
          </div>

          <div className="min-w-0 rounded-3xl border bg-white p-4 shadow-sm sm:p-5">
            {!preview ? (
              <div className="flex min-h-80 items-center justify-center text-center text-sm text-slate-400">Pilih Excel untuk melihat data sebelum disimpan.</div>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="text-xs text-slate-500">File terbaca</p><h2 className="font-black">{preview.fileName}</h2><p className="mt-1 text-[10px] text-slate-400">Sheet: {preview.sheetNames.join(", ")}</p></div>
                  <div className="flex gap-2"><Count value={preview.items.length} label="Implant" /><Count value={preview.instruments.length} label="Instrument" /></div>
                </div>
                <div className="max-h-[62vh] overflow-auto rounded-2xl border">
                  <table className="w-full min-w-[720px] text-left text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-[10px] uppercase text-slate-500"><tr><th className="p-3">REF</th><th className="p-3">Deskripsi</th><th className="p-3">Kategori</th><th className="p-3">Batch</th><th className="p-3 text-center">Qty</th></tr></thead>
                    <tbody>{preview.items.map((item, index) => <tr key={`${item.NoStok}-${item.Batch}-${index}`} className="border-t"><td className="p-3 font-black">{item.NoStok}</td><td className="p-3">{item.Deskripsi}</td><td className="p-3"><span className="rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700">{item.Implant}</span></td><td className="p-3">{item.Batch || "-"}</td><td className="p-3 text-center font-black">{item.Qty}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </section>

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {result && <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="shrink-0" size={21} /><div><p className="font-black">Import Google Sheet selesai</p><p className="mt-1 text-xs">Implant: {result.inserted} baru, {result.updated} diperbarui, {result.skipped} dilewati. Instrument: {result.instrumentInserted} baru, {result.instrumentUpdated} diperbarui, {result.instrumentSkipped} dilewati.</p></div></div>}
      </div>
    </main>
  );
}

function Select({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="block text-xs font-bold text-slate-600">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border bg-white px-3 text-sm font-bold text-slate-900">{options.map((option) => <option key={option} value={option}>{labels[option] || option}</option>)}</select></label>;
}

function Count({ value, label }: { value: number; label: string }) {
  return <div className="min-w-20 rounded-xl bg-slate-100 px-3 py-2 text-center"><div className="text-lg font-black">{value}</div><div className="text-[9px] font-bold uppercase text-slate-500">{label}</div></div>;
}
