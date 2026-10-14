export interface PoDetailItem {
  poCode: string;
  poDate: string;
  supplierName: string;
  poCategory: string;
  createdBy: string;
  updatedBy: string;
  qtyPo: number;
  qtyBpb: number;
  qtyOutstanding: number;
}

export type PrReportStatus = "Completed" | "Outstanding";
export type PrApprovalStatus = "Ready" | "Approve 1" | "Approve 2" | "Closed";

export interface PrReportRecord {
  id: string;
  prNumber: string;
  prDate: string; // e.g. "24-Sep-2026"
  prDateRaw: string; // "YYYY-MM-DD" for filtering
  dateRequired: string; // e.g. "06-Oct-2026"
  dateRequiredRaw: string;
  facilityType: string; // e.g. "NON FASILITAS"
  itemCode: string; // e.g. "80.100.001.190"
  itemName: string; // e.g. "Repair Radiator Truck"
  unitCode: string; // e.g. "NIU", "PCE", "MTR", "PK"
  qtyRequest: number;
  qtyPurchase: number;
  qtyRemain: number;
  status: PrReportStatus;
  approvalDate1: string;
  approvalDate2: string;
  approvalStatus: PrApprovalStatus;
  lastUpdatedBy: string;
  lastUpdatedAt: string;
  deptRequest: string;
  section: string;
  poDetails?: PoDetailItem[];
}
