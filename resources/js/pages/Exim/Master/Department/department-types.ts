export interface DepartmentRecord {
  id: string;
  no: number;
  sectionName: string;
  unit: string;
  status: boolean; // true = active, false = inactive/hidden
}

export type DepartmentSortField = "sectionName" | "unit" | "status";
export type SortDirection = "none" | "asc" | "desc";
