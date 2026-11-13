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
  hidden?: boolean;
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
