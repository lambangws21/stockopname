export type LogisticsWorkflowStatus =
  | "BELUM DIPROSES"
  | "SUDAH DIINFORMASIKAN"
  | "SEDANG DIPESAN"
  | "DALAM PENGIRIMAN"
  | "SELESAI"
  | "DISCONTINUE";

export interface StockWarningRow {
  Row: number;
  UpdatedAt: string;
  Status: "HABIS" | "AKAN HABIS" | "SELESAI" | "DISCONTINUE";
  StockSheet: string;
  No: number;
  NoStok: string;
  Deskripsi: string;
  Implant: string;
  Brand: string;
  Batch: string;
  SisaStock: number;
  Note: string;
  LastMovement: string;
  ResolvedAt: string;
  WorkflowStatus: LogisticsWorkflowStatus;
  PIC: string;
  TargetRefill: string;
  LogisticsNote: string;
  InformedAt: string;
  InformedBy: string;
}
