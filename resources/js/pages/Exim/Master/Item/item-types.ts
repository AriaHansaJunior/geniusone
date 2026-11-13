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
  itemType?: string;
  unitConversion?: number;
  netto?: number;
  size?: string;
  dimension?: string;
  traceByLot: number | boolean;
  status: "Active" | "Inactive";
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  stock?: number;
  stockUnit?: string;
  categories_id?: number;
  classifications_id?: number;
  facilities_id?: number;
  origins_id?: number;
  item_types_id?: number;
  units_of_measurements_id?: number;
  smallest_unit_id?: number;
  greatest_unit_id?: number;
  colours_id?: number;
  brands_id?: number;
  styles_id?: number;
  customs_reports_id?: number;
  group_scrap_items_id?: number;
  specifications_id?: number;
  hs_code_id?: number;
  job_number_id?: number;
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
