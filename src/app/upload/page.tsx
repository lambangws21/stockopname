"use client";

import { useState } from "react";

export default function UploadExcel() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!file) return alert("Pilih file dulu");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    const res = await fetch("/api/upload-excel", {
      method: "POST",
      body: formData,
    });

    const result = await res.json();
    setLoading(false);

    if (result.status === "success") {
      alert(`✅ Upload sukses: ${result.total} data`);
    } else {
      alert("❌ Upload gagal");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button
        onClick={handleUpload}
        disabled={loading}
        className="bg-black text-white px-4 py-2 rounded"
      >
        {loading ? "Uploading..." : "Upload Excel"}
      </button>
    </div>
  );
}
