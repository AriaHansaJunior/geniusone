export interface TypeOfRequestRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  department: string;
  description: string;
  requiresJobNumber: boolean;
  requiresApproval2: boolean;
  status: "Active" | "Inactive";
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type TypeOfRequestSortField =
  | "no"
  | "code"
  | "name"
  | "department"
  | "status";
