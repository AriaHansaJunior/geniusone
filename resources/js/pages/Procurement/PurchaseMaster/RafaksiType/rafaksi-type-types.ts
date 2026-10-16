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

export const initialRafaksiTypeRecords: RafaksiTypeRecord[] = [
  {
    id: "rfk-1",
    no: 1,
    code: "RFK-01",
    name: "Rafaksi Berat",
    description: "Weight deduction due to moisture content or packaging tare",
    status: true,
    createdAt: "2026-01-05 08:30:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "rfk-2",
    no: 2,
    code: "RFK-02",
    name: "Rafaksi Harga",
    description: "Price adjustment or deduction for grade variance from agreed spec",
    status: true,
    createdAt: "2026-01-05 08:35:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "rfk-3",
    no: 3,
    code: "RFK-03",
    name: "Rafaksi Kualitas",
    description: "Quality penalty based on chemical assay or impurity limits",
    status: true,
    createdAt: "2026-01-06 10:10:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "rfk-4",
    no: 4,
    code: "RFK-04",
    name: "Rafaksi Kadar Air",
    description: "Deduction specifically calculated against excess moisture percentage",
    status: true,
    createdAt: "2026-01-08 14:20:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "rfk-5",
    no: 5,
    code: "RFK-05",
    name: "Rafaksi Kemurnian Logam",
    description: "Assay penalty for metal content below contracted standard grade",
    status: true,
    createdAt: "2026-01-12 11:45:00",
    createdBy: "ADMINISTRATOR",
  },
];
