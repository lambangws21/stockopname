export const STOCK_IMPLANT_CATEGORIES = [
  "TKR",
  "BIPOLAR",
  "THR",
  "INSERT TKR",
  "HEAD METAL",
  "HEAD CERAMIC",
  "FEMORAL COMPONENT",
  "TIBIAL COMPONENT",
  "STEM FEMUR",
  "AKSESORIS",
  "BONE CEMENT",
  "CUP ACETABULUM",
  "LINER CUP",
  "BONE SCREW",
  "STEM TKR",
] as const;

export type StockImplantCategory =
  (typeof STOCK_IMPLANT_CATEGORIES)[number];

export const STOCK_IMPLANT_CATEGORY_LABELS: Record<
  StockImplantCategory,
  string
> = {
  TKR: "TKR",
  BIPOLAR: "Bipolar",
  THR: "THR",
  "INSERT TKR": "Insert TKR",
  "HEAD METAL": "Head Metal",
  "HEAD CERAMIC": "Head Ceramic",
  "FEMORAL COMPONENT": "Femoral Component",
  "TIBIAL COMPONENT": "Tibial Component",
  "STEM FEMUR": "Stem Femur",
  AKSESORIS: "Aksesoris",
  "BONE CEMENT": "Bone Cement",
  "CUP ACETABULUM": "Cup Acetabulum",
  "LINER CUP": "Liner Cup",
  "BONE SCREW": "Bone Screw",
  "STEM TKR": "Stem TKR",
};
