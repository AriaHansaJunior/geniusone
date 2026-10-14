export interface StyleRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  status: boolean; // true = active, false = inactive
}

export type StyleSortField = "code" | "name" | "description" | "status";
export type SortDirection = "none" | "asc" | "desc";
