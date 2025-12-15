import { HistoryRow } from "@/types/history";

export function filterHistory(
  rows: HistoryRow[],
  filter: {
    No?: number;
    action?: string;
    from?: string;
    to?: string;
  }
): HistoryRow[] {
  return rows.filter((h) => {
    if (filter.No && h.No !== filter.No) return false;

    if (filter.action && h.Action !== filter.action) return false;

    if (filter.from) {
      if (new Date(h.Timestamp) < new Date(filter.from)) return false;
    }

    if (filter.to) {
      const end = new Date(filter.to);
      end.setHours(23, 59, 59, 999);
      if (new Date(h.Timestamp) > end) return false;
    }

    return true;
  });
}
