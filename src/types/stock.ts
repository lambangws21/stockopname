// Baris data utama
export interface StockRow {
    No: number;
    NoStok: string;
    Deskripsi: string;
    Batch: string;
    Qty: number;
    TotalQty: number;
    TERPAKAI: number;
    REFILL: number;
    KET: string;
  }
  
  // Response standar dari Apps Script
  export interface GasResponse<T> {
    status: "success" | "error";
    message?: string;
    data?: T;
    No?: number;
    newQty?: number;
    backupUrl?: string;
    kpi?: unknown;
  }
  
  
  // Payload POST/PUT untuk create/update
  export type StockPayload =
  | {
      sheet: string;
      action: StockAction;
      No?: number;
      qty: number;
      type?: "in" | "out";
      data?: StockRow;
    }
  | {
      sheet: string;
      action: "duplicate";
      No?: number;
    }
  | {
      sheet?: string;
      No?: number;
      NoStok?: string;
      Deskripsi?: string;
      Batch?: string;
      Qty?: number;
      TotalQty?: number;
      TERPAKAI?: number;
      REFILL?: number;
      KET?: string;
    };

  
  // Mutasi stok (IN / OUT)
  export type MutationType = "in" | "out";
  
  export interface MutationPayload {
    type: MutationType;
    No: number;
    qty: number;
    note?: string;
  }
  
  export interface StockRow {
    No: number;
    NoStok: string;
    Deskripsi: string;
    Batch: string;
    Qty: number;
    TotalQty: number;
    TERPAKAI: number;
    REFILL: number;
    KET: string;
  }
  
  // export interface StockRow {
  //   No: number;
  //   NoStok: string | number;
  //   Batch: string | number;
  //   Deskripsi: string;
  //   Qty: number;
  // }
  
  export type StockAction =
  | "create"
  | "update"
  | "delete"
  | "duplicate"
  | "mutasi";



  export interface MutationPayload {
    No: number;
    type: "in" | "out";
    qty: number;
    note?: string;
  }
  
//   export interface GasResponse {
//     status: "success" | "error";
//     message?: string;
//     data?: StockRow[];
//   }
export interface StockRow {
  No: number;
  NoStok: string;
  Deskripsi: string;
  Batch: string;
  Qty: number;
  TotalQty: number;
  TERPAKAI: number;
  REFILL: number;
  KET: string;
}

/* ================= GAS RESPONSE ================= */
export interface GasResponse<T> {
  status: "success" | "error";
  message?: string;
  data?: T;
  kpi?: unknown;
}

/* ================= BASE PAYLOAD ================= */
export interface BasePayload {
  sheet: string;
  by?: string;
}

/* ================= CREATE ================= */
export interface CreatePayload extends BasePayload {
  NoStok: string;
  Deskripsi: string;
  Batch: string;
  Qty: number;
  TERPAKAI: number;
  REFILL: number;
  KET: string;
}

/* ================= UPDATE ================= */
export interface UpdatePayload extends CreatePayload {
  No: number;
}

/* ================= DELETE ================= */
export interface DeletePayload extends BasePayload {
  No: number;
}

/* ================= MUTASI ================= */
export interface MutasiPayload extends BasePayload {
  No: number;
  qty: number;
  type: "in" | "out";
}

/* ================= DUPLICATE ================= */
export interface DuplicatePayload extends BasePayload {
  No: number;
}


/* ================= KPI ================= */
export interface StockKPI {
  totalItems: number;
  lowStock: number;
  sumStock: number;
}

/* ================= HISTORY ================= */
export interface StockHistoryRow {
  Timestamp: string;
  Action: string;
  Sheet: string;
  No: number;
  Field?: string;
  Before: string;
  After: string;
  By: string;
}



/* ================= HISTORY (GROUPED FOR UI) ================= */
export interface TimelineHistory {
  Timestamp: string;
  Action: string;
  Sheet: string;
  No: number;
  By: string;
  changes: {
    field: string;
    before: string;
    after: string;
  }[];
}

export interface HistoryChange {
  field: string;
  before?: string | number | null;
  after?: string | number | null;
}


export interface HistoryRow {
  Timestamp: string;
  Action: string;
  Sheet: string;
  No: number;
  Changes: string;
  By: string;
}
