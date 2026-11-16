export interface ClassificationRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  reportingTypeId?: string;
  reportingType: string;
  accountId?: string;
  account?: string;
  status: boolean; // true = active, false = inactive/hidden
}

export interface ReportingTypeOption {
  id: string;
  name: string;
}

export type ClassificationSortField = "code" | "name" | "description" | "reportingType" | "status";
export type SortDirection = "none" | "asc" | "desc";
