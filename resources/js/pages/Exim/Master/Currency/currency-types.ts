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

export const initialCurrencyRecords: CurrencyRecord[] = [
  {
    id: "curr-1",
    no: 1,
    currencyCode: "IDR",
    currencyName: "Indonesian Rupiah",
    symbol: "Rp",
    syncStatus: "Synced",
    lastSynced: "2026-10-16 08:30:00",
    createdAt: "2026-01-01 00:00:00",
    createdBy: "SYSTEM",
  },
  {
    id: "curr-2",
    no: 2,
    currencyCode: "USD",
    currencyName: "US Dollar",
    symbol: "$",
    syncStatus: "Synced",
    lastSynced: "2026-10-16 08:30:00",
    createdAt: "2026-01-01 00:00:00",
    createdBy: "SYSTEM",
  },
  {
    id: "curr-3",
    no: 3,
    currencyCode: "EUR",
    currencyName: "Euro",
    symbol: "€",
    syncStatus: "Synced",
    lastSynced: "2026-10-16 08:30:00",
    createdAt: "2026-01-01 00:00:00",
    createdBy: "SYSTEM",
  },
  {
    id: "curr-4",
    no: 4,
    currencyCode: "SGD",
    currencyName: "Singapore Dollar",
    symbol: "S$",
    syncStatus: "Synced",
    lastSynced: "2026-10-16 08:30:00",
    createdAt: "2026-01-01 00:00:00",
    createdBy: "SYSTEM",
  },
  {
    id: "curr-5",
    no: 5,
    currencyCode: "JPY",
    currencyName: "Japanese Yen",
    symbol: "¥",
    syncStatus: "Pending",
    lastSynced: "2026-10-15 18:00:00",
    createdAt: "2026-01-02 10:00:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "curr-6",
    no: 6,
    currencyCode: "CNY",
    currencyName: "Chinese Yuan",
    symbol: "¥",
    syncStatus: "Synced",
    lastSynced: "2026-10-16 08:30:00",
    createdAt: "2026-01-02 10:00:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "curr-7",
    no: 7,
    currencyCode: "GBP",
    currencyName: "British Pound",
    symbol: "£",
    syncStatus: "Failed",
    lastSynced: "2026-10-14 12:00:00",
    createdAt: "2026-01-05 14:00:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "curr-8",
    no: 8,
    currencyCode: "AUD",
    currencyName: "Australian Dollar",
    symbol: "A$",
    syncStatus: "Not Synced",
    lastSynced: "—",
    createdAt: "2026-01-08 16:30:00",
    createdBy: "ADMINISTRATOR",
  },
];
