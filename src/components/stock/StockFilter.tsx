import { IMPLANT_BRANDS, IMPLANT_PROCEDURES } from "@/lib/implantCatalog";

interface Props {
    implant: string;
    batch: string;
    procedure: string;
    brand: string;
    setImplant: (v: string) => void;
    setBatch: (v: string) => void;
    setProcedure: (v: string) => void;
    setBrand: (v: string) => void;
    resultCount: number;
  }

  export function StockFilter({
    implant,
    batch,
    procedure,
    brand,
    setImplant,
    setBatch,
    setProcedure,
    setBrand,
    resultCount,
  }: Props) {
    return (
      <div className="mb-4 rounded-2xl border bg-zinc-50/80 p-3 dark:bg-zinc-950/40">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={implant}
          onChange={(e) => setImplant(e.target.value)}
          placeholder="Cari REF, nama, komponen..."
          className="border bg-white px-3 py-2 rounded-lg text-sm dark:bg-zinc-900"
        />
        <select
          value={procedure}
          onChange={(e) => setProcedure(e.target.value)}
          className="border bg-white px-3 py-2 rounded-lg text-sm dark:bg-zinc-900"
        >
          <option value="">Semua jenis implant</option>
          {IMPLANT_PROCEDURES.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="border bg-white px-3 py-2 rounded-lg text-sm dark:bg-zinc-900"
        >
          <option value="">Semua brand</option>
          {IMPLANT_BRANDS.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="Filter Batch"
          className="border bg-white px-3 py-2 rounded-lg text-sm dark:bg-zinc-900"
        />
        </div>
        <div className="mt-2 text-xs text-zinc-500">{resultCount} item ditemukan</div>
      </div>
    );
  }
