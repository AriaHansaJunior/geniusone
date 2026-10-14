export interface PoReportItemDetail {
  id: string;
  itemCode: string;
  itemName: string;
  prNumber: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discount: number;
  subtotal: number;
  qtyBpb?: number;
  qtyOutstanding?: number;
  remark?: string;
}

export type PoReportStatus = "Approved" | "Ready" | "Draft" | "Closed";
export type PoReceivingStatus = "Complete" | "Outstanding";
export type PoFacilityType = "FASILITAS" | "NON FASILITAS";

export interface PoReportRecord {
  id: string;
  poNumber: string;
  purchaseDate: string; // e.g. "14-10-2026"
  purchaseDateRaw: string; // "YYYY-MM-DD" for filtering & sorting
  supplier: string;
  discount: number;
  vat: number;
  subtotal: number;
  description: string;
  poStatus: PoReportStatus;
  receivingStatus: PoReceivingStatus;
  facilityType: PoFacilityType;
  createdBy: string;
  createdAt: string;
  items?: PoReportItemDetail[];
}
