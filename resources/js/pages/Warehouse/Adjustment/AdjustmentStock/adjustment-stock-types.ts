export type StockAdjustmentDirection = "IN" | "OUT" | "SET";

export type StockAdjustmentSource = "MANUAL" | "EXCEL_IMPORT";

export interface StockAdjustmentItemLine {
  id: string;
  no: number;
  items_id: number;
  itemCode: string;
  itemName: string;
  unit: string;
  warehouseId: number;
  warehouseName: string;
  adjustmentType: StockAdjustmentDirection;
  quantity: number;
  balanceBefore: number;
  balanceAfter: number;
  coordinateName: string;
  lotNumber: string;
  remark: string;
}

export interface StockAdjustmentRecord {
  id: string;
  rawId: number;
  adjustmentNumber: string;
  warehouseId?: number | null;
  warehouseName: string;
  adjustmentDate: string;
  sourceType: StockAdjustmentSource;
  referenceCode: string;
  note: string;
  status: string;
  itemCount: number;
  totalIn: number;
  totalOut: number;
  createdBy: string;
  createdAt: string;
  items: StockAdjustmentItemLine[];
}
