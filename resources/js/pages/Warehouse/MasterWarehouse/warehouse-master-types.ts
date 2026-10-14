export type WarehouseType =
  | "Raw Material"
  | "Work In Process"
  | "Finish Good"
  | "Production"
  | "Scrap"
  | "Others";

export interface WarehouseCoordinateRecord {
  id: string;
  warehouseId: string;
  name: string;
}

export interface WarehouseMasterRecord {
  id: string;
  no: number;
  name: string;
  type: WarehouseType;
  description: string;
  status: boolean; // true = active (blue checked square), false = inactive
  coordinates?: WarehouseCoordinateRecord[];
}

export type WarehouseMasterSortField =
  | "no"
  | "name"
  | "type"
  | "description"
  | "status";

export type WarehouseCoordinateSortField = "no" | "name";

export type SortDirection = "asc" | "desc" | "none";
