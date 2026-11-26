export type WarehouseStockTransferStatus = "Draft" | "Posted" | "Cancelled";

export interface WarehouseStockTransferItemRow {
  id?: number;
  items_id: number;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  lotNumber?: string;
  remark?: string;
}

export interface WarehouseStockTransferRecord {
  id: number;
  transferNumber: string;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  sourceWarehouseCode?: string;
  destinationWarehouseId: number;
  destinationWarehouseName: string;
  destinationWarehouseCode?: string;
  sourceCoordinateId?: number | null;
  sourceCoordinateName?: string | null;
  destinationCoordinateId?: number | null;
  destinationCoordinateName?: string | null;
  transferDate: string;
  referenceCode?: string;
  idempotencyKey?: string;
  status: WarehouseStockTransferStatus;
  note?: string;
  creatorId?: number | null;
  creatorName?: string;
  postedByName?: string;
  postedAt?: string | null;
  createdAt?: string | null;
  items: WarehouseStockTransferItemRow[];
}
