export interface ClassificationRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  reportingType: string;
  account?: string;
  status: boolean; // true = active, false = inactive/hidden
}

export type ClassificationSortField = "code" | "name" | "description" | "reportingType" | "status";
export type SortDirection = "none" | "asc" | "desc";
