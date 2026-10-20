export type LocationFilter = "All" | "Warehouse" | "Production Area";
export type StockStatusFilter = "All" | "Available" | "Not Available";

export interface WarehouseStockRecord {
  id: string;
  number: number;
  materialCode: string;
  externalCode: string;
  materialItem: string;
  classification: string;
  facility: string;
  coordinate: string;
  locationType: "Warehouse" | "Production Area";
  warehouseName: string;
  quantity: number;
  unit: string;
  stockStatus: "Available" | "Not Available";
  date: string;
  // Detail attributes for "Show" inspection
  lotNumber?: string;
  zone?: string;
  rack?: string;
  bin?: string;
  allocatedQty?: number;
  availableQty?: number;
  lastMovementDate?: string;
  remark?: string;
}

export interface WarehouseStockFilterState {
  date: string;
  classification: string;
  location: LocationFilter;
  stock: StockStatusFilter;
  coordinate: string;
  facility: string;
  search: string;
}
