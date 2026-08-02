export type BackgroundTransactionStatus =
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED";

export interface BackgroundTransaction {
  id: string;
  documentId: string;
  expectedStatus: "DRAFT" | "DIKIRIM" | "DITERIMA";
  label: string;
  status: BackgroundTransactionStatus;
  createdAt: string;
  updatedAt: string;
  message?: string;
}

const STORAGE_KEY = "implant-background-transactions-v1";
const EVENT_NAME = "implant-background-transactions-change";

export function readBackgroundTransactions(): BackgroundTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeBackgroundTransactions(rows: BackgroundTransaction[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.slice(-20)));
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
}

export function createBackgroundTransaction(input: {
  documentId: string;
  expectedStatus: BackgroundTransaction["expectedStatus"];
  label: string;
}) {
  const now = new Date().toISOString();
  const transaction: BackgroundTransaction = {
    id: crypto.randomUUID(),
    ...input,
    status: "PROCESSING",
    createdAt: now,
    updatedAt: now,
  };
  writeBackgroundTransactions([
    ...readBackgroundTransactions().filter(
      (row) =>
        row.documentId !== input.documentId || row.status !== "PROCESSING"
    ),
    transaction,
  ]);
  return transaction;
}

export function updateBackgroundTransaction(
  id: string,
  patch: Partial<BackgroundTransaction>
) {
  writeBackgroundTransactions(
    readBackgroundTransactions().map((row) =>
      row.id === id
        ? { ...row, ...patch, updatedAt: new Date().toISOString() }
        : row
    )
  );
}

export function dismissBackgroundTransaction(id: string) {
  writeBackgroundTransactions(
    readBackgroundTransactions().filter((row) => row.id !== id)
  );
}

export function subscribeBackgroundTransactions(listener: () => void) {
  window.addEventListener(EVENT_NAME, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(EVENT_NAME, listener);
    window.removeEventListener("storage", listener);
  };
}

