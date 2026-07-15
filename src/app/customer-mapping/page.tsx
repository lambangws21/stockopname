"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock3,
  Pencil,
  ClipboardList,
  Download,
  LayoutGrid,
  MapPin,
  Package,
  Phone,
  Plus,
  Search,
  Stethoscope,
  Table2,
  Repeat2,
  Target,
  Trash2,
  UploadCloud,
  UserCheck,
  Users,
  XCircle,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CustomerMappingRow,
  CustomerJourneyStage,
  CustomerStatus,
} from "@/types/customer-mapping";

type CustomerFormData = {
  id: string;
  customerType: "EXISTING" | "TARGET";
  territory: string;
  hospital: string;
  doctor: string;
  note: string;
  plan: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: CustomerStatus;
  owner: string;
  journeyStage: CustomerJourneyStage;
  productOffered: string;
  nextFollowUp: string;
  outcome: string;
  phone: string;
  specialty: string;
  practiceHospital2: string;
  practiceHospital3: string;
  photoUrl: string;
  photoFileId: string;
  photoDataUrl: string;
  implantUsed: string;
  procedureType: string;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  action: () => Promise<void> | void;
};

type UsageEntryState = {
  row: CustomerMappingRow;
  nextStage: CustomerJourneyStage;
  hospital: string;
  implantUsed: string;
  procedureType: string;
};

const emptyForm: CustomerFormData = {
  id: "",
  customerType: "TARGET",
  territory: "",
  hospital: "",
  doctor: "",
  note: "",
  plan: "",
  priority: "MEDIUM",
  status: "NEW",
  owner: "",
  journeyStage: "PROSPECT",
  productOffered: "",
  nextFollowUp: "",
  outcome: "",
  phone: "",
  specialty: "",
  practiceHospital2: "",
  practiceHospital3: "",
  photoUrl: "",
  photoFileId: "",
  photoDataUrl: "",
  implantUsed: "",
  procedureType: "",
};

async function prepareDoctorPhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar");
  if (file.size > 10 * 1024 * 1024) throw new Error("Ukuran foto maksimal 10 MB");
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Foto gagal dibaca"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Format foto tidak didukung"));
    element.src = source;
  });
  const size = Math.min(image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 900;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Foto gagal diproses");
  context.drawImage(image, (image.naturalWidth - size) / 2, (image.naturalHeight - size) / 2, size, size, 0, 0, 900, 900);
  return canvas.toDataURL("image/jpeg", 0.82);
}

function doctorPhotoSrc(photoUrl: string, photoFileId: string) {
  return photoFileId
    ? `/api/customer-mapping/photo/${encodeURIComponent(photoFileId)}`
    : photoUrl;
}

const journeyOrder: CustomerJourneyStage[] = [
  "PROSPECT",
  "TARGETED",
  "OFFERED",
  "FIRST_USE",
  "REPEAT_USE",
];

const journeyLabel: Record<CustomerJourneyStage, string> = {
  PROSPECT: "Prospek",
  TARGETED: "Ditargetkan",
  OFFERED: "Produk Ditawarkan",
  FIRST_USE: "Pemakaian Pertama",
  REPEAT_USE: "Pemakaian Ulang",
};

const statusStyle: Record<CustomerStatus, string> = {
  NEW: "bg-slate-100 text-slate-700 ring-slate-200",
  TARGETED: "bg-blue-50 text-blue-700 ring-blue-200",
  APPROVED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 ring-rose-200",
};

const priorityStyle = {
  HIGH: "bg-rose-500",
  MEDIUM: "bg-amber-400",
  LOW: "bg-emerald-500",
};

const priorityBadgeStyle = {
  HIGH: "bg-rose-50 text-rose-700 ring-rose-200",
  MEDIUM: "bg-amber-50 text-amber-700 ring-amber-200",
  LOW: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};

const productSuggestions = ["ZIMMER", "NORMMED"];

function missingCustomerFields(
  row: Pick<CustomerMappingRow, "customerType" | "territory" | "hospital" | "doctor" | "owner" | "priority" | "plan">,
  intendedStatus?: CustomerStatus
) {
  const missing: string[] = [];
  if (!row.territory.trim()) missing.push("Territory");
  if (!row.hospital.trim()) missing.push("Hospital");
  if (!row.doctor.trim()) missing.push("Dokter");
  if (!row.owner.trim()) missing.push("Owner / Sales PIC");
  if (!row.priority.trim()) missing.push("Priority");
  if (
    row.customerType === "TARGET" &&
    (intendedStatus === "TARGETED" || intendedStatus === "APPROVED") &&
    !row.plan.trim()
  ) {
    missing.push("Planning / Follow-up");
  }
  return missing;
}

export default function CustomerMappingPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<CustomerMappingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | CustomerStatus>("ALL");
  const [kind, setKind] = useState<"ALL" | "EXISTING" | "TARGET">("ALL");
  const [owner, setOwner] = useState("Lambang");
  const [formOpen, setFormOpen] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [form, setForm] = useState<CustomerFormData>(emptyForm);
  const [confirmation, setConfirmation] = useState<ConfirmState | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [formNotice, setFormNotice] = useState<string[]>([]);
  const [resumeStatus, setResumeStatus] = useState<CustomerStatus | null>(null);
  const [resumeJourney, setResumeJourney] = useState<CustomerJourneyStage | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [exporting, setExporting] = useState(false);
  const [usageEntry, setUsageEntry] = useState<UsageEntryState | null>(null);

  const loadRows = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/customer-mapping", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Gagal mengambil customer");
      }
      setRows(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal mengambil customer");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const summary = useMemo(
    () => ({
      total: rows.length,
      existing: rows.filter((row) => row.customerType === "EXISTING").length,
      targeted: rows.filter((row) => row.status === "TARGETED").length,
      approved: rows.filter((row) => row.status === "APPROVED").length,
      incomplete: rows.filter((row) => missingCustomerFields(row, row.status).length > 0)
        .length,
    }),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "ALL" && row.status !== status) return false;
      if (kind !== "ALL" && row.customerType !== kind) return false;
      if (!needle) return true;
      return [row.doctor, row.hospital, row.territory, row.owner, row.note]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [kind, query, rows, status]);

  const selectedDoctor = useMemo(
    () => rows.find((row) => row.id === selectedId) || rows[0] || null,
    [rows, selectedId]
  );

  const dashboard = useMemo(() => {
    const statuses = (["NEW", "TARGETED", "APPROVED", "REJECTED"] as CustomerStatus[]).map(
      (name) => ({ name, value: rows.filter((row) => row.status === name).length })
    );
    const priorities = (["HIGH", "MEDIUM", "LOW"] as const).map((name) => ({
      name,
      value: rows.filter((row) => row.priority === name).length,
    }));
    const journeys = journeyOrder.map((name) => ({
      name,
      value: rows.filter((row) => (row.journeyStage || "PROSPECT") === name).length,
    }));
    const territories = Object.entries(
      rows.reduce<Record<string, number>>((result, row) => {
        const name = row.territory || "Tanpa territory";
        result[name] = (result[name] || 0) + 1;
        return result;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { statuses, priorities, territories, journeys };
  }, [rows]);

  function askConfirmation(value: ConfirmState) {
    setConfirmation(value);
  }

  async function runConfirmedAction() {
    if (!confirmation) return;
    setConfirming(true);
    try {
      await confirmation.action();
      setConfirmation(null);
    } finally {
      setConfirming(false);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("actor", owner.trim() || "Lambang");
      const response = await fetch("/api/customer-mapping/import", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Import gagal");
      }
      toast.success(
        `${result.inserted || 0} customer ditambahkan, ${result.updated || 0} diperbarui`
      );
      await loadRows();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import gagal");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Customer Mapping Dashboard";
      const sheet = workbook.addWorksheet("Doctor CRM", {
        views: [{ state: "frozen", ySplit: 1 }],
      });
      sheet.columns = [
        { header: "Doctor", key: "doctor", width: 34 },
        { header: "Phone", key: "phone", width: 18 },
        { header: "Specialty", key: "specialty", width: 22 },
        { header: "Hospital 1", key: "hospital", width: 30 },
        { header: "Hospital 2", key: "hospital2", width: 30 },
        { header: "Hospital 3", key: "hospital3", width: 30 },
        { header: "Territory", key: "territory", width: 16 },
        { header: "Owner / Sales", key: "owner", width: 20 },
        { header: "Product", key: "product", width: 22 },
        { header: "Priority", key: "priority", width: 12 },
        { header: "Status", key: "status", width: 14 },
        { header: "Journey", key: "journey", width: 20 },
        { header: "Implant Used", key: "implantUsed", width: 24 },
        { header: "Procedure Type", key: "procedureType", width: 22 },
        { header: "Usage Count", key: "usage", width: 13 },
        { header: "Next Follow-up", key: "followup", width: 20 },
        { header: "Note", key: "note", width: 42 },
        { header: "Planning", key: "plan", width: 42 },
        { header: "Outcome", key: "outcome", width: 42 },
      ];
      filteredRows.forEach((row) => sheet.addRow({
        doctor: row.doctor,
        phone: row.phone,
        specialty: row.specialty,
        hospital: row.hospital,
        hospital2: row.practiceHospital2,
        hospital3: row.practiceHospital3,
        territory: row.territory,
        owner: row.owner,
        product: row.productOffered,
        priority: row.priority,
        status: row.status,
        journey: journeyLabel[row.journeyStage || "PROSPECT"],
        implantUsed: row.implantUsed,
        procedureType: row.procedureType,
        usage: row.usageCount || 0,
        followup: row.nextFollowUp,
        note: row.note,
        plan: row.plan,
        outcome: row.outcome,
      }));
      const header = sheet.getRow(1);
      header.height = 28;
      header.font = { bold: true, color: { argb: "FFFFFFFF" } };
      header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF172554" } };
      header.alignment = { vertical: "middle" };
      sheet.autoFilter = { from: "A1", to: "S1" };
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          row.alignment = { vertical: "top", wrapText: true };
          row.height = 34;
          if (rowNumber % 2 === 0) row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
        }
      });
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `doctor-customer-mapping-${new Date().toISOString().slice(0, 10)}.xlsx`;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success(`${filteredRows.length} data dokter diexport`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export Excel gagal");
    } finally {
      setExporting(false);
    }
  }

  async function decide(row: CustomerMappingRow, nextStatus: CustomerStatus) {
    if ((nextStatus === "TARGETED" || nextStatus === "APPROVED") && !owner.trim()) {
      toast.error("Isi nama owner terlebih dahulu");
      return;
    }

    setWorkingId(row.id);
    try {
      const response = await fetch("/api/customer-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: row.id,
          status: nextStatus,
          owner: row.owner.trim() || owner.trim(),
          by: owner.trim() || "Lambang",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Update gagal");
      }
      setRows((current) =>
        current.map((item) => (item.id === row.id ? result.data : item))
      );
      toast.success(
        nextStatus === "APPROVED"
          ? "Customer disetujui"
          : nextStatus === "TARGETED"
            ? "Customer menjadi target Anda"
            : "Customer ditolak"
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update gagal");
    } finally {
      setWorkingId("");
    }
  }

  function requestDecision(row: CustomerMappingRow, nextStatus: CustomerStatus) {
    const completedRow = {
      ...row,
      owner: row.owner.trim() || owner.trim(),
    };
    const missing = missingCustomerFields(completedRow, nextStatus);
    if (missing.length) {
      setForm({
        id: row.id,
        customerType: row.customerType,
        territory: row.territory,
        hospital: row.hospital,
        doctor: row.doctor,
        note: row.note,
        plan: row.plan,
        priority: row.priority,
        status: row.status,
        owner: completedRow.owner,
        journeyStage: row.journeyStage || "PROSPECT",
        productOffered: row.productOffered || "",
        nextFollowUp: row.nextFollowUp || "",
        outcome: row.outcome || "",
        phone: row.phone || "",
        specialty: row.specialty || "",
        practiceHospital2: row.practiceHospital2 || "",
        practiceHospital3: row.practiceHospital3 || "",
        photoUrl: row.photoUrl || "",
        photoFileId: row.photoFileId || "",
        photoDataUrl: "",
        implantUsed: row.implantUsed || "",
        procedureType: row.procedureType || "",
      });
      setFormNotice(missing);
      setResumeStatus(nextStatus);
      setFormOpen(true);
      toast.info(`Lengkapi ${missing.join(", ")} sebelum ${nextStatus}`);
      return;
    }

    const labels: Record<CustomerStatus, string> = {
      NEW: "Kembalikan ke New",
      TARGETED: "Targetkan Customer",
      APPROVED: "Approve Customer",
      REJECTED: "Reject Customer",
    };
    askConfirmation({
      title: labels[nextStatus],
      message: `${row.doctor || row.hospital} akan diubah menjadi ${nextStatus}. Perubahan langsung dipost.`,
      confirmLabel: labels[nextStatus],
      tone: nextStatus === "REJECTED" ? "danger" : "primary",
      action: () => decide(row, nextStatus),
    });
  }

  async function deleteRow(row: CustomerMappingRow) {
    setWorkingId(row.id);
    try {
      const response = await fetch("/api/customer-mapping", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, by: owner.trim() || "Lambang" }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Gagal menghapus customer");
      }
      setRows((current) => current.filter((item) => item.id !== row.id));
      toast.success("Customer dihapus");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menghapus customer");
    } finally {
      setWorkingId("");
    }
  }

  function requestDelete(row: CustomerMappingRow) {
    askConfirmation({
      title: "Hapus Customer?",
      message: `${row.doctor || row.hospital} akan dihapus dari CustomerMapping. Snapshot tetap tersimpan di CustomerHistory.`,
      confirmLabel: "Ya, Hapus",
      tone: "danger",
      action: () => deleteRow(row),
    });
  }

  function openCreateForm() {
    setForm({ ...emptyForm, owner: owner.trim() });
    setFormNotice([]);
    setResumeStatus(null);
    setResumeJourney(null);
    setFormOpen(true);
  }

  function openEditForm(row: CustomerMappingRow) {
    setForm({
      id: row.id,
      customerType: row.customerType,
      territory: row.territory,
      hospital: row.hospital,
      doctor: row.doctor,
      note: row.note,
      plan: row.plan,
      priority: row.priority,
      status: row.status,
      owner: row.owner,
      journeyStage: row.journeyStage || "PROSPECT",
      productOffered: row.productOffered || "",
      nextFollowUp: row.nextFollowUp || "",
      outcome: row.outcome || "",
      phone: row.phone || "",
      specialty: row.specialty || "",
      practiceHospital2: row.practiceHospital2 || "",
      practiceHospital3: row.practiceHospital3 || "",
      photoUrl: row.photoUrl || "",
      photoFileId: row.photoFileId || "",
      photoDataUrl: "",
      implantUsed: row.implantUsed || "",
      procedureType: row.procedureType || "",
    });
    setFormNotice([]);
    setResumeStatus(null);
    setResumeJourney(null);
    setFormOpen(true);
  }

  async function saveCustomer() {
    if (!form.hospital.trim() && !form.doctor.trim()) {
      toast.error("Hospital atau dokter wajib diisi");
      return;
    }

    setSavingForm(true);
    try {
      const response = await fetch("/api/customer-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          intent: "upsert",
          by: owner.trim() || form.owner.trim() || "Lambang",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Gagal menyimpan customer");
      }

      setRows((current) => {
        const exists = current.some((item) => item.id === result.data.id);
        return exists
          ? current.map((item) => (item.id === result.data.id ? result.data : item))
          : [result.data, ...current];
      });
      setFormOpen(false);
      toast.success(form.id ? "Customer diperbarui" : "Customer ditambahkan");
      if (resumeStatus) {
        const statusToResume = resumeStatus;
        setResumeStatus(null);
        setFormNotice([]);
        requestDecision(result.data, statusToResume);
      } else if (resumeJourney) {
        const journeyToResume = resumeJourney;
        setResumeJourney(null);
        setFormNotice([]);
        requestJourney(result.data, journeyToResume);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal menyimpan customer");
    } finally {
      setSavingForm(false);
    }
  }

  async function advanceJourney(row: CustomerMappingRow, nextStage: CustomerJourneyStage, usage?: Pick<UsageEntryState, "hospital" | "implantUsed" | "procedureType">) {
    setWorkingId(row.id);
    try {
      const response = await fetch("/api/customer-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "journey",
          id: row.id,
          journeyStage: nextStage,
          owner: row.owner || owner.trim(),
          productOffered: row.productOffered,
          nextFollowUp: row.nextFollowUp,
          outcome: row.outcome,
          usageHospital: usage?.hospital || row.usageHospital,
          implantUsed: usage?.implantUsed || row.implantUsed,
          procedureType: usage?.procedureType || row.procedureType,
          by: owner.trim() || row.owner || "Lambang",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Gagal memperbarui journey");
      setRows((current) => current.map((item) => item.id === row.id ? result.data : item));
      setUsageEntry(null);
      toast.success(`Journey diperbarui: ${journeyLabel[nextStage]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui journey");
    } finally {
      setWorkingId("");
    }
  }

  function requestJourney(row: CustomerMappingRow, requestedStage?: CustomerJourneyStage) {
    const current = row.journeyStage || "PROSPECT";
    const currentIndex = journeyOrder.indexOf(current);
    const nextStage = requestedStage || journeyOrder[Math.min(currentIndex + 1, journeyOrder.length - 1)];
    const missing = missingCustomerFields({ ...row, owner: row.owner || owner.trim() });
    if (!row.productOffered?.trim() && journeyOrder.indexOf(nextStage) >= journeyOrder.indexOf("OFFERED")) missing.push("Product Offered");
    if (missing.length) {
      openEditForm(row);
      setForm({
        id: row.id,
        customerType: row.customerType,
        territory: row.territory,
        hospital: row.hospital,
        doctor: row.doctor,
        note: row.note,
        plan: row.plan,
        priority: row.priority,
        status: row.status,
        owner: row.owner || owner.trim(),
        journeyStage: current,
        productOffered: row.productOffered || "",
        nextFollowUp: row.nextFollowUp || "",
        outcome: row.outcome || "",
        phone: row.phone || "",
        specialty: row.specialty || "",
        practiceHospital2: row.practiceHospital2 || "",
        practiceHospital3: row.practiceHospital3 || "",
        photoUrl: row.photoUrl || "",
        photoFileId: row.photoFileId || "",
        photoDataUrl: "",
        implantUsed: row.implantUsed || "",
        procedureType: row.procedureType || "",
      });
      setFormNotice(missing);
      setResumeJourney(nextStage);
      toast.info(`Lengkapi ${missing.join(", ")} untuk melanjutkan journey`);
      return;
    }
    if (nextStage === "FIRST_USE" || nextStage === "REPEAT_USE") {
      setUsageEntry({
        row,
        nextStage,
        hospital: row.usageHospital || row.hospital || row.practiceHospital2 || row.practiceHospital3 || "",
        implantUsed: row.implantUsed || row.productOffered || "",
        procedureType: row.procedureType || "",
      });
      return;
    }
    askConfirmation({
      title: `Lanjut ke ${journeyLabel[nextStage]}?`,
      message: `Journey ${row.doctor || row.hospital} akan diperbarui dan dicatat.`,
      confirmLabel: "Lanjutkan Journey",
      action: () => advanceJourney(row, nextStage),
    });
  }

  function requestSaveCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.hospital.trim() && !form.doctor.trim()) {
      toast.error("Hospital atau dokter wajib diisi");
      return;
    }
    if (resumeStatus) {
      const missing = missingCustomerFields(
        {
          customerType: form.customerType,
          territory: form.territory,
          hospital: form.hospital,
          doctor: form.doctor,
          owner: form.owner,
          priority: form.priority,
          plan: form.plan,
        },
        resumeStatus
      );
      if (missing.length) {
        setFormNotice(missing);
        toast.error(`Masih belum lengkap: ${missing.join(", ")}`);
        return;
      }
    }
    askConfirmation({
      title: form.id ? "Simpan Perubahan?" : "Post Customer Baru?",
      message: `${form.doctor || form.hospital} akan ${form.id ? "diperbarui" : "ditambahkan"} dan langsung disimpan.`,
      confirmLabel: form.id ? "Simpan Perubahan" : "Post Customer",
      action: saveCustomer,
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 md:px-8">
        <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-blue-950 to-indigo-900 p-5 text-white shadow-xl sm:p-6 md:p-8">
          <motion.div aria-hidden className="absolute -right-20 -top-24 size-72 rounded-full bg-blue-400/15 blur-3xl" animate={{ scale: [1, 1.15, 1], x: [0, -16, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-violet-400/10 blur-3xl" animate={{ scale: [1.1, 0.9, 1.1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <Link
                href="/stock"
                className="inline-flex items-center gap-2 text-sm text-blue-100 transition hover:text-white"
              >
                <ArrowLeft size={16} /> Buka Stock Management
              </Link>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">
                  <Target size={14} /> User acquisition workspace
                </div>
                <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
                  User Orthopedic Mapping 
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                  Impor mapping Excel, tentukan target, assign owner, dan approve user
                  dalam satu pipeline yang tersinkron.
                </p>
              </div>
            </div>

            <div className="grid w-full gap-3 sm:grid-cols-[minmax(180px,240px)_auto] lg:w-auto">
              <label className="space-y-1 text-xs text-slate-300">
                Teams
                <input
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  className="h-11 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-blue-300"
                  placeholder="Nama sales / owner"
                />
              </label>
              <div className="flex items-end">
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    askConfirmation({
                      title: "Import User Mapping?",
                      message: `${file.name}Data akan diperbarui`,
                      confirmLabel: "Ya, Import & Post",
                      action: () => upload(file),
                    });
                  }}
                />
                <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                  <button
                    type="button"
                    onClick={openCreateForm}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
                  >
                    <Plus size={18} /> Input
                  </button>
                  <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-400 disabled:opacity-60"
                  >
                    <UploadCloud size={18} />
                    {uploading ? "Mengimpor..." : "Import Excel"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard icon={Users} label="Total mapping" value={summary.total} detail="Seluruh dokter dalam database" tone="slate" index={0} />
          <SummaryCard icon={Building2} label="Existing customer" value={summary.existing} detail="Sudah menjadi customer" tone="violet" index={1} />
          <SummaryCard icon={UserCheck} label="Target aktif" value={summary.targeted} detail="Sedang dalam proses pendekatan" tone="blue" index={2} />
          <SummaryCard icon={CheckCircle2} label="Approved" value={summary.approved} detail="Data dan target telah disetujui" tone="emerald" index={3} />
          <SummaryCard icon={Clock3} label="Perlu dilengkapi" value={summary.incomplete} detail="Butuh owner, plan, atau data utama" tone="amber" index={4} />
        </section>

        <DashboardPanel
          total={summary.total}
          statuses={dashboard.statuses}
          journeys={dashboard.journeys}
          priorities={dashboard.priorities}
          territories={dashboard.territories}
        />

        <UsageAnalyticsPanel rows={rows} />

        <MyPlanPanel
          rows={rows}
          selectedId={selectedDoctor?.id || ""}
          onSelect={setSelectedId}
        />

        <section className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <JourneyWorkspace
            rows={rows}
            onSelect={setSelectedId}
            onAdvance={requestJourney}
          />
          <DoctorProfilePanel doctor={selectedDoctor} onEdit={openEditForm} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari dokter, rumah sakit, territory, atau owner..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none focus:border-blue-400 focus:bg-white"
              />
            </label>
            <FilterGroup
              value={kind}
              options={["ALL", "EXISTING", "TARGET"]}
              onChange={(value) => setKind(value as typeof kind)}
            />
            <FilterGroup
              value={status}
              options={["ALL", "NEW", "TARGETED", "APPROVED", "REJECTED"]}
              onChange={(value) => setStatus(value as typeof status)}
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold">Customer pipeline</h2>
              <p className="text-xs text-slate-500">{filteredRows.length} data ditampilkan</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button type="button" onClick={() => setViewMode("cards")} className={`rounded-md p-1.5 ${viewMode === "cards" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400"}`} title="Card view"><LayoutGrid size={15} /></button>
                <button type="button" onClick={() => setViewMode("table")} className={`rounded-md p-1.5 ${viewMode === "table" ? "bg-white text-blue-700 shadow-sm" : "text-slate-400"}`} title="Table view"><Table2 size={15} /></button>
              </div>
              <button type="button" onClick={() => void exportExcel()} disabled={exporting || !filteredRows.length} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"><Download size={14} /> {exporting ? "Exporting..." : "Export Excel"}</button>
              <div className="flex items-center gap-2 text-xs text-slate-500"><span className="size-2 rounded-full bg-emerald-500" /> Sinkron Data</div>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <div key={item} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : filteredRows.length && viewMode === "cards" ? (
            <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRows.map((row, index) => (
                <CustomerCard
                  key={[
                    row.id ||
                      [
                        row.customerType,
                        row.territory,
                        row.hospital,
                        row.doctor,
                        row.sourceRow,
                      ].join("|"),
                    index,
                  ].join("|")}
                  row={row}
                  busy={workingId === row.id}
                  onDecision={requestDecision}
                  onEdit={openEditForm}
                  onDelete={requestDelete}
                  onJourney={requestJourney}
                  onSelect={() => setSelectedId(row.id)}
                />
              ))}
            </div>
          ) : filteredRows.length ? (
            <CustomerTable rows={filteredRows} onSelect={setSelectedId} onEdit={openEditForm} />
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center px-6 text-center">
              <div className="mb-4 rounded-2xl bg-blue-50 p-4 text-blue-600">
                <UploadCloud size={28} />
              </div>
              <h3 className="font-semibold">Belum ada customer</h3>
              <p className="mt-1 max-w-md text-sm text-slate-500">
                Import file Customer Mapping.xlsx. Existing customer dan planning akan
                dipisahkan otomatis serta dikirim ke Data Sheet.
              </p>
            </div>
          )}
        </section>
      </div>
      {formOpen ? (
        <CustomerFormModal
          form={form}
          saving={savingForm}
          onChange={setForm}
          onClose={() => {
            setFormOpen(false);
            setFormNotice([]);
            setResumeStatus(null);
            setResumeJourney(null);
          }}
          onSubmit={requestSaveCustomer}
          missingFields={formNotice}
          intendedStatus={resumeStatus}
        />
      ) : null}
      {usageEntry ? <UsageEntryModal value={usageEntry} busy={workingId === usageEntry.row.id} onChange={setUsageEntry} onCancel={() => setUsageEntry(null)} onConfirm={() => void advanceJourney(usageEntry.row, usageEntry.nextStage, usageEntry)} /> : null}
      {confirmation ? (
        <ConfirmationModal
          value={confirmation}
          busy={confirming}
          onCancel={() => {
            setConfirmation(null);
            if (inputRef.current) inputRef.current.value = "";
          }}
          onConfirm={() => void runConfirmedAction()}
        />
      ) : null}
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
  index,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
  tone: "slate" | "violet" | "blue" | "emerald" | "amber";
  index: number;
}) {
  const tones = {
    slate: "bg-slate-900 text-white",
    violet: "bg-violet-50 text-violet-700",
    blue: "bg-blue-50 text-blue-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.4 }} whileHover={{ y: -4, boxShadow: "0 16px 35px rgba(15,23,42,0.10)" }} className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <motion.div whileHover={{ rotate: 6, scale: 1.08 }} className={`rounded-xl p-3 ${tones[tone]}`}><Icon size={21} /></motion.div>
      <div className="min-w-0"><p className="text-xs font-medium text-slate-500">{label}</p><p className="text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{detail}</p></div>
    </motion.article>
  );
}

function MyPlanPanel({ rows, selectedId, onSelect }: { rows: CustomerMappingRow[]; selectedId: string; onSelect: (id: string) => void }) {
  const plans = [...rows]
    .filter((row) => row.status !== "REJECTED")
    .sort((a, b) => ({ HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority]))
    .slice(0, 8);
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4"><div className="flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><ClipboardList size={19} /></span><div><h2 className="font-semibold">My Plan</h2><p className="text-xs text-slate-500">Prioritas aktivitas dan tindak lanjut dokter</p></div></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{plans.length} prioritas</span></div>
      <div className="grid auto-cols-[minmax(270px,320px)] grid-flow-col gap-3 overflow-x-auto p-4">
        {plans.map((row) => (
          <button key={row.id} type="button" onClick={() => onSelect(row.id)} className={`min-h-36 rounded-2xl border p-4 text-left transition ${selectedId === row.id ? "border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-100" : "border-slate-200 bg-slate-50/70 hover:border-indigo-200 hover:bg-white hover:shadow-sm"}`}>
            <div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{row.doctor || "Dokter belum diisi"}</p><span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${priorityBadgeStyle[row.priority]}`}>{row.priority}</span></div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{row.note || row.plan || "Belum ada note atau planning"}</p>
            <div className="mt-3 flex items-center justify-between gap-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusStyle[row.status]}`}>{row.status}</span><span className="truncate text-[11px] font-semibold text-indigo-600">{journeyLabel[row.journeyStage || "PROSPECT"]}</span></div>
          </button>
        ))}
      </div>
    </section>
  );
}

function JourneyWorkspace({ rows, onSelect, onAdvance }: { rows: CustomerMappingRow[]; onSelect: (id: string) => void; onAdvance: (row: CustomerMappingRow) => void }) {
  return (
    <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-base font-semibold">Doctor Engagement Journey</h2><p className="text-[11px] text-slate-500">Klik dokter untuk melihat profil. Gunakan tombol pada setiap kartu untuk melanjutkan tahap.</p></div><span className="shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-semibold text-white">{rows.length} Doctors</span></div>
      <div className="overflow-x-auto pb-2">
        <div className="grid min-w-[1200px] grid-cols-5 gap-3">
          {journeyOrder.map((stage, index) => {
            const doctors = rows.filter((row) => (row.journeyStage || "PROSPECT") === stage);
            return (
              <section key={stage} className="flex min-h-[460px] flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-bold text-indigo-700">0{index + 1}</span>
                  <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{journeyLabel[stage]}</h3><p className="text-[11px] text-slate-400">{doctors.length} dokter</p></div>
                </div>
                <div className="flex-1 space-y-2">
                  {doctors.length ? doctors.map((doctor) => (
                    <div key={doctor.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                      <button type="button" onClick={() => onSelect(doctor.id)} className="w-full text-left">
                        <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-800">{doctor.doctor || "Dokter belum diisi"}</p><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ${priorityBadgeStyle[doctor.priority]}`}>{doctor.priority}</span></div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">{doctor.hospital || "Hospital belum diisi"}</p>
                        {doctor.productOffered ? <p className="mt-2 flex items-center gap-1 text-[11px] font-medium text-indigo-600"><Package size={12} /> {doctor.productOffered}</p> : null}
                        <p className="mt-2 line-clamp-2 text-[11px] leading-4 text-slate-500">{doctor.note || doctor.plan || "Belum ada note"}</p>
                        {doctor.usageCount ? <p className="mt-2 rounded-lg bg-emerald-50 px-2 py-1.5 text-[10px] font-semibold text-emerald-700">Total {doctor.usageCount}x · Ulang {Math.max(0, doctor.usageCount - 1)}x</p> : null}
                      </button>
                      <button type="button" onClick={() => onAdvance(doctor)} className={`mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-semibold ${stage === "REPEAT_USE" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}>
                        {stage === "REPEAT_USE" ? <Repeat2 size={11} /> : <span>→</span>}
                        {stage === "REPEAT_USE" ? "Catat Pakai Lagi" : `Ke ${journeyLabel[journeyOrder[index + 1]]}`}
                      </button>
                    </div>
                  )) : <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/60 px-3 text-center text-[11px] leading-5 text-slate-400">Belum ada dokter di tahap ini</div>}
                </div>
                <div className="mt-3 rounded-xl bg-white p-2 text-center"><p className="text-lg font-semibold text-slate-800">{doctors.length}</p><p className="text-[8px] uppercase tracking-wider text-slate-400">Total tahap</p></div>
              </section>
            );
          })}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3"><JourneyStat label="Repeat usage rate" value={`${rows.length ? Math.round((rows.filter((row) => row.journeyStage === "REPEAT_USE").length / rows.length) * 100) : 0}%`} tone="emerald" /><JourneyStat label="Sudah ditawarkan" value={`${rows.filter((row) => journeyOrder.indexOf(row.journeyStage || "PROSPECT") >= 2).length}`} tone="indigo" /><JourneyStat label="Total penggunaan" value={`${rows.reduce((sum, row) => sum + (row.usageCount || 0), 0)}x`} tone="slate" /></div>
    </article>
  );
}

function JourneyStat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "indigo" | "slate" }) {
  const tones = { emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700", slate: "bg-slate-950 text-white" };
  return <div className={`rounded-xl px-3 py-2 ${tones[tone]}`}><p className="text-[9px] opacity-70">{label}</p><p className="text-lg font-semibold">{value}</p></div>;
}

function DoctorProfilePanel({ doctor, onEdit }: { doctor: CustomerMappingRow | null; onEdit: (row: CustomerMappingRow) => void }) {
  if (!doctor) return <aside className="flex min-h-80 items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Pilih dokter untuk melihat profil.</aside>;
  const hospitals = [doctor.hospital, doctor.practiceHospital2, doctor.practiceHospital3].filter(Boolean);
  return (
    <aside className="overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-lg 2xl:sticky 2xl:top-4">
      <div className="relative aspect-4/3 bg-linear-to-br from-slate-200 via-indigo-100 to-blue-200">
        {doctor.photoUrl || doctor.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(doctor.photoUrl, doctor.photoFileId)} name={doctor.doctor} className="absolute inset-0 size-full object-cover object-center" /> : <div className="absolute inset-0 flex items-center justify-center text-7xl font-semibold text-indigo-700/70">{doctor.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-slate-950/70 to-transparent" />
        <span className={`absolute left-5 top-5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm ring-1 ${priorityBadgeStyle[doctor.priority]}`}>{doctor.priority} PRIORITY</span>
        <button type="button" onClick={() => onEdit(doctor)} className="absolute right-5 top-5 rounded-xl bg-white/90 p-2.5 text-slate-700 shadow-md backdrop-blur hover:bg-white" title="Edit profil dan foto"><Pencil size={17} /></button>
        <span className={`absolute bottom-5 right-5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${statusStyle[doctor.status]}`}>{doctor.status}</span>
      </div>
      <div className="px-6 pb-7 pt-5">
        <h2 className="text-2xl font-semibold leading-tight text-slate-900">{doctor.doctor || "Nama dokter belum diisi"}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm font-medium text-indigo-600"><Stethoscope size={16} /> {doctor.specialty || "Spesialisasi belum diisi"}</p>
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">{doctor.note || doctor.plan || "Belum ada catatan atau rencana pendekatan untuk dokter ini."}</p>
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
          <ProfileLine icon={Phone} label="Nomor HP" value={doctor.phone || "Belum diisi"} />
          <ProfileLine icon={MapPin} label="Territory" value={doctor.territory || "Belum diisi"} />
          <ProfileLine icon={UserCheck} label="Owner / Sales" value={doctor.owner || "Belum diisi"} />
          <ProfileLine icon={Package} label="Produk" value={doctor.productOffered || "Belum ditawarkan"} />
          <ProfileLine icon={Repeat2} label="Pemakaian / Ulang" value={`${doctor.usageCount || 0}x / ${Math.max(0, (doctor.usageCount || 0) - 1)}x`} />
        </div>
        <div className="mt-5"><p className="mb-2 text-sm font-semibold text-slate-700">Rumah Sakit Praktik ({hospitals.length}/3)</p><div className="space-y-2">{hospitals.length ? hospitals.map((hospital, index) => <div key={`${hospital}-${index}`} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Building2 className="shrink-0 text-indigo-500" size={16} /><span>{hospital}</span></div>) : <p className="text-sm text-slate-400">Belum ada rumah sakit praktik</p>}</div></div>
        <button type="button" onClick={() => onEdit(doctor)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700"><Pencil size={15} /> Edit Profile & Foto</button>
      </div>
    </aside>
  );
}

function ProfileLine({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return <div className="flex items-start gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><Icon size={16} /></span><div className="min-w-0"><p className="text-xs text-slate-400">{label}</p><p className="truncate text-sm font-medium text-slate-700">{value}</p></div></div>;
}

function DoctorPhotoImage({ src, name, className }: { src: string; name: string; className: string }) {
  const [failedSrc, setFailedSrc] = useState("");
  if (failedSrc === src) return <div className={`${className} flex items-center justify-center bg-linear-to-br from-indigo-100 to-blue-200 text-5xl font-semibold text-indigo-700`}>{name.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={`Foto ${name || "dokter"}`} className={className} onError={() => setFailedSrc(src)} />;
}

function UsageAnalyticsPanel({ rows }: { rows: CustomerMappingRow[] }) {
  const chartsReady = useSyncExternalStore(() => () => {}, () => true, () => false);
  const users = rows.filter((row) => (row.usageCount || 0) > 0).map((row) => ({ ...row, hospital: row.usageHospital || row.hospital })).sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  const repeats = users.filter((row) => (row.usageCount || 0) >= 2);
  const totalUsage = users.reduce((sum, row) => sum + (row.usageCount || 0), 0);
  const hospitals = new Set(users.map((row) => row.usageHospital || row.hospital).filter(Boolean)).size;
  const chartData = users.slice(0, 7).map((row) => ({ name: row.doctor.replace(/^(dr\.?|Dr\.?)\s*/i, "").split(",")[0] || "Dokter", usage: row.usageCount || 0 }));
  return (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><span className="rounded-xl bg-emerald-50 p-2 text-emerald-700"><Repeat2 size={18} /></span><h2 className="font-semibold">Doctor Implant Usage</h2></div><p className="mt-2 text-xs leading-5 text-slate-500">Pantau dokter yang menggunakan implant, lokasi rumah sakit, jenis tindakan, dan pemakaian ulang.</p></div><div className="grid grid-cols-3 gap-2"><UsageMiniStat label="Total pakai" value={`${totalUsage}x`} /><UsageMiniStat label="Repeat doctor" value={repeats.length} /><UsageMiniStat label="Rumah sakit" value={hospitals} /></div></div>
      {users.length ? <div className="grid gap-5 p-4 xl:grid-cols-[0.9fr_1.4fr] xl:p-5"><article className="rounded-2xl bg-slate-50 p-4"><p className="text-sm font-semibold">Grafik pemakaian per dokter</p><p className="text-[11px] text-slate-400">Diurutkan berdasarkan total penggunaan</p><div className="mt-3 h-64">{chartsReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><BarChart data={chartData} layout="vertical" margin={{ left: 5, right: 15 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} /><YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => [`${value}x`, "Pemakaian"]} contentStyle={{ borderRadius: 14, fontSize: 12 }} /><Bar dataKey="usage" fill="#10b981" radius={[0, 8, 8, 0]} animationDuration={900} /></BarChart></ResponsiveContainer> : <ChartSkeleton />}</div></article><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead><tr className="border-b border-slate-200 text-slate-400"><th className="px-3 py-3 font-medium">Dokter</th><th className="px-3 py-3 font-medium">Rumah sakit</th><th className="px-3 py-3 font-medium">Implant</th><th className="px-3 py-3 font-medium">Tindakan</th><th className="px-3 py-3 text-center font-medium">Pemakaian</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((row) => <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={row.id} className="hover:bg-indigo-50/50"><td className="px-3 py-3"><p className="max-w-56 font-semibold text-slate-800">{row.doctor}</p><span className={row.usageCount >= 2 ? "text-emerald-600" : "text-blue-600"}>{row.usageCount >= 2 ? "Pemakaian ulang" : "Pemakaian pertama"}</span></td><td className="max-w-52 px-3 py-3 text-slate-600">{row.hospital || "Belum diisi"}</td><td className="px-3 py-3 font-medium text-indigo-700">{row.implantUsed || row.productOffered || "Belum diisi"}</td><td className="px-3 py-3 text-slate-600">{row.procedureType || "Belum diisi"}</td><td className="px-3 py-3 text-center"><span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 font-bold text-emerald-700">{row.usageCount}x</span></td></motion.tr>)}</tbody></table></div></div> : <div className="p-8 text-center"><Repeat2 className="mx-auto text-slate-300" size={32} /><p className="mt-3 text-sm font-semibold text-slate-700">Belum ada pemakaian implant tercatat</p><p className="mx-auto mt-1 max-w-lg text-xs leading-5 text-slate-400">Lanjutkan journey dokter ke “Pemakaian Pertama”, kemudian isi implant dan jenis tindakan pada Edit Profile. Ringkasan dan grafik akan terbentuk otomatis.</p></div>}
    </motion.section>
  );
}

function UsageMiniStat({ label, value }: { label: string; value: string | number }) {
  return <div className="min-w-20 rounded-xl bg-slate-50 px-3 py-2 text-center"><p className="text-lg font-semibold text-slate-800">{value}</p><p className="text-[9px] text-slate-400">{label}</p></div>;
}

function DashboardPanel({ total, statuses, journeys, priorities, territories }: { total: number; statuses: Array<{ name: CustomerStatus; value: number }>; journeys: Array<{ name: CustomerJourneyStage; value: number }>; priorities: Array<{ name: "HIGH" | "MEDIUM" | "LOW"; value: number }>; territories: Array<[string, number]> }) {
  const chartsReady = useSyncExternalStore(() => () => {}, () => true, () => false);
  const approved = statuses.find((item) => item.name === "APPROVED")?.value || 0;
  const conversion = total ? Math.round((approved / total) * 100) : 0;
  const journeyChart = journeys.map((item) => ({ name: journeyLabel[item.name], value: item.value }));
  const priorityColors = { HIGH: "#f43f5e", MEDIUM: "#f59e0b", LOW: "#10b981" };
  return (
    <motion.section initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[1.35fr_1fr_0.85fr]">
      <DashboardBlock title="Perkembangan Journey" description="Jumlah dokter pada setiap tahap pendekatan" icon={BarChart3}>
        <div className="h-64 w-full" aria-label="Grafik tahapan customer journey">
          {chartsReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
            <BarChart data={journeyChart} margin={{ top: 8, right: 4, left: -25, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} interval={0} angle={-12} textAnchor="end" height={52} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip cursor={{ fill: "#eef2ff" }} contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(value) => [`${value} dokter`, "Jumlah"]} />
              <Bar dataKey="value" fill="#4f46e5" radius={[8, 8, 2, 2]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer> : <ChartSkeleton />}
        </div>
      </DashboardBlock>
      <DashboardBlock title="Komposisi Priority" description="Fokuskan aktivitas pada dokter berprioritas tinggi" icon={Target}>
        <div className="grid items-center gap-2 sm:grid-cols-[1fr_130px]">
          <div className="h-52 min-w-0">
            {chartsReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie data={priorities} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={4} animationDuration={900}>
                  {priorities.map((item) => <Cell key={item.name} fill={priorityColors[item.name]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(value) => [`${value} dokter`, "Jumlah"]} />
              </PieChart>
            </ResponsiveContainer> : <ChartSkeleton round />}
          </div>
          <div className="space-y-2">{priorities.map((item) => <motion.div whileHover={{ x: 4 }} key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className={`text-[10px] font-semibold ${priorityBadgeStyle[item.name].split(" ")[1]}`}>{item.name}</span><strong className="text-lg">{item.value}</strong></motion.div>)}</div>
        </div>
      </DashboardBlock>
      <DashboardBlock title="Insight & Territory" description="Ringkasan cepat untuk menentukan tindakan berikutnya" icon={Building2} className="lg:col-span-2 2xl:col-span-1">
        <div className="mb-4 rounded-2xl bg-linear-to-br from-indigo-600 to-blue-600 p-4 text-white"><p className="text-xs text-indigo-100">Approval conversion</p><div className="mt-1 flex items-end justify-between gap-3"><p className="text-3xl font-semibold">{conversion}%</p><p className="text-right text-[10px] leading-4 text-indigo-100">{approved} dari {total} dokter<br />sudah approved</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"><motion.div initial={{ width: 0 }} animate={{ width: `${conversion}%` }} transition={{ duration: 0.9, delay: 0.25 }} className="h-full rounded-full bg-white" /></div></div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Distribusi territory</p><div className="space-y-2">
          {territories.length ? territories.map(([name, value]) => (
            <motion.div whileHover={{ x: 4 }} key={name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-sm"><span className="truncate font-medium">{name}</span><span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold shadow-sm">{value}</span></motion.div>
          )) : <p className="text-sm text-slate-400">Belum ada data territory</p>}
        </div><p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs leading-5 text-amber-800">Tip: lengkapi owner dan planning terlebih dahulu agar target dapat dilanjutkan ke tahap penawaran produk.</p>
      </DashboardBlock>
    </motion.section>
  );
}

function ChartSkeleton({ round = false }: { round?: boolean }) {
  return <div className="flex size-full animate-pulse items-end justify-around gap-3 p-6">{round ? <div className="m-auto size-36 rounded-full border-28 border-slate-100" /> : [48, 72, 42, 60, 34].map((height, index) => <div key={`${height}-${index}`} className="w-full max-w-12 rounded-t-lg bg-slate-100" style={{ height: `${height}%` }} />)}</div>;
}

function DashboardBlock({ title, description, icon: Icon, children, className = "" }: { title: string; description: string; icon: typeof Users; children: React.ReactNode; className?: string }) {
  return <motion.article variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -3 }} className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}><div className="mb-4 flex items-start gap-3"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><Icon size={17} /></span><div><h2 className="text-sm font-semibold">{title}</h2><p className="mt-0.5 text-[11px] leading-4 text-slate-400">{description}</p></div></div>{children}</motion.article>;
}

function FilterGroup({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="flex h-11 items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-1">
      {options.map((option) => (
        <button key={option} type="button" onClick={() => onChange(option)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${value === option ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
          {option === "ALL" ? "Semua" : option}
        </button>
      ))}
    </div>
  );
}

function CustomerCard({ row, busy, onDecision, onEdit, onDelete, onJourney, onSelect }: { row: CustomerMappingRow; busy: boolean; onDecision: (row: CustomerMappingRow, status: CustomerStatus) => void; onEdit: (row: CustomerMappingRow) => void; onDelete: (row: CustomerMappingRow) => void; onJourney: (row: CustomerMappingRow) => void; onSelect: () => void }) {
  const stage = row.journeyStage || "PROSPECT";
  return (
    <article onClick={onSelect} className="flex min-h-72 cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${priorityBadgeStyle[row.priority]}`}>
          <span className={`size-2 rounded-full ${priorityStyle[row.priority]}`} />
          {row.priority} PRIORITY
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusStyle[row.status]}`}>{row.status}</span>
      </div>
      <div className="mt-4 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{row.customerType} • {row.territory || "No territory"}</p>
        <h3 className="mt-2 text-base font-semibold leading-snug">{row.doctor || "Dokter belum ditentukan"}</h3>
        <p className="mt-1 flex items-start gap-2 text-sm text-slate-600"><Building2 className="mt-0.5 shrink-0" size={15} /> {row.hospital || "Rumah sakit belum ditentukan"}</p>
        {row.note ? <p className="mt-3 line-clamp-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{row.note}</p> : null}
        {row.owner ? <p className="mt-3 text-xs font-medium text-blue-700">Owner: {row.owner}</p> : null}
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Sales Journey</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{journeyLabel[stage]}</span></div>
          {row.productOffered ? <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-700"><Package size={13} /> {row.productOffered}</p> : <p className="mt-2 text-xs text-amber-700">Produk belum ditentukan</p>}
          {row.usageCount ? <div className="mt-2 grid grid-cols-2 gap-2 text-center"><p className="rounded-lg bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600">Total {row.usageCount}x</p><p className="rounded-lg bg-emerald-100 px-2 py-1.5 text-[10px] font-semibold text-emerald-700">Ulang {Math.max(0, row.usageCount - 1)}x</p></div> : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" disabled={busy} onClick={() => onJourney(row)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{stage === "REPEAT_USE" ? <Repeat2 size={14} /> : <Target size={14} />}{stage === "REPEAT_USE" ? "Catat Pemakaian Lagi" : `Lanjut: ${journeyLabel[journeyOrder[Math.min(journeyOrder.indexOf(stage) + 1, journeyOrder.length - 1)]]}`}</button>
        <button type="button" disabled={busy} onClick={() => onEdit(row)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50" title="Edit customer"><Pencil size={15} /></button>
        <button type="button" disabled={busy} onClick={() => onDecision(row, "TARGETED")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"><Target size={14} /> Targetkan</button>
        <button type="button" disabled={busy} onClick={() => onDecision(row, "APPROVED")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"><CheckCircle2 size={14} /> Approve</button>
        {row.status !== "REJECTED" ? <button type="button" disabled={busy} title="Reject" onClick={() => onDecision(row, "REJECTED")} className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-500 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"><XCircle size={15} /></button> : null}
        <button type="button" disabled={busy} title="Delete customer" onClick={() => onDelete(row)} className="inline-flex items-center justify-center rounded-lg border border-rose-200 px-2.5 text-rose-600 hover:bg-rose-50 disabled:opacity-50"><Trash2 size={15} /></button>
      </div>
      {busy ? <p className="mt-2 flex items-center gap-1 text-[11px] text-slate-400"><Clock3 size={12} /> Menyimpan ke Data Sheet...</p> : null}
    </article>
  );
}

function CustomerTable({ rows, onSelect, onEdit }: { rows: CustomerMappingRow[]; onSelect: (id: string) => void; onEdit: (row: CustomerMappingRow) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1200px] w-full text-left text-xs">
        <thead className="bg-slate-950 text-white"><tr>{["Doctor", "Specialty", "Phone", "Hospital", "Owner", "Product", "Priority", "Status", "Journey", "Usage", "Action"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.id} onClick={() => onSelect(row.id)} className="cursor-pointer hover:bg-indigo-50/50">
              <td className="max-w-64 px-4 py-3 font-semibold text-slate-800">{row.doctor || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{row.specialty || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{row.phone || "-"}</td>
              <td className="max-w-56 px-4 py-3 text-slate-600">{row.hospital || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{row.owner || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{row.productOffered || "-"}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-semibold ring-1 ${priorityBadgeStyle[row.priority]}`}>{row.priority}</span></td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-semibold ring-1 ${statusStyle[row.status]}`}>{row.status}</span></td>
              <td className="px-4 py-3 font-medium text-indigo-700">{journeyLabel[row.journeyStage || "PROSPECT"]}</td>
              <td className="px-4 py-3 text-center font-semibold">{row.usageCount || 0}x</td>
              <td className="px-4 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); onEdit(row); }} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white"><Pencil size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsageEntryModal({ value, busy, onChange, onCancel, onConfirm }: { value: UsageEntryState; busy: boolean; onChange: (value: UsageEntryState) => void; onCancel: () => void; onConfirm: () => void }) {
  const hospitals = Array.from(new Set([value.row.hospital, value.row.practiceHospital2, value.row.practiceHospital3].filter(Boolean)));
  const repeatCount = Math.max(0, value.row.usageCount - 1) + (value.nextStage === "REPEAT_USE" ? 1 : 0);
  const complete = value.hospital.trim() && value.implantUsed.trim() && value.procedureType.trim();
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md"><motion.section initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} role="dialog" aria-modal="true" className="w-full max-w-xl overflow-hidden rounded-4xl bg-white shadow-2xl"><div className="bg-linear-to-br from-emerald-600 to-teal-700 px-6 py-6 text-center text-white"><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Repeat2 size={26} /></span><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">Catat penggunaan implant</p><h2 className="mt-1 text-2xl font-semibold">{journeyLabel[value.nextStage]}</h2><p className="mt-1 text-xs text-emerald-100">{value.row.doctor}</p></div><div className="space-y-4 p-5 sm:p-6"><div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-2xl font-semibold">{value.row.usageCount + 1}x</p><p className="text-[10px] text-slate-400">Total setelah dicatat</p></div><div className="rounded-2xl bg-emerald-50 p-3 text-center"><p className="text-2xl font-semibold text-emerald-700">{repeatCount}x</p><p className="text-[10px] text-emerald-600">Jumlah pemakaian ulang</p></div></div><label className="block space-y-1.5 text-sm font-semibold text-slate-700">Rumah sakit tindakan<select value={value.hospital} onChange={(event) => onChange({ ...value, hospital: event.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"><option value="">Pilih rumah sakit</option>{hospitals.map((hospital) => <option key={hospital} value={hospital}>{hospital}</option>)}</select><span className="block text-[10px] font-normal text-slate-400">Diambil dari maksimal tiga rumah sakit praktik dokter.</span></label><label className="block space-y-1.5 text-sm font-semibold text-slate-700">Implant yang digunakan<input value={value.implantUsed} onChange={(event) => onChange({ ...value, implantUsed: event.target.value })} list="customer-product-suggestions" placeholder="Contoh: Zimmer Persona / Normmed THR" className="h-12 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label><label className="block space-y-1.5 text-sm font-semibold text-slate-700">Jenis tindakan<input value={value.procedureType} onChange={(event) => onChange({ ...value, procedureType: event.target.value })} placeholder="Contoh: TKR, THR, Hip Revision" className="h-12 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label>{!complete ? <p className="rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-700">Rumah sakit, implant, dan jenis tindakan wajib dilengkapi.</p> : null}<div className="grid gap-2.5 pt-2 sm:grid-cols-2"><button type="button" disabled={busy} onClick={onCancel} className="order-2 h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:order-1">Batal</button><button type="button" disabled={busy || !complete} onClick={onConfirm} className="order-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2">{busy ? "Menyimpan..." : <><CheckCircle2 size={16} />Simpan Pemakaian</>}</button></div></div></motion.section></motion.div>;
}

function ConfirmationModal({ value, busy, onCancel, onConfirm }: { value: ConfirmState; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const danger = value.tone === "danger";
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onCancel();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [busy, onCancel]);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <motion.section initial={{ opacity: 0, y: 28, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 320, damping: 26 }} role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" className="relative w-full max-w-[460px] overflow-hidden rounded-4xl border border-white/60 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
        <div className={`h-1.5 w-full ${danger ? "bg-linear-to-r from-rose-500 to-orange-400" : "bg-linear-to-r from-blue-600 via-indigo-500 to-violet-500"}`} />
        <button type="button" aria-label="Tutup konfirmasi" disabled={busy} onClick={onCancel} className="absolute right-4 top-5 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"><X size={18} /></button>
        <div className="px-5 pb-5 pt-6 sm:px-7 sm:pb-7">
          <motion.div initial={{ scale: 0.7, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.08, type: "spring" }} className={`relative mx-auto flex size-14 items-center justify-center rounded-2xl ${danger ? "bg-rose-50 text-rose-600 ring-1 ring-rose-100" : "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100"}`}>
            <span className={`absolute inset-0 animate-ping rounded-2xl opacity-15 ${danger ? "bg-rose-400" : "bg-indigo-400"}`} />
            {danger ? <Trash2 size={25} /> : <CheckCircle2 size={26} />}
          </motion.div>
          <div className="mt-5 text-center"><p className={`text-[10px] font-bold uppercase tracking-[0.18em] ${danger ? "text-rose-500" : "text-indigo-500"}`}>{danger ? "Tindakan permanen" : "Konfirmasi tindakan"}</p><h2 id="confirmation-title" className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{value.title}</h2></div>
          <div className={`mt-4 rounded-2xl border p-4 text-center ${danger ? "border-rose-100 bg-rose-50/70" : "border-slate-200 bg-slate-50"}`}><p className="text-sm leading-6 text-slate-600">{value.message}</p></div>
          <div className="mt-4 flex flex-col items-center justify-center gap-1.5 text-center text-[11px] leading-5 text-slate-400"><span className={`flex size-7 items-center justify-center rounded-full ${danger ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-500"}`}><Clock3 size={13} /></span><p>{danger ? "Pastikan data yang dipilih sudah benar sebelum melanjutkan." : "Perubahan akan langsung diproses dan disinkronkan ke data utama."}</p></div>
          <div className="mt-6 grid gap-2.5 sm:grid-cols-[1fr_1.45fr]">
            <button type="button" disabled={busy} onClick={onCancel} className="order-2 inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1">Batal</button>
            <motion.button whileTap={{ scale: busy ? 1 : 0.97 }} type="button" disabled={busy} onClick={onConfirm} className={`order-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white shadow-lg transition disabled:cursor-wait disabled:opacity-70 sm:order-2 ${danger ? "bg-rose-600 shadow-rose-200 hover:bg-rose-500" : "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-500"}`}>{busy ? <><motion.span animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }} className="size-4 rounded-full border-2 border-white/35 border-t-white" />Memproses...</> : <>{danger ? <Trash2 size={16} /> : <CheckCircle2 size={16} />}{value.confirmLabel}</>}</motion.button>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function CustomerFormModal({ form, saving, missingFields, intendedStatus, onChange, onClose, onSubmit }: { form: CustomerFormData; saving: boolean; missingFields: string[]; intendedStatus: CustomerStatus | null; onChange: (form: CustomerFormData) => void; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const field = (name: keyof CustomerFormData, value: string) => onChange({ ...form, [name]: value });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div><h2 className="text-xl font-semibold">{form.id ? "Edit Customer" : "Input Customer Baru"}</h2><p className="text-xs text-slate-500">{intendedStatus ? `Lengkapi data untuk melanjutkan ${intendedStatus}` : "Data langsung disimpan ke Data Sheet"}</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {missingFields.length ? (
            <div className="md:col-span-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Data berikut wajib dilengkapi:</p>
              <div className="mt-2 flex flex-wrap gap-2">{missingFields.map((item) => <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">{item}</span>)}</div>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <DoctorPhotoUpload
              preview={form.photoDataUrl || doctorPhotoSrc(form.photoUrl, form.photoFileId)}
              doctorName={form.doctor}
              onPrepared={(photoDataUrl) => onChange({ ...form, photoDataUrl })}
              onRemove={() => onChange({ ...form, photoDataUrl: "", photoUrl: "", photoFileId: "" })}
            />
          </div>
          <FormSelect label="Tipe customer" value={form.customerType} options={["EXISTING", "TARGET"]} onChange={(value) => field("customerType", value)} />
          <FormSelect label="Priority" value={form.priority} options={["HIGH", "MEDIUM", "LOW"]} onChange={(value) => field("priority", value)} error={missingFields.includes("Priority")} />
          <FormInput label="Territory" value={form.territory} onChange={(value) => field("territory", value)} placeholder="Contoh: BALI" error={missingFields.includes("Territory")} />
          <FormInput label="Owner / Sales PIC" value={form.owner} onChange={(value) => field("owner", value)} placeholder="Nama owner atau sales" error={missingFields.includes("Owner / Sales PIC")} />
          <FormInput label="Hospital" value={form.hospital} onChange={(value) => field("hospital", value)} placeholder="Nama rumah sakit" error={missingFields.includes("Hospital")} />
          <FormInput label="Dokter" value={form.doctor} onChange={(value) => field("doctor", value)} placeholder="Nama dokter" error={missingFields.includes("Dokter")} />
          <FormInput label="Nomor handphone" value={form.phone} onChange={(value) => field("phone", value)} placeholder="Contoh: 0812..." />
          <FormInput label="Spesialisasi" value={form.specialty} onChange={(value) => field("specialty", value)} placeholder="Contoh: Sp.OT Hip & Knee" />
          <FormInput label="Rumah sakit praktik 2" value={form.practiceHospital2} onChange={(value) => field("practiceHospital2", value)} placeholder="Opsional" />
          <FormInput label="Rumah sakit praktik 3" value={form.practiceHospital3} onChange={(value) => field("practiceHospital3", value)} placeholder="Opsional" />
          <FormSelect label="Status" value={form.status} options={["NEW", "TARGETED", "APPROVED", "REJECTED"]} onChange={(value) => field("status", value)} />
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2"><p className="text-xs font-medium text-indigo-500">Sales Journey</p><p className="mt-1 text-sm font-semibold text-indigo-800">{journeyLabel[form.journeyStage]}</p><p className="text-[10px] text-indigo-500">Tahap diubah melalui tombol Lanjut pada kartu customer.</p></div>
          <FormProductInput value={form.productOffered} onChange={(value) => field("productOffered", value)} error={missingFields.includes("Product Offered")} />
          <FormInput label="Implant yang digunakan" value={form.implantUsed} onChange={(value) => field("implantUsed", value)} placeholder="Contoh: Zimmer Persona / Normmed THR" />
          <FormInput label="Jenis tindakan" value={form.procedureType} onChange={(value) => field("procedureType", value)} placeholder="Contoh: TKR, THR, Hip Revision" />
          <FormInput label="Follow-up berikutnya" value={form.nextFollowUp} onChange={(value) => field("nextFollowUp", value)} placeholder="Contoh: 2026-07-30 / hubungi kembali" />
          <FormTextarea label="Note" value={form.note} onChange={(value) => field("note", value)} placeholder="Catatan customer" />
          <FormTextarea label="Planning" value={form.plan} onChange={(value) => field("plan", value)} placeholder="Rencana pendekatan atau follow-up" error={missingFields.includes("Planning / Follow-up")} />
          <FormTextarea label="Outcome / Hasil" value={form.outcome} onChange={(value) => field("outcome", value)} placeholder="Respons dokter, hasil penggunaan, atau kendala" />
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{saving ? "Menyimpan..." : form.id ? "Simpan Perubahan" : "Post Customer"}</button>
        </div>
      </form>
    </div>
  );
}

function DoctorPhotoUpload({ preview, doctorName, onPrepared, onRemove }: { preview: string; doctorName: string; onPrepared: (value: string) => void; onRemove: () => void }) {
  const [processing, setProcessing] = useState(false);
  async function selectPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    try {
      onPrepared(await prepareDoctorPhoto(file));
      toast.success("Foto siap di-upload saat profil disimpan");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Foto gagal diproses");
    } finally {
      setProcessing(false);
      event.target.value = "";
    }
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-linear-to-br from-indigo-100 to-blue-200 bg-cover bg-center text-3xl font-semibold text-indigo-700 shadow-inner" style={preview ? { backgroundImage: `url(${preview})` } : undefined}>{!preview ? doctorName.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D" : null}</div>
        <div className="flex-1"><p className="text-sm font-semibold text-slate-800">Foto Profile Dokter</p><p className="mt-1 text-xs leading-5 text-slate-500">Pilih JPG, PNG, atau WebP. Foto otomatis dipotong persegi dan dikompres sebelum disimpan ke Google Drive.</p><div className="mt-3 flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500"><UploadCloud size={15} />{processing ? "Memproses..." : preview ? "Ganti Foto" : "Upload Foto"}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={processing} onChange={selectPhoto} className="sr-only" /></label>{preview ? <button type="button" onClick={onRemove} className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50">Hapus Foto</button> : null}</div></div>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, error = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: boolean }) {
  return <label className="space-y-1.5 text-sm font-medium text-slate-700">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-11 w-full rounded-xl border px-3 font-normal outline-none focus:ring-2 ${error ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-100" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"}`} /></label>;
}

function FormProductInput({ value, onChange, error = false }: { value: string; onChange: (value: string) => void; error?: boolean }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700">
      Produk yang ditawarkan
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        list="customer-product-suggestions"
        placeholder="Ketik produk, contoh: ZIMMER"
        className={`h-11 w-full rounded-xl border px-3 font-normal outline-none focus:ring-2 ${error ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-100" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"}`}
      />
      <datalist id="customer-product-suggestions">
        {productSuggestions.map((product) => <option key={product} value={product} />)}
      </datalist>
      <span className="block text-[10px] font-normal text-slate-400">Bisa pilih saran atau tulis produk baru.</span>
    </label>
  );
}

function FormSelect({ label, value, options, onChange, error = false, placeholder }: { label: string; value: string; options: string[]; onChange: (value: string) => void; error?: boolean; placeholder?: string }) {
  return <label className="space-y-1.5 text-sm font-medium text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className={`h-11 w-full rounded-xl border px-3 font-normal outline-none focus:ring-2 ${error ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-100" : "border-slate-200 bg-white focus:border-blue-400 focus:ring-blue-100"}`}>{placeholder ? <option value="">{placeholder}</option> : null}{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function FormTextarea({ label, value, onChange, placeholder, error = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: boolean }) {
  return <label className="space-y-1.5 text-sm font-medium text-slate-700">{label}<textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className={`w-full resize-y rounded-xl border px-3 py-2 font-normal outline-none focus:ring-2 ${error ? "border-amber-400 bg-amber-50 focus:border-amber-500 focus:ring-amber-100" : "border-slate-200 focus:border-blue-400 focus:ring-blue-100"}`} /></label>;
}
