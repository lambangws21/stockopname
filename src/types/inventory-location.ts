export type InventoryCondition =
  | "AVAILABLE"
  | "IN_TRANSIT"
  | "QUARANTINE"
  | "DAMAGED"
  | "EXPIRED"
  | string;

export interface InventoryLocationBalance {
  Location: string;
  StockSheet: string;
  StockRow: number;
  NoStok: string;
  Batch: string;
  Description: string;
  Brand: string;
  Implant: string;
  Qty: number;
  Condition: InventoryCondition;
  UpdatedAt?: string;
  UpdatedBy?: string;
}
