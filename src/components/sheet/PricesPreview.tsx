"use client";

interface PriceSharePreviewProps {
  item: {
    system: string;
    product: string;
    type: string;
    qty: number;
    hargaNett: number;
    hargaNettPPN: number;
  };
}

export default function PriceSharePreview({ item }: PriceSharePreviewProps) {
  return (
    <div
      className="rounded-2xl shadow-xl overflow-hidden"
      style={{
        width: 380,
        background: "white",
        border: "1px solid #e5e7eb",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          background: "linear-gradient(135deg, #0066C5, #004E98)",
          padding: 20,
          color: "white",
        }}
      >
        <h2 className="text-xl font-bold">Zimmer Biomet</h2>
        <h1 className="text-2xl font-extrabold mt-2">{item.product}</h1>
      </div>

      {/* BODY */}
      <div className="p-4 text-gray-900 space-y-2">
        <p>
          <strong>System:</strong> {item.system}
        </p>
        <p>
          <strong>Type:</strong> {item.type}
        </p>
        <p>
          <strong>Qty:</strong> {item.qty}
        </p>

        <div className="pt-2">
          <p className="font-bold text-blue-700">Harga Nett:</p>
          <p className="text-xl font-extrabold text-blue-700">
            Rp {item.hargaNett.toLocaleString("id-ID")}
          </p>
        </div>

        <div>
          <p className="font-bold text-green-700">Harga + PPN:</p>
          <p className="text-xl font-extrabold text-green-700">
            Rp {item.hargaNettPPN.toLocaleString("id-ID")}
          </p>
        </div>

        <p className="pt-4 text-xs text-gray-500">
          Zimmer Biomet • Confidential Pricing
        </p>
      </div>
    </div>
  );
}
