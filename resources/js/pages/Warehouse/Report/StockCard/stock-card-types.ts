export interface StockCardRecord {
  id: string;
  no: number;
  itemCode: string;
  itemName: string;
  unitCode: string;
  warehouse: string;
  date: string;
  ref: string;
  description: string;
  in: number | null;
  out: number | null;
  stock: number;
  historyDocIn: string;
  docOutRef: string;
  noLot: string;
  jobNumber: string;
  lastUpdate: string;
}

export interface StockCardFilterState {
  startDate: string;
  endDate: string;
  itemCode: string;
  unit: string;
  warehouse: string;
}
