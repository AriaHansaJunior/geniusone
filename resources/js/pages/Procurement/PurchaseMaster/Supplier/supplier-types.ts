export interface SupplierRecord {
  id: string;
  no: number;
  supplierCode: string;
  supplierName: string;
  address: string;
  country: string;
  npwp: string;
  nitku: string;
  createdBy: string;
  createdAt: string;
}

export interface SupplierFormData {
  autoGenerateCode: boolean;
  supplierCode: string;
  supplierName: string;
  address: string;
  contactPerson: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  email: string;
  telephoneNumber: string;
  paymentTerm: string;
  paymentMethod: string;
  typeRafaksi: string;
  currency: string;
  port: string;
  npwp: string;
  nitku: string;
  whatsapp: string;
  wechatId: string;
}

export const initialSupplierRecords: SupplierRecord[] = [
  {
    id: "sup-1",
    no: 1,
    supplierCode: "",
    supplierName: "Guangzhou Liancheng Energy Technology Development Co., Ltd.",
    address: "3F, Building 11, Tian'an Headquarters Centre (511400), No. 555 Panyu Avenue North, Panyu District, Guangzhou, P. R. China.",
    country: "CHINA",
    npwp: "",
    nitku: "",
    createdBy: "MEIZHEL",
    createdAt: "26-08-2026 14:58",
  },
  {
    id: "sup-2",
    no: 2,
    supplierCode: "PSL.0001",
    supplierName: "PT. ALDERON PRATAMA INDONESIA",
    address: "Altira Tower lt.37 Altira Bussiness Park. Jalan Yos Sudarso kav.85",
    country: "INDONESIA",
    npwp: "727131559048000",
    nitku: "",
    createdBy: "IMLISECT-02",
    createdAt: "15-07-2026 16:56",
  },
  {
    id: "sup-3",
    no: 3,
    supplierCode: "A SL.0001",
    supplierName: "A Stationery, Toko",
    address: "Jl. Bintaro Gunung Gangsir, Beji, Pasuruan",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "28-08-2025 13:25",
  },
  {
    id: "sup-4",
    no: 4,
    supplierCode: "A.SL.0001",
    supplierName: "A.Snack",
    address: "Jl. Hasan Munadi, Gunung Gangsir, Beji, Pasuruan",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "11-11-2025 09:44",
  },
  {
    id: "sup-5",
    no: 5,
    supplierCode: "A3SL.0001",
    supplierName: "A3 Mitra Andalan, CV",
    address: "Kedung Mangu Timur gang II no 21",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "29-04-2025 10:53",
  },
  {
    id: "sup-6",
    no: 6,
    supplierCode: "A3SL.0002",
    supplierName: "A3 Printing Surabaya",
    address: "Jl. Randu no. 61",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "25-07-2025 14:52",
  },
  {
    id: "sup-7",
    no: 7,
    supplierCode: "ABSL.0001",
    supplierName: "PT. Abadi Metal Utama",
    address: "Jl. Raya Sukomanunggal Jaya A6",
    country: "INDONESIA",
    npwp: "0024578734604000",
    nitku: "0024578734604000000000",
    createdBy: "Lidya",
    createdAt: "29-04-2024 10:33",
  },
  {
    id: "sup-8",
    no: 8,
    supplierCode: "ABSL.0002",
    supplierName: "ABS Elektronik",
    address: "Jl. Hasan Munadi, Gununggangsir, Beji, Pasuruan",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "29-04-2024 10:33",
  },
  {
    id: "sup-9",
    no: 9,
    supplierCode: "ABSL.0003",
    supplierName: "ABCD Plastik",
    address: "Jl. Wicaksana, Gunung Gangsi, Beji, Pasuruan",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "29-04-2024 10:35",
  },
  {
    id: "sup-10",
    no: 10,
    supplierCode: "ABSL.0004",
    supplierName: "Abadi Bengkel",
    address: "Jl. Raya Palur 45, Palur, Solo",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "18-07-2024 10:26",
  },
  {
    id: "sup-11",
    no: 11,
    supplierCode: "ABSL.0005",
    supplierName: "Abdy Teknik Jakarta",
    address: "Jl. Pesing Poglar No. 18, Kedaung Kali Angke, Cengkareng, Jakarta barat 11710",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "Lidya",
    createdAt: "31-01-2025 13:01",
  },
  {
    id: "sup-12",
    no: 12,
    supplierCode: "ABSL.0006",
    supplierName: "ABI MAHENDRA (ABI JAYA)",
    address: "Jln. Rungkut Asri Timur X No. 12",
    country: "INDONESIA",
    npwp: "",
    nitku: "",
    createdBy: "LEVINA",
    createdAt: "19-07-2024 11:15",
  },
];
