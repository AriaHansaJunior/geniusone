export interface AccountRecord {
  id: string;
  no: number;
  accountCode: string;
  accountName: string;
  category: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
}

export type AccountSortField = "accountCode" | "accountName" | "category" | "status";
export type SortDirection = "none" | "asc" | "desc";

export const initialAccountRecords: AccountRecord[] = [];
