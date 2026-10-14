export interface FacilityRecord {
  id: string;
  no: number;
  name: string;
  description: string;
  status: boolean; // true = active, false = inactive/hidden
}

export type FacilitySortField = "name" | "description" | "status";
export type SortDirection = "none" | "asc" | "desc";
