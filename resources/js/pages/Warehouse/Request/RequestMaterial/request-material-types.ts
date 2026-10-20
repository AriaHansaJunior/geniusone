export type ApprovalStatus = "Draft" | "Approved 1" | "Approved 2" | "Rejected";

export interface RequestMaterialItemRow {
  id: string;
  itemCode: string;
  externalCode: string;
  itemName: string;
  unit: string;
  jobNumber: string;
  size: string;
  stockQty: number;
  pendingQty: number;
  requestQty: number;
  remark: string;
}

export interface RequestMaterialRecord {
  id: string; // e.g. "REQ-WH-2026-001"
  no: number;
  requestCode: string;
  requestDate: string;
  destinationLocation: string;
  department: string;
  typeOfRequest: string;
  jobNumber: string;
  customer: string;
  requestNote: string;
  totalItems: number;
  approval: ApprovalStatus;
  projectType: string;
  createdDate: string;
  lastUpdatedDate: string;

  // Additional detail fields
  createdBy?: string;
  soNumber?: string;
  poBuyer?: string;
  warehouseDestination?: string;
  approved1At?: string;
  approved2At?: string;
  revisionCount?: number;
  items: RequestMaterialItemRow[];
}

export interface RequestMaterialFilterState {
  search: string;
  startDate: string;
  endDate: string;
  typeOfRequest: string;
  createdBy: string;
  destinationLocation: string;
  approval: string;
  department: string;
  projectType: string;
}
