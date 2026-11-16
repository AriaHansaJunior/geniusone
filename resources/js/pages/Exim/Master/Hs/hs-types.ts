export interface HsRecord {
  id: string;
  no: number;
  name: string; // HS Code identifier
  description: string;
  typeRateBmId?: number;
  typeRateBm: string; // e.g. "ADVOLORUM" | "SPESIFIK"
  ratesBm: number; // percentage or rate value
  typeRateCukaiId?: number;
  typeRateCukai: string; // e.g. "ADVOLORUM" | "SPESIFIK"
  ratesCukai: number; // percentage or rate value
  ratesPpn: number; // percentage
  ratesPph: number; // percentage
  ratesPpnbm: number; // percentage
  status?: boolean;
}

export type HsSortField =
  | "name"
  | "description"
  | "typeRateBm"
  | "ratesBm"
  | "typeRateCukai"
  | "ratesCukai"
  | "ratesPpn"
  | "ratesPph"
  | "ratesPpnbm"
  | "status";

export type SortDirection = "none" | "asc" | "desc";
