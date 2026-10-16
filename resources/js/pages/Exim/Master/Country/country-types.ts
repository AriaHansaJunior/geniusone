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

export const initialCountryRecords: CountryRecord[] = [
  {
    id: "country-1",
    no: 1,
    code: "ID",
    name: "INDONESIA",
    status: true,
    createdAt: "2026-01-10 09:30:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-2",
    no: 2,
    code: "CN",
    name: "CHINA",
    status: true,
    createdAt: "2026-01-10 09:32:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-3",
    no: 3,
    code: "SG",
    name: "SINGAPORE",
    status: true,
    createdAt: "2026-01-11 11:15:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-4",
    no: 4,
    code: "JP",
    name: "JAPAN",
    status: true,
    createdAt: "2026-01-11 14:20:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-5",
    no: 5,
    code: "US",
    name: "UNITED STATES",
    status: true,
    createdAt: "2026-01-12 10:05:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-6",
    no: 6,
    code: "MY",
    name: "MALAYSIA",
    status: true,
    createdAt: "2026-01-12 15:40:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-7",
    no: 7,
    code: "DE",
    name: "GERMANY",
    status: true,
    createdAt: "2026-01-14 08:50:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-8",
    no: 8,
    code: "KR",
    name: "SOUTH KOREA",
    status: true,
    createdAt: "2026-01-15 16:10:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-9",
    no: 9,
    code: "AU",
    name: "AUSTRALIA",
    status: true,
    createdAt: "2026-01-16 11:25:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-10",
    no: 10,
    code: "TH",
    name: "THAILAND",
    status: true,
    createdAt: "2026-01-18 13:45:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-11",
    no: 11,
    code: "VN",
    name: "VIETNAM",
    status: true,
    createdAt: "2026-01-20 09:15:00",
    createdBy: "ADMINISTRATOR",
  },
  {
    id: "country-12",
    no: 12,
    code: "TW",
    name: "TAIWAN",
    status: true,
    createdAt: "2026-01-22 14:00:00",
    createdBy: "ADMINISTRATOR",
  },
];
