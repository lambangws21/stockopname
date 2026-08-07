export type BranchTransferStatus = "DRAFT" | "DIKIRIM" | "DITERIMA_SEBAGIAN" | "DITERIMA";

export type BranchTransferItem = {
  stockRow: number;
  ref: string;
  description: string;
  batch: string;
  qty: number;
  availableAtSend: number;
  receivedQty?: number;
};

export type BranchTransfer = {
  ID?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  Status: BranchTransferStatus;
  Origin: string;
  Destination: string;
  Items: BranchTransferItem[];
  Note: string;
  Sender: string;
  Receiver: string;
  PhotoUrl?: string;
  PhotoFileId?: string;
  PhotoDataUrl?: string;
  SentAt?: string;
  ReceivedAt?: string;
  By?: string;
  TransferType?: "MUTASI_KELUAR" | "RETURN_CABANG" | string;
};
