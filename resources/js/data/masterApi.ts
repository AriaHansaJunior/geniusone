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
import type { ReceiveNoteRecord } from "../pages/Exim/ReceiveNote/receive-note-types";
import type { ReceiveNoteReturnRecord } from "../pages/Exim/ReceiveNoteReturn/receive-note-return-types";
import type { DocumentHistoryRecord } from "../pages/Exim/DocumentHistory/document-history-types";
import type { UnitReferenceRecord } from "../pages/Exim/Master/UnitReference/unit-reference-types";
import type { RequestMaterialRecord } from "../pages/Warehouse/Request/RequestMaterial/request-material-types";

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

  return res.data.map((item: any): PurchaseCategoryRecord => ({
    id: String(item.id),
    categoryCode: item.code || "",
    categoryName: item.name || "",
    hidden: item.status === 0,
  }));
}

export async function savePurchaseCategoryApi(code: string, name: string): Promise<PurchaseCategoryRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/purchase-categories", { code, name, status: 1 });
  if (!res || !res.data) return null;
  return {
    id: String(res.data.id),
    categoryCode: res.data.code || code,
    categoryName: res.data.name || name,
  };
}

export async function fetchMasterDeliveryTerms(): Promise<DeliveryTermRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/delivery-terms");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any): DeliveryTermRecord => ({
    id: String(item.id),
    name: item.name || "",
    hidden: item.status === 0,
  }));
}

export async function saveDeliveryTermApi(name: string): Promise<DeliveryTermRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/delivery-terms", { name, status: 1 });
  if (!res || !res.data) return null;
  return {
    id: String(res.data.id),
    name: res.data.name || name,
  };
}

export async function fetchMasterAdditionalCosts(): Promise<AdditionalCostRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/additional-costs");
  if (!res || !Array.isArray(res.data)) return null;

  return res.data.map((item: any): AdditionalCostRecord => ({
    id: String(item.id),
    costCode: item.code || "",
    costName: item.name || "",
    hidden: item.status === 0,
  }));
}

export async function saveAdditionalCostApi(code: string, name: string): Promise<AdditionalCostRecord | null> {
  const res = await apiPost<{ data: any }>("/api/procurement/master/additional-costs", { code, name, status: 1 });
  if (!res || !res.data) return null;
  return {
    id: String(res.data.id),
    costCode: res.data.code || code,
    costName: res.data.name || name,
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
    syncStatus: item.sync_status || "Synced",
    lastSynced: item.last_sync_time || item.last_synced || new Date().toISOString().replace("T", " ").substring(0, 19),
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
    category: item.category || item.type || "Current Asset",
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

// ----------------------------------------------------------------------------
// COUNTRY MUTATIONS
// ----------------------------------------------------------------------------
export async function saveCountryApi(
  data: { code?: string; name: string; status: boolean },
  id?: string
): Promise<CountryRecord | null> {
  const payload = {
    name: data.name,
    status: data.status ? 1 : 0,
  };

  let res: any = null;
  if (id && !id.startsWith("country-")) {
    res = await apiPut(`/api/procurement/master/countries/${id}`, payload);
  } else {
    res = await apiPost("/api/procurement/master/countries", payload);
  }

  if (!res?.data) return null;
  const item = res.data;
  return {
    id: String(item.id),
    no: 1,
    code: item.code || `CTR-${String(item.id).padStart(3, "0")}`,
    name: item.name,
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  };
}

export async function deleteCountryApi(id: string): Promise<boolean> {
  if (id.startsWith("country-")) return true;
  return apiDelete(`/api/procurement/master/countries/${id}`);
}

// ----------------------------------------------------------------------------
// RAFAKSI TYPE MUTATIONS
// ----------------------------------------------------------------------------
export async function saveRafaksiTypeApi(
  data: { code?: string; name: string; description?: string; status: boolean },
  id?: string
): Promise<RafaksiTypeRecord | null> {
  const payload = {
    name: data.name,
    status: data.status ? 1 : 0,
  };

  let res: any = null;
  if (id && !id.startsWith("rafaksi-")) {
    res = await apiPut(`/api/procurement/master/rafaksi-types/${id}`, payload);
  } else {
    res = await apiPost("/api/procurement/master/rafaksi-types", payload);
  }

  if (!res?.data) return null;
  const item = res.data;
  return {
    id: String(item.id),
    no: 1,
    code: item.code || `RAF-${String(item.id).padStart(3, "0")}`,
    name: item.name,
    description: data.description || "",
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  };
}

export async function deleteRafaksiTypeApi(id: string): Promise<boolean> {
  if (id.startsWith("rafaksi-")) return true;
  return apiDelete(`/api/procurement/master/rafaksi-types/${id}`);
}

// ----------------------------------------------------------------------------
// CURRENCY MUTATIONS
// ----------------------------------------------------------------------------
export async function saveCurrencyApi(
  data: { currencyCode: string; currencyName: string; symbol?: string; status?: boolean },
  id?: string
): Promise<CurrencyRecord | null> {
  const payload = {
    code: data.currencyCode,
    name: data.currencyName,
    status: data.status !== false ? 1 : 0,
  };

  let res: any = null;
  if (id && !id.startsWith("currency-")) {
    res = await apiPut(`/api/procurement/master/currencies/${id}`, payload);
  } else {
    res = await apiPost("/api/procurement/master/currencies", payload);
  }

  if (!res?.data) return null;
  const item = res.data;
  return {
    id: String(item.id),
    no: 1,
    currencyCode: item.code,
    currencyName: item.name,
    symbol: data.symbol || "",
    syncStatus: "Synced",
    lastSynced: new Date().toISOString().replace("T", " ").substring(0, 19),
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  };
}

export async function deleteCurrencyApi(id: string): Promise<boolean> {
  if (id.startsWith("currency-")) return true;
  return apiDelete(`/api/procurement/master/currencies/${id}`);
}

// ----------------------------------------------------------------------------
// ACCOUNT MUTATIONS
// ----------------------------------------------------------------------------
export async function saveAccountApi(
  data: { accountCode: string; accountName: string; category?: string; status: boolean },
  id?: string
): Promise<AccountRecord | null> {
  const payload = {
    code: data.accountCode,
    name: data.accountName,
    status: data.status ? "1" : "0",
  };

  let res: any = null;
  if (id && !id.startsWith("account-")) {
    res = await apiPut(`/api/exim/master/accounts/${id}`, payload);
  } else {
    res = await apiPost("/api/exim/master/accounts", payload);
  }

  if (!res?.data) return null;
  const item = res.data;
  return {
    id: String(item.id),
    no: 1,
    accountCode: item.code,
    accountName: item.name,
    category: data.category || "Current Asset",
    status: item.status !== "0" && item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  };
}

export async function deleteAccountApi(id: string): Promise<boolean> {
  if (id.startsWith("account-")) return true;
  return apiDelete(`/api/exim/master/accounts/${id}`);
}

// ----------------------------------------------------------------------------
// JOB NUMBER MUTATIONS
// ----------------------------------------------------------------------------
export async function saveJobNumberApi(
  data: { jobNumber: string; jobName?: string; department?: string; status: boolean },
  id?: string
): Promise<JobNumberRecord | null> {
  const payload = {
    name: data.jobName || data.jobNumber,
    status: data.status ? 1 : 0,
  };

  let res: any = null;
  if (id && !id.startsWith("job-")) {
    res = await apiPut(`/api/exim/master/job-numbers/${id}`, payload);
  } else {
    res = await apiPost("/api/exim/master/job-numbers", payload);
  }

  if (!res?.data) return null;
  const item = res.data;
  return {
    id: String(item.id),
    no: 1,
    jobNumber: data.jobNumber,
    jobName: item.name,
    department: data.department || "Production",
    status: item.status !== 0,
    createdAt: item.created_at ? new Date(item.created_at).toISOString().replace("T", " ").substring(0, 19) : "",
    createdBy: item.created_by || "ADMINISTRATOR",
  };
}

export async function deleteJobNumberApi(id: string): Promise<boolean> {
  if (id.startsWith("job-")) return true;
  return apiDelete(`/api/exim/master/job-numbers/${id}`);
}

// ----------------------------------------------------------------------------
// RECEIVE NOTE FETCH HELPERS
// ----------------------------------------------------------------------------
export async function fetchMasterReceiveNotes(): Promise<ReceiveNoteRecord[] | null> {
  const res = await apiGet<{ status: string; total: number; rows: any[] }>("/api/warehouse/rn");
  if (!res || !Array.isArray(res.rows) || res.rows.length === 0) return null;

  return res.rows.map((item: any, idx: number): ReceiveNoteRecord => {
    const rawArrival = item.arrival_date || "";
    const dateOnly = rawArrival.split(" ")[0] || "";
    const itemsList = Array.isArray(item.items) ? item.items : [];
    const firstItem = itemsList[0];
    const totalAmount = itemsList.reduce((sum: number, it: any) => sum + (Number(it.grand_total) || 0), 0);

    return {
      id: String(item.id),
      no: idx + 1,
      rnNumber: item.rn_number || "",
      arrivalDate: dateOnly,
      poNumber: firstItem?.po_number || "-",
      date: dateOnly,
      supplier: item.supplier?.name || "-",
      facility: "FASILITAS",
      bcCode: "BC 4.0",
      ajuNumber: "-",
      noDaftar: "-",
      amount: totalAmount,
      amountFormatted: `IDR ${totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: item.note || "-",
      warehouseTransaction: `0619/WHIN-IMLI/T/I/${new Date().getFullYear()}`,
      currency: "IDR",
      rate: 1,
      invoiceNumber: item.invoice_number || "-",
      invoiceDate: dateOnly,
      taxInvoiceNumber: "-",
      taxInvoiceDate: "-",
      vehicleType: "-",
      licensePlate: item.license_plate || "-",
      tanggalDaftar: dateOnly,
      nomorPackingList: item.sj_number || "-",
      tanggalPackingList: item.sj_date || dateOnly,
      status: item.approvals && item.approvals.length > 0 ? (item.approvals[0].status || "Approved") : "Approved 2",
      createdAt: item.formatted_arrival_date || dateOnly,
      lastUpdatedAt: item.formatted_arrival_date || dateOnly,
      approval1At: "-",
      approval2At: "-",
      items: itemsList.map((it: any, i: number) => ({
        id: String(it.id),
        no: i + 1,
        poNumber: it.po_number || "-",
        itemCode: it.item_code || "",
        itemName: it.item_name || "",
        qty: Number(it.gross_quantity) || 0,
        unit: "PCS",
        rafaksi: Number(it.rafaksi) || 0,
        rafaksiPercent: 0,
        pricePerUnit: Number(it.price) || 0,
        priceSubtotal: Number(it.grand_total) || 0,
        price2PerUnit: Number(it.price) || 0,
        price2Subtotal: Number(it.grand_total) || 0,
        remark: it.dn_number || "",
        sjNumber: item.sj_number || "-",
        sjDate: item.sj_date || dateOnly,
      })),
      totalQty: Number(item.total_net_quantity) || 0,
      biayaLain: 0,
      discountPercent: 0,
      discountAmount: 0,
      ppnPercent: 0,
      ppnAmount: 0,
      grandTotal: totalAmount,
    };
  });
}

// ----------------------------------------------------------------------------
// RECEIVE NOTE RETURN HELPERS
// ----------------------------------------------------------------------------
export async function fetchMasterReceiveNoteReturns(): Promise<ReceiveNoteReturnRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/returns");
  if (!res || !Array.isArray(res.data) || res.data.length === 0) return null;

  return res.data.map((item: any, idx: number): ReceiveNoteReturnRecord => {
    const itemsList = Array.isArray(item.items) ? item.items : [];
    const grandTotal = Number(item.amount) || itemsList.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || 0), 0);
    const dateStr = item.rn_date || (item.created_at ? item.created_at.split("T")[0] : "");

    return {
      id: String(item.id),
      no: idx + 1,
      rnNumber: item.rn_number || "",
      rnDate: dateStr,
      deliveryOrder: item.delivery_order || null,
      doDate: item.do_date || "-",
      customer: item.customer || "-",
      facility: item.facility || "FASILITAS",
      bcCode: item.bc_code || "BC 4.0",
      ajuNumber: item.aju_number || "-",
      noDaftar: item.no_daftar || "-",
      amount: grandTotal,
      amountFormatted: `IDR ${grandTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: item.notes || "-",
      warehouseTransaction: `0619/WHIN-IMLI/T/I/${new Date().getFullYear()}`,
      warehouseReceiveDate: dateStr,
      approvalStatus: item.approval_status || "Draft",
      userCreated: item.created_by_user?.name || "System",
      createdAtTimestamp: `${dateStr} 10:00`,
      arrivalDate: dateStr,
      typeOfReturn: item.type_of_return || "Sales Delivery",
      salesDeliveryNumber: item.sales_delivery_number || "-",
      salesDeliveryLine: "01",
      vehicleType: item.vehicle_type || "-",
      licensePlate: item.license_plate || "-",
      createdAt: `${dateStr} by ${item.created_by_user?.name || "System"}`,
      lastUpdatedAt: `${dateStr} by ${item.created_by_user?.name || "System"}`,
      releasedAt: "-",
      approvedAt: "-",
      items: itemsList.map((it: any, i: number) => ({
        id: String(it.id),
        no: i + 1,
        doNumber: it.do_number || item.delivery_order || "-",
        sjNumber: it.sj_number || "-",
        itemCode: it.item_code || "",
        itemName: it.item_name || "",
        quantity: Number(it.quantity) || 0,
        unit: it.unit || "PCS",
        qtyPackage: Number(it.delivery_qty) || Number(it.quantity) || 0,
        packageType: "BOX",
        price: Number(it.price) || 0,
        subtotal: Number(it.subtotal) || 0,
        subtotalIdr: Number(it.subtotal_idr) || Number(it.subtotal) || 0,
        deliveryQty: Number(it.delivery_qty) || Number(it.quantity) || 0,
        returQty: Number(it.retur_qty) || Number(it.quantity) || 0,
      })),
      totalSubtotal: grandTotal,
      totalAdditionalCost: 0,
      grandTotal: grandTotal,
      notes: item.notes,
    };
  });
}

export async function saveReceiveNoteReturnApi(newRecord: ReceiveNoteReturnRecord): Promise<ReceiveNoteReturnRecord | null> {
  const payload = {
    rn_number: newRecord.rnNumber,
    rn_date: newRecord.rnDate || newRecord.arrivalDate,
    delivery_order: newRecord.deliveryOrder,
    do_date: newRecord.doDate && newRecord.doDate !== "-" ? newRecord.doDate : undefined,
    customer: newRecord.customer,
    facility: newRecord.facility,
    bc_code: newRecord.bcCode,
    aju_number: newRecord.ajuNumber,
    no_daftar: newRecord.noDaftar,
    amount: newRecord.grandTotal || newRecord.amount,
    type_of_return: newRecord.typeOfReturn,
    sales_delivery_number: newRecord.salesDeliveryNumber,
    vehicle_type: newRecord.vehicleType,
    license_plate: newRecord.licensePlate,
    notes: newRecord.description || newRecord.notes,
    items: (newRecord.items || []).map((it) => ({
      item_name: it.itemName,
      item_code: it.itemCode,
      quantity: Number(it.quantity) || Number(it.returQty) || 1,
      unit: it.unit || "PCS",
      price: Number(it.price) || 0,
      subtotal: Number(it.subtotal) || 0,
      retur_qty: Number(it.returQty) || Number(it.quantity) || 1,
      delivery_qty: Number(it.deliveryQty) || Number(it.quantity) || 1,
      do_number: it.doNumber || newRecord.deliveryOrder,
      sj_number: it.sjNumber,
    })),
  };

  const res = await apiPost<{ data: any }>("/api/exim/operations/returns", payload);
  if (!res?.data) return null;
  const item = res.data;
  return {
    ...newRecord,
    id: String(item.id),
    rnNumber: item.rn_number || newRecord.rnNumber,
    approvalStatus: item.approval_status || "Draft",
  };
}

// ----------------------------------------------------------------------------
// DOCUMENT HISTORY HELPERS
// ----------------------------------------------------------------------------
export async function fetchMasterDocumentHistories(): Promise<DocumentHistoryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/document-histories");
  if (!res || !Array.isArray(res.data) || res.data.length === 0) return null;

  return res.data.map((item: any, idx: number): DocumentHistoryRecord => {
    const itemsList = Array.isArray(item.items) ? item.items : [];
    const dateStr = item.invoice_date || (item.created_at ? item.created_at.split("T")[0] : "");
    const amountVal = Number(item.amount) || itemsList.reduce((sum: number, it: any) => sum + (Number(it.subtotal) || 0), 0);

    return {
      id: String(item.id),
      no: idx + 1,
      invoiceNumber: item.invoice_number || "",
      invoiceAlias: item.invoice_alias || "",
      invoiceDate: dateStr,
      transactionNumber: item.transaction_number || "-",
      mutationType: item.mutation_type || "Export",
      customerSupplier: item.customer_supplier || item.customer || "-",
      customer: item.customer || item.customer_supplier || "-",
      destination: item.destination || "-",
      blNumber: item.bl_number || "-",
      currency: item.currency || "USD",
      customsDocument: item.customs_document || "BC 3.0",
      amount: amountVal,
      amountFormatted: `${item.currency || "USD"} ${amountVal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      lastUpdatedUser: item.created_by_user?.name || "System",
      lastUpdatedTimestamp: `${dateStr} 10:00`,
      createdAt: dateStr,
      lastUpdatedAt: dateStr,
      totalUnitPrice: itemsList.reduce((sum: number, it: any) => sum + (Number(it.unit_price) || 0), 0),
      totalSubtotal: amountVal,
      items: itemsList.map((it: any, i: number) => ({
        id: String(it.id),
        no: i + 1,
        soNumber: it.so_number || "-",
        soDate: it.so_date || dateStr,
        plNumber: it.pl_number || "-",
        plDate: it.pl_date || dateStr,
        itemProduct: it.item_name || "",
        itemCode: it.item_code || "",
        nettWeight: Number(it.nett_weight) || 0,
        grossWeight: Number(it.gross_weight) || 0,
        pack: Number(it.pack) || 0,
        packUnit: it.pack_unit || "PKG",
        quantity: Number(it.quantity) || 0,
        unit: it.unit || "PCS",
        unitPrice: Number(it.unit_price) || 0,
        subtotal: Number(it.subtotal) || 0,
        currency: item.currency || "USD",
        history: [],
      })),
    };
  });
}

// ----------------------------------------------------------------------------
// UNIT REFERENCE HELPERS (Satuan Ukur / units_of_measurements)
// ----------------------------------------------------------------------------
export async function fetchMasterUnitReferences(): Promise<UnitReferenceRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/unit-references");
  if (!res || !Array.isArray(res.data) || res.data.length === 0) return null;

  return res.data.map((item: any, idx: number): UnitReferenceRecord => ({
    id: String(item.id),
    code: item.name || item.code || "",
    description: item.name || "",
  }));
}

// ----------------------------------------------------------------------------
// STATUS TOGGLE PERSISTENCE HELPERS
// ----------------------------------------------------------------------------
export async function togglePaymentTermStatusApi(id: string, status: boolean): Promise<boolean> {
  if (id.startsWith("pt-")) return true;
  const res = await apiPut(`/api/procurement/master/payment-terms/${id}`, { status: status ? 1 : 0 });
  return !!res;
}

export async function togglePurchaseCategoryStatusApi(id: string, status: boolean): Promise<boolean> {
  if (id.startsWith("pc-")) return true;
  const res = await apiPut(`/api/procurement/master/purchase-categories/${id}`, { status: status ? 1 : 0 });
  return !!res;
}

export async function toggleDeliveryTermStatusApi(id: string, status: boolean): Promise<boolean> {
  if (id.startsWith("dt-")) return true;
  const res = await apiPut(`/api/procurement/master/delivery-terms/${id}`, { status: status ? 1 : 0 });
  return !!res;
}

export async function toggleAdditionalCostStatusApi(id: string, status: boolean): Promise<boolean> {
  if (id.startsWith("ac-")) return true;
  const res = await apiPut(`/api/procurement/master/additional-costs/${id}`, { status: status ? 1 : 0 });
  return !!res;
}

export async function togglePphStatusApi(id: string, status: boolean): Promise<boolean> {
  if (id.startsWith("pph-")) return true;
  const res = await apiPut(`/api/procurement/master/pph/${id}`, { status: status ? 1 : 0 });
  return !!res;
}

// ----------------------------------------------------------------------------
// WAREHOUSE REQUEST MATERIAL API HELPERS
// ----------------------------------------------------------------------------
export async function fetchRequestMaterials(): Promise<RequestMaterialRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/request-materials");
  if (!res || !Array.isArray(res.data) || res.data.length === 0) return null;
  return res.data;
}

export async function saveRequestMaterialApi(record: Partial<RequestMaterialRecord>): Promise<RequestMaterialRecord | null> {
  const res = await apiPost<{ data: RequestMaterialRecord }>("/api/warehouse/request-materials", record);
  return res?.data ?? null;
}

export async function approveRequestMaterialApi(id: string): Promise<RequestMaterialRecord | null> {
  const res = await apiPost<{ data: RequestMaterialRecord }>(`/api/warehouse/request-materials/${encodeURIComponent(id)}/approve`, {});
  return res?.data ?? null;
}

// ----------------------------------------------------------------------------
// USER PROFILE API HELPERS
// ----------------------------------------------------------------------------
export async function updateUserProfileApi(data: { name?: string; username?: string; email?: string; password?: string; photo?: string }): Promise<boolean> {
  const res = await apiPost<{ status: string }>("/api/user/profile", data);
  return res?.status === "success";
}



