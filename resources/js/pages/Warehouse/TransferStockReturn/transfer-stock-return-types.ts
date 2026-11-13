/**
 * Transfer Stock Return (Warehouse / Incoming) Data Types — GENIUSONE UI 2.0
 * Aligns with SmartOne transfer_stok_retur schema
 */

export interface TransferStockReturnItem {
  id: string;
  items_id?: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  sourceLocation: string;
  destinationLocation: string;
  reason: string;
}

export type TransferStockReturnStatus =
  | "Draft"
  | "Waiting Approve 1"
  | "Waiting Approve 2"
  | "Approved"
  | "Rejected";

export interface TransferStockReturnRecord {
  id: string;
  warehouses_id?: number;
  warehouseName?: string;
  request_material_id?: number;
  job_number_id?: number;
  mutationCode: string; // e.g. "MUT-2026-11-001"
  productionCode: string; // e.g. "PRD-2026-088"
  jobNumber: string; // e.g. "JOB-2026-0045"
  transferDate: string; // e.g. "10-11-2026"
  transferNote: string; // e.g. "Return excess raw materials"
  totalItems: number; // e.g. 3
  status: TransferStockReturnStatus;
  userCreated: string; // e.g. "Administrator GeniusOne"
  userLastUpdated: string; // e.g. "12-11-2026 14:30"
  items: TransferStockReturnItem[];
}

export type TransferStockReturnSortField =
  | "no"
  | "mutationCode"
  | "productionCode"
  | "jobNumber"
  | "transferNote"
  | "totalItems"
  | "status"
  | "userCreated"
  | "userLastUpdated";

