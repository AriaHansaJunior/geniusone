export interface PurchaseCategoryRecord {
  id: string;
  categoryCode: string;
  categoryName: string;
}

export const initialPurchaseCategoryRecords: PurchaseCategoryRecord[] = [
  { id: "pc-1", categoryCode: "01", categoryName: "Lokal" },
  { id: "pc-2", categoryCode: "02", categoryName: "Import" },
  { id: "pc-3", categoryCode: "03", categoryName: "Langsung" },
  { id: "pc-4", categoryCode: "05", categoryName: "Jasa" },
];
