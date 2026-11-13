import type { ItemRecord, ItemColumnConfig } from "./item-types";

export const defaultItemColumns: ItemColumnConfig[] = [
  { key: "itemCode", label: "Item Code", visible: true, minWidth: 140 },
  { key: "kodeEksternal", label: "Kode Eksternal", visible: true, minWidth: 130 },
  { key: "itemName", label: "Item Name", visible: true, minWidth: 260 },
  { key: "classification", label: "Classification", visible: true, minWidth: 180 },
  { key: "category", label: "Category", visible: true, minWidth: 120 },
  { key: "hsCode", label: "HS Code", visible: true, minWidth: 120 },
  { key: "smallestUnit", label: "Smallest Unit", visible: true, minWidth: 110 },
  { key: "greatestUnit", label: "Greatest Unit", visible: true, minWidth: 110 },
  { key: "facility", label: "Facility", visible: true, minWidth: 130 },
  { key: "groupScrap", label: "Group Scrap", visible: true, minWidth: 120 },
  { key: "specification", label: "Specification", visible: true, minWidth: 140 },
  { key: "origin", label: "Origin", visible: true, minWidth: 100 },
  { key: "colour", label: "Colour", visible: true, minWidth: 100 },
  { key: "brand", label: "Brand", visible: true, minWidth: 120 },
  { key: "style", label: "Style", visible: true, minWidth: 110 },
  { key: "customReport", label: "Custom Report", visible: true, minWidth: 130 },
  { key: "traceByLot", label: "Trace By Lot", visible: true, minWidth: 110 },
  { key: "status", label: "Status", visible: true, minWidth: 90 },
  { key: "createdAt", label: "Created at", visible: true, minWidth: 160 },
  { key: "updatedAt", label: "Updated at", visible: true, minWidth: 160 },
  { key: "option", label: "Option", visible: true, minWidth: 80 },
];

export const initialItemRecords: ItemRecord[] = [];

export const itemCategories = [
  "All Categories",
  "Umum",
  "Bahan Baku",
  "Stainless",
  "Sparepart",
];

export const itemClassifications = [
  "All Classifications",
  "MESIN & SPARE PART",
  "PERLENGKAPAN PABRIK",
  "RAW MATERIAL (BAHAN BAKU)",
  "BAHAN PEMBANTU",
];
