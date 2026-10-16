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

export const initialJobNumberRecords: JobNumberRecord[] = [
  {
    id: "job-1",
    no: 1,
    jobNumber: "JOB-2026-001",
    jobName: "SMELTING LINE EXPANSION LOT A",
    department: "SMELTING",
    status: true,
    createdAt: "2026-01-08 09:00:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "job-2",
    no: 2,
    jobNumber: "JOB-2026-002",
    jobName: "FURNACE MAINTENANCE & REFRACTORY OVERHAUL",
    department: "MAINTENANCE",
    status: true,
    createdAt: "2026-01-08 09:15:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "job-3",
    no: 3,
    jobNumber: "JOB-2026-003",
    jobName: "REVERB CASTING VENTILATION UPGRADE",
    department: "REVERB",
    status: true,
    createdAt: "2026-01-09 11:30:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "job-4",
    no: 4,
    jobNumber: "JOB-2026-004",
    jobName: "HSE ENVIRONMENTAL SCRUBBER RETROFIT",
    department: "HSE",
    status: true,
    createdAt: "2026-01-10 14:00:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "job-5",
    no: 5,
    jobNumber: "JOB-2026-005",
    jobName: "ELECTRICAL SUBSTATION RELAY COMMISSIONING",
    department: "TEKNIK",
    status: true,
    createdAt: "2026-01-12 10:20:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "job-6",
    no: 6,
    jobNumber: "JOB-2026-006",
    jobName: "PPIC WAREHOUSE PALLET RACKING INSTALLATION",
    department: "PPIC",
    status: true,
    createdAt: "2026-01-15 13:40:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "job-7",
    no: 7,
    jobNumber: "JOB-2026-007",
    jobName: "INGOT COOLING CONVEYOR AUTOMATION",
    department: "PRODUCTION",
    status: true,
    createdAt: "2026-01-18 16:15:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "job-8",
    no: 8,
    jobNumber: "JOB-2026-008",
    jobName: "BAG FILTER DUST COLLECTOR REPLACEMENT",
    department: "MAINTENANCE",
    status: true,
    createdAt: "2026-01-20 08:45:00",
    createdBy: "ADMINISTRATOR",
  },
];
