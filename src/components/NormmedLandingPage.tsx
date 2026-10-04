import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CircleDot,
  MapPin,
  MessageCircle,
  Menu,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  ZoomIn,
} from "lucide-react";

const products = [
  {
    eyebrow: "Total Hip System",
    title: "Hector Acetabular System",
    description:
      "Sistem acetabular dengan shell hemisferis tiga lubang, permukaan dalam polished, liner XLPE, dan mekanisme double locking.",
    image: "/images/normmed-products/acetabular-p8.png",
    imagePosition: "right center",
    tags: ["Titanium Plasma + HA", "XLPE liner", "0° & 20° liner"],
  },
  {
    eyebrow: "Total Hip System",
    title: "Hector Stem System",
    description:
      "Pilihan stem cementless dan cemented dengan desain conical, taper 12/14, serta rentang ukuran untuk rekonstruksi femoral.",
    image: "/images/normmed-products/stem-p10.png",
    imagePosition: "left center",
    tags: ["Cementless", "Cemented", "CoCr femoral head"],
  },
  {
    eyebrow: "Hip System",
    title: "Bipolar Head System",
    description:
      "Konsep double-ball dengan bipolar head dan femoral head CoCr Ø28, dilengkapi clamp locking mechanism.",
    image: "/images/normmed-products/bipolar-p7.png",
    imagePosition: "left center",
    tags: ["CoCr", "Taper 12/14", "44–60 mm"],
  },
  {
    eyebrow: "Total Knee System",
    title: "Gordion Knee System",
    description:
      "Femoral component PS/CR cemented dengan pilihan ukuran komprehensif, progressive rollback, dan insert UHMWPE.",
    image: "/images/normmed-products/knee-p13.png",
    imagePosition: "right center",
    tags: ["PS & CR", "CoCr", "UHMWPE insert"],
  },
];

const materials = [
  {
    code: "Ti + HA",
    title: "Titanium Plasma + HA",
    description:
      "Digunakan pada acetabular cup dan cementless stem untuk menghadirkan permukaan berlapis pada area yang dirancang berkontak dengan tulang.",
    tone: "from-red-600 to-rose-500",
  },
  {
    code: "CoCr",
    title: "Cobalt Chromium",
    description:
      "Material pada femoral head serta komponen femoral knee, dipadukan dengan geometri implant sesuai sistemnya.",
    tone: "from-slate-700 to-slate-500",
  },
  {
    code: "XLPE",
    title: "Cross-linked Polyethylene",
    description:
      "Material liner acetabular dengan liner ears untuk membantu mencegah rotasi dan mekanisme penguncian ganda.",
    tone: "from-amber-500 to-orange-400",
  },
  {
    code: "UHMWPE",
    title: "Ultra-high Molecular Weight PE",
    description:
      "Material yang digunakan pada tibial insert CR dan PS serta komponen patella dalam Gordion Knee System.",
    tone: "from-indigo-600 to-violet-500",
  },
];

const productDetails = [
  { title: "Acetabular Cup", system: "Hector Acetabular", image: "/images/normmed-products/details/acetabular-cup.webp", detail: "Titanium Plasma + HA coating · hemispherical shell" },
  { title: "Acetabular Liner 0°", system: "Hector Acetabular", image: "/images/normmed-products/details/acetabular-liner-0.webp", detail: "Cross-linked polyethylene · double locking" },
  { title: "Acetabular Liner 20°", system: "Hector Acetabular", image: "/images/normmed-products/details/acetabular-liner-20.webp", detail: "XLPE · liner ears membantu mencegah rotasi" },
  { title: "Acetabular Screw", system: "Hector Acetabular", image: "/images/normmed-products/details/acetabular-screw.webp", detail: "Cancellous screw · angulasi kepala hingga 15°" },
  { title: "Cementless Stem", system: "Hector Stem", image: "/images/normmed-products/details/cementless-stem.webp", detail: "Conical form · taper 12/14 · Titanium Plasma + HA" },
  { title: "Cemented Stem", system: "Hector Stem", image: "/images/normmed-products/details/cemented-stem.webp", detail: "Standard cemented configuration · taper 12/14" },
  { title: "CoCr Femoral Head", system: "Hector Hip", image: "/images/normmed-products/details/femoral-head.webp", detail: "CoCr material · pilihan diameter dan neck length" },
  { title: "Bipolar Head", system: "Bipolar System", image: "/images/normmed-products/details/bipolar-shell.webp", detail: "Clamp locking mechanism · rentang 44–60 mm" },
  { title: "Femoral Head Ø28", system: "Bipolar System", image: "/images/normmed-products/details/bipolar-head.webp", detail: "CoCr material · taper 12/14" },
  { title: "PS Femoral Component", system: "Gordion Knee", image: "/images/normmed-products/details/knee-femoral-ps.webp", detail: "PS cemented femoral component · CoCr" },
  { title: "CR Femoral Component", system: "Gordion Knee", image: "/images/normmed-products/details/knee-femoral-cr.webp", detail: "CR cemented femoral component · comprehensive sizing" },
  { title: "Tibial Component", system: "Gordion Knee", image: "/images/normmed-products/details/knee-tibial.webp", detail: "Rough surface dan cement recess" },
  { title: "CR Tibial Insert", system: "Gordion Knee", image: "/images/normmed-products/details/knee-insert.webp", detail: "UHMWPE · pilihan ketebalan" },
  { title: "Patellar Component", system: "Gordion Knee", image: "/images/normmed-products/details/knee-patella.webp", detail: "UHMWPE · diameter 29–38 mm" },
];

export default function NormmedLandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#f7f5f2] text-[#171717] selection:bg-red-200">
      <header className="absolute inset-x-0 top-0 z-30 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-black/20 px-4 py-3 text-white shadow-2xl backdrop-blur-xl sm:px-5">
          <a href="#top" className="flex items-center gap-3" aria-label="Normmed homepage">
            <NormmedMark />
            <span className="hidden border-l border-white/20 pl-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65 sm:block">
              Orthopaedic Systems
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-xs font-semibold text-white/75 md:flex">
            <a href="#products" className="transition hover:text-white">Produk</a>
            <a href="#materials" className="transition hover:text-white">Material</a>
            <a href="#origin" className="transition hover:text-white">Tentang</a>
            <a href="#contact" className="transition hover:text-white">Kontak</a>
          </nav>
          <a href="#contact" className="hidden h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-red-700 shadow-lg sm:inline-flex">
            Hubungi kami <ArrowRight size={14} />
          </a>
          <a href="#products" className="grid size-11 place-items-center rounded-xl border border-white/20 md:hidden" aria-label="Lihat produk">
            <Menu size={19} />
          </a>
        </div>
      </header>

      <section id="top" className="relative min-h-[760px] bg-[#15120f] text-white sm:min-h-[820px]">
        <Image
          src="/images/normmed-products/stem-p1.png"
          alt="Normmed Hector Total Hip System"
          fill
          priority
          className="object-cover object-center opacity-45"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(20,14,11,.98)_0%,rgba(20,14,11,.82)_45%,rgba(20,14,11,.28)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(220,38,38,.28),transparent_30%)]" />
        <div className="relative mx-auto flex min-h-[760px] max-w-7xl items-end px-5 pb-16 pt-32 sm:min-h-[820px] sm:px-8 sm:pb-24 lg:items-center lg:pb-0">
          <div className="max-w-3xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/75 backdrop-blur">
              <span className="size-1.5 rounded-full bg-red-500 shadow-[0_0_14px_#ef4444]" />
              Designed & manufactured in Ankara, Türkiye
            </div>
            <h1 className="text-[clamp(3.35rem,9vw,7.6rem)] font-black leading-[0.86] tracking-[-0.07em]">
              Engineering
              <span className="block bg-gradient-to-r from-red-500 via-red-400 to-orange-300 bg-clip-text text-transparent">in motion.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              Sistem implant orthopaedic Normmed untuk rekonstruksi hip dan knee—menggabungkan geometri implant, pilihan material, dan instrumentasi dalam satu ekosistem tindakan.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a href="#products" className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-red-600 px-6 text-sm font-black shadow-xl shadow-red-950/35 transition hover:-translate-y-0.5 hover:bg-red-500">
                Jelajahi produk <ArrowRight size={17} />
              </a>
              <a href="#materials" className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-6 text-sm font-bold backdrop-blur transition hover:bg-white/14">
                Lihat desain material
              </a>
            </div>
            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-3 border-t border-white/12 pt-6">
              <HeroMetric value="4" label="Sistem utama" />
              <HeroMetric value="Hip + Knee" label="Portfolio" />
              <HeroMetric value="Ankara" label="Asal produk" />
            </div>
          </div>
        </div>
      </section>

      <section id="origin" className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
          <div>
            <SectionLabel>Origin & identity</SectionLabel>
            <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
              Berakar di Ankara.<br />Dirancang untuk orthopaedics.
            </h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-6 shadow-[0_18px_70px_rgba(37,25,17,.08)] sm:p-8">
              <MapPin className="text-red-600" size={25} />
              <h3 className="mt-8 text-xl font-black">Made in Türkiye</h3>
              <p className="mt-3 text-sm leading-6 text-zinc-500">
                Normmed Medical Industry and Trade Inc. berlokasi di kawasan industri İvedik OSB, Yenimahalle, Ankara, Türkiye.
              </p>
            </div>
            <div className="rounded-[2rem] bg-[#191715] p-6 text-white shadow-[0_18px_70px_rgba(37,25,17,.16)] sm:p-8">
              <BadgeCheck className="text-red-400" size={25} />
              <h3 className="mt-8 text-xl font-black">System-based design</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">
                Implant, ukuran, dan instrumen disusun sebagai sistem tindakan—mulai dari acetabular, stem, bipolar, hingga total knee.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="products" className="bg-[#191715] px-5 py-20 text-white sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <SectionLabel dark>Product portfolio</SectionLabel>
              <h2 className="mt-5 max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">Satu portfolio untuk hip dan knee.</h2>
            </div>
            <p className="max-w-md text-sm leading-6 text-white/52">Ringkasan berikut disusun dari surgical technique resmi Normmed. Pemilihan implant tetap mengikuti penilaian dan keputusan klinis tenaga medis.</p>
          </div>

          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            {products.map((product, index) => (
              <article key={product.title} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[.055]">
                <div className="relative h-64 overflow-hidden bg-zinc-100 sm:h-80">
                  <Image src={product.image} alt={product.title} fill className="object-cover transition duration-700 group-hover:scale-[1.025]" style={{ objectPosition: product.imagePosition }} sizes="(max-width: 1024px) 100vw, 50vw" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
                  <span className="absolute left-5 top-5 grid size-10 place-items-center rounded-full bg-red-600 text-xs font-black">0{index + 1}</span>
                </div>
                <div className="p-6 sm:p-8">
                  <p className="text-[10px] font-black uppercase tracking-[.2em] text-red-400">{product.eyebrow}</p>
                  <h3 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{product.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/55">{product.description}</p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {product.tags.map((tag) => <span key={tag} className="rounded-full border border-white/10 bg-white/[.06] px-3 py-1.5 text-[10px] font-bold text-white/70">{tag}</span>)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="gallery" className="bg-white px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_.6fr] lg:items-end">
            <div>
              <SectionLabel>Detail gallery</SectionLabel>
              <h2 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">Lihat setiap komponen lebih dekat.</h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-zinc-500 lg:justify-self-end">Pilih gambar untuk membuka resolusi lebih besar. Detail visual diambil langsung dari halaman implant types pada katalog Normmed.</p>
          </div>

          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {productDetails.map((item, index) => (
              <a
                key={item.title}
                href={item.image}
                target="_blank"
                rel="noreferrer"
                className={`group overflow-hidden rounded-2xl border border-black/6 bg-[#f6f4f1] shadow-[0_12px_40px_rgba(37,25,17,.06)] transition hover:-translate-y-1 hover:shadow-[0_22px_60px_rgba(37,25,17,.12)] sm:rounded-[1.75rem] ${index === 0 || index === 9 ? "sm:col-span-2" : ""}`}
              >
                <div className={`relative overflow-hidden bg-[#efeeec] ${index === 0 || index === 9 ? "aspect-[16/9]" : "aspect-square"}`}>
                  <Image src={item.image} alt={item.title} fill className="object-cover transition duration-500 group-hover:scale-[1.035]" sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw" />
                  <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/65 text-white opacity-90 backdrop-blur transition group-hover:bg-red-600"><ZoomIn size={15} /></span>
                </div>
                <div className="p-3.5 sm:p-5">
                  <p className="text-[8px] font-black uppercase tracking-[.15em] text-red-700 sm:text-[9px]">{item.system}</p>
                  <h3 className="mt-1.5 text-sm font-black leading-tight sm:text-lg">{item.title}</h3>
                  <p className="mt-2 hidden text-[11px] leading-5 text-zinc-500 sm:block">{item.detail}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="materials" className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <SectionLabel>Material language</SectionLabel>
              <h2 className="mt-5 text-4xl font-black tracking-[-0.045em] sm:text-6xl">Material sesuai fungsi desain.</h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-zinc-500">Setiap sistem mengombinasikan material dan fitur geometri yang berbeda. Informasi ini merangkum material yang dinyatakan dalam katalog resmi.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {materials.map((material) => (
                <article key={material.code} className="rounded-[2rem] border border-black/6 bg-white p-6 shadow-[0_16px_60px_rgba(37,25,17,.06)] sm:p-8">
                  <div className={`grid size-16 place-items-center rounded-2xl bg-gradient-to-br ${material.tone} text-sm font-black text-white shadow-lg`}>{material.code}</div>
                  <h3 className="mt-8 text-xl font-black">{material.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-500">{material.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.25rem] bg-red-700 text-white lg:grid-cols-2">
          <div className="p-7 sm:p-12 lg:p-16">
            <Sparkles size={25} className="text-red-200" />
            <h2 className="mt-8 text-3xl font-black tracking-[-0.04em] sm:text-5xl">Designed as a complete system.</h2>
            <div className="mt-8 space-y-5">
              <DesignPoint title="Acetabular stability" text="Shell hemisferis, pilihan liner, locking mechanism, dan acetabular screw dalam satu sistem." />
              <DesignPoint title="Femoral versatility" text="Pilihan cementless/cemented, standard/lateral, serta femoral head untuk kebutuhan konfigurasi berbeda." />
              <DesignPoint title="Knee articulation" text="Opsi PS/CR, rentang ukuran femoral, serta insert UHMWPE dengan beberapa ketebalan." />
            </div>
          </div>
          <div className="relative min-h-80 bg-white lg:min-h-full">
            <Image src="/images/normmed-products/knee-p14.png" alt="Normmed Gordion knee implant portfolio" fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 50vw" />
          </div>
        </div>
      </section>

      <section id="contact" className="bg-[#e9e5df] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#161412] p-7 text-white shadow-2xl sm:p-12 lg:p-16">
            <div className="absolute -right-24 -top-24 size-80 rounded-full bg-red-600/25 blur-3xl" />
            <div className="relative grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
              <div>
                <SectionLabel dark>Kontak cabang Bali</SectionLabel>
                <h2 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">Diskusikan kebutuhan produk Normmed.</h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">Untuk informasi produk, katalog, ketersediaan, dan dukungan Normmed di wilayah Bali, silakan hubungi contact person cabang.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-red-300"><UserRound size={21} /></span>
                  <span><span className="block text-[9px] font-bold uppercase tracking-[.15em] text-white/35">Contact person</span><strong className="mt-1 block text-base">Herlambang Wicaksono</strong><span className="mt-0.5 block text-[10px] text-white/45">Bali, Indonesia</span></span>
                </div>
                <ContactLink href="https://wa.me/6285156331464?text=Halo%20Pak%20Herlambang%2C%20saya%20ingin%20menanyakan%20produk%20Normmed." icon={<MessageCircle size={18} />} label="WhatsApp cabang Bali" value="+62 851-5633-1464" external />
                <ContactLink href="tel:+6285156331464" icon={<Phone size={18} />} label="Telephone" value="+62 851-5633-1464" />
              </div>
            </div>
            <div className="relative mt-12 flex flex-col gap-5 border-t border-white/10 pt-6 text-[10px] text-white/42 sm:flex-row sm:items-center sm:justify-between">
              <p>Cabang Bali · Indonesia</p>
              <p>Manufacturer: Normmed Medical · Ankara, Türkiye · <a href="mailto:info@normmed.com.tr" className="text-white/65 hover:text-white">info@normmed.com.tr</a></p>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#161412] px-5 py-7 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <NormmedMark />
          <p className="text-[10px] leading-5 text-white/40">Materi produk dirangkum dari surgical technique Normmed. Bukan pengganti petunjuk penggunaan resmi atau pertimbangan klinis.</p>
          <Link href="/stock" className="inline-flex items-center gap-2 text-xs font-bold text-white/65 hover:text-white">Buka NEX Stock <ArrowRight size={14} /></Link>
        </div>
      </footer>
    </main>
  );
}

function NormmedMark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center rounded-xl bg-red-600 shadow-lg shadow-red-950/25">
        <span className="absolute size-4 rotate-45 rounded-[4px] border-2 border-white" />
        <CircleDot size={11} className="relative text-white" />
      </span>
      <span className="text-lg font-black tracking-[-0.04em]">normmed</span>
    </span>
  );
}

function SectionLabel({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return <p className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] ${dark ? "text-red-400" : "text-red-700"}`}><span className="h-px w-7 bg-current" />{children}</p>;
}

function HeroMetric({ value, label }: { value: string; label: string }) {
  return <div><p className="text-sm font-black sm:text-xl">{value}</p><p className="mt-1 text-[9px] uppercase tracking-[.14em] text-white/40">{label}</p></div>;
}

function DesignPoint({ title, text }: { title: string; text: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/12"><ShieldCheck size={14} /></span><div><h3 className="text-sm font-black">{title}</h3><p className="mt-1 text-xs leading-5 text-white/65">{text}</p></div></div>;
}

function ContactLink({ href, icon, label, value, external = false }: { href: string; icon: React.ReactNode; label: string; value: string; external?: boolean }) {
  return <a href={href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-3.5 transition hover:border-red-400/50 hover:bg-white/10"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-600 text-white">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[9px] font-bold uppercase tracking-[.15em] text-white/35">{label}</span><strong className="mt-0.5 block truncate text-sm">{value}</strong></span><ArrowRight size={15} className="text-white/35" /></a>;
}
