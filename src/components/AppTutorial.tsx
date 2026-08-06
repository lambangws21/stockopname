"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  CheckCircle2,
  ClipboardSignature,
  FileSpreadsheet,
  History,
  Hospital,
  PackageSearch,
  Warehouse,
  X,
} from "lucide-react";

const GUIDES = [
  {
    id: "stock",
    label: "Stock",
    href: "/",
    icon: PackageSearch,
    summary: "Melihat stok fisik office dan katalog Support Pusat.",
    steps: [
      "Cari implant menggunakan nama, REF, LOT, brand, kategori, atau status stok.",
      "Gunakan Aksi lainnya untuk Terpakai Operasi, Refill, Support Cabang, atau Return.",
      "Hijau berarti stok Office, ungu berarti Support Pusat, merah berarti stok Office habis.",
      "Support Pusat tetap tersedia dalam katalog tetapi tidak dihitung pada total stok Office.",
    ],
  },
  {
    id: "logistik",
    label: "Logistik",
    href: "/logistik",
    icon: Warehouse,
    summary: "Memproses permintaan refill dan stok kritis.",
    steps: [
      "Checklist item yang ingin diminta lalu gunakan tombol Share WhatsApp.",
      "Ubah status menjadi Belum Diproses, Sedang Dipesan, Dalam Pengiriman, atau Selesai.",
      "Tandai Discontinue jika implant tidak akan tersedia lagi agar tidak muncul pada warning.",
    ],
  },
  {
    id: "handover",
    label: "Serah Terima",
    href: "/serah-terima",
    icon: ClipboardSignature,
    summary: "Membuat BAST pengiriman implant dan instrument.",
    steps: [
      "Pilih tindakan, brand, rumah sakit, dokter, dan tanggal.",
      "Periksa checklist serta jumlah dikirim; Bone Cement otomatis 2 pcs.",
      "Isi pihak pengirim/penerima dan tanda tangan, lalu Simpan atau Kirim ke Penerima.",
      "Bagikan link WhatsApp agar penerima membuka dokumen dan menyetujui secara online.",
    ],
  },
  {
    id: "hospital",
    label: "Stock RS",
    href: "/rumah-sakit",
    icon: Hospital,
    summary: "Menyelesaikan pemakaian dan pengembalian setelah operasi.",
    steps: [
      "Cari rumah sakit atau implant yang sedang berada di RS.",
      "Checklist implant yang terpakai; item lain dapat dikembalikan ke Office.",
      "Simpan penyelesaian agar stok Office, jumlah terpakai, dan histori diperbarui.",
      "Daftar RS hilang otomatis ketika tidak ada implant tersisa di lokasi tersebut.",
    ],
  },
  {
    id: "history",
    label: "Riwayat",
    href: "/histori-tabel",
    icon: History,
    summary: "Melihat audit seluruh pergerakan implant.",
    steps: [
      "Cari berdasarkan REF, nama implant, tindakan, atau pengguna.",
      "Buka detail untuk melihat stok sebelum/sesudah dan keterangan terbaru.",
      "Hapus histori hanya jika catatan memang salah; stok tidak otomatis dibalik saat histori dihapus.",
    ],
  },
  {
    id: "excel",
    label: "Import Excel",
    href: "/upload-stock",
    icon: FileSpreadsheet,
    summary: "Mengimpor master implant dan instrument ke Google Sheet.",
    steps: [
      "Pilih file .xlsx, brand, tindakan, dan sumber Office/Support Pusat.",
      "Periksa preview data sebelum menyimpan.",
      "Gunakan Lewati Data Lama untuk mencegah duplikat, atau Perbarui jika diperlukan.",
      "Implant masuk Sheet1 dan instrument masuk InstrumentMaster.",
    ],
  },
] as const;

export default function AppTutorial() {
  const pathname = usePathname();
  const current = GUIDES.find((guide) =>
    guide.href === "/" ? pathname === "/" || pathname === "/stock" : pathname.startsWith(guide.href)
  );
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(current?.id || "stock");
  const guide = GUIDES.find((item) => item.id === active) || GUIDES[0];
  const Icon = guide.icon;

  function show() {
    setActive(current?.id || "stock");
    setOpen(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 z-35 inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-white/95 px-3 text-[10px] font-black text-blue-700 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95 dark:border-blue-900 dark:bg-zinc-900/95 dark:text-blue-300 sm:bottom-5 sm:left-5 sm:h-11 sm:text-xs"
        aria-label="Buka panduan aplikasi"
      >
        <BookOpen size={16} /> Panduan
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-10060 flex items-end justify-center bg-slate-950/60 backdrop-blur-sm sm:items-center sm:p-4"
            onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}
          >
            <motion.section
              initial={{ opacity: 0, y: 36, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 330, damping: 30 }}
              className="flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl"
            >
              <header className="flex items-start justify-between gap-3 border-b bg-slate-950 p-4 text-white sm:p-5">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-blue-600"><BookOpen size={21} /></span>
                  <div><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-300">Pusat Bantuan</p><h2 className="mt-1 text-lg font-black">Panduan Stock Implant</h2></div>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="flex size-10 items-center justify-center rounded-xl border border-white/15 bg-white/10" aria-label="Tutup panduan"><X size={18} /></button>
              </header>

              <div className="grid min-h-0 flex-1 sm:grid-cols-[210px_1fr]">
                <nav className="flex gap-1.5 overflow-x-auto border-b bg-slate-50 p-2 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-col sm:overflow-y-auto sm:border-b-0 sm:border-r sm:p-3">
                  {GUIDES.map((item) => {
                    const ItemIcon = item.icon;
                    return <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`flex min-w-fit items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold transition sm:w-full ${active === item.id ? "bg-blue-600 text-white shadow-sm" : "text-zinc-500 hover:bg-white dark:hover:bg-zinc-800"}`}><ItemIcon size={15} /><span>{item.label}</span></button>;
                  })}
                </nav>

                <motion.div key={guide.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="min-h-0 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
                  <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Icon size={23} /></span><div><h3 className="text-lg font-black">{guide.label}</h3><p className="mt-0.5 text-xs text-zinc-500">{guide.summary}</p></div></div>
                  <div className="mt-5 space-y-2.5">
                    {guide.steps.map((step, index) => <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }} className="flex gap-3 rounded-2xl border bg-slate-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950"><CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" /><div><p className="text-[9px] font-black uppercase text-zinc-400">Langkah {index + 1}</p><p className="mt-1 text-xs font-medium leading-5">{step}</p></div></motion.div>)}
                  </div>
                </motion.div>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
