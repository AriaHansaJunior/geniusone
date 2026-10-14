export interface ReceiveNoteReturnItem {
  id: string;
  no: number;
  doNumber: string;
  doDate?: string;
  sjNumber?: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
  qtyPackage: number;
  packageType: string;
  price: number;
  subtotal: number;
  subtotalIdr: number;
  // Fields for Add form item table
  deliveryQty?: number;
  returQty?: number;
}

export interface ReceiveNoteReturnRecord {
  id: string;
  no: number;
  rnNumber: string;
  rnDate: string;
  deliveryOrder: string | null;
  doDate: string | null;
  customer: string;
  facility: string;
  bcCode: string;
  ajuNumber: string;
  noDaftar: string | null;
  amount: number;
  amountFormatted: string;
  description: string;
  warehouseTransaction: string | null;
  warehouseReceiveDate: string | null;
  approvalStatus: string;
  userCreated: string;
  createdAtTimestamp: string;
  // Detail metadata
  arrivalDate: string;
  typeOfReturn: string;
  salesDeliveryNumber: string;
  salesDeliveryLine?: string;
  vehicleType: string;
  licensePlate: string;
  createdAt: string;
  lastUpdatedAt: string;
  releasedAt: string;
  approvedAt: string;
  // Items & totals
  items: ReceiveNoteReturnItem[];
  totalSubtotal: number;
  totalAdditionalCost: number;
  grandTotal: number;
  notes?: string;
}

export interface SalesReturnItemToPick {
  id: string;
  doNumber: string;
  doDate: string;
  sjNumber: string;
  itemCode: string;
  itemName: string;
  unit: string;
  price: number;
  deliveryQty: number;
  availableReturnQty: number;
  packageQty: number;
  packageType: string;
}

export type ReceiveNoteReturnSortField =
  | "rnNumber"
  | "deliveryOrder"
  | "customer"
  | "facility"
  | "ajuNumber"
  | "amount"
  | "approvalStatus"
  | "userCreated";

export type SortDirection = "none" | "asc" | "desc";
