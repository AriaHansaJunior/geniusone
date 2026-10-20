export type RateType =
  | "Pajak (KMK)"
  | "Bank Indonesia (BI)"
  | "Commercial Bank (Counter)";

export type RateAvailability = "Available" | "Unavailable" | "Pending";

export interface ExchangeRateRecord {
  id: string;
  no: number;
  rateDate: string; // YYYY-MM-DD
  currencyCode: string; // USD, EUR, SGD, JPY, CNY, GBP, AUD, IDR
  currencyName: string;
  rateType: RateType;
  buyingRate: number | null; // null if not available
  sellingRate: number | null; // null if not available
  rate: number | null; // Middle Rate / Kurs Tengah / Official Rate
  flag: string; // e.g. "KMK No. 42/2026", "BI JISDOR", "Commercial Counter"
  availability: RateAvailability;
  note?: string;
}

export type RateSortField =
  | "rateDate"
  | "currencyCode"
  | "rateType"
  | "buyingRate"
  | "sellingRate"
  | "rate";

export type SortDirection = "asc" | "desc" | "none";

export interface RateFilterState {
  startDate: string;
  endDate: string;
  currency: string;
  rateType: string;
}
