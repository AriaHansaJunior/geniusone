export interface UnitReferenceRecord {
  id: string;
  code: string;
  description: string;
}

export type UnitReferenceSortField = "code" | "description";
export type SortDirection = "none" | "asc" | "desc";
