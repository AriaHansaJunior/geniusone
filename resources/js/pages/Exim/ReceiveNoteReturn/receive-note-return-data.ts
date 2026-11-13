import type {
  ReceiveNoteReturnRecord,
  SalesReturnItemToPick,
} from "./receive-note-return-types";

export const initialReceiveNoteReturnRecords: ReceiveNoteReturnRecord[] = [];
export const customerList = ["Choose Customer"];
export const docTypesList = [
  "All Type of Documents",
  "BC 4.0",
  "BC 2.3",
  "BC 2.7",
  "Non-Fasilitas",
];
export const returnTypesList = [
  "Select Type of Return",
  "Sales Delivery",
  "Consignment",
  "Internal Return",
];
export const vehicleTypesList = [
  "Select Option...",
  "SEPEDA MOTOR",
  "MOBIL BARANG",
  "TRUK BOX",
  "CONTAINER 20FT",
  "CONTAINER 40FT",
  "PICKUP",
];
export const currencyList = [
  "Select Currency",
  "IDR - RUPIAH",
  "USD - US DOLLAR",
  "EUR - EURO",
  "SGD - SINGAPORE DOLLAR",
];
export const availableSalesReturnItemsToPick: SalesReturnItemToPick[] = [];
