export const IMPLANT_PROCEDURES = ["BIPOLAR", "THR", "UKA", "TKA"] as const;
export const IMPLANT_BRANDS = ["NORMMED", "ZIMMER"] as const;

export type ImplantProcedure = (typeof IMPLANT_PROCEDURES)[number];
export type ImplantBrand = (typeof IMPLANT_BRANDS)[number];

export const IMPLANT_MASTER_DATA: Record<
  ImplantProcedure,
  Record<ImplantBrand, string[]>
> = {
  BIPOLAR: {
    NORMMED: ["Bipolar Cup", "Femoral Head", "Femoral Stem"],
    ZIMMER: ["Bipolar Shell", "Femoral Head", "Femoral Stem"],
  },
  THR: {
    NORMMED: ["Acetabular Cup", "Liner", "Femoral Head", "Femoral Stem"],
    ZIMMER: ["Trilogy Cup", "Liner", "Femoral Head", "Femoral Stem"],
  },
  UKA: {
    NORMMED: ["Femoral Component", "Tibial Baseplate", "Tibial Insert"],
    ZIMMER: ["Femoral Component", "Tibial Tray", "Articular Surface"],
  },
  TKA: {
    NORMMED: ["Femoral Component", "Tibial Baseplate", "Tibial Insert", "Patella"],
    ZIMMER: ["Femoral Component", "Tibial Tray", "Articular Surface", "Patella"],
  },
};

export function inferImplantClassification(
  ...values: Array<string | undefined | null>
): { procedure?: ImplantProcedure; brand?: ImplantBrand } {
  const text = values.filter(Boolean).join(" ").toUpperCase();
  const procedure = IMPLANT_PROCEDURES.find((item) => text.includes(item));
  const brand = IMPLANT_BRANDS.find((item) => text.includes(item));
  return { procedure, brand };
}
