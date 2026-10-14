export interface ExpandedHistoryRecord {
  id: string;
  namaBarang: string;
  itemCode: string;
  productionNumber: string;
  productionDate: string;
  spkNumber: string;
  nomorAju: string;
  nomorAjuDate: string;
  nomorDaftar: string;
  nomorDaftarDate: string;
  jenisDokumen: string;
  seriBarang: string;
  qty: number;
  qtyFormatted: string;
  netto: number;
  nettoFormatted: string;
}

export interface DocumentHistoryItem {
  id: string;
  no: number;
  soNumber: string;
  soDate: string;
  plNumber: string;
  plDate: string;
  itemProduct: string;
  itemCode: string;
  nettWeight: number;
  grossWeight: number;
  pack: number;
  packUnit: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
  currency: string;
  history: ExpandedHistoryRecord[];
}

export interface DocumentHistoryRecord {
  id: string;
  no: number;
  invoiceNumber: string;
  mutationType: string;
  invoiceDate: string; // DD-MM-YYYY
  customerSupplier: string;
  customsDocument: string;
  amount: number;
  amountFormatted: string;
  lastUpdatedUser: string;
  lastUpdatedTimestamp: string;
  // Detail metadata
  transactionNumber: string;
  invoiceAlias: string;
  customer: string;
  destination: string;
  blNumber: string;
  currency: string;
  createdAt: string;
  lastUpdatedAt: string;
  items: DocumentHistoryItem[];
  totalUnitPrice: number;
  totalSubtotal: number;
}

export type DocumentHistorySortField =
  | "invoiceNumber"
  | "invoiceDate"
  | "customerSupplier"
  | "customsDocument"
  | "amount"
  | "lastUpdated";

export type SortDirection = "none" | "asc" | "desc";
