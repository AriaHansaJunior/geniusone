export interface StockNotificationRecord {
  id: string;
  no: number;
  itemCode: string;
  itemName: string;
  category: string;
  unit: string;
  currentStock: number;
  bufferQuantity: number;
  triggerCondition: "Stock <= Buffer" | "Stock < Buffer";
  notificationLevel: "Critical" | "Warning" | "Standard";
  status: "Active" | "Inactive";
  lastTriggered?: string;
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type StockNotificationSortField =
  | "no"
  | "itemCode"
  | "itemName"
  | "category"
  | "currentStock"
  | "bufferQuantity"
  | "status";
