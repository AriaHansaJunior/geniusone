export interface JobNumberRecord {
  id: string;
  no: number;
  jobNumber: string;
  jobName: string;
  department: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
}

export type JobNumberSortField = "jobNumber" | "jobName" | "department" | "status";
export type SortDirection = "none" | "asc" | "desc";
