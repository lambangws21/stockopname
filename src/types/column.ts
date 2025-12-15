import { StockRow } from "./stock";

export type StockColumn = {
  key: keyof StockRow;
  label: string;
  visible: boolean;
};
