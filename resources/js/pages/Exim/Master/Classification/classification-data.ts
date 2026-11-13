import type { ClassificationRecord } from "./classification-types";

export const initialClassificationRecords: ClassificationRecord[] = [];

export const reportingTypeOptions = [
  "Select Classification",
  "Mutasi Bahan Baku dan Penolong",
  "Mutasi Barang Jadi dan Scrap",
  "Mutasi Barang Sisa Produksi dan Scrap",
  "Mutasi Peralatan Kantor",
  "Mutasi Barang Modal",
  "Mutasi Bahan Bakar Produksi",
  "Mutasi Bahan Penelitian",
  "WIP",
];

export const accountOptions = [
  "Find Account",
  "1101 - Kas & Bank",
  "1140 - Persediaan Bahan Baku",
  "1141 - Persediaan Bahan Penolong",
  "1142 - Persediaan Barang Jadi",
  "1143 - Persediaan Barang Dalam Proses (WIP)",
  "1144 - Persediaan Suku Cadang & Perlengkapan",
  "1145 - Persediaan Barang Dagangan",
  "1301 - Aset Tetap - Mesin & Peralatan",
  "5101 - Beban Operasional / Umum",
];
