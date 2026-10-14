export interface ColorRecord {
  id: string;
  no: number;
  code: string;
  name: string;
}

export type ColorSortField = "code" | "name";
export type SortDirection = "none" | "asc" | "desc";
