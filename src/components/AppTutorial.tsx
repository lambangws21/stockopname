"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Barcode,
  Building2,
  CheckCircle2,
  ClipboardCheck,
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
      "Gunakan pencarian nama, REF, LOT, brand, kategori, atau status untuk menemukan implant yang tepat.",
      "Jika satu nama memiliki beberapa REF/LOT, buka Aksi lainnya lalu pilih varian fisik sebelum mengedit atau membuat pergerakan.",
      "Terpakai Operasi mengurangi stok; isi dokter, rumah sakit, tanggal, tindakan, REF, dan LOT yang benar.",
      "Refill menambah stok, Support Cabang mengurangi stok sementara, dan Kembali Cabang menambahkannya kembali.",
      "Gunakan Riwayat untuk memeriksa stok sebelum/sesudah serta pengguna yang melakukan transaksi.",
      "Untuk barang bermasalah, buka Aksi lainnya → Karantina / Rusak / Expired. Jumlah tersebut keluar dari stok tersedia tetapi tetap tersimpan di ledger.",
    ],
    important: "Hijau = tersedia, oranye = terbatas, merah = habis, ungu = Support Pusat. Support Pusat tidak dihitung sebagai stok Office.",
  },
  {
    id: "inventory",
    label: "Lokasi & Opname",
    href: "/",
    icon: ClipboardCheck,
    summary: "Mengelola saldo Office, cabang, perjalanan, dan koreksi stok fisik.",
    steps: [
      "Buka Mutasi Cabang dan tekan Sinkronkan satu kali setelah backend terbaru dipasang. Sistem membuat saldo awal Office Denpasar dari Sheet1.",
      "Kartu Saldo Inventory per Lokasi menunjukkan total pcs dan jumlah varian REF/LOT pada Office, cabang, serta barang Dalam Perjalanan.",
      "Saat mutasi dikirim, stok Office/cabang asal berkurang dan jumlahnya masuk lokasi Dalam Perjalanan. Saldo tujuan belum bertambah.",
      "Saat barang tiba, isi nama penerima serta jumlah aktual setiap REF/LOT. Gunakan Terima sebagian jika belum semua box datang.",
      "Dokumen berstatus Sebagian dapat dibuka kembali. Masukkan tambahan jumlah yang diterima sampai seluruh kiriman lengkap, kemudian tekan Semua.",
      "Untuk pemeriksaan fisik, buka Stock Opname, scan REF/LOT berulang, lalu bandingkan angka Sistem dan Fisik.",
      "Jika ada selisih, isi nama petugas dan alasan koreksi. Tekan Simpan koreksi agar Sheet1, warning, history, saldo Office, dan ledger diperbarui bersamaan.",
      "Gunakan Aksi lainnya → Karantina / Rusak / Expired untuk memisahkan barang yang tidak boleh digunakan tanpa menghapus auditnya.",
    ],
    important: "Jangan mengubah Qty langsung di Google Sheet untuk koreksi operasional. Gunakan mutasi, return, opname, atau kondisi barang agar saldo lokasi dan audit ledger tetap sama.",
  },
  {
    id: "logistik",
    label: "Logistik",
    href: "/logistik",
    icon: Warehouse,
    summary: "Memproses permintaan refill dan stok kritis.",
    steps: [
      "Buka filter Habis atau Menipis, lalu pilih brand dan komponen yang ingin ditangani.",
      "Checklist implant yang akan diminta; gunakan pilihan massal bila itemnya banyak.",
      "Bagikan ringkasan singkat melalui WhatsApp agar permintaan mudah dibaca tim logistik.",
      "Perbarui alur menjadi Belum Diproses → Sedang Dipesan → Dalam Pengiriman → Selesai.",
      "Isi PIC, target refill, dan catatan supaya progres dapat dilanjutkan oleh petugas lain.",
      "Tandai Discontinue jika implant tidak akan tersedia lagi sehingga tidak muncul pada warning.",
    ],
    important: "Status Selesai digunakan setelah barang benar-benar datang dan stok sudah diperbarui, bukan saat baru dipesan.",
  },
  {
    id: "handover",
    label: "Serah Terima",
    href: "/serah-terima",
    icon: ClipboardSignature,
    summary: "Membuat BAST pengiriman implant dan instrument.",
    steps: [
      "Langkah Info: pilih tindakan, brand, opsi bearing, rumah sakit, dokter, tanggal, serta foto dokumentasi bila diperlukan.",
      "Langkah Implant: checklist item dan pastikan REF, LOT, stok Office, kebutuhan, serta jumlah dikirim sudah benar.",
      "Langkah Alat: periksa instrumen, jumlah/unit, kondisi, sumber Office/Support Pusat, dan keterangan kelengkapannya.",
      "Langkah TTD: saat Draft hanya pengirim yang mengisi nama dan tanda tangan; data penerima baru muncul setelah dikirim.",
      "Simpan BAST mempertahankan Draft. Kirim akan mengurangi stok Office dan membuat link privat untuk rumah sakit.",
      "Penerima membuka link, memeriksa barang, mengisi nama/TTD, lalu menekan Terima & Setujui.",
      "Cetak PDF memuat implant, instrumen, tanda tangan, status pemakaian, dan QR verifikasi privat.",
    ],
    important: "Setelah dikirim, tanda tangan pengirim terkunci. Setelah diterima, identitas dan tanda tangan penerima ikut terkunci.",
  },
  {
    id: "hospital",
    label: "Stock RS",
    href: "/rumah-sakit",
    icon: Hospital,
    summary: "Menyelesaikan pemakaian dan pengembalian setelah operasi.",
    steps: [
      "Cari rumah sakit, REF, LOT, atau nama implant yang sedang berada di lokasi operasi.",
      "Checklist satu atau beberapa item; tandai Terpakai sesuai REF/LOT yang digunakan saat operasi.",
      "Pilih Return untuk implant yang tidak digunakan agar stok kembali ke Office.",
      "Periksa ringkasan jumlah dikirim, sisa RS, terpakai, dan kembali sebelum menyimpan.",
      "Simpan penyelesaian agar stok, riwayat, dan ringkasan refill diperbarui bersamaan.",
      "Daftar rumah sakit hilang otomatis setelah tidak ada implant tersisa di sana.",
    ],
    important: "Merah menandakan implant terpakai, hijau menandakan sudah kembali, dan biru berarti masih berada di RS.",
  },
  {
    id: "history",
    label: "Riwayat",
    href: "/histori-tabel",
    icon: History,
    summary: "Melihat audit seluruh pergerakan implant.",
    steps: [
      "Cari berdasarkan REF, LOT, nama implant, jenis tindakan, rumah sakit, atau pengguna.",
      "Buka detail untuk melihat waktu, jenis transaksi, jumlah, stok sebelum/sesudah, dan keterangan terbaru.",
      "Gunakan timeline untuk membedakan Operasi, Refill, Support Keluar, serta Kembali.",
      "Pilih beberapa riwayat jika memang harus dihapus karena pencatatan salah.",
    ],
    important: "Menghapus riwayat hanya menghapus audit log dan tidak mengembalikan atau mengurangi stok secara otomatis.",
  },
  {
    id: "excel",
    label: "Import Excel",
    href: "/upload-stock",
    icon: FileSpreadsheet,
    summary: "Mengimpor master implant dan instrument ke Google Sheet.",
    steps: [
      "Gunakan template Excel dengan kolom REF, deskripsi, kategori, brand, LOT/Batch, dan Qty.",
      "Pilih file .xlsx lalu tentukan brand, tindakan, serta sumber Office atau Support Pusat.",
      "Periksa preview dan koreksi baris yang tidak terbaca sebelum menyimpan.",
      "Pilih Lewati Data Lama untuk mencegah REF+LOT ganda, atau Perbarui jika data lama memang harus diganti.",
      "Implant masuk Sheet1, sedangkan daftar instrumen masuk InstrumentMaster.",
    ],
    important: "Identitas fisik utama adalah kombinasi REF + LOT. Nama yang sama boleh muncul pada LOT berbeda.",
  },
  {
    id: "scanner",
    label: "Scanner",
    href: "/scanner",
    icon: Barcode,
    summary: "Mencari implant secara cepat melalui barcode, QR, foto, atau OCR.",
    steps: [
      "Arahkan kamera ke barcode box atau gunakan Scan dari Foto jika kamera sulit fokus.",
      "Untuk label angka, gunakan OCR lalu pilih pencarian REF atau LOT dan periksa hasil bacanya.",
      "Jika barcode pabrik belum dikenal, cari implant yang benar lalu tekan Ajarkan Barcode satu kali.",
      "Hasil scan menampilkan REF, LOT, stok aktual, kondisi habis/terbatas, dan status permintaan logistik.",
      "Gunakan Buat QR Internal dan Cetak Label jika barcode asli box sulit dibaca.",
    ],
    important: "Selalu cocokkan REF dan LOT sebelum melakukan aksi stok; nama yang sama belum tentu merupakan box fisik yang sama.",
  },
  {
    id: "branch",
    label: "Mutasi Cabang",
    href: "/mutasi-cabang",
    icon: Building2,
    summary: "Mengirim ke cabang, menerima sebagian, dan mengembalikan stok ke Office.",
    steps: [
      "Periksa Saldo Inventory per Lokasi. Jika baru pertama menggunakan versi ini, tekan Sinkronkan untuk membuat saldo awal Office Denpasar.",
      "Pilih Kirim ke cabang, tentukan tujuan, lalu checklist implant berdasarkan kombinasi REF dan LOT yang benar.",
      "Tentukan jumlah, nama pengirim, catatan, dan foto. Simpan Draft jika barang belum benar-benar meninggalkan lokasi.",
      "Tekan Kirim ketika barang berangkat. Stok asal berkurang dan barang berubah menjadi Dalam Perjalanan; stok cabang belum bertambah.",
      "Jika REF, LOT, jumlah, atau foto salah dan barang belum diterima, gunakan Koreksi pada dokumen yang sama.",
      "Saat sebagian barang tiba, isi jumlah Diterima pada setiap item dan tekan Terima sebagian. Hanya jumlah tersebut yang masuk saldo cabang.",
      "Buka kembali dokumen berstatus Sebagian saat sisa barang tiba, lalu lanjutkan jumlah diterima atau tekan Semua jika lengkap.",
      "Untuk pengembalian, buat dokumen baru lalu pilih Return ke office. Pilih cabang asal dan item dari saldo cabang tersebut.",
      "Saat return dikirim, saldo cabang berkurang dan masuk Dalam Perjalanan. Stok Office baru bertambah setelah logistik menekan Terima.",
      "Cetak surat mutasi/PDF dan gunakan riwayat dokumen untuk memeriksa pengirim, penerima, waktu, serta bukti foto.",
    ],
    important: "Dikirim bukan berarti sudah menjadi stok cabang. Saldo tujuan hanya bertambah sesuai jumlah yang dikonfirmasi diterima. Return juga baru menambah Office setelah diterima logistik.",
  },
] as const;

function subscribeUrlChange(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getPrivateDocumentSnapshot() {
  return window.location.pathname.startsWith("/serah-terima") && new URLSearchParams(window.location.search).has("token");
}

export default function AppTutorial() {
  const pathname = usePathname();
  const current = GUIDES.find((guide) =>
    guide.href === "/" ? pathname === "/" || pathname === "/stock" : pathname.startsWith(guide.href)
  );
  const [open, setOpen] = useState(false);
  const privateDocumentView = useSyncExternalStore(
    subscribeUrlChange,
    getPrivateDocumentSnapshot,
    () => false
  );
  const [active, setActive] = useState(current?.id || "stock");
  const guide = GUIDES.find((item) => item.id === active) || GUIDES[0];
  const Icon = guide.icon;

  function show() {
    setActive(current?.id || "stock");
    setOpen(true);
  }

  useEffect(() => {
    function openTutorial() {
      show();
    }
    window.addEventListener("open-app-tutorial", openTutorial);
    return () => window.removeEventListener("open-app-tutorial", openTutorial);
  });

  if (privateDocumentView) return null;

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={`fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-3 z-35 h-10 items-center justify-center gap-2 border border-blue-200 bg-white/95 text-[10px] font-black text-blue-700 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-xl active:scale-95 dark:border-blue-900 dark:bg-zinc-900/95 dark:text-blue-300 sm:bottom-5 sm:left-5 sm:h-11 sm:rounded-xl sm:px-3 sm:text-xs ${pathname === "/" || pathname === "/stock" ? "hidden" : "inline-flex"} ${pathname.startsWith("/serah-terima") ? "size-10 rounded-full px-0" : "rounded-xl px-3"}`}
        aria-label="Buka panduan aplikasi"
      >
        <BookOpen size={16} /> <span className={pathname.startsWith("/serah-terima") ? "hidden sm:inline" : "inline"}>Panduan</span>
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
                  <div className="flex items-center gap-3"><span className="flex size-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"><Icon size={23} /></span><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-blue-600">Cara menggunakan</p><h3 className="text-lg font-black">{guide.label}</h3><p className="mt-0.5 text-xs text-zinc-500">{guide.summary}</p></div></div>
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-900 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-200"><p className="text-[9px] font-black uppercase tracking-wide">Perlu diperhatikan</p><p className="mt-1 text-[10px] font-medium leading-5">{guide.important}</p></div>
                  <div className="mt-5 space-y-2.5">
                    {guide.steps.map((step, index) => <motion.div key={step} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }} className="flex gap-3 rounded-2xl border bg-slate-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-100 text-[10px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">{index + 1}</span><div><p className="text-[9px] font-black uppercase text-zinc-400">Langkah {index + 1}</p><p className="mt-1 text-xs font-medium leading-5">{step}</p></div><CheckCircle2 size={15} className="ml-auto mt-0.5 shrink-0 text-emerald-500" /></motion.div>)}
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
