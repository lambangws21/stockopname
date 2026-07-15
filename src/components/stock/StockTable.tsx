"use client";

import { useEffect, useRef, useState } from "react";
import { QrCode, PackagePlus } from "lucide-react";
import { ImplantStockItem } from "@/types/implant-stock";
import { StockFilter } from "./StockFilter";
import { EditStockModal } from "./EditStockModal";
import Scanner from "./Scanner";

interface StockTableProps {
  reloadKey?: number;
}

interface ScanData {
  ref: string;
  lot: string;
  exp?: string;
  raw?: string;
}

interface CreateFormState {
  stockNo: string;
  description: string;
  batch: string;
  qty: number;
  refill: number;
  used: number;
  note: string;
}

const INITIAL_CREATE_FORM: CreateFormState = {
  stockNo: "",
  description: "",
  batch: "",
  qty: 1,
  refill: 0,
  used: 0,
  note: "",
};

function normalizeToken(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function formatGs1Exp(exp?: string) {
  if (!exp || exp.length !== 6) return "";
  const yy = Number(exp.slice(0, 2));
  const mm = Number(exp.slice(2, 4));
  const dd = Number(exp.slice(4, 6));
  if (!Number.isFinite(yy) || !Number.isFinite(mm) || !Number.isFinite(dd)) {
    return "";
  }
  const year = 2000 + yy;
  return `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${year}`;
}

function toSafeNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function StockTable({ reloadKey }: StockTableProps) {
  const [data, setData] = useState<ImplantStockItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [keyword, setKeyword] = useState("");
  const [batch, setBatch] = useState("");

  const [editingItem, setEditingItem] = useState<ImplantStockItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [scanOpen, setScanOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanData | null>(null);
  const [scanMatch, setScanMatch] = useState<ImplantStockItem | null>(null);
  const [scanMessage, setScanMessage] = useState("");
  const [addQty, setAddQty] = useState(1);
  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE_FORM);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const lastScanSignature = useRef("");
  const lastScanAt = useRef(0);

  const loadData = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/implant-stock");
      const json = await res.json();

      const safeData: ImplantStockItem[] = Array.isArray(json?.data)
        ? json.data
        : [];

      setData(safeData);
    } catch (error) {
      console.error("Gagal load data table:", error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [reloadKey]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/implant-stock/${id}`, { method: "DELETE" });
    loadData();
  };

  const handleEditClick = (item: ImplantStockItem) => {
    setEditingItem(item);
    setModalOpen(true);
  };

  const findMatchByScan = (ref: string, lot: string) => {
    const normalizedRef = normalizeToken(ref);
    const normalizedLot = normalizeToken(lot);

    if (!normalizedRef) return null;

    const byRefAndLot = data.find((item) => {
      const sameRef = normalizeToken(item.stockNo) === normalizedRef;
      if (!sameRef) return false;
      if (!normalizedLot) return true;
      return normalizeToken(item.batch) === normalizedLot;
    });
    if (byRefAndLot) return byRefAndLot;

    return data.find((item) => normalizeToken(item.stockNo) === normalizedRef) ?? null;
  };

  const handleScanDetected = (result: ScanData) => {
    const signature = `${result.ref}|${result.lot}|${result.exp ?? ""}`;
    const now = Date.now();
    if (
      signature === lastScanSignature.current &&
      now - lastScanAt.current < 1200
    ) {
      return;
    }

    lastScanSignature.current = signature;
    lastScanAt.current = now;
    setScanResult(result);
    setScanMessage("");

    const ref = String(result.ref ?? "").trim();
    const lot = String(result.lot ?? "").trim();

    if (!ref) {
      setScanMatch(null);
      setScanMessage("QR terbaca, tapi kode referensi tidak ditemukan.");
      return;
    }

    setKeyword(ref);
    if (lot) setBatch(lot);

    const matched = findMatchByScan(ref, lot);
    setScanMatch(matched);
    setAddQty(1);

    if (matched) {
      setCreateForm({
        stockNo: matched.stockNo,
        description: matched.description,
        batch: matched.batch,
        qty: 1,
        refill: 0,
        used: 0,
        note: matched.note ?? "",
      });
      setScanMessage("Stok ditemukan. Anda bisa tambah kuantitas langsung.");
      return;
    }

    const expText = formatGs1Exp(result.exp);
    setCreateForm({
      stockNo: ref,
      description: "",
      batch: lot,
      qty: 1,
      refill: 0,
      used: 0,
      note: expText ? `EXP ${expText}` : "",
    });
    setScanMessage("Stok belum ada. Isi deskripsi lalu tambahkan item baru.");
  };

  const handleIncreaseExisting = async () => {
    if (!scanMatch) return;

    const increaseBy = Math.max(1, Math.floor(toSafeNumber(addQty, 1)));
    setUpdating(true);
    setScanMessage("");

    try {
      const res = await fetch(`/api/implant-stock/${scanMatch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stockNo: scanMatch.stockNo,
          description: scanMatch.description,
          batch: scanMatch.batch,
          qty: toSafeNumber(scanMatch.qty),
          refill: toSafeNumber(scanMatch.refill) + increaseBy,
          used: toSafeNumber(scanMatch.used),
          note: scanMatch.note ?? "",
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string"
            ? json.error
            : "Gagal update stok dari hasil scan"
        );
      }

      await loadData();
      setScanMessage(`Stok ${scanMatch.stockNo} berhasil ditambah +${increaseBy}.`);
    } catch (error) {
      setScanMessage(error instanceof Error ? error.message : "Gagal update stok.");
    } finally {
      setUpdating(false);
    }
  };

  const handleCreateFromScan = async () => {
    if (!createForm.stockNo.trim()) {
      setScanMessage("No stok wajib diisi.");
      return;
    }
    if (!createForm.description.trim()) {
      setScanMessage("Deskripsi wajib diisi untuk menambah item baru.");
      return;
    }

    setCreating(true);
    setScanMessage("");

    try {
      const payload = {
        stockNo: createForm.stockNo.trim(),
        description: createForm.description.trim(),
        batch: createForm.batch.trim(),
        qty: toSafeNumber(createForm.qty),
        refill: toSafeNumber(createForm.refill),
        used: toSafeNumber(createForm.used),
        note: createForm.note.trim(),
      };

      const res = await fetch("/api/implant-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string"
            ? json.error
            : "Gagal menambah stok baru dari scan"
        );
      }

      await loadData();
      setKeyword(payload.stockNo);
      setBatch(payload.batch);
      setScanMatch(null);
      setScanMessage(`Item baru ${payload.stockNo} berhasil ditambahkan.`);
    } catch (error) {
      setScanMessage(
        error instanceof Error ? error.message : "Gagal menambah item baru."
      );
    } finally {
      setCreating(false);
    }
  };

  const filtered = data.filter((item) => {
    return (
      item.description.toLowerCase().includes(keyword.toLowerCase()) &&
      item.batch.toLowerCase().includes(batch.toLowerCase())
    );
  });

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow">
      <StockFilter
        implant={keyword}
        batch={batch}
        setImplant={setKeyword}
        setBatch={setBatch}
      />

      <div className="mb-4 rounded-xl border p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-medium flex items-center gap-2">
            <QrCode size={16} />
            Scan QR Implant
          </div>
          <button
            onClick={() => setScanOpen((prev) => !prev)}
            className="text-xs px-3 py-1.5 rounded-lg border hover:bg-zinc-50 dark:hover:bg-zinc-800"
            type="button"
          >
            {scanOpen ? "Tutup Scanner" : "Buka Scanner"}
          </button>
        </div>

        {scanMessage && (
          <div className="text-xs text-blue-700 dark:text-blue-300">{scanMessage}</div>
        )}

        {scanOpen ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Scanner onDetected={handleScanDetected} />
              <p className="text-[11px] text-zinc-500">
                Untuk barcode panjang 1D, posisikan kamera sejajar garis barcode,
                dekatkan perlahan, dan pastikan pencahayaan cukup.
              </p>
              <div className="rounded-lg border bg-zinc-50 dark:bg-zinc-800 p-3 text-xs space-y-1">
                <div>
                  <span className="font-semibold">REF:</span>{" "}
                  {scanResult?.ref || "-"}
                </div>
                <div>
                  <span className="font-semibold">Batch:</span>{" "}
                  {scanResult?.lot || "-"}
                </div>
                <div>
                  <span className="font-semibold">EXP:</span>{" "}
                  {formatGs1Exp(scanResult?.exp) || scanResult?.exp || "-"}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {scanMatch ? (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    Item ditemukan: {scanMatch.description}
                  </div>
                  <div className="text-xs space-y-1">
                    <div>No Stok: {scanMatch.stockNo}</div>
                    <div>Batch: {scanMatch.batch || "-"}</div>
                    <div>Total Saat Ini: {scanMatch.totalQty}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs">Tambah Qty</label>
                    <input
                      type="number"
                      min={1}
                      value={addQty}
                      onChange={(e) => setAddQty(Math.max(1, toSafeNumber(e.target.value, 1)))}
                      className="w-24 rounded-lg border px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={handleIncreaseExisting}
                      disabled={updating}
                      className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-60"
                    >
                      {updating ? "Menyimpan..." : "Tambah ke Stok"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-3 space-y-3">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <PackagePlus size={16} />
                    Tambah Item Baru Dari Scan
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <input
                      value={createForm.stockNo}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          stockNo: e.target.value,
                        }))
                      }
                      placeholder="No Stok"
                      className="rounded-lg border px-3 py-2 text-sm"
                    />
                    <input
                      value={createForm.description}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Deskripsi"
                      className="rounded-lg border px-3 py-2 text-sm"
                    />
                    <input
                      value={createForm.batch}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          batch: e.target.value,
                        }))
                      }
                      placeholder="Batch"
                      className="rounded-lg border px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={createForm.qty}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            qty: toSafeNumber(e.target.value),
                          }))
                        }
                        placeholder="Qty"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={createForm.used}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            used: toSafeNumber(e.target.value),
                          }))
                        }
                        placeholder="Terpakai"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                      <input
                        type="number"
                        min={0}
                        value={createForm.refill}
                        onChange={(e) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            refill: toSafeNumber(e.target.value),
                          }))
                        }
                        placeholder="Refill"
                        className="rounded-lg border px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={createForm.note}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          note: e.target.value,
                        }))
                      }
                      placeholder="Keterangan"
                      rows={2}
                      className="rounded-lg border px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleCreateFromScan}
                    disabled={creating}
                    className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-60"
                  >
                    {creating ? "Menyimpan..." : "Simpan Item Baru"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {loading ? (
        <div className="py-6 text-center text-sm text-zinc-500">
          Memuat data stok...
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border">
            <thead className="bg-zinc-100 dark:bg-zinc-800">
              <tr className="text-left">
                <th className="px-2 py-2">NO</th>
                <th className="px-2 py-2">No Stok</th>
                <th className="px-2 py-2">Deskripsi</th>
                <th className="px-2 py-2">Batch</th>
                <th className="px-2 py-2">Qty</th>
                <th className="px-2 py-2">Total Qty</th>
                <th className="px-2 py-2">Terpakai</th>
                <th className="px-2 py-2">Refill</th>
                <th className="px-2 py-2">Ket.</th>
                <th className="px-2 py-2">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-2 py-1">{item.no}</td>
                  <td className="px-2 py-1">{item.stockNo}</td>
                  <td className="px-2 py-1">{item.description}</td>
                  <td className="px-2 py-1">{item.batch}</td>
                  <td className="px-2 py-1">{item.qty}</td>
                  <td className="px-2 py-1">{item.totalQty}</td>
                  <td className="px-2 py-1">{item.used}</td>
                  <td className="px-2 py-1">{item.refill}</td>
                  <td className="px-2 py-1">{item.note}</td>
                  <td className="px-2 py-1 space-x-2">
                    <button
                      onClick={() => handleEditClick(item)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={10}
                    className="px-2 py-4 text-center text-xs text-zinc-500"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <EditStockModal
        open={modalOpen}
        item={editingItem}
        onClose={() => setModalOpen(false)}
        onSaved={loadData}
      />
    </div>
  );
}
