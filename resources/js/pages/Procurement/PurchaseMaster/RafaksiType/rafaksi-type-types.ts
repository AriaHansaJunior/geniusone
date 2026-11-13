export interface RafaksiTypeRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  description: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
}

export type RafaksiTypeSortField = "code" | "name" | "description" | "status";
export type SortDirection = "none" | "asc" | "desc";
