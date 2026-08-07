export type HandoverProcedure =
  | "TKR"
  | "TKR VANGUARD"
  | "UKA"
  | "TKR PERSONA"
  | "THR"
  | "BIPOLAR";
export type HandoverStatus = "DRAFT" | "DIKIRIM" | "DITERIMA";
export type HandoverBearingOption = "MOP" | "COP" | "COC" | "";

export interface HandoverItem {
  selected: boolean;
  stockRow?: number;
  partNumber: string;
  description: string;
  batch: string;
  stdQty: number;
  qtyChecked: number;
  qtyIssued: number;
  qtyReturned: number;
  officeBefore?: number;
  officeAfter?: number;
  hospitalQty?: number;
  usedQty?: number;
  returnedQty?: number;
  hospitalRemaining?: number;
  locationStatus?: string;
  supplementRequestIds?: string[];
  supplySource?: "OFFICE" | "SUPPORT PUSAT" | string;
}

export interface HandoverInstrument {
  selected: boolean;
  code: string;
  name: string;
  qty: number;
  unit: string;
  condition: string;
  note?: string;
  supplementRequestIds?: string[];
  supplySource?: "OFFICE" | "SUPPORT PUSAT" | string;
}

export interface HandoverSignatureAudit {
  fullName: string;
  employeeId: string;
  position: string;
  signedAt?: string;
  ipAddress?: string;
  deviceId?: string;
  userAgent?: string;
}

export interface OnlineHandover {
  Row?: number;
  ID?: string;
  CreatedAt?: string;
  UpdatedAt?: string;
  Procedure: HandoverProcedure;
  Brand: string;
  BearingOption?: HandoverBearingOption;
  Hospital: string;
  Surgeon: string;
  ApprovedBy: string;
  HandoverDate: string;
  SetName: string;
  Items: HandoverItem[];
  Instruments: HandoverInstrument[];
  Sender: string;
  Checker1: string;
  Checker2: string;
  AcknowledgedBy: string;
  Receiver: string;
  Status: HandoverStatus;
  SentAt?: string;
  AcceptedAt?: string;
  AcceptanceNote: string;
  SenderSignature?: string;
  ReceiverSignature?: string;
  SenderSignatureMeta?: HandoverSignatureAudit;
  ReceiverSignatureMeta?: HandoverSignatureAudit;
  VerificationToken?: string;
  InventoryPostedAt?: string;
  HospitalUpdatedAt?: string;
  PhotoUrl?: string;
  PhotoFileId?: string;
  PhotoDataUrl?: string;
  By?: string;
}
