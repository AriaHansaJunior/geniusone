export interface BrandRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  status: boolean; // true = active, false = inactive/hidden
}

export type BrandSortField = "code" | "name" | "description" | "status";
export type SortDirection = "none" | "asc" | "desc";
