import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  BadgeCheck,
  Boxes,
  CircleDot,
  ExternalLink,
  Eye,
  FileText,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  ZoomIn,
} from "lucide-react";
import ShareImageButton from "@/components/ShareImageButton";

const productFamilies = [
  {
    category: "Hip reconstruction",
    title: "Normmed Hector Hip",
    brand: "NORMMED",
    image: "/images/normmed-products/acetabular-p8.png",
    description:
      "Acetabular cup, liner XLPE, screw, cementless/cemented stem, dan femoral head dalam satu sistem.",
    tags: ["Ti Plasma + HA", "XLPE", "12/14 taper"],
  },
  {
    category: "Acetabular system",
    title: "Trilogy IT",
    brand: "ZIMMER",
    image: "/images/orthopaedic-products/zimmer/trilogy.webp",
    description:
      "Sistem acetabular dengan pilihan shell cluster-hole serta liner polyethylene, ceramic, dan metal.",
    tags: ["Cluster-hole shell", "Longevity PE", "BIOLOX delta"],
  },
  {
    category: "Cemented acetabular",
    title: "ZCA All-Poly Cup",
    brand: "ZIMMER",
    image: "/images/orthopaedic-products/zimmer/zca.webp",
    description:
      "Pilihan cemented all-poly acetabular cup dalam konfigurasi standard, elevated, dan hooded.",
    tags: ["All-poly", "Cemented", "10° inclined option"],
  },
  {
    category: "Total knee system",
    title: "Persona Knee",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/focused/persona-product.webp",
    description:
      "Platform total knee yang menekankan pilihan ukuran, anatomi, instrumentasi, dan teknologi fiksasi.",
    tags: ["Personalized fit", "Anatomic tibia", "Trabecular Metal"],
  },
  {
    category: "Partial knee system",
    title: "Oxford Partial Knee",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/focused/oxford-product.webp",
    description:
      "Sistem partial knee dengan mobile bearing dan Microplasty instrumentation.",
    tags: ["Mobile bearing", "Partial knee", "Microplasty"],
  },
  {
    category: "Total knee system",
    title: "Vanguard PS Knee",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/zimmer/vanguard.webp",
    description:
      "Posterior-stabilized knee dengan perhatian pada trochlear groove dan tibiofemoral articulation.",
    tags: ["PS design", "ArCom PE", "E1 bearing"],
  },
  {
    category: "High-flex knee",
    title: "NexGen Legacy LPS-Flex",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/zimmer/nexgen.webp",
    description:
      "Sistem LPS-Flex dalam keluarga NexGen yang dirancang mengakomodasi aktivitas high-flexion.",
    tags: ["LPS-Flex", "Fixed bearing", "NexGen platform"],
  },
  {
    category: "Total knee system",
    title: "Normmed Gordion Knee",
    brand: "NORMMED",
    image: "/images/normmed-products/knee-p13.png",
    description:
      "Pilihan femoral component PS/CR, tibial component, insert UHMWPE, dan patellar component.",
    tags: ["PS & CR", "CoCr", "UHMWPE"],
  },
  {
    category: "Revision knee",
    title: "NexGen Legacy LCCK",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/zimmer/lcck.webp",
    description:
      "Sistem constrained condylar knee dengan opsi augment, stem extension, dan Trabecular Metal cone.",
    tags: ["Revision", "Constraint", "Stem & augment"],
  },
  {
    category: "Revision hip",
    title: "Wagner SL Revision",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/zimmer/wagner.webp",
    description:
      "Stem cementless berbentuk tapered conical dengan longitudinal ribs untuk rekonstruksi femoral revision.",
    tags: ["Titanium alloy", "Conical stem", "Longitudinal ribs"],
  },
  {
    category: "Fixed-bearing UKA",
    title: "Persona Partial Knee",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/zimmer/persona-partial.webp",
    description:
      "Partial knee fixed-bearing dengan bentuk komponen spesifik kompartemen dan Vivacit-E polyethylene.",
    tags: ["Fixed bearing", "Cemented", "Vivacit-E"],
  },
  {
    category: "Surgical technology",
    title: "Dermatome & Skin Graft",
    brand: "ZIMMER BIOMET",
    image: "/images/orthopaedic-products/focused/dermatome-product.webp",
    description:
      "Keluarga Air, AN, dan Electric Dermatome serta Skin Graft Mesher untuk pengambilan dan ekspansi graft.",
    tags: ["Air / AN / Electric", "Skin graft", "Mesher"],
  },
];

const detailGallery = [
  {
    title: "Trilogy IT Shell",
    meta: "Zimmer · Acetabular",
    image: "/images/orthopaedic-products/zimmer/trilogy.webp",
  },
  {
    title: "ZCA All-Poly Cup",
    meta: "Zimmer · Cemented cup",
    image: "/images/orthopaedic-products/zimmer/zca.webp",
  },
  {
    title: "Persona Knee",
    meta: "Zimmer Biomet · Total knee",
    image: "/images/orthopaedic-products/zimmer/persona.webp",
  },
  {
    title: "Personalized Implant Geometry",
    meta: "Persona · Design",
    image: "/images/orthopaedic-products/zimmer/persona-design.webp",
  },
  {
    title: "Trabecular Metal",
    meta: "Persona · Material",
    image: "/images/orthopaedic-products/zimmer/persona-material.webp",
  },
  {
    title: "14 mm × +30 mm Stem",
    meta: "Persona · Stem extension",
    image: "/images/orthopaedic-products/focused/persona-stem-product.webp",
  },
  {
    title: "Oxford Partial Knee",
    meta: "Zimmer Biomet · UKA",
    image: "/images/orthopaedic-products/zimmer/oxford.webp",
  },
  {
    title: "NexGen Legacy LCCK",
    meta: "Zimmer Biomet · Revision knee",
    image: "/images/orthopaedic-products/zimmer/lcck.webp",
  },
  {
    title: "NexGen LPS-Flex",
    meta: "Zimmer Biomet · TKA",
    image: "/images/orthopaedic-products/zimmer/nexgen.webp",
  },
  {
    title: "NexGen Articulation",
    meta: "LPS-Flex · Design",
    image: "/images/orthopaedic-products/zimmer/nexgen-detail.webp",
  },
  {
    title: "Vanguard PS",
    meta: "Zimmer Biomet · TKA",
    image: "/images/orthopaedic-products/zimmer/vanguard.webp",
  },
  {
    title: "Vanguard Tibial Bearings",
    meta: "Vanguard · Bearing",
    image: "/images/orthopaedic-products/zimmer/vanguard-bearing.webp",
  },
  {
    title: "Hector Cementless Stem",
    meta: "Normmed · Hip",
    image: "/images/normmed-products/details/cementless-stem.webp",
  },
  {
    title: "Hector Acetabular Cup",
    meta: "Normmed · Hip",
    image: "/images/normmed-products/details/acetabular-cup.webp",
  },
  {
    title: "Bipolar Head",
    meta: "Normmed · Bipolar",
    image: "/images/normmed-products/details/bipolar-shell.webp",
  },
  {
    title: "Gordion Femoral Component",
    meta: "Normmed · TKA",
    image: "/images/normmed-products/details/knee-femoral-ps.webp",
  },
  {
    title: "Wagner SL Revision Stem",
    meta: "Zimmer Biomet · Revision hip",
    image: "/images/orthopaedic-products/zimmer/wagner.webp",
  },
  {
    title: "Persona Partial Knee",
    meta: "Zimmer Biomet · Fixed-bearing UKA",
    image: "/images/orthopaedic-products/zimmer/persona-partial.webp",
  },
  {
    title: "Zimmer Electric Dermatome",
    meta: "Surgical technology · Dermatome",
    image: "/images/orthopaedic-products/focused/dermatome-product.webp",
  },
  {
    title: "Skin Graft Mesher",
    meta: "Surgical technology · Skin graft",
    image: "/images/orthopaedic-products/focused/mesher-product.webp",
  },
];

const brochures = [
  {
    title: "Hector Acetabular System",
    brand: "Normmed",
    category: "Hip",
    href: "/brochures/normmed-hector-acetabular.pdf",
  },
  {
    title: "Hector Stem System",
    brand: "Normmed",
    category: "Hip",
    href: "/brochures/normmed-hector-stem.pdf",
  },
  {
    title: "Bipolar Head System",
    brand: "Normmed",
    category: "Hip",
    href: "/brochures/normmed-bipolar-head.pdf",
  },
  {
    title: "Gordion Knee System",
    brand: "Normmed",
    category: "TKA",
    href: "/brochures/normmed-gordion-knee.pdf",
  },
  {
    title: "Trilogy IT Surgical Technique",
    brand: "Zimmer",
    category: "Hip",
    href: "/brochures/zimmer-trilogy-it.pdf",
  },
  {
    title: "ZCA All-Poly Cup",
    brand: "Zimmer",
    category: "Hip",
    href: "/brochures/zimmer-zca-all-poly.pdf",
  },
  {
    title: "Persona Knee",
    brand: "Zimmer Biomet",
    category: "TKA",
    href: "/brochures/persona-knee.pdf",
  },
  {
    title: "Persona Stem Extension",
    brand: "Zimmer Biomet",
    category: "TKA",
    href: "/brochures/persona-stem-extension.pdf",
  },
  {
    title: "Oxford Partial Knee",
    brand: "Zimmer Biomet",
    category: "UKA",
    href: "/brochures/oxford-partial-knee.pdf",
  },
  {
    title: "NexGen Legacy LPS-Flex",
    brand: "Zimmer Biomet",
    category: "TKA",
    href: "/brochures/nexgen-lps-flex.pdf",
  },
  {
    title: "Vanguard PS Knee",
    brand: "Zimmer Biomet",
    category: "TKA",
    href: "/brochures/vanguard-ps-knee.pdf",
  },
  {
    title: "Dermatome & Skin Graft",
    brand: "Zimmer Biomet",
    category: "Surgical Technology",
    href: "/brochures/dermatome-skin-graft.pdf",
  },
];

const officialResources = [
  {
    title: "NexGen Legacy LCCK",
    href: "https://www.zimmerbiomet.com/en/products-and-solutions/specialties/knee/nexgen-legacy-constrained-condylar-knee-lcck.html",
  },
  {
    title: "Wagner SL Revision",
    href: "https://www.zimmerbiomet.com/en/products-and-solutions/specialties/hip/wagner-sl-revision-hip-system.html",
  },
  {
    title: "Persona Partial Knee",
    href: "https://www.zimmerbiomet.com/en/products-and-solutions/specialties/knee/persona-partial-knee.html/1000",
  },
];

const designPrinciples = [
  {
    code: "HIP",
    title: "Acetabular options",
    text: "Pilihan shell, liner, screw, cemented cup, dan bearing untuk berbagai konfigurasi sistem hip.",
  },
  {
    code: "TKA",
    title: "Knee personalization",
    text: "Pilihan ukuran, bearing, stem extension, dan filosofi implant dalam platform total knee.",
  },
  {
    code: "UKA",
    title: "Partial knee",
    text: "Oxford menggabungkan mobile bearing dengan instrumentasi Microplasty pada platform partial knee.",
  },
  {
    code: "MAT",
    title: "Material engineering",
    text: "CoCr, titanium coating, polyethylene, ceramic bearing, dan porous biomaterial sesuai sistem produknya.",
  },
];

export default function NormmedLandingPage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-[#f4f7f8] text-[#10212a] selection:bg-cyan-200">
      <header className="absolute inset-x-0 top-0 z-30 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-[#071b24]/70 px-4 py-3 text-white shadow-2xl backdrop-blur-xl sm:px-5">
          <a href="#top" aria-label="Ortho Bali homepage">
            <PortfolioMark />
          </a>
          <nav className="hidden items-center gap-7 text-xs font-semibold text-white/70 md:flex">
            <a href="#portfolio" className="hover:text-white">
              Portfolio
            </a>
            <a href="#design" className="hover:text-white">
              Desain
            </a>
            <a href="#gallery" className="hover:text-white">
              Galeri
            </a>
            <a href="#brochures" className="hover:text-white">
              Brosur
            </a>
            <a href="#contact" className="hover:text-white">
              Kontak
            </a>
          </nav>
          <a
            href="#contact"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-400 px-4 text-xs font-black text-[#06202a] shadow-lg"
          >
            Hubungi <ArrowRight size={14} />
          </a>
        </div>
      </header>

      <section
        id="top"
        className="relative min-h-[780px] bg-[#071820] text-white sm:min-h-[850px]"
      >
        <Image
          src="/images/orthopaedic-products/zimmer/persona.webp"
          alt="Portfolio implant hip dan knee"
          fill
          priority
          className="object-cover object-[70%_center] opacity-55"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(5,22,30,.99)_0%,rgba(5,22,30,.91)_46%,rgba(5,22,30,.16)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(34,211,238,.22),transparent_34%)]" />
        <div className="relative mx-auto flex min-h-[780px] max-w-7xl items-end px-5 pb-16 pt-32 sm:min-h-[850px] sm:px-8 sm:pb-24 lg:items-center lg:pb-0">
          <div className="max-w-4xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/75 backdrop-blur">
              <span className="size-1.5 rounded-full bg-cyan-400 shadow-[0_0_14px_#22d3ee]" />{" "}
              Normmed · Zimmer Biomet
            </div>
            <h1 className="text-[clamp(3.2rem,9vw,7.5rem)] font-black leading-[.86] tracking-[-.07em]">
              Precision for
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                every movement.
              </span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-white/68 sm:text-lg sm:leading-8">
              Portfolio sistem implant hip, total knee, dan partial
              knee—disajikan dengan fokus pada bentuk produk, material, serta
              karakter desain tiap sistem.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                href="#portfolio"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-6 text-sm font-black text-[#06202a] shadow-xl transition hover:-translate-y-0.5 hover:bg-cyan-300"
              >
                Lihat portfolio <ArrowRight size={17} />
              </a>
              <a
                href="#contact"
                className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-6 text-sm font-bold backdrop-blur hover:bg-white/14"
              >
                Konsultasi produk
              </a>
            </div>
            <div className="mt-12 grid max-w-2xl grid-cols-3 gap-3 border-t border-white/12 pt-6">
              <HeroMetric value="2" label="Portfolio brand" />
              <HeroMetric value="Hip · TKA · UKA" label="Kategori" />
              <HeroMetric value="Bali" label="Dukungan lokal" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.75fr_1.25fr] lg:items-center">
          <div>
            <SectionLabel>Curated portfolio</SectionLabel>
            <h2 className="mt-5 text-4xl font-black leading-[1.02] tracking-[-.05em] sm:text-6xl">
              Dua portfolio.
              <br />
              Satu akses di Bali.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-500">
              Landing page ini merupakan katalog informasi produk lokal, bukan
              situs resmi manufacturer. Informasi teknis diringkas dari brosur
              dan surgical technique yang tersedia.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <BrandCard
              brand="NORMMED"
              origin="Ankara, Türkiye"
              text="Sistem Hector Hip, Bipolar Head, dan Gordion Knee dengan kombinasi titanium coating, CoCr, XLPE, dan UHMWPE."
              accent="bg-rose-600"
            />
            <BrandCard
              brand="ZIMMER BIOMET"
              origin="Orthopaedic portfolio"
              text="Trilogy, ZCA, Persona, Oxford, NexGen, dan Vanguard untuk acetabular, total knee, serta partial knee."
              accent="bg-cyan-600"
            />
          </div>
        </div>
      </section>

      <section
        id="portfolio"
        className="bg-[#081b24] px-5 py-20 text-white sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <SectionLabel dark>Product systems</SectionLabel>
          <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <h2 className="max-w-4xl text-4xl font-black tracking-[-.05em] sm:text-6xl">
              Hip, total knee, dan partial knee.
            </h2>
            <p className="max-w-md text-sm leading-6 text-white/50">
              Gambar difokuskan pada implant dan geometri komponennya agar
              perbedaan sistem mudah dikenali.
            </p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {productFamilies.map((product) => (
              <article
                key={product.title}
                className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[.055]"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-white">
                  <Image
                    src={product.image}
                    alt={product.title}
                    fill
                    className="object-cover transition duration-700 group-hover:scale-[1.035]"
                    sizes="(max-width:768px) 100vw, (max-width:1280px) 50vw, 25vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
                  <span className="absolute left-4 top-4 rounded-full bg-[#071b24]/85 px-3 py-1.5 text-[9px] font-black tracking-[.14em] text-cyan-300 backdrop-blur">
                    {product.brand}
                  </span>
                </div>
                <div className="p-5">
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-cyan-400">
                    {product.category}
                  </p>
                  <h3 className="mt-2 text-xl font-black tracking-tight">
                    {product.title}
                  </h3>
                  <p className="mt-3 text-xs leading-5 text-white/55">
                    {product.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[.06] px-2.5 py-1 text-[9px] font-bold text-white/65"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#dfeaed] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <div>
            <SectionLabel>Persona in motion</SectionLabel>
            <h2 className="mt-5 text-4xl font-black tracking-[-.05em] sm:text-6xl">
              Femur dan tibia dalam satu artikulasi.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-slate-600">
              Animasi visual memperkenalkan tiga bagian utama Persona: femoral
              component, polyethylene bearing, dan anatomic tibial baseplate.
              Gerakan dibuat sebagai ilustrasi produk, bukan simulasi biomekanik
              atau panduan tindakan.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <PersonaPart
                number="01"
                title="Femur"
                text="21 profil anatomis"
              />
              <PersonaPart number="02" title="Bearing" text="Opsi CR dan PS" />
              <PersonaPart
                number="03"
                title="Tibia"
                text="9 ukuran, kiri/kanan"
              />
            </div>
          </div>
          <div className="relative min-h-[430px] overflow-hidden rounded-[2.5rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(4,24,34,.14)] sm:min-h-[560px]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_64%_48%,rgba(34,211,238,.18),transparent_35%)]" />
            <Image
              src="/images/orthopaedic-products/zimmer/persona.webp"
              alt="Animasi komponen femur dan tibia Persona Knee"
              fill
              className="object-cover object-center motion-safe:animate-[pulse_5s_ease-in-out_infinite]"
              sizes="(max-width:1024px) 100vw,60vw"
            />
            <span className="absolute right-4 top-[18%] rounded-2xl border border-cyan-200 bg-white/90 px-4 py-3 text-xs font-black text-cyan-800 shadow-xl backdrop-blur motion-safe:animate-bounce sm:right-8">
              Femoral component
            </span>
            <span className="absolute left-4 top-[58%] rounded-2xl border border-blue-200 bg-white/90 px-4 py-3 text-xs font-black text-blue-800 shadow-xl backdrop-blur motion-safe:animate-pulse sm:left-8">
              Polyethylene bearing
            </span>
            <span className="absolute bottom-[8%] right-4 rounded-2xl border border-slate-200 bg-[#071b24]/90 px-4 py-3 text-xs font-black text-white shadow-xl backdrop-blur motion-safe:animate-bounce sm:right-8">
              Tibial baseplate
            </span>
          </div>
        </div>
      </section>

      <section id="design" className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <SectionLabel>Design focus</SectionLabel>
              <h2 className="mt-5 text-4xl font-black tracking-[-.05em] sm:text-6xl">
                Desain yang mudah dibandingkan.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-slate-500">
                Setiap keluarga produk dirangkum berdasarkan konfigurasi sistem
                dan material yang disebutkan pada dokumen sumber.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {designPrinciples.map((item) => (
                <article
                  key={item.code}
                  className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_16px_60px_rgba(4,24,34,.07)] sm:p-8"
                >
                  <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 text-xs font-black text-white">
                    {item.code}
                  </div>
                  <h3 className="mt-7 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {item.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="gallery" className="bg-white px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl">
          <SectionLabel>Product close-up</SectionLabel>
          <h2 className="mt-5 max-w-4xl text-4xl font-black tracking-[-.05em] sm:text-6xl">
            Detail produk, bukan sekadar sampul.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-500">
            Tekan foto untuk memperbesar atau gunakan tombol Bagikan untuk
            mengirim gambar langsung melalui WhatsApp, AirDrop, dan aplikasi
            lain di perangkat.
          </p>
          <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {detailGallery.map((item, index) => (
              <article
                key={item.title}
                className={`group overflow-hidden rounded-2xl border border-slate-200 bg-[#f5f8f9] shadow-sm transition hover:-translate-y-1 hover:shadow-xl ${index === 2 || index === 12 ? "sm:col-span-2" : ""}`}
              >
                <div
                  className={`relative overflow-hidden bg-white ${index === 2 || index === 12 ? "aspect-[16/9]" : "aspect-square"}`}
                >
                  <a
                    href={item.image}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Perbesar foto ${item.title}`}
                    className="absolute inset-0 z-0"
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover transition duration-500 group-hover:scale-[1.035]"
                      sizes="(max-width:640px) 50vw,25vw"
                    />
                    <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-[#071b24]/80 text-white backdrop-blur group-hover:bg-cyan-500">
                      <ZoomIn size={15} />
                    </span>
                  </a>
                </div>
                <div className="p-3.5 sm:p-5">
                  <p className="text-[8px] font-black uppercase tracking-[.15em] text-cyan-700 sm:text-[9px]">
                    {item.meta}
                  </p>
                  <h3 className="mt-1.5 text-sm font-black leading-tight sm:text-lg">
                    {item.title}
                  </h3>
                  <div className="mt-3">
                    <ShareImageButton src={item.image} title={item.title} meta={item.meta} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-cyan-700 to-blue-900 text-white lg:grid-cols-2">
          <div className="p-7 sm:p-12 lg:p-16">
            <Sparkles className="text-cyan-200" />
            <h2 className="mt-8 text-3xl font-black tracking-[-.04em] sm:text-5xl">
              Built as complete systems.
            </h2>
            <div className="mt-8 space-y-5">
              <DesignPoint
                title="Komponen saling melengkapi"
                text="Implant utama, bearing, liner, stem, dan instrumen tampil sebagai keluarga sistem."
              />
              <DesignPoint
                title="Pilihan yang terlihat jelas"
                text="Bedakan hip, TKA, dan UKA melalui portfolio dan close-up tiap produk."
              />
              <DesignPoint
                title="Dukungan informasi lokal"
                text="Hubungi cabang Bali untuk katalog, ketersediaan, dan kebutuhan produk."
              />
            </div>
          </div>
          <div className="relative min-h-80 bg-white lg:min-h-full">
            <Image
              src="/images/orthopaedic-products/zimmer/oxford-detail.webp"
              alt="Detail Oxford Partial Knee"
              fill
              className="object-cover object-center"
              sizes="(max-width:1024px) 100vw,50vw"
            />
          </div>
        </div>
      </section>

      <section
        id="brochures"
        className="bg-[#081b24] px-5 py-20 text-white sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <SectionLabel dark>Document center</SectionLabel>
              <h2 className="mt-5 text-4xl font-black tracking-[-.05em] sm:text-6xl">
                Lihat atau download brosur.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-7 text-white/50">
              Tombol Lihat membuka PDF di tab perangkat. Tombol Download
              menyimpan salinan untuk dibaca kembali secara offline.
            </p>
          </div>
          <div className="mt-12 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {brochures.map((item) => (
              <article
                key={item.href}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.055] p-4"
              >
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-cyan-400/12 text-cyan-300">
                  <FileText size={21} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black">{item.title}</p>
                  <p className="mt-1 text-[9px] font-bold uppercase tracking-[.14em] text-white/35">
                    {item.brand} · {item.category}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Lihat ${item.title}`}
                    className="grid size-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  >
                    <Eye size={16} />
                  </a>
                  <a
                    href={item.href}
                    download
                    aria-label={`Download ${item.title}`}
                    className="grid size-10 place-items-center rounded-xl bg-cyan-400 text-[#06202a] hover:bg-cyan-300"
                  >
                    <ArrowDownToLine size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-8 rounded-2xl border border-white/10 bg-black/15 p-4">
            <p className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">
              Referensi resmi online
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {officialResources.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.05] px-3 py-2 text-xs font-bold text-white/70 hover:text-white"
                >
                  {item.title}
                  <ExternalLink size={13} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="bg-[#dfeaed] px-5 py-20 sm:px-8 sm:py-28"
      >
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-[#071b24] p-7 text-white shadow-2xl sm:p-12 lg:p-16">
            <div className="absolute -right-24 -top-24 size-80 rounded-full bg-cyan-400/20 blur-3xl" />
            <div className="relative grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
              <div>
                <SectionLabel dark>Kontak Bali</SectionLabel>
                <h2 className="mt-5 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-.05em] sm:text-6xl">
                  Diskusikan kebutuhan produk orthopaedic.
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-white/55">
                  Untuk informasi portfolio Normmed dan Zimmer Biomet, katalog
                  produk, serta ketersediaan di wilayah Bali.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[.06] p-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-cyan-400 text-[#06202a]">
                    <UserRound size={21} />
                  </span>
                  <span>
                    <span className="block text-[9px] font-bold uppercase tracking-[.15em] text-white/35">
                      Contact person
                    </span>
                    <strong className="mt-1 block text-base">
                      Herlambang Wicaksono
                    </strong>
                    <span className="mt-.5 block text-[10px] text-white/45">
                      Bali, Indonesia
                    </span>
                  </span>
                </div>
                <ContactLink
                  href="https://wa.me/6285156331464?text=Halo%20Pak%20Herlambang%2C%20saya%20ingin%20menanyakan%20produk%20orthopaedic."
                  icon={<MessageCircle size={18} />}
                  label="WhatsApp"
                  value="+62 851-5633-1464"
                  external
                />
                <ContactLink
                  href="tel:+6285156331464"
                  icon={<Phone size={18} />}
                  label="Telephone"
                  value="+62 851-5633-1464"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-[#071b24] px-5 py-7 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PortfolioMark />
          <p className="max-w-xl text-[10px] leading-5 text-white/40">
            Informasi produk untuk tenaga profesional. Bukan pengganti IFU
            resmi, konsultasi manufacturer, atau pertimbangan klinis.
          </p>
          <Link
            href="/stock"
            className="inline-flex items-center gap-2 text-xs font-bold text-white/65 hover:text-white"
          >
            Buka NEX Stock <ArrowRight size={14} />
          </Link>
        </div>
      </footer>
    </main>
  );
}

function PortfolioMark() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative grid size-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg">
        <Boxes size={19} className="text-white" />
        <CircleDot
          size={8}
          className="absolute bottom-1.5 right-1.5 text-white"
        />
      </span>
      <span>
        <strong className="block text-base font-black tracking-[-.04em]">
          ORTHO BALI
        </strong>
        <span className="block text-[8px] font-bold uppercase tracking-[.2em] text-white/45">
          Implant portfolio
        </span>
      </span>
    </span>
  );
}
function SectionLabel({
  children,
  dark = false,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <p
      className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[.22em] ${dark ? "text-cyan-300" : "text-cyan-700"}`}
    >
      <span className="h-px w-7 bg-current" />
      {children}
    </p>
  );
}
function HeroMetric({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-black sm:text-xl">{value}</p>
      <p className="mt-1 text-[9px] uppercase tracking-[.14em] text-white/40">
        {label}
      </p>
    </div>
  );
}
function PersonaPart({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-white/80 bg-white/70 p-4 backdrop-blur">
      <span className="text-[9px] font-black tracking-[.18em] text-cyan-700">
        {number}
      </span>
      <strong className="mt-1 block text-sm">{title}</strong>
      <span className="mt-1 block text-[10px] text-slate-500">{text}</span>
    </div>
  );
}
function BrandCard({
  brand,
  origin,
  text,
  accent,
}: {
  brand: string;
  origin: string;
  text: string;
  accent: string;
}) {
  return (
    <article className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_18px_70px_rgba(4,24,34,.08)] sm:p-8">
      <div
        className={`grid size-12 place-items-center rounded-2xl ${accent} text-white`}
      >
        <BadgeCheck size={23} />
      </div>
      <p className="mt-7 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">
        {origin}
      </p>
      <h3 className="mt-1 text-2xl font-black">{brand}</h3>
      <p className="mt-3 text-sm leading-6 text-slate-500">{text}</p>
    </article>
  );
}
function DesignPoint({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-.5 grid size-7 shrink-0 place-items-center rounded-full bg-white/12">
        <ShieldCheck size={14} />
      </span>
      <div>
        <h3 className="text-sm font-black">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-white/65">{text}</p>
      </div>
    </div>
  );
}
function ContactLink({
  href,
  icon,
  label,
  value,
  external = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-3.5 transition hover:border-cyan-300/50 hover:bg-white/10"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-400 text-[#06202a]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[9px] font-bold uppercase tracking-[.15em] text-white/35">
          {label}
        </span>
        <strong className="mt-.5 block truncate text-sm">{value}</strong>
      </span>
      <ArrowRight size={15} className="text-white/35" />
    </a>
  );
}
