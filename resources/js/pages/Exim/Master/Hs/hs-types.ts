export interface HsRecord {
  id: string;
  no: number;
  name: string; // HS Code identifier
  description: string;
  typeRateBm: string; // e.g. "ADVOLORUM" | "SPESIFIK"
  ratesBm: number; // percentage or rate value
  typeRateCukai: string; // e.g. "ADVOLORUM" | "SPESIFIK"
  ratesCukai: number; // percentage or rate value
  ratesPpn: number; // percentage
  ratesPph: number; // percentage
  ratesPpnbm: number; // percentage
}

export type HsSortField =
  | "name"
  | "description"
  | "ratesBm"
  | "ratesCukai"
  | "ratesPpn"
  | "ratesPph"
  | "ratesPpnbm";

export type SortDirection = "none" | "asc" | "desc";
