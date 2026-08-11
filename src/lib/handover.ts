import type { OnlineHandover } from "@/types/handover";

const API = "/api/super-sheet";

export async function listOnlineHandovers(id?: string) {
  const query = new URLSearchParams({ action: "handoverList" });
  if (id) query.set("id", id);
  const response = await fetch(`${API}?${query}`, { cache: "no-store" });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: OnlineHandover[];
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Serah terima gagal dimuat");
  }
  return json.data ?? [];
}

export async function getPublicOnlineHandover(id: string, token: string) {
  const query = new URLSearchParams({ action: "handoverPublic", id, token });
  const response = await fetch(`${API}?${query}`, { cache: "no-store" });
  const json = (await response.json()) as { status: "success" | "error"; message?: string; data?: OnlineHandover[] };
  if (!response.ok || json.status === "error") throw new Error(json.message || "Dokumen verifikasi tidak dapat dibuka");
  return json.data?.[0];
}

export async function saveOnlineHandover(
  handover: OnlineHandover,
  accept = false
) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: accept ? "handoverAccept" : "handoverSave",
      ...handover,
    }),
  });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    ID?: string;
    data?: OnlineHandover;
    customerMappingSync?: {
      linked: boolean;
      created?: boolean;
      updated?: boolean;
      customerId?: string;
      usageId?: string;
      reason?: string;
      matchCount?: number;
      message?: string;
    };
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Serah terima gagal disimpan");
  }
  return json;
}

export async function settleOnlineHandover(
  handover: Pick<OnlineHandover, "ID" | "Items"> & { by?: string; completionNote?: string }
) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "handoverSettle",
      ...handover,
    }),
  });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: OnlineHandover;
    customerMappingSync?: {
      linked: boolean;
      created?: boolean;
      updated?: boolean;
      customerId?: string;
      usageId?: string;
      reason?: string;
      matchCount?: number;
      message?: string;
    };
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Pemakaian implant gagal disimpan");
  }
  return json;
}

export async function appendOnlineHandoverSupplement(payload: {
  ID: string;
  Items: OnlineHandover["Items"];
  Instruments: OnlineHandover["Instruments"];
  by?: string;
  requestId: string;
}) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "handoverSupplement",
      ...payload,
    }),
  });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    data?: OnlineHandover;
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Kiriman tambahan gagal disimpan");
  }
  return json;
}

export async function deleteOnlineHandovers(ids: string[]) {
  const response = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "handoverDelete",
      ids,
    }),
  });
  const json = (await response.json()) as {
    status: "success" | "error";
    message?: string;
    deleted?: number;
    data?: { deleted: number };
  };
  if (!response.ok || json.status === "error") {
    throw new Error(json.message || "Dokumen serah terima gagal dihapus");
  }
  return json;
}
