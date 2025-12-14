interface Props {
    implant: string;
    batch: string;
    setImplant: (v: string) => void;
    setBatch: (v: string) => void;
  }
  
  export function StockFilter({
    implant,
    batch,
    setImplant,
    setBatch,
  }: Props) {
    return (
      <div className="flex flex-col gap-2 mb-4 md:flex-row">
        <input
          value={implant}
          onChange={(e) => setImplant(e.target.value)}
          placeholder="Filter Implant"
          className="border px-3 py-2 rounded-lg text-sm w-full md:w-64"
        />
        <input
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          placeholder="Filter Batch"
          className="border px-3 py-2 rounded-lg text-sm w-full md:w-64"
        />
      </div>
    );
  }
  