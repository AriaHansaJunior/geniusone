export interface TypeOfRequestRecord {
  id: string;
  no: number;
  name: string;
  departmentId: string;
  department: string;
  description: string;
  requiresJobNumber: boolean;
  status: "Active" | "Inactive";
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type TypeOfRequestSortField =
  | "no"
  | "name"
  | "department"
  | "status";
