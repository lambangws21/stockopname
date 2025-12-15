export interface HistoryRow {
  Timestamp: string;
  Action: string;
  Sheet: string;
  No: number;
  Changes: string;
  By: string;
}

  export interface HistoryResponse {
    status: "success" | "error";
    sheet: string;
    data: HistoryRow[];
  }
  

  export interface ChangeItem {
    field: string;
    before?: string | number;
    after?: string | number;
  }
  

  export interface HistoryItem {
    Timestamp: string;
    Action: string;
    Sheet: string;
    No: number;
    Changes: string
    By: string;
  }
  

  export interface HistoryChange {
    field: string;
    before?: string | number | null;
    after?: string | number | null;
  }

  export function badge(action: string) {
    if (action.includes("MUTASI"))
      return "bg-purple-100 text-purple-700";
    if (action.includes("CREATE"))
      return "bg-green-100 text-green-700";
    if (action.includes("DELETE"))
      return "bg-red-100 text-red-700";
    return "bg-blue-100 text-blue-700";
  }