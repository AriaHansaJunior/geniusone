export interface CategoryRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  status: boolean; // true = active, false = inactive
}

export type CategorySortField = "code" | "name" | "description" | "status";
export type SortDirection = "none" | "asc" | "desc";
