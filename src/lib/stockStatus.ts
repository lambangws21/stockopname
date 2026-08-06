import type { StockRow } from "@/types/stock";

export function isDiscontinuedStock(row: Pick<StockRow, "Discontinue">) {
  const value = row.Discontinue as unknown;
  if (value === true || value === 1) return true;
  const normalized = String(value ?? "").trim().toUpperCase();
  return ["TRUE", "YA", "YES", "1", "DISCONTINUE", "DISCONTINUED"].includes(
    normalized
  );
}

export function isSupportCenterStock(row: Pick<StockRow, "SupplySource">) {
  return String(row.SupplySource ?? "OFFICE").trim().toUpperCase() === "SUPPORT PUSAT";
}
