export interface AdditionalCostRecord {
  id: string;
  costCode: string;
  costName: string;
}

export const initialAdditionalCostRecords: AdditionalCostRecord[] = [
  { id: "ac-1", costCode: "0002", costName: "Insurance" },
  { id: "ac-2", costCode: "0003", costName: "Additional Support" },
  { id: "ac-3", costCode: "0004", costName: "Assuransi Fee" },
  { id: "ac-4", costCode: "0005", costName: "Bank Fee" },
  { id: "ac-5", costCode: "0006", costName: "CIF Surabaya Port 1x20 FCL" },
  { id: "ac-6", costCode: "0007", costName: "Courier Fee" },
  { id: "ac-7", costCode: "0008", costName: "Export Packing, Inland Freight" },
  { id: "ac-8", costCode: "0009", costName: "Freight Cost" },
  { id: "ac-9", costCode: "0011", costName: "Ongkos Kirim" },
  { id: "ac-10", costCode: "0012", costName: "Packing Inland Freight Door to Door By Fedex" },
  { id: "ac-11", costCode: "0013", costName: "Shipping Cost" },
  { id: "ac-12", costCode: "0014", costName: "Warranty Claim" },
  { id: "ac-13", costCode: "0018", costName: "Commission" },
  { id: "ac-14", costCode: "0019", costName: "Biaya Jasa Aplikasi" },
  { id: "ac-15", costCode: "0020", costName: "Biaya Layanan" },
  { id: "ac-16", costCode: "0021", costName: "Biaya Top-up GoPay" },
  { id: "ac-17", costCode: "0022", costName: "PPh Psl 22 (0.3%)" },
  { id: "ac-18", costCode: "0023", costName: "Biaya Penanganan" },
  { id: "ac-19", costCode: "0024", costName: "ribbon fargo YMCKO PN 45500 colour" },
  { id: "ac-20", costCode: "0025", costName: "ribbon fargo black" },
  { id: "ac-21", costCode: "0026", costName: "PPN 1.1%" },
  { id: "ac-22", costCode: "0027", costName: "PPh 22 0.1%" },
  { id: "ac-23", costCode: "0028", costName: "PBBKB" },
  { id: "ac-24", costCode: "0029", costName: "Biaya Materai" },
];
