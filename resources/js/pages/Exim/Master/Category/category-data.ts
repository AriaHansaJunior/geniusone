import type { CategoryRecord } from "./category-types";

export const initialCategoryRecords: CategoryRecord[] = [
  {
    id: "cat-1",
    no: 1,
    code: "CAT-RAW",
    name: "Bahan Baku Logam",
    description: "Bahan baku utama timah, baterai bekas, dan scrap logam",
    status: true,
  },
  {
    id: "cat-2",
    no: 2,
    code: "CAT-SPARE",
    name: "Suku Cadang & Komponen",
    description: "Suku cadang mesin, komponen elektrikal, dan mechanical parts",
    status: true,
  },
  {
    id: "cat-3",
    no: 3,
    code: "CAT-CHEM",
    name: "Bahan Kimia Industri",
    description: "Reagent kimia, asam sulfat, dan cairan proses smelting",
    status: true,
  },
  {
    id: "cat-4",
    no: 4,
    code: "CAT-HSE",
    name: "Alat Pelindung Diri (APD)",
    description: "Peralatan keselamatan kerja, kacamata safety, dan masker",
    status: true,
  },
  {
    id: "cat-5",
    no: 5,
    code: "CAT-UMUM",
    name: "Umum & Konsumsi Pabrik",
    description: "Perlengkapan operasional pabrik dan material umum",
    status: true,
  },
];
