"use client";

import { useState } from "react";
import { ImplantStockItemBase } from "@/types/implant-stock";

interface UploadStockExcelProps {
  onUploaded?: () => void;
}

type UploadStatus = "idle" | "uploading" | "success" | "error";

// ✅ RESPONSE BARU DARI API (SUDAH LANGSUNG SIMPAN KE FIRESTORE)
interface UploadResponse {
  status: "success";
  message: string;
  meta: {
    fileName: string;
    uploadedAt: string;
    totalRows: number;
  };
  data: ImplantStockItemBase[];
}

export function UploadStockExcel({ onUploaded }: UploadStockExcelProps) {
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState<string>("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("uploading");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      // ✅ SEKARANG CUKUP 1x HIT KE API
      const res = await fetch("/api/upload-implant-stock", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Gagal upload Excel");
      }

      const result: UploadResponse = await res.json();

      if (result.data.length === 0) {
        setStatus("error");
        setMessage("File kosong atau tidak ada baris yang terbaca.");
        return;
      }

      setStatus("success");
      setMessage(
        `✅ ${result.meta.totalRows} data dari ${result.meta.fileName} berhasil disimpan ke Firebase`
      );

      if (onUploaded) {
        onUploaded();
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      setMessage("❌ Terjadi kesalahan saat upload & simpan ke Firebase.");
    } finally {
      // reset input supaya bisa pilih file yang sama lagi
      e.target.value = "";
    }
  };

  const statusLabel: Record<UploadStatus, string> = {
    idle: "Upload Excel",
    uploading: "Mengunggah & menyimpan...",
    success: "Berhasil",
    error: "Gagal",
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="inline-flex items-center px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800">
        <span>{statusLabel[status]}</span>
        <input
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          onChange={handleUpload}
          disabled={status === "uploading"}
        />
      </label>

      {message && (
        <p
          className={`text-xs ${
            status === "error"
              ? "text-red-500"
              : status === "success"
              ? "text-emerald-500"
              : "text-zinc-500"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
