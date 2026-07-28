export type CustomerKind = "EXISTING" | "TARGET";
export type CustomerPriority = "HIGH" | "MEDIUM" | "LOW";
export type CustomerStatus = "NEW" | "TARGETED" | "APPROVED" | "REJECTED";
export type CustomerJourneyStage =
  | "PROSPECT"
  | "TARGETED"
  | "OFFERED"
  | "FIRST_USE"
  | "REPEAT_USE";

export interface CustomerMappingRow {
  id: string;
  customerType: CustomerKind;
  territory: string;
  hospital: string;
  doctor: string;
  note: string;
  plan: string;
  priority: CustomerPriority;
  status: CustomerStatus;
  owner: string;
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
  sourceFile: string;
  sourceRow: number;
  journeyStage: CustomerJourneyStage;
  productOffered: string;
  offeredAt: string;
  firstUsedAt: string;
  lastUsedAt: string;
  usageCount: number;
  nextFollowUp: string;
  outcome: string;
  phone: string;
  specialty: string;
  practiceHospital2: string;
  practiceHospital3: string;
  photoUrl: string;
  photoFileId: string;
  implantUsed: string;
  procedureType: string;
  usageHospital: string;
  monthlyCaseCount: number;
  orthopedicCaseTypes: string;
  implantVendors: string;
  vendorSupport: string;
}
