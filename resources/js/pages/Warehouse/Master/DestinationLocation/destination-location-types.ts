export interface DestinationLocationRecord {
  id: string;
  no: number;
  code: string;
  name: string;
  locationType: "Production Area" | "Warehouse" | "Workshop" | "Laboratory" | "Office" | "Shipping Area";
  pic: string;
  description: string;
  status: "Active" | "Inactive";
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export type DestinationLocationSortField =
  | "no"
  | "code"
  | "name"
  | "locationType"
  | "pic"
  | "status";
