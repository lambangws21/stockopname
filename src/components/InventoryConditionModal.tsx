"use client";

import { useState } from "react";
import { AlertTriangle, LoaderCircle, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import type { StockRow } from "@/types/stock";

export default function InventoryConditionModal({ row, onClose, onSuccess }: {
  row: StockRow;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [condition, setCondition] = useState<"QUARANTINE" | "DAMAGED" | "EXPIRED">("QUARANTINE");
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [actor, setActor] = useState("");
  const [saving, setSaving] = useState(false);
  const available = Number(row.TotalQty || 0);

  async function save() {
    if (!note.trim() || !actor.trim()) return toast.error("Nama petugas dan alasan wajib diisi");
    setSaving(true);
    try {
      const response = await fetch("/api/super-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "inventoryConditionPost", StockRow: row.No, Ref: row.NoStok,
          Batch: row.Batch, Qty: qty, Condition: condition, Note: note.trim(), By: actor.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Kondisi barang gagal disimpan");
      toast.success(`${qty} pcs dipindahkan ke status ${condition}`);
      await onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kondisi barang gagal disimpan");
    } finally {
      setSaving(false);
    }
  }

  return <div className="fixed inset-0 z-[11000] flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4">
    <section className="w-full max-w-lg rounded-t-3xl bg-white p-4 shadow-2xl dark:bg-zinc-900 sm:rounded-3xl sm:p-5">
      <div className="flex items-start gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><ShieldAlert size={19}/></span><div className="min-w-0 flex-1"><p className="text-[9px] font-black uppercase tracking-wider text-amber-700">Kondisi Inventory</p><h2 className="text-lg font-black">Pisahkan stok bermasalah</h2></div><button onClick={onClose} className="flex size-10 items-center justify-center rounded-xl border"><X size={17}/></button></div>
      <div className="mt-4 rounded-xl bg-slate-50 p-3 dark:bg-zinc-800"><b className="text-xs">{row.NoStok} · LOT {row.Batch || "-"}</b><p className="mt-1 line-clamp-2 text-[10px] text-zinc-500">{row.Deskripsi}</p><p className="mt-2 text-[10px] font-black text-emerald-700">Tersedia {available} pcs</p></div>
      <div className="mt-4 grid grid-cols-3 gap-2">{([['QUARANTINE','Karantina'],['DAMAGED','Rusak'],['EXPIRED','Expired']] as const).map(([value,label])=><button key={value} onClick={()=>setCondition(value)} className={`h-11 rounded-xl border text-[9px] font-black ${condition===value?'border-amber-600 bg-amber-500 text-white':'text-zinc-500'}`}>{label}</button>)}</div>
      <div className="mt-3 grid grid-cols-[100px_1fr] gap-2"><label className="text-[9px] font-bold text-zinc-500">Jumlah<input type="number" min={1} max={available} value={qty} onChange={(event)=>setQty(Math.max(1,Math.min(available,Number(event.target.value)||1)))} className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-center text-sm font-black"/></label><label className="text-[9px] font-bold text-zinc-500">Petugas<input value={actor} onChange={(event)=>setActor(event.target.value)} className="mt-1 h-11 w-full rounded-xl border bg-transparent px-3 text-xs" placeholder="Nama petugas"/></label></div>
      <label className="mt-3 block text-[9px] font-bold text-zinc-500">Alasan<textarea value={note} onChange={(event)=>setNote(event.target.value)} className="mt-1 min-h-20 w-full rounded-xl border bg-transparent p-3 text-xs" placeholder="Contoh: kemasan rusak, menunggu pemeriksaan..."/></label>
      <p className="mt-3 flex gap-2 rounded-xl bg-amber-50 p-3 text-[9px] leading-4 text-amber-800"><AlertTriangle size={14} className="shrink-0"/>Barang akan dikeluarkan dari stok tersedia, tetapi tetap tersimpan pada saldo lokasi dan audit ledger.</p>
      <button onClick={()=>void save()} disabled={saving||available<=0} className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-600 text-xs font-black text-white disabled:opacity-40">{saving?<LoaderCircle size={16} className="animate-spin"/>:<ShieldAlert size={16}/>}Simpan kondisi barang</button>
    </section>
  </div>;
}
