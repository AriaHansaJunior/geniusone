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

export const initialAccountRecords: AccountRecord[] = [
  {
    id: "acc-1",
    no: 1,
    accountCode: "1101",
    accountName: "RAW MATERIAL INVENTORY",
    category: "Current Asset",
    status: true,
    createdAt: "2026-01-10 08:30:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-2",
    no: 2,
    accountCode: "1102",
    accountName: "SPARE PART INVENTORY",
    category: "Current Asset",
    status: true,
    createdAt: "2026-01-10 08:35:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-3",
    no: 3,
    accountCode: "1103",
    accountName: "WIP PRODUCTION INVENTORY",
    category: "Current Asset",
    status: true,
    createdAt: "2026-01-11 09:20:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-4",
    no: 4,
    accountCode: "1104",
    accountName: "FINISHED GOODS INVENTORY",
    category: "Current Asset",
    status: true,
    createdAt: "2026-01-11 09:25:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-5",
    no: 5,
    accountCode: "2101",
    accountName: "ACCOUNTS PAYABLE - TRADE",
    category: "Current Liability",
    status: true,
    createdAt: "2026-01-12 10:15:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-6",
    no: 6,
    accountCode: "2102",
    accountName: "ACCRUED PURCHASES / UNBILLED",
    category: "Current Liability",
    status: true,
    createdAt: "2026-01-12 10:20:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-7",
    no: 7,
    accountCode: "5101",
    accountName: "COST OF GOODS SOLD - DIRECT MATERIAL",
    category: "Cost of Sales",
    status: true,
    createdAt: "2026-01-14 11:00:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-8",
    no: 8,
    accountCode: "5102",
    accountName: "FREIGHT & INBOUND LOGISTICS",
    category: "Cost of Sales",
    status: true,
    createdAt: "2026-01-14 11:05:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-9",
    no: 9,
    accountCode: "6101",
    accountName: "FACTORY MAINTENANCE & REPAIR",
    category: "Operating Expense",
    status: true,
    createdAt: "2026-01-16 14:10:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "acc-10",
    no: 10,
    accountCode: "6102",
    accountName: "OPERATIONAL CONSUMABLES & SUPPLIES",
    category: "Operating Expense",
    status: true,
    createdAt: "2026-01-18 15:30:00",
    createdBy: "ADMINISTRATOR",
  },
];
