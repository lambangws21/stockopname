import type { BranchTransfer } from "@/types/branch-transfer";
import type { InventoryLocationBalance } from "@/types/inventory-location";

const API = "/api/super-sheet";

export async function listBranchTransfers(id?: string) {
  const query = new URLSearchParams({ action: "branchTransferList" });
  if (id) query.set("id", id);
  const response = await fetch(`${API}?${query}`, { cache: "no-store" });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: BranchTransfer[];
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Data mutasi gagal dimuat");
  }
  return json.data ?? [];
}

export async function saveBranchTransfer(transfer: BranchTransfer) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "branchTransferSave", ...transfer }),
  });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    ID?: string;
    data?: BranchTransfer;
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Mutasi gagal disimpan");
  }
  return json;
}

export async function correctBranchTransfer(transfer: BranchTransfer) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "branchTransferCorrect", ...transfer }),
  });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: BranchTransfer;
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Koreksi mutasi gagal disimpan");
  }
  return json;
}

export async function listInventoryLocations(location?: string) {
  const query = new URLSearchParams({ action: "inventoryLocationList" });
  if (location) query.set("location", location);
  const response = await fetch(`${API}?${query}`, { cache: "no-store" });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: InventoryLocationBalance[];
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Saldo lokasi gagal dimuat");
  }
  return json.data ?? [];
}

export async function syncInventoryLocations() {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "inventoryLocationSync" }),
  });
  const json = await response.json();
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Sinkronisasi lokasi gagal");
  }
  return json as { status: "success"; data?: InventoryLocationBalance[] };
}
