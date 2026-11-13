import type { StockCardRecord } from "./stock-card-types";

export interface StockCardItemOption {
  code: string;
  name: string;
  unit: string;
  defaultWarehouse: string;
}

export const stockCardItemsList: StockCardItemOption[] = [];
export const stockCardWarehousesList = ["All Warehouse"];
export const stockCardUnitsList = ["All Units", "PCE", "KGS", "RIM", "LTR", "MTR", "SET"];
export const initialStockCardRecords: StockCardRecord[] = [];
