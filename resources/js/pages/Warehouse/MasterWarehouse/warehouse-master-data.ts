import type {
  WarehouseMasterRecord,
  WarehouseType,
} from "./warehouse-master-types";

export const warehouseTypesList: WarehouseType[] = [
  "Raw Material",
  "Work In Process",
  "Finish Good",
  "Production",
  "Scrap",
  "Others",
];

export const initialWarehouseMasterRecords: WarehouseMasterRecord[] = [
  {
    id: "wh-1",
    no: 1,
    name: "Gudang ATK",
    type: "Others",
    description: "Gudang untuk penyimpanan alat tulis kantor",
    status: true,
    coordinates: [
      {
        id: "coord-1",
        warehouseId: "wh-1",
        name: "Gudang ATK",
      },
    ],
  },
  {
    id: "wh-2",
    no: 2,
    name: "Gudang Bahan Bakar",
    type: "Others",
    description: "Gudang untuk penyimpanan bahan bakar",
    status: true,
    coordinates: [
      {
        id: "coord-2",
        warehouseId: "wh-2",
        name: "Gudang Bahan Bakar",
      },
    ],
  },
  {
    id: "wh-3",
    no: 3,
    name: "Gudang Buffer",
    type: "Others",
    description: "Gudang penyimpanan sementara material BB",
    status: true,
    coordinates: [],
  },
  {
    id: "wh-4",
    no: 4,
    name: "Gudang Finish Good",
    type: "Finish Good",
    description: "Gudang untuk klasifikasi barang jadi tembaga, timah",
    status: true,
    coordinates: [
      {
        id: "coord-4-1",
        warehouseId: "wh-4",
        name: "Area Finishing",
      },
      {
        id: "coord-4-2",
        warehouseId: "wh-4",
        name: "Staging FG",
      },
    ],
  },
  {
    id: "wh-5",
    no: 5,
    name: "Gudang HSE",
    type: "Others",
    description: "Gudang untuk penyimpanan barang HSE",
    status: true,
    coordinates: [
      {
        id: "coord-5",
        warehouseId: "wh-5",
        name: "Gudang HSE",
      },
    ],
  },
  {
    id: "wh-6",
    no: 6,
    name: "Gudang IT",
    type: "Others",
    description: "Gudang untuk penyimpanan barang IT",
    status: true,
    coordinates: [
      {
        id: "coord-6",
        warehouseId: "wh-6",
        name: "Server Room Storage",
      },
    ],
  },
  {
    id: "wh-7",
    no: 7,
    name: "Gudang LB3",
    type: "Others",
    description: "",
    status: true,
    coordinates: [],
  },
  {
    id: "wh-8",
    no: 8,
    name: "Gudang Produksi",
    type: "Production",
    description: "Area produksi Reverb, Battery Breaker, Furnace, Refining",
    status: true,
    coordinates: [
      {
        id: "coord-8-1",
        warehouseId: "wh-8",
        name: "Area Reverb",
      },
      {
        id: "coord-8-2",
        warehouseId: "wh-8",
        name: "Area Furnace",
      },
      {
        id: "coord-8-3",
        warehouseId: "wh-8",
        name: "Area Refining",
      },
    ],
  },
  {
    id: "wh-9",
    no: 9,
    name: "Gudang Raw Material",
    type: "Raw Material",
    description: "Gudang untuk klasifikasi bahan baku tembaga, timah",
    status: true,
    coordinates: [
      {
        id: "coord-9",
        warehouseId: "wh-9",
        name: "Gudang Raw Material",
      },
    ],
  },
  {
    id: "wh-10",
    no: 10,
    name: "Gudang Sample",
    type: "Others",
    description: "Gudang untuk penyimpanan sample",
    status: true,
    coordinates: [],
  },
  {
    id: "wh-11",
    no: 11,
    name: "Gudang Sisa Produksi",
    type: "Others",
    description: "Gudang untuk penyimpanan sisa produksi",
    status: true,
    coordinates: [
      {
        id: "coord-11",
        warehouseId: "wh-11",
        name: "Area Scrap A",
      },
    ],
  },
  {
    id: "wh-12",
    no: 12,
    name: "Gudang Slag",
    type: "Others",
    description: "Gudang untuk penyimpanan slag",
    status: true,
    coordinates: [],
  },
  {
    id: "wh-13",
    no: 13,
    name: "Gudang Sparepart",
    type: "Others",
    description: "Gudang untuk penyimpanan Sparepart",
    status: true,
    coordinates: [
      {
        id: "coord-13-1",
        warehouseId: "wh-13",
        name: "Rak Mekanik",
      },
      {
        id: "coord-13-2",
        warehouseId: "wh-13",
        name: "Rak Elektrik",
      },
    ],
  },
  {
    id: "wh-14",
    no: 14,
    name: "Gudang Sub Material",
    type: "Others",
    description: "Gudang untuk penyimpanan Sub Material",
    status: true,
    coordinates: [],
  },
  {
    id: "wh-15",
    no: 15,
    name: "Gudang Umum",
    type: "Others",
    description: "Gudang Aset dan Umum",
    status: true,
    coordinates: [
      {
        id: "coord-15",
        warehouseId: "wh-15",
        name: "Gudang Umum",
      },
    ],
  },
  {
    id: "wh-16",
    no: 16,
    name: "UMUM",
    type: "Others",
    description: "UMUM",
    status: true,
    coordinates: [
      {
        id: "coord-16",
        warehouseId: "wh-16",
        name: "UMUM",
      },
    ],
  },
];
