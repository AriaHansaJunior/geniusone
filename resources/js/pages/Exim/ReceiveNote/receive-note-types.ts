export interface ReceiveNoteItem {
  id: string;
  no: number;
  poNumber: string;
  poDate?: string;
  dnNumber?: string;
  dnDate?: string;
  jobNumber?: string;
  jobDate?: string;
  itemCode: string;
  itemName: string;
  qty: number;
  unit: string;
  rafaksi: number;
  rafaksiPercent: number;
  pricePerUnit: number;
  priceSubtotal: number;
  price2PerUnit: number;
  price2Subtotal: number;
  remark: string;
  // Additional fields for Add RN table
  sjNumber?: string;
  sjDate?: string;
  poQty?: number;
  dlvrQty?: number;
  suratJalanQty?: number;
}

export interface ReceiveNoteRecord {
  id: string;
  no: number;
  rnNumber: string;
  arrivalDate: string;
  poNumber: string;
  date: string;
  supplier: string;
  facility: string;
  bcCode: string;
  ajuNumber: string;
  noDaftar: string;
  amount: number;
  amountFormatted: string;
  description: string;
  warehouseTransaction: string;
  // Detail metadata
  currency: string;
  rate: number;
  invoiceNumber: string;
  invoiceDate: string;
  taxInvoiceNumber: string;
  taxInvoiceDate: string;
  vehicleType: string;
  licensePlate: string;
  tanggalDaftar: string;
  nomorPackingList: string;
  tanggalPackingList: string;
  status: string; // e.g. "Approved 2"
  createdAt: string;
  lastUpdatedAt: string;
  approval1At: string;
  approval2At: string;
  // Grouped items and financial summary
  items: ReceiveNoteItem[];
  totalQty: number;
  biayaLain: number;
  discountPercent: number;
  discountAmount: number;
  ppnPercent: number;
  ppnAmount: number;
  grandTotal: number;
}

export interface PoItemToPick {
  id: string;
  jobNumber: string;
  poNumber: string;
  poNumberAlias: string;
  remark: string;
  itemCode: string;
  itemName: string;
  unit: string;
  poQty: number;
  rnQty: number;
  remainQty: number;
  unitPrice: number;
}

export type ReceiveNoteSortField =
  | "rnNumber"
  | "poNumber"
  | "date"
  | "supplier"
  | "facility"
  | "ajuNumber"
  | "amount";

export type SortDirection = "none" | "asc" | "desc";
