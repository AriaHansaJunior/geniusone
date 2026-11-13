import type {
  WarehouseMasterRecord,
  WarehouseType,
} from "./warehouse-master-types";

export const warehouseTypesList: WarehouseType[] = [
  "Raw Material",
  "Work In Process",
  "Finish Good",
  "Production",
  "Scrap",
  "Others",
];

export const initialWarehouseMasterRecords: WarehouseMasterRecord[] = [];
