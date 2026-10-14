export interface ItemRecord {
  id: string;
  no: number;
  itemCode: string;
  kodeEksternal?: string;
  itemName: string;
  classification: string;
  category: string;
  hsCode?: string;
  smallestUnitCode: string;
  smallestUnitName: string;
  greatestUnitCode: string;
  greatestUnitName: string;
  facility: "FASILITAS" | "NON FASILITAS";
  groupScrap?: string;
  specification?: string;
  origin?: string;
  colour?: string;
  brand: string;
  style: string;
  customReport?: string;
  traceByLot: number | boolean;
  status: "Active" | "Inactive";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  stock?: number;
  stockUnit?: string;
}

export type ItemColumnKey =
  | "itemCode"
  | "kodeEksternal"
  | "itemName"
  | "classification"
  | "category"
  | "hsCode"
  | "smallestUnit"
  | "greatestUnit"
  | "facility"
  | "groupScrap"
  | "specification"
  | "origin"
  | "colour"
  | "brand"
  | "style"
  | "customReport"
  | "traceByLot"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "option";

export interface ItemColumnConfig {
  key: ItemColumnKey;
  label: string;
  visible: boolean;
  minWidth?: number;
}

export interface ItemFilterState {
  search: string;
  category: string;
  classification: string;
}
