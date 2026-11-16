export interface ColorRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  grade?: string;
  status: boolean;
}

export type ColorSortField = "code" | "name" | "status";
export type SortDirection = "none" | "asc" | "desc";
