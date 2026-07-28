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
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CustomerMappingRow,
  CustomerJourneyStage,
  CustomerStatus,
} from "@/types/customer-mapping";
import CustomerMappingAccessGate from "@/components/CustomerMappingAccessGate";

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
  monthlyCaseCount: string;
  orthopedicCaseTypes: string;
  implantVendors: string;
  vendorSupport: string;
};

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel: string;
  tone?: "primary" | "danger";
  action: () => Promise<void> | void;
};

type JourneyEntryState = {
  row: CustomerMappingRow;
  nextStage: CustomerJourneyStage;
  owner: string;
  productOffered: string;
  hospital: string;
  implantUsed: string;
  procedureType: string;
  note: string;
  plan: string;
  outcome: string;
  monthlyCaseCount: string;
  orthopedicCaseTypes: string;
  implantVendors: string;
  vendorSupport: string;
  hospital1: string;
  hospital2: string;
  hospital3: string;
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
  monthlyCaseCount: "",
  orthopedicCaseTypes: "",
  implantVendors: "",
  vendorSupport: "",
};

const orthopedicCaseOptions = ["Artroplasty HIP", "Artroplasty KNEE", "Artroscopy", "Trauma", "Nailing"];

function potentialPriority(monthlyCaseCount: string | number, caseTypes: string): "HIGH" | "MEDIUM" | "LOW" {
  const count = Number(monthlyCaseCount) || 0;
  const normalizedCases = caseTypes.toLowerCase();
  const hasArthroplasty = normalizedCases.includes("artroplasty hip") || normalizedCases.includes("artroplasty knee");
  const hasTraumaOrScope = normalizedCases.includes("trauma") || normalizedCases.includes("artroscopy");
  if (count > 5 && hasArthroplasty) return "HIGH";
  if (hasTraumaOrScope || (count > 0 && hasArthroplasty)) return "MEDIUM";
  return "LOW";
}

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

const statusLabel: Record<CustomerStatus, string> = {
  NEW: "Baru",
  TARGETED: "Ditargetkan",
  APPROVED: "Existing",
  REJECTED: "Ditolak",
};

type UsageProductFilter = "ALL" | "USERS" | "ZIMMER" | "NORMMED" | "BOTH";

function usedProductBrands(row: Pick<CustomerMappingRow, "implantUsed" | "productOffered" | "usageCount">) {
  if ((row.usageCount || 0) < 1) return { zimmer: false, normmed: false };
  const products = (row.implantUsed || row.productOffered || "").toLowerCase();
  return {
    zimmer: products.includes("zimmer"),
    normmed: products.includes("normmed"),
  };
}

function matchesUsageProductFilter(
  row: Pick<CustomerMappingRow, "implantUsed" | "productOffered" | "usageCount">,
  filter: UsageProductFilter
) {
  if (filter === "ALL") return true;
  const brands = usedProductBrands(row);
  if (filter === "USERS") return brands.zimmer || brands.normmed;
  if (filter === "ZIMMER") return brands.zimmer;
  if (filter === "NORMMED") return brands.normmed;
  return brands.zimmer && brands.normmed;
}

function isExistingCustomer(row: Pick<CustomerMappingRow, "status" | "usageCount" | "implantUsed" | "productOffered">) {
  const brands = usedProductBrands(row);
  return row.status === "APPROVED" || brands.zimmer || brands.normmed;
}

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

function ResponsiveContainer(props: React.ComponentProps<typeof RechartsResponsiveContainer>) {
  return <RechartsResponsiveContainer initialDimension={{ width: 480, height: 256 }} {...props} />;
}

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

const desktopMediaQuery = "(min-width: 768px)";

function subscribeDesktopViewport(callback: () => void) {
  const media = window.matchMedia(desktopMediaQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function getDesktopViewportSnapshot() {
  return window.matchMedia(desktopMediaQuery).matches;
}

function CustomerMappingDashboard() {
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
  const [journeyEntry, setJourneyEntry] = useState<JourneyEntryState | null>(null);
  const [showMobileInsights, setShowMobileInsights] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [engagementFilter, setEngagementFilter] = useState<UsageProductFilter>("ALL");
  const isDesktopViewport = useSyncExternalStore(
    subscribeDesktopViewport,
    getDesktopViewportSnapshot,
    () => false
  );

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
      existing: rows.filter(isExistingCustomer).length,
      targeted: rows.filter((row) => row.status === "TARGETED").length,
      approved: rows.filter((row) => row.status === "APPROVED").length,
      incomplete: rows.filter((row) => missingCustomerFields(row, row.status).length > 0)
        .length,
    }),
    [rows]
  );

  const existingCustomers = useMemo(
    () => rows
      .filter(isExistingCustomer)
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)),
    [rows]
  );

  const potentialCustomers = useMemo(
    () => rows
      .filter((row) => !isExistingCustomer(row) && row.status !== "REJECTED")
      .map((row) => {
        const stage = row.journeyStage || "PROSPECT";
        const score =
          ({ HIGH: 45, MEDIUM: 28, LOW: 12 }[row.priority]) +
          ({ PROSPECT: 0, TARGETED: 12, OFFERED: 25, FIRST_USE: 0, REPEAT_USE: 0 }[stage]) +
          (row.owner ? 6 : 0) +
          (row.plan ? 6 : 0) +
          (row.phone ? 3 : 0) +
          Math.min(20, row.monthlyCaseCount || 0) +
          (row.orthopedicCaseTypes ? 6 : 0);
        return { row, score };
      })
      .sort((a, b) => b.score - a.score),
    [rows]
  );

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (status !== "ALL" && row.status !== status) return false;
      if (kind === "EXISTING" && !isExistingCustomer(row)) return false;
      if (kind === "TARGET" && isExistingCustomer(row)) return false;
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
  const engagementRows = useMemo(
    () => rows.filter((row) => matchesUsageProductFilter(row, engagementFilter)),
    [engagementFilter, rows]
  );

  function openDoctorProfile(id: string) {
    setSelectedId(id);
    setProfileOpen(true);
  }

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
    const customerKinds = [
      { name: "EXISTING" as const, value: rows.filter(isExistingCustomer).length },
      { name: "TARGET" as const, value: rows.filter((row) => !isExistingCustomer(row) && row.status !== "REJECTED").length },
    ];
    const territories = Object.entries(
      rows.reduce<Record<string, number>>((result, row) => {
        const name = row.territory || "Tanpa territory";
        result[name] = (result[name] || 0) + 1;
        return result;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const repeatUsers = rows.filter((row) => (row.usageCount || 0) >= 2).length;
    return { statuses, priorities, territories, journeys, customerKinds, repeatUsers };
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
      workbook.created = new Date();
      workbook.calcProperties.fullCalcOnLoad = true;
      const mapping = workbook.addWorksheet("Customer Mapping", { views: [{ state: "frozen", ySplit: 3, showGridLines: false, zoomScale: 80 }] });
      mapping.columns = [
        { width: 6 }, { width: 27 }, { width: 15 }, { width: 36 }, { width: 34 }, { width: 3 },
        { width: 6 }, { width: 27 }, { width: 15 }, { width: 36 }, { width: 34 }, { width: 34 },
        { width: 12 }, { width: 12 }, { width: 12 },
      ];
      mapping.mergeCells("A1:L1"); mapping.getCell("A1").value = "CUSTOMER MAPPING"; mapping.getCell("A1").font = { name: "Aptos Display", size: 18, bold: true, color: { argb: "FFFFFFFF" } }; mapping.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A5F" } }; mapping.getCell("A1").alignment = { horizontal: "center", vertical: "middle" }; mapping.getRow(1).height = 30;
      mapping.mergeCells("A2:E2"); mapping.getCell("A2").value = "EXISTING CUSTOMER"; mapping.getCell("A2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF4CCCC" } };
      mapping.mergeCells("G2:L2"); mapping.getCell("G2").value = "PLANNING / TARGET CUSTOMER"; mapping.getCell("G2").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9EAF7" } };
      ["A2", "G2"].forEach((cellAddress) => { const cell = mapping.getCell(cellAddress); cell.font = { bold: true, color: { argb: "FF1F2937" } }; cell.alignment = { horizontal: "center", vertical: "middle" }; });
      const existingHeaders = ["NO", "HOSPITAL", "TERRITORY", "DOKTER", "NOTE"];
      const targetHeaders = ["NO", "HOSPITAL", "TERRITORY", "DOKTER", "NOTE", "PLANNING"];
      existingHeaders.forEach((header, index) => { mapping.getCell(3, index + 1).value = header; });
      targetHeaders.forEach((header, index) => { mapping.getCell(3, index + 7).value = header; });
      mapping.mergeCells("M1:O1"); mapping.getCell("M1").value = "SYMBOL PRIORITY"; mapping.getCell("M1").font = { bold: true, color: { argb: "FFFFFFFF" } }; mapping.getCell("M1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } }; mapping.getCell("M1").alignment = { horizontal: "center" };
      (["HIGH", "MEDIUM", "LOW"] as const).forEach((priority, index) => { const cell = mapping.getCell(2, index + 13); cell.value = priority; cell.font = { bold: true, color: { argb: priority === "HIGH" ? "FFBE123C" : priority === "MEDIUM" ? "FFB45309" : "FF047857" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: priority === "HIGH" ? "FFFFE4E6" : priority === "MEDIUM" ? "FFFEF3C7" : "FFD1FAE5" } }; cell.alignment = { horizontal: "center" }; });
      [...existingHeaders.map((_, index) => mapping.getCell(3, index + 1)), ...targetHeaders.map((_, index) => mapping.getCell(3, index + 7))].forEach((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF365F91" } }; cell.alignment = { horizontal: "center", vertical: "middle" }; cell.border = { bottom: { style: "thin", color: { argb: "FFCBD5E1" } } }; });
      const existingRows = rows.filter(isExistingCustomer);
      const targetRows = rows.filter((row) => !isExistingCustomer(row));
      const mappingLength = Math.max(existingRows.length, targetRows.length, 1);
      for (let index = 0; index < mappingLength; index += 1) {
        const rowNumber = index + 4; const existing = existingRows[index]; const target = targetRows[index];
        if (existing) [index + 1, existing.hospital, existing.territory, existing.doctor, existing.note].forEach((value, columnIndex) => { mapping.getCell(rowNumber, columnIndex + 1).value = value; });
        if (target) [index + 1, target.hospital, target.territory, target.doctor, target.note, target.plan || target.nextFollowUp || "Belum ada planning"].forEach((value, columnIndex) => { mapping.getCell(rowNumber, columnIndex + 7).value = value; });
        mapping.getRow(rowNumber).height = 42; mapping.getRow(rowNumber).alignment = { vertical: "top", wrapText: true };
        [...Array.from({ length: 5 }, (_, columnIndex) => mapping.getCell(rowNumber, columnIndex + 1)), ...Array.from({ length: 6 }, (_, columnIndex) => mapping.getCell(rowNumber, columnIndex + 7))].forEach((cell) => { cell.border = { bottom: { style: "hair", color: { argb: "FFE2E8F0" } }, right: { style: "hair", color: { argb: "FFE2E8F0" } } }; });
        if (existing) { const marker = mapping.getCell(rowNumber, 13 + (["HIGH", "MEDIUM", "LOW"] as const).indexOf(existing.priority)); marker.value = "●"; marker.font = { bold: true, color: { argb: existing.priority === "HIGH" ? "FFF43F5E" : existing.priority === "MEDIUM" ? "FFF59E0B" : "FF10B981" } }; marker.alignment = { horizontal: "center" }; }
        if (target) { const marker = mapping.getCell(rowNumber, 13 + (["HIGH", "MEDIUM", "LOW"] as const).indexOf(target.priority)); marker.value = marker.value ? "● ●" : "●"; marker.font = { bold: true, color: { argb: target.priority === "HIGH" ? "FFF43F5E" : target.priority === "MEDIUM" ? "FFF59E0B" : "FF10B981" } }; marker.alignment = { horizontal: "center" }; }
      }
      mapping.autoFilter = { from: "A3", to: "L3" };
      const crm = workbook.addWorksheet("Doctor CRM", { views: [{ state: "frozen", ySplit: 4, xSplit: 1, showGridLines: false }] });
      crm.mergeCells("A1:Y1");
      crm.getCell("A1").value = "DOCTOR CUSTOMER MAPPING";
      crm.getCell("A1").font = { name: "Aptos Display", size: 20, bold: true, color: { argb: "FFFFFFFF" } };
      crm.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF172554" } };
      crm.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
      crm.getRow(1).height = 38;
      crm.mergeCells("A2:Y2");
      crm.getCell("A2").value = `Export ${new Date().toLocaleDateString("id-ID")} • ${filteredRows.length} dokter • Filter mengikuti tampilan aplikasi`;
      crm.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };
      crm.getRow(3).height = 8;
      const headers = ["Doctor", "Phone", "Specialty", "Hospital 1", "Hospital 2", "Hospital 3", "Territory", "Owner / Sales", "Product Offered", "Priority", "Status", "Journey", "Usage Hospital", "Implant Used", "Procedure Type", "Total Usage", "Repeat Usage", "Next Follow-up", "Monthly Cases", "Orthopedic Case Types", "Current Implant Vendors", "Vendor Support", "Note", "Planning", "Outcome"];
      const crmRows = filteredRows.map((row) => [row.doctor, row.phone, row.specialty, row.hospital, row.practiceHospital2, row.practiceHospital3, row.territory, row.owner, row.productOffered, row.priority, row.status, journeyLabel[row.journeyStage || "PROSPECT"], row.usageHospital, row.implantUsed, row.procedureType, row.usageCount || 0, Math.max(0, (row.usageCount || 0) - 1), row.nextFollowUp, row.monthlyCaseCount || 0, row.orthopedicCaseTypes, row.implantVendors, row.vendorSupport, row.note, row.plan, row.outcome]);
      crm.addTable({ name: "DoctorCRMTable", ref: "A4", headerRow: true, style: { theme: "TableStyleMedium2", showRowStripes: true }, columns: headers.map((name) => ({ name, filterButton: true })), rows: crmRows });
      [34, 17, 22, 28, 28, 28, 14, 18, 20, 12, 14, 20, 28, 23, 21, 12, 13, 18, 14, 34, 28, 34, 38, 38, 38].forEach((width, index) => { crm.getColumn(index + 1).width = width; });
      crm.getRow(4).height = 30;
      crm.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };
      crm.getRow(4).alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      for (let rowNumber = 5; rowNumber <= crm.rowCount; rowNumber += 1) { crm.getRow(rowNumber).height = 42; crm.getRow(rowNumber).alignment = { vertical: "top", wrapText: true }; }
      crm.addConditionalFormatting({ ref: `J5:J${Math.max(5, crm.rowCount)}`, rules: [{ type: "containsText", operator: "containsText", text: "HIGH", priority: 1, style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } }, font: { color: { argb: "FFBE123C" }, bold: true } } }, { type: "containsText", operator: "containsText", text: "MEDIUM", priority: 2, style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }, font: { color: { argb: "FFB45309" }, bold: true } } }] });
      crm.addConditionalFormatting({ ref: `K5:K${Math.max(5, crm.rowCount)}`, rules: [{ type: "containsText", operator: "containsText", text: "APPROVED", priority: 1, style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } }, font: { color: { argb: "FF047857" }, bold: true } } }, { type: "containsText", operator: "containsText", text: "REJECTED", priority: 2, style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } }, font: { color: { argb: "FFBE123C" }, bold: true } } }] });

      const usage = workbook.addWorksheet("Implant Usage", { views: [{ state: "frozen", ySplit: 4, showGridLines: false }] });
      usage.mergeCells("A1:H1"); usage.getCell("A1").value = "IMPLANT USAGE & REPEAT SUMMARY"; usage.getCell("A1").font = { size: 18, bold: true, color: { argb: "FFFFFFFF" } }; usage.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } }; usage.getRow(1).height = 36;
      usage.mergeCells("A2:H2"); usage.getCell("A2").value = "Dokter, rumah sakit tindakan, implant, jenis tindakan, dan jumlah pemakaian ulang"; usage.getCell("A2").font = { size: 10, color: { argb: "FF64748B" } };
      const usageRows = filteredRows.filter((row) => row.usageCount > 0).map((row) => [row.doctor, row.usageHospital || row.hospital, row.implantUsed || row.productOffered, row.procedureType, row.usageCount, Math.max(0, row.usageCount - 1), row.lastUsedAt ? new Date(row.lastUsedAt) : "", row.owner]);
      usage.addTable({ name: "ImplantUsageTable", ref: "A4", headerRow: true, style: { theme: "TableStyleMedium4", showRowStripes: true }, columns: ["Doctor", "Usage Hospital", "Implant", "Procedure", "Total Usage", "Repeat Usage", "Last Used", "Owner"].map((name) => ({ name, filterButton: true })), rows: usageRows });
      [34, 30, 24, 22, 13, 14, 17, 18].forEach((width, index) => { usage.getColumn(index + 1).width = width; }); usage.getColumn(7).numFmt = "yyyy-mm-dd"; usage.getRow(4).height = 28; usage.getRow(4).font = { bold: true, color: { argb: "FFFFFFFF" } };

      const report = workbook.addWorksheet("Dashboard", { properties: { tabColor: { argb: "FF4F46E5" } }, views: [{ showGridLines: false }] });
      report.columns = Array.from({ length: 12 }, () => ({ width: 14 })); report.mergeCells("A1:L2"); report.getCell("A1").value = "CUSTOMER MAPPING DASHBOARD"; report.getCell("A1").font = { size: 24, bold: true, color: { argb: "FFFFFFFF" } }; report.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF172554" } }; report.getCell("A1").alignment = { vertical: "middle", horizontal: "left" };
      const kpis = [["A4:B5", "Total Mapping", filteredRows.length, "FF0F172A"], ["D4:E5", "Status Existing", filteredRows.filter((row) => row.status === "APPROVED").length, "FF059669"], ["G4:H5", "Target Aktif", filteredRows.filter((row) => row.status === "TARGETED").length, "FF2563EB"], ["J4:K5", "Repeat Doctor", filteredRows.filter((row) => row.usageCount >= 2).length, "FF7C3AED"]] as const;
      kpis.forEach(([range, label, value, color]) => { report.mergeCells(range); const cell = report.getCell(range.split(":")[0]); cell.value = `${label}\n${value}`; cell.font = { size: 14, bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } }; cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true }; });
      report.getCell("A8").value = "Journey"; report.getCell("B8").value = "Doctors";
      journeyOrder.forEach((stage, index) => { report.getCell(`A${index + 9}`).value = journeyLabel[stage]; report.getCell(`B${index + 9}`).value = filteredRows.filter((row) => (row.journeyStage || "PROSPECT") === stage).length; });
      report.getCell("D8").value = "Priority"; report.getCell("E8").value = "Doctors";
      (["HIGH", "MEDIUM", "LOW"] as const).forEach((priority, index) => { report.getCell(`D${index + 9}`).value = priority; report.getCell(`E${index + 9}`).value = filteredRows.filter((row) => row.priority === priority).length; });
      ["A8:B13", "D8:E11"].forEach((range) => { const cells = report.getCell(range.split(":")[0]); cells.font = { bold: true, color: { argb: "FFFFFFFF" } }; cells.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } }; });
      report.mergeCells("A15:F15"); report.getCell("A15").value = "JOURNEY VISUAL"; report.getCell("A15").font = { bold: true, color: { argb: "FFFFFFFF" } }; report.getCell("A15").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
      journeyOrder.forEach((stage, index) => { const count = filteredRows.filter((row) => (row.journeyStage || "PROSPECT") === stage).length; const rowNumber = index + 16; report.mergeCells(`A${rowNumber}:B${rowNumber}`); report.getCell(`A${rowNumber}`).value = journeyLabel[stage]; report.getCell(`C${rowNumber}`).value = count; report.mergeCells(`D${rowNumber}:F${rowNumber}`); report.getCell(`D${rowNumber}`).value = count ? "■".repeat(Math.max(1, Math.round((count / Math.max(1, filteredRows.length)) * 18))) : "–"; report.getCell(`D${rowNumber}`).font = { color: { argb: "FF4F46E5" }, bold: true }; });
      report.mergeCells("G15:L15"); report.getCell("G15").value = "PRIORITY VISUAL"; report.getCell("G15").font = { bold: true, color: { argb: "FFFFFFFF" } }; report.getCell("G15").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
      (["HIGH", "MEDIUM", "LOW"] as const).forEach((priority, index) => { const count = filteredRows.filter((row) => row.priority === priority).length; const rowNumber = index + 16; report.mergeCells(`G${rowNumber}:H${rowNumber}`); report.getCell(`G${rowNumber}`).value = priority; report.getCell(`I${rowNumber}`).value = count; report.mergeCells(`J${rowNumber}:L${rowNumber}`); report.getCell(`J${rowNumber}`).value = count ? "■".repeat(Math.max(1, Math.round((count / Math.max(1, filteredRows.length)) * 18))) : "–"; report.getCell(`J${rowNumber}`).font = { color: { argb: priority === "HIGH" ? "FFF43F5E" : priority === "MEDIUM" ? "FFF59E0B" : "FF10B981" }, bold: true }; });
      report.getCell("A24").value = "Workbook Guide"; report.getCell("A24").font = { bold: true, color: { argb: "FF4F46E5" } }; report.mergeCells("A25:L27"); report.getCell("A25").value = "Dashboard: ringkasan dan visual KPI • Doctor CRM: seluruh data dokter dengan filter • Implant Usage: khusus pemakaian pertama dan ulang. Warna merah menandai prioritas tinggi/rejected; hijau menandai status Existing."; report.getCell("A25").alignment = { wrapText: true, vertical: "top" }; report.getCell("A25").font = { size: 10, color: { argb: "FF64748B" } };
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
          ? "Customer menjadi Existing"
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
        monthlyCaseCount: String(row.monthlyCaseCount || ""),
        orthopedicCaseTypes: row.orthopedicCaseTypes || "",
        implantVendors: row.implantVendors || "",
        vendorSupport: row.vendorSupport || "",
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
      APPROVED: "Jadikan Existing",
      REJECTED: "Reject Customer",
    };
    askConfirmation({
      title: labels[nextStatus],
      message: nextStatus === "APPROVED" ? `${row.doctor || row.hospital} akan dipindahkan ke status Existing.` : `${row.doctor || row.hospital} akan diubah menjadi ${statusLabel[nextStatus]}. Perubahan langsung dipost.`,
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
      monthlyCaseCount: String(row.monthlyCaseCount || ""),
      orthopedicCaseTypes: row.orthopedicCaseTypes || "",
      implantVendors: row.implantVendors || "",
      vendorSupport: row.vendorSupport || "",
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

  async function advanceJourney(row: CustomerMappingRow, nextStage: CustomerJourneyStage, entry?: JourneyEntryState) {
    setWorkingId(row.id);
    try {
      const response = await fetch("/api/customer-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "journey",
          id: row.id,
          journeyStage: nextStage,
          owner: entry?.owner || row.owner || owner.trim(),
          productOffered: entry?.productOffered || row.productOffered,
          nextFollowUp: row.nextFollowUp,
          note: entry?.note ?? row.note,
          plan: entry?.plan ?? row.plan,
          outcome: entry?.outcome ?? row.outcome,
          usageHospital: entry?.hospital || row.usageHospital,
          implantUsed: entry?.implantUsed || row.implantUsed,
          procedureType: entry?.procedureType || row.procedureType,
          monthlyCaseCount: entry?.monthlyCaseCount || row.monthlyCaseCount,
          orthopedicCaseTypes: entry?.orthopedicCaseTypes ?? row.orthopedicCaseTypes,
          implantVendors: entry?.implantVendors ?? row.implantVendors,
          vendorSupport: entry?.vendorSupport ?? row.vendorSupport,
          hospital: entry?.hospital1 || row.hospital,
          practiceHospital2: entry?.hospital2 ?? row.practiceHospital2,
          practiceHospital3: entry?.hospital3 ?? row.practiceHospital3,
          by: owner.trim() || row.owner || "Lambang",
        }),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") throw new Error(result.message || "Gagal memperbarui journey");
      setRows((current) => current.map((item) => item.id === row.id ? result.data : item));
      setJourneyEntry(null);
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
    const missing = missingCustomerFields({ ...row, owner: row.owner || owner.trim() })
      .filter((field) => field !== "Owner / Sales PIC");
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
        monthlyCaseCount: String(row.monthlyCaseCount || ""),
        orthopedicCaseTypes: row.orthopedicCaseTypes || "",
        implantVendors: row.implantVendors || "",
        vendorSupport: row.vendorSupport || "",
      });
      setFormNotice(missing);
      setResumeJourney(nextStage);
      toast.info(`Lengkapi ${missing.join(", ")} untuk melanjutkan journey`);
      return;
    }
    setJourneyEntry({
      row,
      nextStage,
      owner: row.owner || owner.trim(),
      productOffered: row.productOffered || "",
      hospital: row.usageHospital || row.hospital || row.practiceHospital2 || row.practiceHospital3 || "",
      implantUsed: row.implantUsed || row.productOffered || "",
      procedureType: row.procedureType || "",
      note: row.note || "",
      plan: row.plan || "",
      outcome: row.outcome || "",
      monthlyCaseCount: String(row.monthlyCaseCount || ""),
      orthopedicCaseTypes: row.orthopedicCaseTypes || "",
      implantVendors: row.implantVendors || "",
      vendorSupport: row.vendorSupport || "",
      hospital1: row.hospital || "",
      hospital2: row.practiceHospital2 || "",
      hospital3: row.practiceHospital3 || "",
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
      <div className="mx-auto max-w-[1800px] space-y-4 px-3 py-3 sm:space-y-6 sm:px-4 sm:py-6 md:px-8">
        <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-950 via-blue-950 to-indigo-900 p-4 text-white shadow-xl sm:rounded-3xl sm:p-6 md:p-8">
          <motion.div aria-hidden className="absolute -right-20 -top-24 size-72 rounded-full bg-blue-400/15 blur-3xl" animate={{ scale: [1, 1.15, 1], x: [0, -16, 0] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
          <motion.div aria-hidden className="absolute -bottom-24 left-1/3 size-64 rounded-full bg-violet-400/10 blur-3xl" animate={{ scale: [1.1, 0.9, 1.1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3 sm:space-y-4">
              <Link
                href="/stock"
                className="inline-flex items-center gap-2 text-xs text-blue-100 transition hover:text-white sm:text-sm"
              >
                <ArrowLeft size={16} /> Buka Stock Management
              </Link>
              <div>
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-blue-100 ring-1 ring-white/15">
                  <Target size={14} /> User acquisition workspace
                </div>
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                  User Orthopedic Mapping 
                </h1>
                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-300 sm:text-sm sm:leading-6 md:text-base">
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

        <section className="flex snap-x gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible xl:grid-cols-5">
          <SummaryCard icon={Users} label="Total mapping" value={summary.total} detail="Seluruh dokter dalam database" tone="slate" index={0} />
          <SummaryCard icon={Building2} label="Existing customer" value={summary.existing} detail="Dokter yang sudah pernah menggunakan produk kita" tone="violet" index={1} />
          <SummaryCard icon={UserCheck} label="Target aktif" value={summary.targeted} detail="Sedang dalam proses pendekatan" tone="blue" index={2} />
          <SummaryCard icon={CheckCircle2} label="Status Existing" value={summary.approved} detail="Customer yang sudah dipindahkan ke status Existing" tone="emerald" index={3} />
          <SummaryCard icon={Clock3} label="Perlu dilengkapi" value={summary.incomplete} detail="Butuh owner, plan, atau data utama" tone="amber" index={4} />
        </section>

        <button type="button" onClick={() => setShowMobileInsights((current) => !current)} className="flex w-full items-center justify-between rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-left shadow-sm md:hidden"><span><span className="block text-sm font-semibold text-slate-800">Dashboard & Analitik</span><span className="text-[10px] text-slate-400">Grafik journey dan pemakaian implant</span></span><span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-semibold text-indigo-700">{showMobileInsights ? "Tutup" : "Lihat"}</span></button>

        {showMobileInsights || isDesktopViewport ? <div className="space-y-4 md:space-y-6"><DashboardPanel
          total={summary.total}
          statuses={dashboard.statuses}
          journeys={dashboard.journeys}
          priorities={dashboard.priorities}
          territories={dashboard.territories}
          customerKinds={dashboard.customerKinds}
          repeatUsers={dashboard.repeatUsers}
        />

        <UsageAnalyticsPanel rows={rows} />
        </div> : null}

        <ExistingCustomerPanel
          rows={existingCustomers}
          onSelect={openDoctorProfile}
        />

        <GroupedPotentialCustomerPanel
          items={potentialCustomers}
          selectedId={selectedDoctor?.id || ""}
          onSelect={openDoctorProfile}
          onAdvance={requestJourney}
        />

        <section className="space-y-4">
          <EngagementProductFilter rows={rows} value={engagementFilter} onChange={setEngagementFilter} />
          <div className="hidden min-w-0 lg:block"><JourneyWorkspace
            rows={engagementRows}
            onSelect={openDoctorProfile}
            onAdvance={requestJourney}
          /></div>
          <MobileJourneyOverview rows={engagementRows} onSelect={openDoctorProfile} onAdvance={requestJourney} />
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
                  onSelect={() => openDoctorProfile(row.id)}
                />
              ))}
            </div>
          ) : filteredRows.length ? (
            <CustomerTable rows={filteredRows} onSelect={openDoctorProfile} onEdit={openEditForm} />
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
      {profileOpen && selectedDoctor ? <DoctorProfileModal doctor={selectedDoctor} onClose={() => setProfileOpen(false)} onEdit={(row) => { setProfileOpen(false); openEditForm(row); }} /> : null}
      {journeyEntry ? <JourneyEntryModal value={journeyEntry} busy={workingId === journeyEntry.row.id} onChange={setJourneyEntry} onCancel={() => setJourneyEntry(null)} onConfirm={() => void advanceJourney(journeyEntry.row, journeyEntry.nextStage, journeyEntry)} /> : null}
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

export default function CustomerMappingPage() {
  return (
    <CustomerMappingAccessGate>
      <CustomerMappingDashboard />
    </CustomerMappingAccessGate>
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
    <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.4 }} whileHover={{ y: -4, boxShadow: "0 16px 35px rgba(15,23,42,0.10)" }} className="flex min-h-20 min-w-[190px] snap-start items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:min-h-28 sm:min-w-0 sm:gap-4 sm:p-4">
      <motion.div whileHover={{ rotate: 6, scale: 1.08 }} className={`rounded-xl p-3 ${tones[tone]}`}><Icon size={21} /></motion.div>
      <div className="min-w-0"><p className="text-[11px] font-medium text-slate-500 sm:text-xs">{label}</p><p className="text-xl font-semibold tracking-tight sm:text-2xl">{value}</p><p className="mt-1 hidden line-clamp-2 text-[10px] leading-4 text-slate-400 sm:block">{detail}</p></div>
    </motion.article>
  );
}

function ExistingCustomerPanel({ rows, onSelect }: { rows: CustomerMappingRow[]; onSelect: (id: string) => void }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><UserCheck size={19} /></span><div><h2 className="font-semibold">Existing Customer</h2><p className="text-xs text-slate-500">Customer berstatus Existing atau sudah pernah menggunakan produk kita</p></div></div><div className="flex gap-2"><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{rows.length} customer</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{rows.reduce((sum, row) => sum + (row.usageCount || 0), 0)} pemakaian</span></div></div>
      {rows.length ? <><div className="grid gap-3 p-4 md:hidden">{rows.map((row) => <button key={row.id} type="button" onClick={() => onSelect(row.id)} className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 text-left"><div className="size-12 shrink-0 overflow-hidden rounded-xl bg-indigo-100">{row.photoUrl || row.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(row.photoUrl, row.photoFileId)} name={row.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center font-bold text-indigo-600">{row.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}</div><div className="min-w-0 flex-1"><p className="line-clamp-1 text-sm font-semibold text-slate-800">{row.doctor}</p><p className="line-clamp-1 text-[11px] text-slate-500">{row.usageHospital || row.hospital}</p><p className="mt-1 text-[10px] font-semibold text-emerald-700">{row.implantUsed || row.productOffered || "Produk belum dicatat"} · {row.usageCount}x</p></div></button>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left text-xs"><thead className="bg-emerald-950 text-white"><tr>{["Dokter", "Rumah Sakit", "Produk Digunakan", "Tindakan", "Total", "Pemakaian Ulang", "Terakhir Digunakan"].map((label) => <th key={label} className="px-4 py-3 font-semibold">{label}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id} onClick={() => onSelect(row.id)} className="cursor-pointer hover:bg-emerald-50/60"><td className="px-4 py-3"><div className="flex items-center gap-2.5"><div className="size-9 shrink-0 overflow-hidden rounded-xl bg-indigo-100">{row.photoUrl || row.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(row.photoUrl, row.photoFileId)} name={row.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center font-bold text-indigo-600">{row.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}</div><span className="max-w-60 font-semibold text-slate-800">{row.doctor}</span></div></td><td className="max-w-52 px-4 py-3 text-slate-600">{row.usageHospital || row.hospital || "-"}</td><td className="px-4 py-3 font-semibold text-indigo-700">{row.implantUsed || row.productOffered || "-"}</td><td className="px-4 py-3 text-slate-600">{row.procedureType || "-"}</td><td className="px-4 py-3"><span className="rounded-full bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">{row.usageCount}x</span></td><td className="px-4 py-3 font-semibold text-slate-700">{Math.max(0, row.usageCount - 1)}x</td><td className="px-4 py-3 text-slate-500">{row.lastUsedAt ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(row.lastUsedAt)) : "-"}</td></tr>)}</tbody></table></div></> : <div className="p-8 text-center text-sm text-slate-400">Belum ada dokter yang tercatat menggunakan produk kita.</div>}
    </section>
  );
}

function GroupedPotentialCustomerPanel({ items, selectedId, onSelect, onAdvance }: { items: Array<{ row: CustomerMappingRow; score: number }>; selectedId: string; onSelect: (id: string) => void; onAdvance: (row: CustomerMappingRow) => void }) {
  const [expanded, setExpanded] = useState<Record<"HIGH" | "MEDIUM" | "LOW", boolean>>({ HIGH: false, MEDIUM: false, LOW: false });
  const groups = (["HIGH", "MEDIUM", "LOW"] as const).map((priority) => ({
    priority,
    items: items.filter(({ row }) => row.priority === priority),
  }));
  const groupTone = {
    HIGH: "border-rose-200 bg-rose-50/50 text-rose-700",
    MEDIUM: "border-amber-200 bg-amber-50/50 text-amber-700",
    LOW: "border-emerald-200 bg-emerald-50/50 text-emerald-700",
  };
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Target size={19} /></span><div><h2 className="font-semibold">Potential Customer Plan</h2><p className="text-xs text-slate-500">Dikelompokkan berdasarkan priority; satu profil utama ditampilkan pada setiap kelompok</p></div></div>
        <span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{items.length} potential</span>
      </div>
      <div className="grid gap-4 p-4 xl:grid-cols-3">
        {groups.map(({ priority, items: groupItems }) => {
          const featured = groupItems[0];
          const isOpen = expanded[priority];
          return (
            <article key={priority} className={`overflow-hidden rounded-2xl border ${groupTone[priority]}`}>
              <div className="flex items-center justify-between border-b border-current/10 px-4 py-3">
                <div><p className="text-xs font-bold">{priority} POTENTIAL</p><p className="text-[10px] opacity-70">{groupItems.length} customer</p></div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold shadow-sm">{groupItems.length}</span>
              </div>
              {featured ? <div className="p-3"><PotentialProfileCard item={featured} selected={selectedId === featured.row.id} onSelect={onSelect} onAdvance={onAdvance} compact />
                <button type="button" onClick={() => setExpanded((current) => ({ ...current, [priority]: !current[priority] }))} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-white text-xs font-semibold shadow-sm ring-1 ring-black/5">
                  {isOpen ? "Tutup data lengkap" : `Lihat semua ${groupItems.length} customer`}<span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>⌄</span>
                </button>
                {isOpen ? <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 max-h-[680px] space-y-3 overflow-y-auto pr-1">
                  {groupItems.map((item) => <PotentialProfileCard key={item.row.id} item={item} selected={selectedId === item.row.id} onSelect={onSelect} onAdvance={onAdvance} />)}
                </motion.div> : null}
              </div> : <div className="p-6 text-center text-xs opacity-60">Belum ada customer pada kelompok ini.</div>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function PotentialProfileCard({ item, selected, onSelect, onAdvance, compact = false }: { item: { row: CustomerMappingRow; score: number }; selected: boolean; onSelect: (id: string) => void; onAdvance: (row: CustomerMappingRow) => void; compact?: boolean }) {
  const { row, score } = item;
  const stage = row.journeyStage || "PROSPECT";
  const hospitals = [row.hospital, row.practiceHospital2, row.practiceHospital3].filter(Boolean);
  return (
    <div className={`rounded-2xl border bg-white p-3 text-slate-700 transition ${selected ? "border-indigo-300 ring-1 ring-indigo-100" : "border-slate-200"}`}>
      <button type="button" onClick={() => onSelect(row.id)} className="w-full text-left">
        <div className="flex items-start gap-3"><div className="size-11 shrink-0 overflow-hidden rounded-xl bg-indigo-100">{row.photoUrl || row.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(row.photoUrl, row.photoFileId)} name={row.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center font-bold text-indigo-600">{row.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}</div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{row.doctor}</p><p className="line-clamp-1 text-[10px] text-slate-400">{row.hospital || "Rumah sakit belum diisi"}</p></div><span className="rounded-full bg-slate-950 px-2 py-1 text-[9px] font-bold text-white">{score}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-amber-50 p-2"><p className="text-[9px] text-amber-600">Case / bulan</p><p className="text-lg font-bold text-amber-800">{row.monthlyCaseCount || 0}</p></div><div className="rounded-xl bg-indigo-50 p-2"><p className="text-[9px] text-indigo-500">Vendor</p><p className="line-clamp-1 text-xs font-semibold text-indigo-800">{row.implantVendors || "Belum diketahui"}</p></div></div>
        {!compact ? <div className="mt-3 space-y-2 text-[10px] leading-4"><p><strong>Jenis case:</strong> {row.orthopedicCaseTypes || "Belum dipetakan"}</p><p><strong>Support vendor:</strong> {row.vendorSupport || "Belum diketahui"}</p><p><strong>Rumah sakit:</strong> {hospitals.join(", ") || "Belum diisi"}</p><p><strong>Planning:</strong> {row.plan || "Belum ada planning"}</p><p><strong>Tahap:</strong> {journeyLabel[stage]}</p></div> : <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{row.orthopedicCaseTypes || row.plan || "Data potensi belum lengkap"}</p>}
      </button>
      {!compact ? <button type="button" onClick={() => onAdvance(row)} className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-[11px] font-semibold text-white hover:bg-amber-400"><Target size={13} />{stage === "PROSPECT" ? "Targetkan Dokter" : "Lanjutkan Pendekatan"}</button> : null}
    </div>
  );
}

// Legacy layout retained temporarily for easy visual comparison during the UI migration.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PotentialCustomerPanel({ items, selectedId, onSelect, onAdvance }: { items: Array<{ row: CustomerMappingRow; score: number }>; selectedId: string; onSelect: (id: string) => void; onAdvance: (row: CustomerMappingRow) => void }) {
  const visible = items.slice(0, 12);
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="rounded-xl bg-amber-50 p-2.5 text-amber-700"><Target size={19} /></span><div><h2 className="font-semibold">Potential Customer Plan</h2><p className="text-xs text-slate-500">Dokter yang belum menggunakan produk, diurutkan berdasarkan potensi untuk dibidik</p></div></div><span className="w-fit rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{items.length} potential</span></div>
      {visible.length ? <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map(({ row, score }, index) => { const stage = row.journeyStage || "PROSPECT"; return <article key={row.id} className={`rounded-2xl border p-4 transition ${selectedId === row.id ? "border-amber-300 bg-amber-50/70 ring-1 ring-amber-100" : "border-slate-200 bg-slate-50/60 hover:border-amber-200 hover:bg-white hover:shadow-sm"}`}><button type="button" onClick={() => onSelect(row.id)} className="w-full text-left"><div className="flex items-start gap-3"><div className="size-11 shrink-0 overflow-hidden rounded-xl bg-indigo-100">{row.photoUrl || row.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(row.photoUrl, row.photoFileId)} name={row.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center font-bold text-indigo-600">{row.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{row.doctor}</p><span className="shrink-0 rounded-full bg-slate-950 px-2 py-1 text-[9px] font-bold text-white">#{index + 1}</span></div><p className="line-clamp-1 text-[10px] text-slate-400">{row.hospital || "Rumah sakit belum diisi"}</p></div></div><div className="mt-3 flex items-center justify-between gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${priorityBadgeStyle[row.priority]}`}>{row.priority}</span><span className="text-[10px] font-semibold text-amber-700">Potential score {score}</span></div><div className="mt-3 grid grid-cols-2 gap-2"><div className="rounded-xl bg-amber-50 p-2"><p className="text-[9px] text-amber-600">Case / bulan</p><p className="text-lg font-bold text-amber-800">{row.monthlyCaseCount || 0}</p></div><div className="rounded-xl bg-indigo-50 p-2"><p className="text-[9px] text-indigo-500">Vendor sekarang</p><p className="line-clamp-1 text-xs font-semibold text-indigo-800">{row.implantVendors || "Belum diketahui"}</p></div></div><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{row.orthopedicCaseTypes || "Jenis case belum dipetakan"}</p><p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-slate-500">{row.plan || row.note || "Belum ada planning. Lengkapi rencana pendekatan dokter ini."}</p><div className="mt-3 rounded-xl bg-white p-2.5 ring-1 ring-slate-100"><p className="text-[9px] uppercase tracking-wider text-slate-400">Langkah berikutnya</p><p className="mt-0.5 text-xs font-semibold text-indigo-700">{stage === "REPEAT_USE" ? "Pertahankan customer" : journeyLabel[journeyOrder[Math.min(journeyOrder.indexOf(stage) + 1, journeyOrder.length - 1)]]}</p></div></button><button type="button" onClick={() => onAdvance(row)} className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-xs font-semibold text-white hover:bg-amber-400"><Target size={14} />{stage === "PROSPECT" ? "Targetkan Dokter" : "Lanjutkan Pendekatan"}</button></article>; })}</div> : <div className="p-8 text-center text-sm text-slate-400">Tidak ada potential customer aktif.</div>}
      {items.length > visible.length ? <p className="border-t border-slate-100 px-5 py-3 text-center text-[11px] text-slate-400">Menampilkan 12 potential customer teratas dari {items.length} dokter.</p> : null}
    </section>
  );
}

function EngagementProductFilter({ rows, value, onChange }: { rows: CustomerMappingRow[]; value: UsageProductFilter; onChange: (value: UsageProductFilter) => void }) {
  const options: Array<{ value: UsageProductFilter; label: string; description: string }> = [
    { value: "ALL", label: "Semua Dokter", description: "Seluruh journey" },
    { value: "USERS", label: "Sudah Menggunakan", description: "Zimmer atau Normmed" },
    { value: "ZIMMER", label: "Zimmer", description: "Pengguna Zimmer" },
    { value: "NORMMED", label: "Normmed", description: "Pengguna Normmed" },
    { value: "BOTH", label: "Keduanya", description: "Zimmer + Normmed" },
  ];
  return (
    <div className="rounded-3xl border border-indigo-100 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><Package size={17} /></span>
        <div><h2 className="text-sm font-semibold text-slate-800">Filter Doctor Engagement</h2><p className="text-[10px] text-slate-400">Tampilkan dokter berdasarkan produk yang pernah digunakan.</p></div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
        {options.map((option) => {
          const count = rows.filter((row) => matchesUsageProductFilter(row, option.value)).length;
          const active = value === option.value;
          return (
            <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`min-w-fit rounded-2xl px-3 py-2.5 text-left transition sm:min-w-32 ${active ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-indigo-50 hover:text-indigo-700"}`}>
              <span className="flex items-center justify-between gap-3"><span className="text-[11px] font-semibold">{option.label}</span><strong className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-white/15 text-white" : "bg-white text-slate-700"}`}>{count}</strong></span>
              <span className={`mt-0.5 block text-[9px] ${active ? "text-indigo-100" : "text-slate-400"}`}>{option.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function JourneyWorkspace({ rows, onSelect, onAdvance }: { rows: CustomerMappingRow[]; onSelect: (id: string) => void; onAdvance: (row: CustomerMappingRow) => void }) {
  const visibleRows = rows;
  return (
    <article className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between"><div><h2 className="text-base font-semibold">Doctor Engagement</h2><p className="text-[11px] text-slate-500">Filter dokter berdasarkan produk yang benar-benar sudah digunakan.</p></div><span className="w-fit shrink-0 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-semibold text-white">{visibleRows.length} Doctors</span></div>
      <div>
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {journeyOrder.map((stage, index) => {
            const doctors = visibleRows.filter((row) => (row.journeyStage || "PROSPECT") === stage);
            return (
              <section key={stage} className="flex min-h-[340px] min-w-0 flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-2.5">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-[11px] font-bold text-indigo-700">0{index + 1}</span>
                  <div className="min-w-0"><h3 className="truncate text-sm font-semibold">{journeyLabel[stage]}</h3><p className="text-[11px] text-slate-400">{doctors.length} dokter</p></div>
                </div>
                <div className="max-h-[930px] flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:#cbd5e1_transparent] [scrollbar-width:thin]">
                  {doctors.length ? doctors.map((doctor) => (
                    <div key={doctor.id} className="min-h-[174px] rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-indigo-200 hover:shadow-md">
                      <button type="button" onClick={() => onSelect(doctor.id)} className="w-full text-left">
                        <div className="flex items-start gap-2.5"><div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-indigo-100">{doctor.photoUrl || doctor.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(doctor.photoUrl, doctor.photoFileId)} name={doctor.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-sm font-bold text-indigo-600">{doctor.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-[13px] font-semibold leading-5 text-slate-800">{doctor.doctor || "Dokter belum diisi"}</p><span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ring-1 ${priorityBadgeStyle[doctor.priority]}`}>{doctor.priority}</span></div><p className="mt-0.5 line-clamp-1 text-[10px] text-slate-400">{doctor.hospital || "Hospital belum diisi"}</p></div></div>
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
                <div className="mt-3 rounded-xl bg-white p-2 text-center"><p className="text-lg font-semibold text-slate-800">{doctors.length}</p><p className="text-[8px] uppercase tracking-wider text-slate-400">{doctors.length > 5 ? "5 terlihat · scroll untuk lainnya" : "Total tahap"}</p></div>
              </section>
            );
          })}
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3"><JourneyStat label="Repeat usage rate" value={`${visibleRows.length ? Math.round((visibleRows.filter((row) => row.journeyStage === "REPEAT_USE").length / visibleRows.length) * 100) : 0}%`} tone="emerald" /><JourneyStat label="Sudah ditawarkan" value={`${visibleRows.filter((row) => journeyOrder.indexOf(row.journeyStage || "PROSPECT") >= 2).length}`} tone="indigo" /><JourneyStat label="Total penggunaan" value={`${visibleRows.reduce((sum, row) => sum + (row.usageCount || 0), 0)}x`} tone="slate" /></div>
    </article>
  );
}

function MobileJourneyOverview({ rows, onSelect, onAdvance }: { rows: CustomerMappingRow[]; onSelect: (id: string) => void; onAdvance: (row: CustomerMappingRow) => void }) {
  return <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:hidden"><div className="mb-3"><h2 className="text-lg font-semibold">Ringkasan Journey</h2><p className="text-[10px] text-slate-400">Profile dan aksi tersedia seperti desktop</p></div><div className="space-y-2">{journeyOrder.map((stage, index) => { const doctors = rows.filter((row) => (row.journeyStage || "PROSPECT") === stage); return <div key={stage} className="rounded-2xl bg-slate-50 p-3"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-indigo-100 text-[10px] font-bold text-indigo-700">0{index + 1}</span><span className="text-xs font-semibold">{journeyLabel[stage]}</span></div><span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-600">{doctors.length}</span></div>{doctors.length ? <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{doctors.map((doctor) => <article key={doctor.id} className="min-w-52 rounded-xl border border-slate-200 bg-white p-2.5"><button type="button" onClick={() => onSelect(doctor.id)} className="flex w-full items-center gap-2 text-left"><div className="size-10 shrink-0 overflow-hidden rounded-xl bg-indigo-100">{doctor.photoUrl || doctor.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(doctor.photoUrl, doctor.photoFileId)} name={doctor.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-sm font-bold text-indigo-600">{doctor.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}</div><div className="min-w-0"><p className="line-clamp-1 text-[10px] font-semibold text-slate-700">{doctor.doctor}</p><p className="line-clamp-1 text-[9px] text-slate-400">{doctor.hospital || "Hospital belum diisi"}</p><p className="mt-0.5 text-[9px] font-medium text-indigo-600">Ulang {Math.max(0, doctor.usageCount - 1)}x</p></div></button><button type="button" onClick={() => onAdvance(doctor)} className={`mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[9px] font-semibold ${stage === "REPEAT_USE" ? "bg-emerald-50 text-emerald-700" : "bg-indigo-50 text-indigo-700"}`}>{stage === "REPEAT_USE" ? <Repeat2 size={10} /> : <span>→</span>}{stage === "REPEAT_USE" ? "Catat Pakai Lagi" : `Ke ${journeyLabel[journeyOrder[index + 1]]}`}</button></article>)}</div> : null}</div>; })}</div></section>;
}

function JourneyStat({ label, value, tone }: { label: string; value: string; tone: "emerald" | "indigo" | "slate" }) {
  const tones = { emerald: "bg-emerald-50 text-emerald-700", indigo: "bg-indigo-50 text-indigo-700", slate: "bg-slate-950 text-white" };
  return <div className={`rounded-xl px-3 py-2 ${tones[tone]}`}><p className="text-[9px] opacity-70">{label}</p><p className="text-lg font-semibold">{value}</p></div>;
}

function DoctorProfileModal({ doctor, onClose, onEdit }: { doctor: CustomerMappingRow; onClose: () => void; onEdit: (row: CustomerMappingRow) => void }) {
  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") onClose(); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-md sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><motion.div initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 27 }} role="dialog" aria-modal="true" aria-label={`Profile ${doctor.doctor}`} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-4xl bg-slate-50 p-2 shadow-2xl sm:p-3"><div className="flex items-center justify-between px-3 py-2 sm:px-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Doctor Profile</p><p className="text-xs text-slate-400">Informasi customer dan aktivitas journey</p></div><button type="button" onClick={onClose} className="rounded-full bg-white p-2.5 text-slate-500 shadow-sm ring-1 ring-slate-200 hover:text-slate-900"><X size={17} /></button></div><DoctorProfilePanel doctor={doctor} onEdit={onEdit} /></motion.div></motion.div>;
}

function DoctorProfilePanel({ doctor, onEdit }: { doctor: CustomerMappingRow | null; onEdit: (row: CustomerMappingRow) => void }) {
  if (!doctor) return <aside className="flex min-h-40 items-center justify-center rounded-3xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">Pilih dokter untuk melihat profil.</aside>;
  const hospitals = [doctor.hospital, doctor.practiceHospital2, doctor.practiceHospital3].filter(Boolean);
  return (
    <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="grid gap-4 sm:grid-cols-[170px_minmax(0,1fr)] lg:grid-cols-[190px_minmax(0,1fr)]">
      <div className="relative h-48 overflow-hidden rounded-2xl bg-linear-to-br from-slate-200 via-indigo-100 to-blue-200 sm:h-full sm:min-h-52">
        {doctor.photoUrl || doctor.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(doctor.photoUrl, doctor.photoFileId)} name={doctor.doctor} className="absolute inset-0 size-full object-cover object-center" /> : <div className="absolute inset-0 flex items-center justify-center text-7xl font-semibold text-indigo-700/70">{doctor.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-slate-950/65 to-transparent" />
        <span className={`absolute left-3 top-3 rounded-full px-2 py-1 text-[9px] font-bold ring-1 ${priorityBadgeStyle[doctor.priority]}`}>{doctor.priority}</span>
          <span className={`absolute bottom-3 left-3 rounded-full px-2 py-1 text-[9px] font-semibold ring-1 ${statusStyle[doctor.status]}`}>{statusLabel[doctor.status]}</span>
      </div>
      <div className="min-w-0 p-1 sm:p-2">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-indigo-500">Selected doctor profile</p><h2 className="mt-1 text-lg font-semibold leading-snug text-slate-900 sm:text-xl">{doctor.doctor || "Nama dokter belum diisi"}</h2><p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-indigo-600"><Stethoscope size={13} /> {doctor.specialty || "Spesialisasi belum diisi"}</p></div><button type="button" onClick={() => onEdit(doctor)} className="shrink-0 rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50" title="Edit profil dan foto"><Pencil size={15} /></button></div>
        <p className="mt-3 line-clamp-2 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">{doctor.note || doctor.plan || "Belum ada catatan atau rencana pendekatan."}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
          <ProfileLine icon={Phone} label="Nomor HP" value={doctor.phone || "Belum diisi"} />
          <ProfileLine icon={MapPin} label="Territory" value={doctor.territory || "Belum diisi"} />
          <ProfileLine icon={UserCheck} label="Owner / Sales" value={doctor.owner || "Belum diisi"} />
          <ProfileLine icon={Package} label="Produk" value={doctor.productOffered || "Belum ditawarkan"} />
          <ProfileLine icon={Repeat2} label="Total / Ulang" value={`${doctor.usageCount || 0}x / ${Math.max(0, (doctor.usageCount || 0) - 1)}x`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{hospitals.length ? hospitals.map((hospital, index) => <span key={`${hospital}-${index}`} className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1.5 text-[10px] font-medium text-indigo-700"><Building2 size={11} />{hospital}</span>) : <span className="text-xs text-slate-400">Belum ada rumah sakit praktik</span>}</div>
      </div>
      </div>
    </aside>
  );
}

function ProfileLine({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: string }) {
  return <div className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-100 px-2 py-2"><span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600"><Icon size={13} /></span><div className="min-w-0"><p className="text-[9px] text-slate-400">{label}</p><p className="truncate text-[11px] font-medium text-slate-700">{value}</p></div></div>;
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

function DashboardPanel({ total, statuses, journeys, priorities, territories, customerKinds, repeatUsers }: { total: number; statuses: Array<{ name: CustomerStatus; value: number }>; journeys: Array<{ name: CustomerJourneyStage; value: number }>; priorities: Array<{ name: "HIGH" | "MEDIUM" | "LOW"; value: number }>; territories: Array<[string, number]>; customerKinds: Array<{ name: "EXISTING" | "TARGET"; value: number }>; repeatUsers: number }) {
  const chartsReady = useSyncExternalStore(() => () => {}, () => true, () => false);
  const approved = statuses.find((item) => item.name === "APPROVED")?.value || 0;
  const conversion = total ? Math.round((approved / total) * 100) : 0;
  const journeyChart = journeys.map((item) => ({ name: journeyLabel[item.name], value: item.value }));
  const priorityColors = { HIGH: "#f43f5e", MEDIUM: "#f59e0b", LOW: "#10b981" };
  return (
    <motion.section initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }} className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
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
      <DashboardBlock title="Existing vs Target User" description="Perbandingan customer yang sudah ada dan target baru" icon={Users}>
        <div className="grid items-center gap-2 sm:grid-cols-[1fr_140px]">
          <div className="h-52 min-w-0">{chartsReady ? <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}><PieChart><Pie data={customerKinds} dataKey="value" nameKey="name" innerRadius={46} outerRadius={78} paddingAngle={5} animationDuration={900}>{customerKinds.map((item) => <Cell key={item.name} fill={item.name === "EXISTING" ? "#7c3aed" : "#2563eb"} />)}</Pie><Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} formatter={(value) => [`${value} dokter`, "Jumlah"]} /></PieChart></ResponsiveContainer> : <ChartSkeleton round />}</div>
          <div className="space-y-2">{customerKinds.map((item) => <motion.div whileHover={{ x: 4 }} key={item.name} className="rounded-xl bg-slate-50 px-3 py-2.5"><div className="flex items-center justify-between gap-2"><span className={`size-2 rounded-full ${item.name === "EXISTING" ? "bg-violet-600" : "bg-blue-600"}`} /><strong className="text-lg">{item.value}</strong></div><p className="mt-1 text-[10px] font-semibold text-slate-500">{item.name === "EXISTING" ? "Existing Customer" : "Target Customer"}</p><p className="text-[9px] text-slate-400">{total ? Math.round((item.value / total) * 100) : 0}% total</p></motion.div>)}</div>
        </div>
        <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold text-violet-700">Repeat User ≥ 2x</span><strong className="text-lg text-violet-700">{repeatUsers}</strong></div><p className="mt-1 text-[9px] leading-4 text-violet-500">Existing berasal dari mapping awal; Repeat User dihitung dari pemakaian nyata.</p></div>
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
        <div className="mb-4 rounded-2xl bg-linear-to-br from-emerald-600 to-teal-600 p-4 text-white"><p className="text-xs text-emerald-100">Existing status rate</p><div className="mt-1 flex items-end justify-between gap-3"><p className="text-3xl font-semibold">{conversion}%</p><p className="text-right text-[10px] leading-4 text-emerald-100">{approved} dari {total} dokter<br />berstatus Existing</p></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/20"><motion.div initial={{ width: 0 }} animate={{ width: `${conversion}%` }} transition={{ duration: 0.9, delay: 0.25 }} className="h-full rounded-full bg-white" /></div></div>
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
          {option === "ALL" ? "Semua" : statusLabel[option as CustomerStatus] || option}
        </button>
      ))}
    </div>
  );
}

function CustomerCard({ row, busy, onDecision, onEdit, onDelete, onJourney, onSelect }: { row: CustomerMappingRow; busy: boolean; onDecision: (row: CustomerMappingRow, status: CustomerStatus) => void; onEdit: (row: CustomerMappingRow) => void; onDelete: (row: CustomerMappingRow) => void; onJourney: (row: CustomerMappingRow) => void; onSelect: () => void }) {
  const stage = row.journeyStage || "PROSPECT";
  return (
    <article onClick={(event) => { if (!(event.target as HTMLElement).closest("button")) onSelect(); }} className="flex min-h-72 cursor-pointer flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${priorityBadgeStyle[row.priority]}`}>
          <span className={`size-2 rounded-full ${priorityStyle[row.priority]}`} />
          {row.priority} PRIORITY
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${statusStyle[row.status]}`}>{statusLabel[row.status]}</span>
      </div>
      <div className="mt-4 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{row.customerType} • {row.territory || "No territory"}</p>
        <div className="mt-3 flex items-center gap-3"><div className="size-12 shrink-0 overflow-hidden rounded-xl bg-indigo-100">{row.photoUrl || row.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(row.photoUrl, row.photoFileId)} name={row.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-base font-bold text-indigo-600">{row.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}</div><h3 className="text-base font-semibold leading-snug">{row.doctor || "Dokter belum ditentukan"}</h3></div>
        <p className="mt-1 flex items-start gap-2 text-sm text-slate-600"><Building2 className="mt-0.5 shrink-0" size={15} /> {row.hospital || "Rumah sakit belum ditentukan"}</p>
        {row.note ? <p className="mt-3 line-clamp-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">{row.note}</p> : null}
        {row.owner ? <p className="mt-3 text-xs font-medium text-blue-700">Owner: {row.owner}</p> : null}
        <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3">
          <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-500">Riwayat</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-indigo-700">{journeyLabel[stage]}</span></div>
          {row.productOffered ? <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-700"><Package size={13} /> {row.productOffered}</p> : <p className="mt-2 text-xs text-amber-700">Produk belum ditentukan</p>}
          {row.usageCount ? <div className="mt-2 grid grid-cols-2 gap-2 text-center"><p className="rounded-lg bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-600">Total {row.usageCount}x</p><p className="rounded-lg bg-emerald-100 px-2 py-1.5 text-[10px] font-semibold text-emerald-700">Ulang {Math.max(0, row.usageCount - 1)}x</p></div> : null}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <button type="button" disabled={busy} onClick={() => onJourney(row)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">{stage === "REPEAT_USE" ? <Repeat2 size={14} /> : <Target size={14} />}{stage === "REPEAT_USE" ? "Catat Pemakaian Lagi" : `Lanjut: ${journeyLabel[journeyOrder[Math.min(journeyOrder.indexOf(stage) + 1, journeyOrder.length - 1)]]}`}</button>
        <button type="button" disabled={busy} onClick={() => onEdit(row)} className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-2.5 text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50" title="Edit customer"><Pencil size={15} /></button>
        <button type="button" disabled={busy} onClick={() => onDecision(row, "TARGETED")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50"><Target size={14} /> Targetkan</button>
        <button type="button" disabled={busy || row.status === "APPROVED"} title="Pindahkan customer ke status Existing" onClick={() => onDecision(row, "APPROVED")} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:bg-emerald-100 disabled:text-emerald-700 disabled:opacity-100"><CheckCircle2 size={14} /> {row.status === "APPROVED" ? "Existing" : "Jadikan Existing"}</button>
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
              <td className="max-w-64 px-4 py-3 font-semibold text-slate-800">
                <div className="flex min-w-44 items-center gap-2.5">
                  <div className="size-9 shrink-0 overflow-hidden rounded-xl bg-indigo-100 ring-1 ring-indigo-100">
                    {row.photoUrl || row.photoFileId ? <DoctorPhotoImage src={doctorPhotoSrc(row.photoUrl, row.photoFileId)} name={row.doctor} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center font-bold text-indigo-600">{row.doctor?.replace(/^(dr\.?|Dr\.?)\s*/i, "").charAt(0) || "D"}</div>}
                  </div>
                  <span className="line-clamp-2">{row.doctor || "-"}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600">{row.specialty || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{row.phone || "-"}</td>
              <td className="max-w-56 px-4 py-3 text-slate-600">{row.hospital || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{row.owner || "-"}</td>
              <td className="px-4 py-3 text-slate-600">{row.productOffered || "-"}</td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-semibold ring-1 ${priorityBadgeStyle[row.priority]}`}>{row.priority}</span></td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-1 font-semibold ring-1 ${statusStyle[row.status]}`}>{statusLabel[row.status]}</span></td>
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

function JourneyEntryModal({ value, busy, onChange, onCancel, onConfirm }: { value: JourneyEntryState; busy: boolean; onChange: (value: JourneyEntryState) => void; onCancel: () => void; onConfirm: () => void }) {
  const hospitals = Array.from(new Set([value.row.hospital, value.row.practiceHospital2, value.row.practiceHospital3].filter(Boolean)));
  const isTargeting = value.nextStage === "TARGETED";
  const isOffering = value.nextStage === "OFFERED";
  const isUsage = value.nextStage === "FIRST_USE" || value.nextStage === "REPEAT_USE";
  const repeatCount = Math.max(0, value.row.usageCount - 1) + (value.nextStage === "REPEAT_USE" ? 1 : 0);
  const complete = isTargeting
    ? Boolean(value.owner.trim() && value.plan.trim() && Number(value.monthlyCaseCount) > 0 && value.orthopedicCaseTypes.trim() && value.implantVendors.trim() && value.vendorSupport.trim() && value.hospital1.trim())
    : isOffering
      ? Boolean(value.productOffered.trim() && value.plan.trim())
      : Boolean(value.hospital.trim() && value.implantUsed.trim() && value.procedureType.trim() && value.plan.trim() && value.outcome.trim());
  const missingMessage = isTargeting
    ? "Owner, planning, jumlah case, jenis case, vendor implant, support vendor, dan rumah sakit wajib dilengkapi."
    : isOffering
      ? "Produk yang ditawarkan dan planning wajib dilengkapi."
      : "Rumah sakit, produk, tindakan, planning, dan outcome wajib dilengkapi.";
  return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-md sm:p-4"><motion.section initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 26 }} role="dialog" aria-modal="true" className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-4xl bg-white shadow-2xl"><div className={`px-6 py-6 text-center text-white ${isUsage ? "bg-linear-to-br from-emerald-600 to-teal-700" : "bg-linear-to-br from-indigo-600 to-blue-700"}`}><span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">{isUsage ? <Repeat2 size={26} /> : isOffering ? <Package size={26} /> : <Target size={26} />}</span><p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">Form tahap {journeyOrder.indexOf(value.nextStage) + 1}</p><h2 className="mt-1 text-2xl font-semibold">{journeyLabel[value.nextStage]}</h2><p className="mt-1 text-xs text-white/75">{value.row.doctor}</p></div><div className="space-y-4 p-5 sm:p-6">{isUsage ? <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-slate-50 p-3 text-center"><p className="text-2xl font-semibold">{value.row.usageCount + 1}x</p><p className="text-[10px] text-slate-400">Total setelah dicatat</p></div><div className="rounded-2xl bg-emerald-50 p-3 text-center"><p className="text-2xl font-semibold text-emerald-700">{repeatCount}x</p><p className="text-[10px] text-emerald-600">Jumlah pemakaian ulang</p></div></div> : null}{isTargeting ? <div className="space-y-4"><FormInput label="Owner / Sales PIC" value={value.owner} onChange={(ownerValue) => onChange({ ...value, owner: ownerValue })} placeholder="Nama sales yang menangani" /><label className="block space-y-1.5 text-sm font-medium text-slate-700">Jumlah case operasi per bulan<input type="number" min="0" value={value.monthlyCaseCount} onChange={(event) => onChange({ ...value, monthlyCaseCount: event.target.value })} placeholder="Contoh: 12" className="h-11 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" /></label><OrthopedicCaseSelector value={value.orthopedicCaseTypes} onChange={(orthopedicCaseTypes) => onChange({ ...value, orthopedicCaseTypes })} /><FormInput label="Vendor implant yang digunakan" value={value.implantVendors} onChange={(implantVendors) => onChange({ ...value, implantVendors })} placeholder="Contoh: J&J, Smith+Nephew, Zimmer" /><FormTextarea label="Bentuk support vendor" value={value.vendorSupport} onChange={(vendorSupport) => onChange({ ...value, vendorSupport })} placeholder="Contoh: instrumen, teknisi, workshop, sponsorship" /><div className="grid gap-3 sm:grid-cols-3"><FormInput label="Rumah sakit 1" value={value.hospital1} onChange={(hospital1) => onChange({ ...value, hospital1 })} placeholder="Rumah sakit utama" /><FormInput label="Rumah sakit 2" value={value.hospital2} onChange={(hospital2) => onChange({ ...value, hospital2 })} placeholder="Opsional" /><FormInput label="Rumah sakit 3" value={value.hospital3} onChange={(hospital3) => onChange({ ...value, hospital3 })} placeholder="Opsional" /></div></div> : null}{isOffering ? <FormProductInput value={value.productOffered} onChange={(productOffered) => onChange({ ...value, productOffered })} /> : null}{isUsage ? <><label className="block space-y-1.5 text-sm font-semibold text-slate-700">Rumah sakit tindakan<select value={value.hospital} onChange={(event) => onChange({ ...value, hospital: event.target.value })} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"><option value="">Pilih rumah sakit</option>{hospitals.map((hospital) => <option key={hospital} value={hospital}>{hospital}</option>)}</select><span className="block text-[10px] font-normal text-slate-400">Diambil dari maksimal tiga rumah sakit praktik dokter.</span></label><label className="block space-y-1.5 text-sm font-semibold text-slate-700">Produk yang digunakan<input value={value.implantUsed} onChange={(event) => onChange({ ...value, implantUsed: event.target.value })} list="customer-product-suggestions" placeholder="Contoh: Zimmer Persona / Normmed THR" className="h-12 w-full rounded-xl border border-slate-200 px-3 font-normal outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" /></label><FormInput label="Jenis tindakan" value={value.procedureType} onChange={(procedureType) => onChange({ ...value, procedureType })} placeholder="Contoh: TKR, THR, Hip Revision" /></> : null}{value.nextStage !== "REPEAT_USE" ? <FormTextarea label="Note" value={value.note} onChange={(note) => onChange({ ...value, note })} placeholder="Catatan pada tahap ini" /> : null}<FormTextarea label="Planning" value={value.plan} onChange={(plan) => onChange({ ...value, plan })} placeholder="Rencana tindak lanjut setelah tahap ini" />{isUsage ? <FormTextarea label="Outcome / Hasil" value={value.outcome} onChange={(outcome) => onChange({ ...value, outcome })} placeholder="Hasil tindakan, respons dokter, atau kendala" /> : null}{!complete ? <p className="rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-700">{missingMessage}</p> : null}<div className="grid gap-2.5 pt-2 sm:grid-cols-2"><button type="button" disabled={busy} onClick={onCancel} className="order-2 h-12 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:order-1">Batal</button><button type="button" disabled={busy || !complete} onClick={onConfirm} className={`order-1 inline-flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50 sm:order-2 ${isUsage ? "bg-emerald-600 shadow-emerald-200 hover:bg-emerald-500" : "bg-indigo-600 shadow-indigo-200 hover:bg-indigo-500"}`}>{busy ? "Menyimpan..." : <><CheckCircle2 size={16} />{isUsage ? "Simpan Pemakaian" : "Simpan & Lanjutkan"}</>}</button></div></div></motion.section></motion.div>;
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
  const field = (name: keyof CustomerFormData, value: string) => {
    const next = { ...form, [name]: value };
    if (
      next.customerType === "TARGET" &&
      (name === "monthlyCaseCount" || name === "orthopedicCaseTypes" || name === "customerType")
    ) {
      next.priority = potentialPriority(next.monthlyCaseCount, next.orthopedicCaseTypes);
    }
    onChange(next);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
          <div><h2 className="text-xl font-semibold">{form.id ? "Edit Customer" : "Input Customer Baru"}</h2><p className="text-xs text-slate-500">{intendedStatus ? `Lengkapi data untuk melanjutkan ${intendedStatus}` : "Data langsung disimpan ke Data Sheet"}</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          <div className="flex flex-wrap gap-2 md:col-span-2"><span className="rounded-full bg-rose-50 px-3 py-1.5 text-[10px] font-semibold text-rose-700 ring-1 ring-rose-200">Merah: wajib belum diisi</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">Hijau: data wajib sudah valid</span><span className="rounded-full bg-amber-50 px-3 py-1.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">Kuning: data potensi penting</span></div>
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
          <FormSelect label="Tipe customer" value={form.customerType} options={["EXISTING", "TARGET"]} onChange={(value) => field("customerType", value)} required />
          {form.customerType === "TARGET" ? <div className={`rounded-xl border p-3 ${priorityBadgeStyle[form.priority]}`}><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold">Priority otomatis</p><p className="mt-1 text-[10px] opacity-75">Dihitung dari jumlah dan jenis case operasi.</p></div><strong className="rounded-full bg-white/70 px-3 py-1 text-sm">{form.priority}</strong></div></div> : <FormSelect label="Priority" value={form.priority} options={["HIGH", "MEDIUM", "LOW"]} onChange={(value) => field("priority", value)} error={missingFields.includes("Priority")} required />}
          <FormInput label="Territory" value={form.territory} onChange={(value) => field("territory", value)} placeholder="Contoh: BALI" error={missingFields.includes("Territory")} required />
          <FormInput label="Owner / Sales PIC" value={form.owner} onChange={(value) => field("owner", value)} placeholder="Nama owner atau sales" error={missingFields.includes("Owner / Sales PIC")} required />
          <FormInput label="Hospital" value={form.hospital} onChange={(value) => field("hospital", value)} placeholder="Nama rumah sakit" error={missingFields.includes("Hospital")} required />
          <FormInput label="Dokter" value={form.doctor} onChange={(value) => field("doctor", value)} placeholder="Nama dokter" error={missingFields.includes("Dokter")} required />
          <FormInput label="Nomor handphone" value={form.phone} onChange={(value) => field("phone", value)} placeholder="Contoh: 0812..." />
          <FormInput label="Spesialisasi" value={form.specialty} onChange={(value) => field("specialty", value)} placeholder="Contoh: Sp.OT Hip & Knee" />
          <FormInput label="Rumah sakit praktik 2" value={form.practiceHospital2} onChange={(value) => field("practiceHospital2", value)} placeholder="Opsional" />
          <FormInput label="Rumah sakit praktik 3" value={form.practiceHospital3} onChange={(value) => field("practiceHospital3", value)} placeholder="Opsional" />
          {form.customerType === "TARGET" ? <div className="grid gap-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 md:col-span-2 md:grid-cols-2"><div className="md:col-span-2"><p className="text-sm font-semibold text-amber-900">Data Potensi Customer</p><p className="mt-1 text-xs text-amber-700">Gunakan data ini untuk menilai volume dan peluang produk.</p></div><label className="space-y-1.5 text-sm font-medium text-slate-700"><RequiredLabel label="Jumlah case operasi per bulan" required /><input type="number" min="1" required value={form.monthlyCaseCount} onChange={(event) => field("monthlyCaseCount", event.target.value)} placeholder="Contoh: 12" className={`h-11 w-full rounded-xl border px-3 font-normal outline-none focus:ring-2 ${requiredFieldStyle(form.monthlyCaseCount, true)}`} /></label><FormInput label="Vendor implant yang digunakan" value={form.implantVendors} onChange={(value) => field("implantVendors", value)} placeholder="Contoh: J&J, Smith+Nephew, Zimmer" required /><div className="md:col-span-2"><OrthopedicCaseSelector value={form.orthopedicCaseTypes} onChange={(value) => field("orthopedicCaseTypes", value)} required /></div><div className="md:col-span-2"><FormTextarea label="Bentuk support vendor" value={form.vendorSupport} onChange={(value) => field("vendorSupport", value)} placeholder="Contoh: instrumen, teknisi, workshop, sponsorship" required /></div></div> : null}
          <FormSelect label="Status" value={form.status} options={["NEW", "TARGETED", "APPROVED", "REJECTED"]} onChange={(value) => field("status", value)} />
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2"><p className="text-xs font-medium text-indigo-500">Riwayat</p><p className="mt-1 text-sm font-semibold text-indigo-800">{journeyLabel[form.journeyStage]}</p><p className="text-[10px] text-indigo-500">Tahap diubah melalui tombol Lanjut pada kartu customer.</p></div>
          <FormProductInput value={form.productOffered} onChange={(value) => field("productOffered", value)} error={missingFields.includes("Product Offered")} />
          <FormInput label="Implant yang digunakan" value={form.implantUsed} onChange={(value) => field("implantUsed", value)} placeholder="Contoh: Zimmer Persona / Normmed THR" />
          <FormInput label="Jenis tindakan" value={form.procedureType} onChange={(value) => field("procedureType", value)} placeholder="Contoh: TKR, THR, Hip Revision" />
          <FormInput label="Follow-up berikutnya" value={form.nextFollowUp} onChange={(value) => field("nextFollowUp", value)} placeholder="Contoh: 2026-07-30 / hubungi kembali" />
          <FormTextarea label="Note" value={form.note} onChange={(value) => field("note", value)} placeholder="Catatan customer" />
          <FormTextarea label="Planning" value={form.plan} onChange={(value) => field("plan", value)} placeholder="Rencana pendekatan atau follow-up" error={missingFields.includes("Planning / Follow-up")} required={form.customerType === "TARGET"} />
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

function RequiredLabel({ label, required }: { label: string; required?: boolean }) {
  return <span className="flex items-center gap-2">{label}{required ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-rose-700">Wajib</span> : null}</span>;
}

function requiredFieldStyle(value: string, required?: boolean, error?: boolean) {
  if (error || (required && !value.trim())) return "border-rose-300 bg-rose-50 focus:border-rose-500 focus:ring-rose-100";
  if (required) return "border-emerald-300 bg-emerald-50/50 focus:border-emerald-500 focus:ring-emerald-100";
  return "border-slate-200 bg-white focus:border-blue-400 focus:ring-blue-100";
}

function FormInput({ label, value, onChange, placeholder, error = false, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: boolean; required?: boolean }) {
  return <label className="space-y-1.5 text-sm font-medium text-slate-700"><RequiredLabel label={label} required={required} /><input value={value} required={required} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`h-11 w-full rounded-xl border px-3 font-normal outline-none focus:ring-2 ${requiredFieldStyle(value, required, error)}`} /></label>;
}

function FormProductInput({ value, onChange, error = false, required = false }: { value: string; onChange: (value: string) => void; error?: boolean; required?: boolean }) {
  return (
    <label className="space-y-1.5 text-sm font-medium text-slate-700">
      <RequiredLabel label="Produk yang ditawarkan" required={required} />
      <input
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        list="customer-product-suggestions"
        placeholder="Ketik produk, contoh: ZIMMER"
        className={`h-11 w-full rounded-xl border px-3 font-normal outline-none focus:ring-2 ${requiredFieldStyle(value, required, error)}`}
      />
      <datalist id="customer-product-suggestions">
        {productSuggestions.map((product) => <option key={product} value={product} />)}
      </datalist>
      <span className="block text-[10px] font-normal text-slate-400">Bisa pilih saran atau tulis produk baru.</span>
    </label>
  );
}

function OrthopedicCaseSelector({ value, onChange, required = false }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  const selected = value.split(",").map((item) => item.trim()).filter(Boolean);
  function toggle(option: string) {
    onChange(selected.includes(option) ? selected.filter((item) => item !== option).join(", ") : [...selected, option].join(", "));
  }
  return <fieldset className={`rounded-xl border p-3 ${requiredFieldStyle(value, required)}`}><legend className="px-1 text-sm font-medium text-slate-700"><RequiredLabel label="Jenis case operasi orthopedi" required={required} /></legend><div className="mt-1 flex flex-wrap gap-2">{orthopedicCaseOptions.map((option) => <button key={option} type="button" onClick={() => toggle(option)} className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 transition ${selected.includes(option) ? "bg-indigo-600 text-white ring-indigo-600" : "bg-white text-slate-600 ring-slate-200 hover:ring-indigo-300"}`}>{selected.includes(option) ? "✓ " : "+ "}{option}</button>)}</div></fieldset>;
}

function FormSelect({ label, value, options, onChange, error = false, placeholder, required = false }: { label: string; value: string; options: string[]; onChange: (value: string) => void; error?: boolean; placeholder?: string; required?: boolean }) {
  return <label className="space-y-1.5 text-sm font-medium text-slate-700"><RequiredLabel label={label} required={required} /><select value={value} required={required} onChange={(event) => onChange(event.target.value)} className={`h-11 w-full rounded-xl border px-3 font-normal outline-none focus:ring-2 ${requiredFieldStyle(value, required, error)}`}>{placeholder ? <option value="">{placeholder}</option> : null}{options.map((option) => <option key={option} value={option}>{statusLabel[option as CustomerStatus] || option}</option>)}</select></label>;
}

function FormTextarea({ label, value, onChange, placeholder, error = false, required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; error?: boolean; required?: boolean }) {
  return <label className="space-y-1.5 text-sm font-medium text-slate-700"><RequiredLabel label={label} required={required} /><textarea value={value} required={required} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={4} className={`w-full resize-y rounded-xl border px-3 py-2 font-normal outline-none focus:ring-2 ${requiredFieldStyle(value, required, error)}`} /></label>;
}
