export type SyncStatus = "Synced" | "Pending" | "Failed" | "Not Synced";

export interface CurrencyRecord {
  id: string;
  no: number;
  currencyCode: string;
  currencyName: string;
  symbol: string;
  syncStatus: SyncStatus;
  lastSynced: string;
  createdAt: string;
  createdBy: string;
}

export type CurrencySortField = "currencyCode" | "currencyName" | "syncStatus" | "lastSynced";
export type SortDirection = "none" | "asc" | "desc";

export const initialCurrencyRecords: CurrencyRecord[] = [];
