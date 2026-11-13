export interface CountryRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  status: boolean;
  createdAt: string;
  createdBy: string;
}

export type CountrySortField = "code" | "name" | "status";
export type SortDirection = "none" | "asc" | "desc";

export const initialCountryRecords: CountryRecord[] = [];
