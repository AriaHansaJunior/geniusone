export interface PphRecord {
  id: string;
  name: string;
  rate: number;
  deduction: string;
  type?: string;
  hidden?: boolean;
}

export const initialPphRecords: PphRecord[] = [
  { id: "pph-1", name: "PBBKB - MIGAS", rate: 0.8585, deduction: "-" },
  { id: "pph-2", name: "PPh - 23", rate: 2.0000, deduction: "No" },
  { id: "pph-3", name: "PPh 21 - NON NPWP", rate: 6.0000, deduction: "No" },
  { id: "pph-4", name: "PPh 21 - NPWP", rate: 5.0000, deduction: "-" },
  { id: "pph-5", name: "PPh 22 - IMPORT", rate: 2.5000, deduction: "-" },
  { id: "pph-6", name: "PPh 22 - MIGAS", rate: 0.3000, deduction: "-" },
  { id: "pph-7", name: "PPh 22 - TAMBANG", rate: 1.5000, deduction: "-" },
  { id: "pph-8", name: "PPh 22 0.1%", rate: 0.1000, deduction: "No" },
  { id: "pph-9", name: "PPh 23 - NON NPWP", rate: 4.0000, deduction: "-" },
  { id: "pph-10", name: "PPh 23 - Pekerjaan Konstruksi Terintegrasi", rate: 2.6500, deduction: "Yes" },
  { id: "pph-11", name: "PPh 31 E - Badan", rate: 0.5000, deduction: "Yes" },
  { id: "pph-12", name: "PPh 4 (2) - KONSTRUKSI KECIL", rate: 1.7500, deduction: "-" },
  { id: "pph-13", name: "PPh 4 (2) - KONSTRUKSI MENENGAH & BESAR", rate: 2.6500, deduction: "-" },
  { id: "pph-14", name: "PPh 4 (2) - KONSTRUKSI NON KU", rate: 4.0000, deduction: "-" },
  { id: "pph-15", name: "PPh 4 (2) - PENGAWAS KONSTRUKSI", rate: 3.5000, deduction: "-" },
  { id: "pph-16", name: "PPh 4 (2) - PENGAWAS KONSTRUKSI NON KU", rate: 6.0000, deduction: "-" },
  { id: "pph-17", name: "PPh 4 (2) - SEWA TANAH & BANGUNAN", rate: 10.0000, deduction: "-" },
  { id: "pph-18", name: "PPH PP 20 Tahun 2026", rate: 0.5000, deduction: "Yes" },
];
