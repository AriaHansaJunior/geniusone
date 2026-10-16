import { apiGet, apiPost, apiPut, apiDelete } from "./api";
import type { SupplierRecord, SupplierFormData } from "../pages/Procurement/PurchaseMaster/Supplier/supplier-types";
import type { PaymentTermRecord } from "../pages/Procurement/PurchaseMaster/PaymentTerm/payment-term-types";
import type { PurchaseCategoryRecord } from "../pages/Procurement/PurchaseMaster/PurchaseCategory/purchase-category-types";
import type { DeliveryTermRecord } from "../pages/Procurement/PurchaseMaster/DeliveryTerms/delivery-terms-types";
import type { AdditionalCostRecord } from "../pages/Procurement/PurchaseMaster/AdditionalCosts/additional-costs-types";
import type { PphRecord } from "../pages/Procurement/PurchaseMaster/Pph/pph-types";
import type { UnitRecord } from "../pages/Exim/Master/Unit/unit-types";
import type { ClassificationRecord } from "../pages/Exim/Master/Classification/classification-types";
import type { DepartmentRecord } from "../pages/Exim/Master/Department/department-types";
import type { BrandRecord } from "../pages/Exim/Master/Brand/brand-types";
import type { FacilityRecord } from "../pages/Exim/Master/Facility/facility-types";
import type { HsRecord } from "../pages/Exim/Master/Hs/hs-types";
import type { CategoryRecord } from "../pages/Exim/Master/Category/category-types";
import type { StyleRecord } from "../pages/Exim/Master/Style/style-types";
import type { ColorRecord } from "../pages/Exim/Master/Color/color-types";
import type { ItemRecord } from "../pages/Exim/Master/Item/item-types";
import type {
  WarehouseMasterRecord,
  WarehouseCoordinateRecord,
  WarehouseType,
} from "../pages/Warehouse/MasterWarehouse/warehouse-master-types";
import type { CountryRecord } from "../pages/Exim/Master/Country/country-types";
import type { RafaksiTypeRecord } from "../pages/Procurement/PurchaseMaster/RafaksiType/rafaksi-type-types";
import type { CurrencyRecord } from "../pages/Exim/Master/Currency/currency-types";
import type { AccountRecord } from "../pages/Exim/Master/Account/account-types";
import type { JobNumberRecord } from "../pages/Procurement/PurchaseMaster/JobNumber/job-number-types";

// ============================================================================
// 1. PROCUREMENT MASTER FETCH & MUTATION HELPERS
// ============================================================================

export async function fetchMasterSuppliers(): Promise<SupplierRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/suppliers");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): SupplierRecord => ({
    id: String(item.id),
    no: idx + 1,
    supplierCode: item.code || "",
    supplierName: item.name || "",
    address: item.address || "",
    country: item.country?.name || (typeof item.country === "string" ? item.country : ""),
    npwp: item.npwp || "",
    nitku: item.nitku || "",
    createdBy: item.created_by_user?.name || "System",
    createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : "",
    hidden: false,
  }));
}

export async function saveSupplierApi(data: SupplierFormData): Promise<SupplierRecord | null> {
  const payload = {
    name: data.supplierName,
    code: data.supplierCode || undefined,
    address: data.address,
    contact_person: data.contactPerson,
    city: data.city,
    state: data.state,
    country: data.country,
    zipcode: data.zipcode,
    email: data.email,
    telephone_number: data.telephoneNumber,
    payment_term: data.paymentTerm,
    payment_method: data.paymentMethod,
    npwp: data.npwp,
    nitku: data.nitku,
    whatsapp: data.whatsapp,
    wechat_id: data.wechatId,
  };
  const res = await apiPost<{ data: any }>("/api/procurement/master/suppliers", payload);
  if (!res || !res.data) return null;

  const item = res.data;
  return {
    id: String(item.id),
    no: 1,
    supplierCode: item.code || data.supplierCode || "",
    supplierName: item.name || data.supplierName,
    address: item.address || data.address,
    country: item.country?.name || data.country,
    npwp: item.npwp || data.npwp,
    nitku: item.nitku || data.nitku,
    createdBy: "ADMINISTRATOR",
    createdAt: new Date().toLocaleDateString(),
    hidden: false,
  };
}

export async function fetchMasterPaymentTerms(): Promise<PaymentTermRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/payment-terms");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): PaymentTermRecord => ({
    id: String(item.id),
    no: idx + 1,
    name: item.name || "",
    hidden: item.status === 0,
  }));
}

export async function savePaymentTermApi(name: string): Promise<PaymentTermRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/payment-terms", { name, status: 1 });
  if (!res || !res.data) return null;
  return {
    id: String(res.data.id),
    no: 1,
    name: res.data.name || name,
  };
}

export async function fetchMasterPurchaseCategories(): Promise<PurchaseCategoryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/purchase-categories");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): PurchaseCategoryRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || "",
    name: item.name || "",
    hidden: item.status === 0,
  }));
}

export async function savePurchaseCategoryApi(code: string, name: string): Promise<PurchaseCategoryRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/purchase-categories", { code, name, status: 1 });
  if (!res || !res.data) return null;
  return {
    id: String(res.data.id),
    no: 1,
    code: res.data.code || code,
    name: res.data.name || name,
  };
}

export async function fetchMasterDeliveryTerms(): Promise<DeliveryTermRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/delivery-terms");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): DeliveryTermRecord => ({
    id: String(item.id),
    no: idx + 1,
    name: item.name || "",
    hidden: item.status === 0,
  }));
}

export async function saveDeliveryTermApi(name: string): Promise<DeliveryTermRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/delivery-terms", { name, status: 1 });
  if (!res || !res.data) return null;
  return {
    id: String(res.data.id),
    no: 1,
    name: res.data.name || name,
  };
}

export async function fetchMasterAdditionalCosts(): Promise<AdditionalCostRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/additional-costs");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): AdditionalCostRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || "",
    name: item.name || "",
    hidden: item.status === 0,
  }));
}

export async function saveAdditionalCostApi(code: string, name: string): Promise<AdditionalCostRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/additional-costs", { code, name, status: 1 });
  if (!res || !res.data) return null;
  return {
    id: String(res.data.id),
    no: 1,
    code: res.data.code || code,
    name: res.data.name || name,
  };
}

export async function fetchMasterPph(): Promise<PphRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/pph");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any): PphRecord => ({
    id: String(item.id),
    name: item.name || "",
    rate: item.rate !== undefined ? parseFloat(item.rate) : 0,
    deduction: item.deduction || "-",
    type: item.type || undefined,
    hidden: item.status === 0,
  }));
}

export async function savePphApi(record: PphRecord): Promise<PphRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/pph", {
    name: record.name,
    rate: record.rate,
    status: 1,
  });
  if (!res || !res.data) return null;
  return {
    ...record,
    id: String(res.data.id),
  };
}

// ============================================================================
// 2. EXIM MASTER FETCH & MUTATION HELPERS
// ============================================================================

export async function fetchMasterUnits(): Promise<UnitRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/units");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): UnitRecord => ({
    id: String(item.id),
    no: idx + 1,
    name: item.nama || item.name || "",
    createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : undefined,
    createdBy: item.created_by || "ADMINISTRATOR",
  }));
}

export async function saveUnitApi(record: UnitRecord, isEdit: boolean): Promise<UnitRecord | null> {
  if (isEdit) {
    await apiPut(`/api/exim/master/units/${record.id}`, { name: record.name, status: 1 });
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/units", { name: record.name, status: 1 });
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteUnitApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/units/${id}`);
}

export async function fetchMasterBrands(): Promise<BrandRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/brands");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): BrandRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || "",
    name: item.name || "",
    description: item.description || "",
    status: item.status !== 0,
  }));
}

export async function saveBrandApi(record: BrandRecord, isEdit: boolean): Promise<BrandRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/brands/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/brands", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteBrandApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/brands/${id}`);
}

export async function fetchMasterClassifications(): Promise<ClassificationRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/classifications");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): ClassificationRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || "",
    name: item.name || "",
    description: item.description || "",
    reportingType: item.reporting_type || item.reportingType || "-",
    account: item.account || undefined,
    status: item.status !== 0,
  }));
}

export async function saveClassificationApi(record: ClassificationRecord, isEdit: boolean): Promise<ClassificationRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/classifications/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/classifications", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteClassificationApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/classifications/${id}`);
}

export async function fetchMasterDepartments(): Promise<DepartmentRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/departments");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): DepartmentRecord => ({
    id: String(item.id),
    no: idx + 1,
    sectionName: item.name || item.sectionName || item.section_name || "",
    unit: item.unit?.name || item.unit?.nama || (typeof item.unit === "string" ? item.unit : "-"),
    status: item.status !== 0,
  }));
}

export async function saveDepartmentApi(record: DepartmentRecord, isEdit: boolean): Promise<DepartmentRecord | null> {
  const payload = {
    name: record.sectionName,
    status: record.status ? 1 : 0,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/departments/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/departments", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteDepartmentApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/departments/${id}`);
}

export async function fetchMasterFacilities(): Promise<FacilityRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/facilities");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): FacilityRecord => ({
    id: String(item.id),
    no: idx + 1,
    name: item.name || "",
    description: item.description || "",
    status: item.status !== 0,
  }));
}

export async function saveFacilityApi(record: FacilityRecord, isEdit: boolean): Promise<FacilityRecord | null> {
  const payload = {
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/facilities/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/facilities", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteFacilityApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/facilities/${id}`);
}

export async function fetchMasterHsCodes(): Promise<HsRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/hs-codes");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): HsRecord => ({
    id: String(item.id),
    no: idx + 1,
    name: item.code || item.name || "",
    description: item.description || "",
    typeRateBm: item.type_rate_bm || item.typeRateBm || "ADVOLORUM",
    ratesBm: parseFloat(item.bm ?? item.ratesBm ?? 0),
    typeRateCukai: item.type_rate_cukai || item.typeRateCukai || "-",
    ratesCukai: parseFloat(item.cukai ?? item.ratesCukai ?? 0),
    ratesPpn: parseFloat(item.ppn ?? item.ratesPpn ?? 11),
    ratesPph: parseFloat(item.pph ?? item.ratesPph ?? 2.5),
    ratesPpnbm: parseFloat(item.ppnbm ?? item.ratesPpnbm ?? 0),
  }));
}

export async function saveHsApi(record: HsRecord, isEdit: boolean): Promise<HsRecord | null> {
  const payload = {
    code: record.name,
    description: record.description,
    bm: record.ratesBm,
    ppn: record.ratesPpn,
    pph: record.ratesPph,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/hs-codes/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/hs-codes", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteHsApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/hs-codes/${id}`);
}

export async function fetchMasterCategories(): Promise<CategoryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/categories");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): CategoryRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || "",
    name: item.name || "",
    description: item.description || "",
    status: item.status !== 0,
  }));
}

export async function saveCategoryApi(record: CategoryRecord, isEdit: boolean): Promise<CategoryRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/categories/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/categories", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteCategoryApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/categories/${id}`);
}

export async function fetchMasterStyles(): Promise<StyleRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/styles");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): StyleRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || "",
    name: item.name || "",
    description: item.description || "",
    status: item.status !== 0,
  }));
}

export async function saveStyleApi(record: StyleRecord, isEdit: boolean): Promise<StyleRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/styles/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/styles", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteStyleApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/styles/${id}`);
}

export async function fetchMasterColours(): Promise<ColorRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/colours");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): ColorRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || "",
    name: item.name || "",
  }));
}

export async function saveColorApi(record: ColorRecord): Promise<ColorRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
  };
  const res = await apiPost<{ data: any }>("/api/exim/master/colours", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function fetchMasterItems(): Promise<ItemRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/items");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): ItemRecord => ({
    id: String(item.id),
    no: idx + 1,
    itemCode: item.code || item.itemCode || "",
    itemName: item.name || item.itemName || "",
    classification: item.classification?.name || item.classification || "RAW MATERIAL",
    category: item.category?.name || item.category || "GENERAL",
    smallestUnitCode: item.unit?.code || item.smallestUnitCode || "PCS",
    smallestUnitName: item.unit?.name || item.unit?.nama || item.smallestUnitName || "Pieces",
    greatestUnitCode: item.greatestUnitCode || "PCS",
    greatestUnitName: item.greatestUnitName || "Pieces",
    facility: item.facility || "FASILITAS",
    brand: item.brand?.name || item.brand || "-",
    style: item.style?.name || item.style || "-",
    traceByLot: item.trace_by_lot ?? item.traceByLot ?? false,
    status: item.status === 0 || item.status === "Inactive" ? "Inactive" : "Active",
    createdAt: item.created_at ? new Date(item.created_at).toLocaleDateString() : "",
    createdBy: item.created_by || "System",
    updatedAt: item.updated_at ? new Date(item.updated_at).toLocaleDateString() : "",
    updatedBy: "System",
  }));
}

export async function saveItemApi(record: ItemRecord, isEdit: boolean): Promise<ItemRecord | null> {
  const payload = {
    code: record.itemCode,
    name: record.itemName,
    status: record.status === "Active" ? 1 : 0,
  };
  if (isEdit) {
    await apiPut(`/api/exim/master/items/${record.id}`, payload);
    return record;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/items", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function deleteItemApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/items/${id}`);
}

// ============================================================================
// 3. WAREHOUSE MASTER & COORDINATES
// ============================================================================

export async function fetchMasterWarehouses(): Promise<WarehouseMasterRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/master/warehouses");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): WarehouseMasterRecord => ({
    id: String(item.id),
    no: idx + 1,
    name: item.name || "",
    type: (item.type as WarehouseType) || "Raw Material",
    description: item.address || item.description || "",
    status: item.status !== 0,
    coordinates: Array.isArray(item.coordinates)
      ? item.coordinates.map((c: any) => ({
          id: String(c.id),
          warehouseId: String(item.id),
          name: c.name || c.code || "",
        }))
      : [],
  }));
}

export async function saveWarehouseMasterApi(record: WarehouseMasterRecord): Promise<WarehouseMasterRecord | null> {
  const payload = {
    code: `WH-${Date.now().toString().slice(-4)}`,
    name: record.name,
    address: record.description,
  };
  const res = await apiPost<{ data: any }>("/api/warehouse/master/warehouses", payload);
  return {
    ...record,
    id: res?.data?.id ? String(res.data.id) : record.id,
  };
}

export async function saveWarehouseCoordinateApi(coord: WarehouseCoordinateRecord): Promise<WarehouseCoordinateRecord | null> {
  const payload = {
    code: coord.name,
    name: coord.name,
  };
  const res = await apiPost<{ data: any }>(`/api/warehouse/master/warehouses/${coord.warehouseId}/coordinates`, payload);
  return {
    ...coord,
    id: res?.data?.id ? String(res.data.id) : coord.id,
  };
}

export async function deleteWarehouseCoordinateApi(coordId: string): Promise<boolean> {
  return apiDelete(`/api/warehouse/master/coordinates/${coordId}`);
}

export async function fetchMasterCountries(): Promise<CountryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/countries");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): CountryRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || `CTR-${String(item.id).padStart(3, "0")}`,
    name: item.name || "",
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  }));
}

export async function fetchMasterRafaksiTypes(): Promise<RafaksiTypeRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/rafaksi-types");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): RafaksiTypeRecord => ({
    id: String(item.id),
    no: idx + 1,
    code: item.code || `RAF-${String(item.id).padStart(3, "0")}`,
    name: item.name || "",
    description: item.description || "",
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  }));
}

export async function fetchMasterCurrencies(): Promise<CurrencyRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/currencies");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): CurrencyRecord => ({
    id: String(item.id),
    no: idx + 1,
    currencyCode: item.code || item.currency_code || "",
    currencyName: item.name || item.currency_name || "",
    symbol: item.symbol || "",
    exchangeRate: Number(item.exchange_rate) || 1.0,
    syncStatus: item.sync_status || "Synced",
    lastSyncTime: item.last_sync_time || new Date().toISOString().replace("T", " ").substring(0, 19),
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  }));
}

export async function fetchMasterAccounts(): Promise<AccountRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/accounts");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): AccountRecord => ({
    id: String(item.id),
    no: idx + 1,
    accountCode: item.code || item.account_code || "",
    accountName: item.name || item.account_name || "",
    accountType: item.type || "Asset",
    description: item.description || "",
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  }));
}

export async function fetchMasterJobNumbers(): Promise<JobNumberRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/job-numbers");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any, idx: number): JobNumberRecord => ({
    id: String(item.id),
    no: idx + 1,
    jobNumber: item.code || item.job_number || item.name || "",
    jobName: item.name || item.job_name || "",
    department: item.department || "Production",
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  }));
}
