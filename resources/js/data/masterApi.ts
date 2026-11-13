/**
 * Master Data & Module API Service — GENIUSONE UI 2.0
 * 100% Database-Backed via Laravel API Endpoints (Zero Hardcoded Fallbacks)
 */

import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "./api";
import type { SupplierRecord, SupplierFormData } from "../pages/Procurement/PurchaseMaster/Supplier/supplier-types";
import type { PaymentTermRecord } from "../pages/Procurement/PurchaseMaster/PaymentTerm/payment-term-types";
import type { PurchaseCategoryRecord } from "../pages/Procurement/PurchaseMaster/PurchaseCategory/purchase-category-types";
import type { DeliveryTermRecord } from "../pages/Procurement/PurchaseMaster/DeliveryTerms/delivery-terms-types";
import type { AdditionalCostRecord } from "../pages/Procurement/PurchaseMaster/AdditionalCosts/additional-costs-types";
import type { PphRecord } from "../pages/Procurement/PurchaseMaster/Pph/pph-types";
import type { UnitRecord } from "../pages/Exim/Master/Unit/unit-types";
import type { BrandRecord } from "../pages/Exim/Master/Brand/brand-types";
import type { ClassificationRecord } from "../pages/Exim/Master/Classification/classification-types";
import type { DepartmentRecord } from "../pages/Exim/Master/Department/department-types";
import type { FacilityRecord } from "../pages/Exim/Master/Facility/facility-types";
import type { HsRecord } from "../pages/Exim/Master/Hs/hs-types";
import type { CategoryRecord } from "../pages/Exim/Master/Category/category-types";
import type { StyleRecord } from "../pages/Exim/Master/Style/style-types";
import type { ColorRecord } from "../pages/Exim/Master/Color/color-types";
import type { ItemRecord } from "../pages/Exim/Master/Item/item-types";
import type { WarehouseMasterRecord, WarehouseCoordinateRecord, WarehouseType } from "../pages/Warehouse/MasterWarehouse/warehouse-master-types";
import type { CountryRecord } from "../pages/Exim/Master/Country/country-types";
import type { RafaksiTypeRecord } from "../pages/Procurement/PurchaseMaster/RafaksiType/rafaksi-type-types";
import type { CurrencyRecord } from "../pages/Exim/Master/Currency/currency-types";
import type { AccountRecord } from "../pages/Exim/Master/Account/account-types";
import type { JobNumberRecord } from "../pages/Procurement/PurchaseMaster/JobNumber/job-number-types";
import type { ReceiveNoteRecord } from "../pages/Exim/ReceiveNote/receive-note-types";
import type { ReceiveNoteReturnRecord } from "../pages/Exim/ReceiveNoteReturn/receive-note-return-types";
import type { DocumentHistoryRecord } from "../pages/Exim/DocumentHistory/document-history-types";
import type { UnitReferenceRecord } from "../pages/Exim/Master/UnitReference/unit-reference-types";
import type { RequestMaterialRecord, ApprovalStatus } from "../pages/Warehouse/Request/RequestMaterial/request-material-types";
import type { StockNotificationRecord } from "../pages/Dashboard/StockNotificationMaster/stock-notification-types";
import type { ExchangeRateRecord, RateType, RateAvailability } from "../pages/Dashboard/dashboard-rate-types";
import type { TypeOfRequestRecord } from "../pages/Warehouse/Master/TypeOfRequest/type-of-request-types";
import type { DestinationLocationRecord } from "../pages/Warehouse/Master/DestinationLocation/destination-location-types";
import type { TransferStockReturnRecord, TransferStockReturnStatus } from "../pages/Warehouse/TransferStockReturn/transfer-stock-return-types";
import type { WarehouseStockRecord } from "../pages/Warehouse/Report/StockItem/stock-item-types";
import type { StockCardRecord } from "../pages/Warehouse/Report/StockCard/stock-card-types";
import type { PoReportRecord } from "../pages/Procurement/Reports/po-report-types";
import type { PrReportRecord } from "../pages/Procurement/Reports/pr-report-types";

// =========================================================================
// HELPERS
// =========================================================================

export function formatDisplayDate(val?: string | null): string {
  if (!val) return "-";
  const str = String(val).trim();
  if (!str) return "-";
  return str.replace("T", " ").slice(0, 19);
}

function isTruthyStatus(val: any): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    return lower === "1" || lower === "true" || lower === "active" || lower === "yes";
  }
  return Boolean(val);
}

function toNumericOrCleanId(id: string | number): string {
  const raw = String(id).trim();
  const match = raw.match(/(\d+)$/);
  return match ? match[1] : raw;
}

// =========================================================================
// 0. SYSTEM CONTEXT, SETTINGS & DYNAMIC LOOKUPS
// =========================================================================

export interface SystemContextData {
  company: {
    name: string;
    legal_name: string;
    short_code: string;
    address: string;
    tax_id: string;
    customs_office: string;
    skep_kb_number: string;
    default_currency: string;
    default_ppn_rate: number;
  };
  settings: Record<string, any>;
  navigation_counts: Record<string, number>;
  current_user: any;
}

export async function fetchSystemContextApi(): Promise<SystemContextData | null> {
  const res = await apiGet<{ data: SystemContextData }>("/api/system/context");
  return res?.data ?? null;
}

export async function fetchSystemSettingsApi(): Promise<Record<string, any> | null> {
  const res = await apiGet<{ data: Record<string, any> }>("/api/system/settings");
  return res?.data ?? null;
}

export async function updateSystemSettingsApi(settings: Record<string, any>): Promise<Record<string, any> | null> {
  const res = await apiPut<{ data: Record<string, any> }>("/api/system/settings", { settings });
  return res?.data ?? null;
}

export async function fetchMasterLookupsApi(category?: string): Promise<Record<string, any> | null> {
  const res = await apiGet<{ data: Record<string, any> }>("/api/master/lookups", category ? { category } : undefined);
  return res?.data ?? null;
}

// =========================================================================
// 1. PROCUREMENT MASTER API
// =========================================================================

export async function fetchMasterSuppliers(): Promise<SupplierRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/suppliers", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    supplierCode: r.code || "",
    supplierName: r.name || "",
    address: r.address || "-",
    country: r.country_name || r.country?.name || "-",
    npwp: r.npwp || "-",
    nitku: r.nitku || "-",
    createdBy: r.created_by_name || r.created_by_user?.name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.created_at),
    hidden: !isTruthyStatus(r.status),
  }));
}

export async function saveSupplierApi(data: SupplierFormData, editId?: string): Promise<SupplierRecord | null> {
  const cleanOpt = (v?: string) => (v && v.trim() !== "" && v.trim() !== "-" && v.trim() !== "—" ? v.trim() : undefined);
  const emailClean = cleanOpt(data.email);
  const payload: Record<string, any> = {
    code: data.autoGenerateCode ? undefined : cleanOpt(data.supplierCode),
    name: data.supplierName,
    address: cleanOpt(data.address),
    contact_person: cleanOpt(data.contactPerson),
    city: cleanOpt(data.city),
    state: cleanOpt(data.state),
    countries_id: data.countries_id || undefined,
    country: data.countries_id ? undefined : cleanOpt(data.country),
    zipcode: cleanOpt(data.zipcode),
    email: emailClean && emailClean.includes("@") ? emailClean : undefined,
    telephone_number: cleanOpt(data.telephoneNumber),
    payment_terms_id: data.payment_terms_id || undefined,
    payment_term: data.payment_terms_id ? undefined : cleanOpt(data.paymentTerm),
    payment_methods_id: data.payment_methods_id || undefined,
    payment_method: data.payment_methods_id ? undefined : cleanOpt(data.paymentMethod),
    rafaksi_types_id: data.rafaksi_types_id || undefined,
    rafaksi_type: data.rafaksi_types_id ? undefined : cleanOpt(data.typeRafaksi),
    currencies_id: data.currencies_id || undefined,
    currency: data.currencies_id ? undefined : cleanOpt(data.currency),
    ports_id: data.ports_id || undefined,
    port: data.ports_id ? undefined : cleanOpt(data.port),
    npwp: cleanOpt(data.npwp),
    nitku: cleanOpt(data.nitku),
    whatsapp: cleanOpt(data.whatsapp),
    wechat_id: cleanOpt(data.wechatId),
    status: 1,
  };
  const res = editId
    ? await apiPut<{ data: any }>(`/api/procurement/master/suppliers/${toNumericOrCleanId(editId)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/suppliers", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    no: 1,
    supplierCode: r.code || data.supplierCode || "",
    supplierName: r.name || data.supplierName || "",
    address: r.address || data.address || "-",
    country: r.country_name || r.country?.name || data.country || "-",
    npwp: r.npwp || data.npwp || "-",
    nitku: r.nitku || data.nitku || "-",
    createdBy: r.created_by_name || r.created_by_user?.name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.created_at),
    hidden: !isTruthyStatus(r.status ?? 1),
  };
}

export async function deleteSupplierApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/suppliers/${toNumericOrCleanId(id)}`);
}

export async function toggleSupplierStatusApi(id: string, _hidden?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/suppliers/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterPaymentTerms(): Promise<PaymentTermRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/payment-terms", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    name: r.name || "",
    hidden: !isTruthyStatus(r.status),
  }));
}

export async function savePaymentTermApi(name: string, editId?: string): Promise<PaymentTermRecord | null> {
  const res = editId
    ? await apiPut<{ data: any }>(`/api/procurement/master/payment-terms/${toNumericOrCleanId(editId)}`, { name })
    : await apiPost<{ data: any }>("/api/procurement/master/payment-terms", { name, status: 1 });
  if (!res?.data) return null;
  return {
    id: String(res.data.id),
    no: 1,
    name: res.data.name || name,
    hidden: !isTruthyStatus(res.data.status ?? 1),
  };
}

export async function deletePaymentTermApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/payment-terms/${toNumericOrCleanId(id)}`);
}

export async function togglePaymentTermStatusApi(id: string, _hidden?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/payment-terms/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterPurchaseCategories(): Promise<PurchaseCategoryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/purchase-categories", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any) => ({
    id: String(r.id),
    categoryCode: r.code || "",
    categoryName: r.name || "",
    hidden: !isTruthyStatus(r.status),
  }));
}

export async function savePurchaseCategoryApi(code: string, name: string, editId?: string): Promise<PurchaseCategoryRecord | null> {
  const payload = { code, name, status: 1 };
  const res = editId
    ? await apiPut<{ data: any }>(`/api/procurement/master/purchase-categories/${toNumericOrCleanId(editId)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/purchase-categories", payload);
  if (!res?.data) return null;
  return {
    id: String(res.data.id),
    categoryCode: res.data.code || code,
    categoryName: res.data.name || name,
    hidden: !isTruthyStatus(res.data.status ?? 1),
  };
}

export async function deletePurchaseCategoryApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/purchase-categories/${toNumericOrCleanId(id)}`);
}

export async function togglePurchaseCategoryStatusApi(id: string, _hidden?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/purchase-categories/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterDeliveryTerms(): Promise<DeliveryTermRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/delivery-terms", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any) => ({
    id: String(r.id),
    name: r.name || "",
    hidden: !isTruthyStatus(r.status),
  }));
}

export async function saveDeliveryTermApi(name: string, editId?: string): Promise<DeliveryTermRecord | null> {
  const res = editId
    ? await apiPut<{ data: any }>(`/api/procurement/master/delivery-terms/${toNumericOrCleanId(editId)}`, { name })
    : await apiPost<{ data: any }>("/api/procurement/master/delivery-terms", { name, status: 1 });
  if (!res?.data) return null;
  return {
    id: String(res.data.id),
    name: res.data.name || name,
    hidden: !isTruthyStatus(res.data.status ?? 1),
  };
}

export async function deleteDeliveryTermApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/delivery-terms/${toNumericOrCleanId(id)}`);
}

export async function toggleDeliveryTermStatusApi(id: string, _hidden?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/delivery-terms/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterAdditionalCosts(): Promise<AdditionalCostRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/additional-costs", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any) => ({
    id: String(r.id),
    costCode: r.code || "",
    costName: r.name || "",
    hidden: !isTruthyStatus(r.status),
  }));
}

export async function saveAdditionalCostApi(code: string, name: string, editId?: string): Promise<AdditionalCostRecord | null> {
  const payload = { code, name, status: 1 };
  const res = editId
    ? await apiPut<{ data: any }>(`/api/procurement/master/additional-costs/${toNumericOrCleanId(editId)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/additional-costs", payload);
  if (!res?.data) return null;
  return {
    id: String(res.data.id),
    costCode: res.data.code || code,
    costName: res.data.name || name,
    hidden: !isTruthyStatus(res.data.status ?? 1),
  };
}

export async function deleteAdditionalCostApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/additional-costs/${toNumericOrCleanId(id)}`);
}

export async function toggleAdditionalCostStatusApi(id: string, _hidden?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/additional-costs/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchPphTypesApi(): Promise<Array<{ id: number; name: string }>> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/pph-types");
  return (res?.data || []).map((t: any) => ({ id: Number(t.id), name: t.name || t.nama || "" }));
}

export async function fetchMasterPph(): Promise<PphRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/pph", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any) => ({
    id: String(r.id),
    name: r.name || "",
    rate: Number(r.value ?? r.rates ?? r.rate ?? 0),
    deduction: r.deduction === "yes" || r.deduction === true || r.deduction === 1 ? "Yes" : "No",
    type: r.type?.nama || r.type?.name || r.type_pph?.name || r.type_pph_name || undefined,
    hidden: !isTruthyStatus(r.status ?? "active"),
  }));
}

export async function savePphApi(rec: PphRecord, isEdit?: boolean): Promise<PphRecord | null> {
  const payload = {
    name: rec.name,
    value: Number(rec.rate) || 0,
    pph_type_name: rec.type || undefined,
    deduction: rec.deduction === "Yes" || (rec.deduction as any) === true ? "yes" : "no",
    status: rec.hidden ? "inactive" : "active",
  };
  const res = isEdit && rec.id
    ? await apiPut<{ data: any }>(`/api/procurement/master/pph/${toNumericOrCleanId(rec.id)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/pph", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    name: r.name || rec.name,
    rate: Number(r.value ?? r.rates ?? rec.rate ?? 0),
    deduction: r.deduction === "yes" || r.deduction === true || r.deduction === 1 ? "Yes" : "No",
    type: r.type?.nama || r.type?.name || r.type_pph?.name || r.type_pph_name || rec.type,
    hidden: !isTruthyStatus(r.status ?? "active"),
  };
}

export async function deletePphApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/pph/${toNumericOrCleanId(id)}`);
}

export async function togglePphStatusApi(id: string, _hidden?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/pph/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

// =========================================================================
// 2. EXIM MASTER API
// =========================================================================

export async function fetchMasterUnits(): Promise<UnitRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/units", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    name: r.unit?.nama || r.name || r.code || "",
    createdBy: r.created_by_name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.created_at),
  }));
}

export async function saveUnitApi(record: UnitRecord, isEdit: boolean): Promise<UnitRecord | null> {
  const payload = {
    name: record.name,
    status: 1,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/units/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/units", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    name: r?.unit?.nama || r?.name || record.name,
    createdBy: r?.created_by_name || record.createdBy || "-",
    createdAt: formatDisplayDate(r?.created_at || record.createdAt),
  };
}

export async function deleteUnitApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/units/${toNumericOrCleanId(id)}`);
}

export async function toggleUnitStatusApi(id: string, _nextStatus?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/units/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterBrands(): Promise<BrandRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/brands", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    description: r.description || "",
    status: isTruthyStatus(r.status),
  }));
}

export async function saveBrandApi(record: BrandRecord, isEdit: boolean): Promise<BrandRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/brands/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/brands", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    code: r?.code || record.code,
    name: r?.name || record.name,
    description: r?.description ?? record.description ?? "",
    status: isTruthyStatus(r?.status ?? record.status),
  };
}

export async function deleteBrandApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/brands/${toNumericOrCleanId(id)}`);
}

export async function toggleBrandStatusApi(id: string, _nextStatus?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/brands/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterClassifications(): Promise<ClassificationRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/classifications", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    description: r.description || "",
    reportingType: r.reporting_type || r.hs_group || "-",
    account: r.account ? `${r.account.code} - ${r.account.name}` : (r.account_name || undefined),
    status: isTruthyStatus(r.status),
  }));
}

export async function saveClassificationApi(record: ClassificationRecord, isEdit: boolean): Promise<ClassificationRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    reporting_type: record.reportingType,
    account_name: record.account,
    status: record.status ? 1 : 0,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/classifications/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/classifications", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    code: r?.code || record.code,
    name: r?.name || record.name,
    description: r?.description ?? record.description ?? "",
    reportingType: r?.reporting_type || record.reportingType || "-",
    status: isTruthyStatus(r?.status ?? record.status),
  };
}

export async function deleteClassificationApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/classifications/${toNumericOrCleanId(id)}`);
}

export async function toggleClassificationStatusApi(id: string, _nextStatus?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/classifications/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterDepartments(): Promise<DepartmentRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/departments", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    sectionName: r.name || r.section_name || "",
    unit: r.code || r.unit || "",
    status: isTruthyStatus(r.status),
  }));
}

export async function saveDepartmentApi(record: DepartmentRecord, isEdit: boolean): Promise<DepartmentRecord | null> {
  const payload = {
    code: record.unit,
    name: record.sectionName,
    status: record.status ? 1 : 0,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/departments/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/departments", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    sectionName: r?.name || record.sectionName,
    unit: r?.code || record.unit,
    status: isTruthyStatus(r?.status ?? record.status),
  };
}

export async function deleteDepartmentApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/departments/${toNumericOrCleanId(id)}`);
}

export async function toggleDepartmentStatusApi(id: string, _nextStatus?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/departments/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterSectionsApi(departmentId?: string | number): Promise<any[]> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/sections", departmentId ? { departments_id: departmentId } : undefined);
  return res?.data ?? [];
}

export async function saveSectionApi(payload: { id?: string | number; departments_id: number; code?: string; name: string; status?: number }): Promise<any> {
  if (payload.id) {
    const res = await apiPut<{ data: any }>(`/api/exim/master/sections/${toNumericOrCleanId(payload.id)}`, payload);
    return res?.data ?? null;
  }
  const res = await apiPost<{ data: any }>("/api/exim/master/sections", payload);
  return res?.data ?? null;
}

export async function deleteSectionApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/exim/master/sections/${toNumericOrCleanId(id)}`);
}

export async function toggleSectionStatusApi(id: string | number): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/sections/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterFacilities(): Promise<FacilityRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/facilities", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    name: r.name || "",
    description: r.description || "",
    status: isTruthyStatus(r.status),
  }));
}

export async function saveFacilityApi(record: FacilityRecord, isEdit: boolean): Promise<FacilityRecord | null> {
  const payload = {
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/facilities/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/facilities", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    name: r?.name || record.name,
    description: r?.description ?? record.description ?? "",
    status: isTruthyStatus(r?.status ?? record.status),
  };
}

export async function deleteFacilityApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/facilities/${toNumericOrCleanId(id)}`);
}

export async function toggleFacilityStatusApi(id: string, _nextStatus?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/facilities/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchHsRateTypesApi(): Promise<{ bmTypes: Array<{ id: number; name: string }>; cukaiTypes: Array<{ id: number; name: string }> }> {
  const res = await apiGet<{ data: { types_rates_bm?: any[]; types_rates_cukai?: any[] } }>("/api/exim/master/hs-codes/rate-types");
  return {
    bmTypes: (res?.data?.types_rates_bm || []).map((t: any) => ({ id: Number(t.id), name: t.name || t.nama || "" })),
    cukaiTypes: (res?.data?.types_rates_cukai || []).map((t: any) => ({ id: Number(t.id), name: t.name || t.nama || "" })),
  };
}

export async function fetchMasterHsCodes(): Promise<HsRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/hs-codes", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    name: r.name || r.code || "",
    description: r.description || "",
    typeRateBm: r.bm_type?.name || r.bm_type_name || "-",
    ratesBm: Number(r.rates_bm ?? r.bm ?? 0),
    typeRateCukai: r.cukai_type?.name || r.cukai_type_name || "-",
    ratesCukai: Number(r.rates_cukai ?? r.cukai ?? 0),
    ratesPpn: Number(r.rates_ppn ?? r.ppn ?? 0),
    ratesPph: Number(r.rates_pph ?? r.pph ?? 0),
    ratesPpnbm: Number(r.rates_ppnbm ?? r.ppnbm ?? 0),
  }));
}

export async function saveHsApi(record: HsRecord, isEdit: boolean): Promise<HsRecord | null> {
  const payload = {
    name: record.name,
    description: record.description,
    bm_type_name: record.typeRateBm,
    rates_bm: record.ratesBm,
    cukai_type_name: record.typeRateCukai,
    rates_cukai: record.ratesCukai,
    rates_ppn: record.ratesPpn,
    rates_pph: record.ratesPph,
    rates_ppnbm: record.ratesPpnbm,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/hs-codes/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/hs-codes", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    name: r?.name || record.name,
    description: r?.description ?? record.description ?? "",
    typeRateBm: r?.bm_type?.name || r?.bm_type_name || record.typeRateBm,
    ratesBm: Number(r?.rates_bm ?? record.ratesBm),
    typeRateCukai: r?.cukai_type?.name || r?.cukai_type_name || record.typeRateCukai,
    ratesCukai: Number(r?.rates_cukai ?? record.ratesCukai),
    ratesPpn: Number(r?.rates_ppn ?? record.ratesPpn),
    ratesPph: Number(r?.rates_pph ?? record.ratesPph),
    ratesPpnbm: Number(r?.rates_ppnbm ?? record.ratesPpnbm),
  };
}

export async function deleteHsApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/hs-codes/${toNumericOrCleanId(id)}`);
}

export async function fetchMasterCategories(): Promise<CategoryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/categories", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    description: r.description || "",
    status: isTruthyStatus(r.status),
  }));
}

export async function saveCategoryApi(record: CategoryRecord, isEdit: boolean): Promise<CategoryRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/categories/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/categories", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    code: r?.code || record.code,
    name: r?.name || record.name,
    description: r?.description ?? record.description ?? "",
    status: isTruthyStatus(r?.status ?? record.status),
  };
}

export async function deleteCategoryApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/categories/${toNumericOrCleanId(id)}`);
}

export async function toggleCategoryStatusApi(id: string, _nextStatus?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/categories/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterStyles(): Promise<StyleRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/styles", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    description: r.description || "",
    status: isTruthyStatus(r.status),
  }));
}

export async function saveStyleApi(record: StyleRecord, isEdit: boolean): Promise<StyleRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    description: record.description,
    status: record.status ? "active" : "inactive",
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/styles/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/styles", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    code: r?.code || record.code,
    name: r?.name || record.name,
    description: r?.description ?? record.description ?? "",
    status: isTruthyStatus(r?.status ?? record.status),
  };
}

export async function deleteStyleApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/styles/${toNumericOrCleanId(id)}`);
}

export async function toggleStyleStatusApi(id: string, _nextStatus?: boolean): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/styles/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterColours(): Promise<ColorRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/colours", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
  }));
}

export async function saveColorApi(record: ColorRecord, isEdit?: boolean): Promise<ColorRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    status: 1,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/colours/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/colours", payload);
  const r = res?.data;
  return {
    ...record,
    id: r?.id ? String(r.id) : record.id,
    code: r?.code || record.code,
    name: r?.name || record.name,
  };
}

export async function deleteColorApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/colours/${toNumericOrCleanId(id)}`);
}

export async function toggleColorStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/colours/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

function mapApiItemToRecord(r: any, idx = 0): ItemRecord {
  const uom = r.unit_of_measurement || r.unitOfMeasurement || r.unit;
  const unitCode = uom?.code || uom?.nama || uom?.name || r.unit_name || "";
  const unitName = uom?.name || uom?.nama || unitCode;
  const smallest = r.smallest_unit || r.smallestUnit;
  const greatest = r.greatest_unit || r.greatestUnit;
  const facVal = r.facility?.name || r.facility_name || "";
  const hs = r.hs_code || r.hsCode;

  return {
    id: String(r.id),
    no: idx + 1,
    itemCode: r.code || "",
    kodeEksternal: r.external_code || "-",
    itemName: r.name || "",
    classification: r.classification?.name || r.classification_name || "-",
    category: r.category?.name || r.category_name || "-",
    hsCode: hs?.code || hs?.name || r.hs_code_name || "-",
    smallestUnitCode: smallest?.code || smallest?.name || unitCode,
    smallestUnitName: smallest?.name || unitName,
    greatestUnitCode: greatest?.code || greatest?.name || r.greatest_unit_name || unitCode,
    greatestUnitName: greatest?.name || r.greatest_unit_name || unitName,
    facility: (/non/i.test(facVal) ? "NON FASILITAS" : "FASILITAS") as "FASILITAS" | "NON FASILITAS",
    groupScrap: r.group_scrap_item?.name || r.groupScrapItem?.name || r.group_scrap || "-",
    specification: r.specification?.name || (typeof r.specification === "string" ? r.specification : "") || "-",
    origin: r.origin?.name || r.origin_name || "-",
    colour: r.colour?.name || r.colour_name || "-",
    brand: r.brand?.name || r.brand_name || "-",
    style: r.style?.name || r.style_name || "-",
    customReport: r.customs_report?.name || r.customsReport?.name || r.custom_report || "-",
    itemType: r.item_type?.name || r.itemType?.name || undefined,
    unitConversion: r.unit_conversion !== undefined && r.unit_conversion !== null ? Number(r.unit_conversion) : 1,
    netto: r.netto !== undefined && r.netto !== null ? Number(r.netto) : 0,
    size: r.size || "-",
    traceByLot: Boolean(r.trace_by_lot ?? true),
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    createdAt: formatDisplayDate(r.created_at),
    createdBy: r.created_by_user?.name || r.created_by_name || r.creator?.name || "-",
    updatedAt: formatDisplayDate(r.updated_at || r.created_at),
    updatedBy: r.updated_by_user?.name || r.updated_by_name || r.created_by_user?.name || r.created_by_name || "-",
    stock: Number(r.current_stock ?? r.stock ?? 0),
    stockUnit: unitCode,
    categories_id: r.categories_id ? Number(r.categories_id) : undefined,
    classifications_id: r.classifications_id ? Number(r.classifications_id) : undefined,
    facilities_id: r.facilities_id ? Number(r.facilities_id) : undefined,
    origins_id: r.origins_id ? Number(r.origins_id) : undefined,
    item_types_id: r.item_types_id ? Number(r.item_types_id) : undefined,
    units_of_measurements_id: r.units_of_measurements_id ? Number(r.units_of_measurements_id) : undefined,
    smallest_unit_id: r.smallest_unit_id ? Number(r.smallest_unit_id) : undefined,
    greatest_unit_id: r.greatest_unit_id ? Number(r.greatest_unit_id) : undefined,
    colours_id: r.colours_id ? Number(r.colours_id) : undefined,
    brands_id: r.brands_id ? Number(r.brands_id) : undefined,
    styles_id: r.styles_id ? Number(r.styles_id) : undefined,
    customs_reports_id: r.customs_reports_id ? Number(r.customs_reports_id) : undefined,
    group_scrap_items_id: r.group_scrap_items_id ? Number(r.group_scrap_items_id) : undefined,
    specifications_id: r.specifications_id ? Number(r.specifications_id) : undefined,
    hs_code_id: r.hs_code_id ? Number(r.hs_code_id) : undefined,
    job_number_id: r.job_number_id ? Number(r.job_number_id) : undefined,
  };
}

export async function fetchMasterItems(): Promise<ItemRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/items", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => mapApiItemToRecord(r, idx));
}

export async function saveItemApi(record: ItemRecord, isEdit: boolean): Promise<ItemRecord | null> {
  const cleanCode = (val?: string) => (val && val.trim() !== "" && val.trim() !== "-" ? val.trim() : undefined);
  const payload: Record<string, any> = {
    code: cleanCode(record.itemCode),
    external_code: cleanCode(record.kodeEksternal),
    name: record.itemName,
    classifications_id: record.classifications_id ? Number(record.classifications_id) : undefined,
    categories_id: record.categories_id ? Number(record.categories_id) : undefined,
    facilities_id: record.facilities_id ? Number(record.facilities_id) : undefined,
    origins_id: record.origins_id ? Number(record.origins_id) : undefined,
    item_types_id: record.item_types_id ? Number(record.item_types_id) : undefined,
    units_of_measurements_id: record.units_of_measurements_id ? Number(record.units_of_measurements_id) : undefined,
    smallest_unit_id: record.smallest_unit_id ? Number(record.smallest_unit_id) : undefined,
    greatest_unit_id: record.greatest_unit_id ? Number(record.greatest_unit_id) : undefined,
    unit_conversion: record.unitConversion !== undefined ? Number(record.unitConversion) : undefined,
    netto: record.netto !== undefined ? Number(record.netto) : undefined,
    size: cleanCode(record.size),
    colours_id: record.colours_id ? Number(record.colours_id) : undefined,
    brands_id: record.brands_id ? Number(record.brands_id) : undefined,
    styles_id: record.styles_id ? Number(record.styles_id) : undefined,
    customs_reports_id: record.customs_reports_id ? Number(record.customs_reports_id) : undefined,
    group_scrap_items_id: record.group_scrap_items_id ? Number(record.group_scrap_items_id) : undefined,
    specifications_id: record.specifications_id ? Number(record.specifications_id) : undefined,
    hs_code_id: record.hs_code_id ? Number(record.hs_code_id) : undefined,
    job_number_id: record.job_number_id ? Number(record.job_number_id) : undefined,
    trace_by_lot: record.traceByLot ? 1 : 0,
    status: record.status === "Active" ? 1 : 0,
  };
  const res = isEdit
    ? await apiPut<{ data: any }>(`/api/exim/master/items/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/items", payload);
  if (!res?.data) return null;
  return mapApiItemToRecord(res.data, (record.no || 1) - 1);
}

export async function deleteItemApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/items/${toNumericOrCleanId(id)}`);
}

export async function toggleItemStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/items/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

// =========================================================================
// 3. WAREHOUSE MASTER, TYPE OF REQUEST, DESTINATION LOCATION, TSR & REPORTS
// =========================================================================

export async function fetchWarehouseTypesApi(): Promise<Array<{ id: number; name: string }>> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/master/warehouse-types");
  return (res?.data || []).map((t: any) => ({ id: Number(t.id), name: t.name || t.nama || "" }));
}

export async function fetchMasterWarehouses(): Promise<WarehouseMasterRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/master/warehouses", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => {
    const rawType = r.type?.name || r.warehouse_type?.name || r.type_name || "Raw Material";
    const coords: WarehouseCoordinateRecord[] = Array.isArray(r.coordinates)
      ? r.coordinates.map((c: any) => ({
          id: String(c.id),
          warehouseId: String(r.id),
          name: c.name || c.code || "",
        }))
      : [];

    return {
      id: String(r.id),
      no: idx + 1,
      name: r.name || "",
      type: rawType as WarehouseType,
      description: r.description || "",
      status: isTruthyStatus(r.status),
      coordinates: coords,
    };
  });
}

export async function saveWarehouseMasterApi(record: WarehouseMasterRecord, isEdit?: boolean): Promise<WarehouseMasterRecord | null> {
  const payload = {
    name: record.name,
    type_name: record.type,
    description: record.description,
    status: record.status ? 1 : 0,
  };
  const res = isEdit && record.id
    ? await apiPut<{ data: any }>(`/api/warehouse/master/warehouses/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/warehouse/master/warehouses", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    ...record,
    id: String(r.id),
    name: r.name || record.name,
    type: (r.type?.name || record.type) as WarehouseType,
    description: r.description ?? record.description ?? "",
    status: isTruthyStatus(r.status ?? record.status),
    coordinates: record.coordinates || [],
  };
}

export async function deleteWarehouseMasterApi(id: string): Promise<boolean> {
  return apiDelete(`/api/warehouse/master/warehouses/${toNumericOrCleanId(id)}`);
}

export async function toggleWarehouseMasterStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/warehouse/master/warehouses/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function saveWarehouseCoordinateApi(coord: WarehouseCoordinateRecord): Promise<WarehouseCoordinateRecord | null> {
  const whId = toNumericOrCleanId(coord.warehouseId);
  const payload = {
    warehouses_id: Number(whId),
    code: coord.name,
    name: coord.name,
    status: 1,
  };
  const res = await apiPost<{ data: any }>(`/api/warehouse/master/warehouses/${whId}/coordinates`, payload);
  if (!res?.data) return null;
  return {
    id: String(res.data.id),
    warehouseId: String(coord.warehouseId),
    name: res.data.name || res.data.code || coord.name,
  };
}

export async function deleteWarehouseCoordinateApi(coordinateId: string): Promise<boolean> {
  return apiDelete(`/api/warehouse/master/coordinates/${toNumericOrCleanId(coordinateId)}`);
}

export async function fetchWarehouseTypesOfRequestApi(): Promise<TypeOfRequestRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/master/type-of-requests", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    department: r.department || r.category || "ALL DEPARTMENTS",
    requiresJobNumber: Boolean(r.requires_job_number),
    requiresApproval2: r.requires_approval_2 !== undefined ? Boolean(r.requires_approval_2) : r.approval_tier !== "Tier 1 Only",
    description: r.description || "",
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    createdAt: formatDisplayDate(r.created_at),
    createdBy: r.created_by || r.creator?.name || "-",
  }));
}

export async function saveWarehouseTypeOfRequestApi(record: TypeOfRequestRecord, isEdit?: boolean): Promise<TypeOfRequestRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    department: record.department,
    category: record.department,
    requires_job_number: Boolean(record.requiresJobNumber),
    requires_approval_2: Boolean(record.requiresApproval2),
    approval_tier: record.requiresApproval2 ? "Tier 1 + Tier 2" : "Tier 1 Only",
    description: record.description,
    status: record.status === "Active" ? 1 : 0,
  };
  const res = isEdit && record.id
    ? await apiPut<{ data: any }>(`/api/warehouse/master/type-of-requests/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/warehouse/master/type-of-requests", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    ...record,
    id: String(r.id),
    code: r.code || record.code,
    name: r.name || record.name,
    department: r.department || r.category || record.department,
    requiresJobNumber: Boolean(r.requires_job_number ?? record.requiresJobNumber),
    requiresApproval2: r.requires_approval_2 !== undefined ? Boolean(r.requires_approval_2) : record.requiresApproval2,
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    createdAt: formatDisplayDate(r.created_at || record.createdAt),
    createdBy: r.created_by || record.createdBy || "-",
  };
}

export async function deleteWarehouseTypeOfRequestApi(id: string): Promise<boolean> {
  return apiDelete(`/api/warehouse/master/type-of-requests/${toNumericOrCleanId(id)}`);
}

export async function toggleWarehouseTypeOfRequestStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/warehouse/master/type-of-requests/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchDestinationLocationsApi(): Promise<DestinationLocationRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/master/destination-locations", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    locationType: (["Production Area", "Warehouse", "Workshop", "Laboratory", "Office", "Shipping Area"].includes(r.location_type)
      ? r.location_type
      : "Production Area") as DestinationLocationRecord["locationType"],
    department: r.department?.name || r.department_name || "-",
    pic: r.pic || "-",
    description: r.description || "",
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    createdAt: formatDisplayDate(r.created_at),
    createdBy: r.created_by || r.creator?.name || "-",
  }));
}

export async function saveDestinationLocationApi(record: DestinationLocationRecord, isEdit?: boolean): Promise<DestinationLocationRecord | null> {
  const payload = {
    code: record.code,
    name: record.name,
    location_type: record.locationType,
    department_name: (record as any).department,
    pic: record.pic,
    description: record.description,
    status: record.status === "Active" ? 1 : 0,
  };
  const res = isEdit && record.id
    ? await apiPut<{ data: any }>(`/api/warehouse/master/destination-locations/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/warehouse/master/destination-locations", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    ...record,
    id: String(r.id),
    code: r.code || record.code,
    name: r.name || record.name,
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    createdAt: formatDisplayDate(r.created_at || record.createdAt),
    createdBy: r.created_by || record.createdBy || "-",
  };
}

export async function deleteDestinationLocationApi(id: string): Promise<boolean> {
  return apiDelete(`/api/warehouse/master/destination-locations/${toNumericOrCleanId(id)}`);
}

export async function toggleDestinationLocationStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/warehouse/master/destination-locations/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

// =========================================================================
// 4. ADDITIONAL SHARED MASTERS (COUNTRY, RAFAKSI, CURRENCY, ACCOUNT, JOB NO)
// =========================================================================

export async function fetchMasterCountries(): Promise<CountryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/countries", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.created_by_user?.name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  }));
}

export async function saveCountryApi(data: { code?: string; name: string; status: boolean }, id?: string): Promise<CountryRecord | null> {
  const payload = { code: data.code || "", name: data.name, status: data.status ? 1 : 0 };
  const res = id
    ? await apiPut<{ data: any }>(`/api/procurement/master/countries/${toNumericOrCleanId(id)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/countries", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    no: 1,
    code: r.code || data.code || "",
    name: r.name || data.name,
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.created_by_user?.name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  };
}

export async function deleteCountryApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/countries/${toNumericOrCleanId(id)}`);
}

export async function toggleCountryStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/countries/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterRafaksiTypes(): Promise<RafaksiTypeRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/rafaksi-types", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    code: r.code || "",
    name: r.name || "",
    description: r.description || "",
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  }));
}

export async function saveRafaksiTypeApi(
  data: { code?: string; name: string; description?: string; status: boolean },
  id?: string
): Promise<RafaksiTypeRecord | null> {
  const payload = {
    code: data.code,
    name: data.name,
    description: data.description || "",
    status: data.status ? 1 : 0,
  };
  const res = id
    ? await apiPut<{ data: any }>(`/api/procurement/master/rafaksi-types/${toNumericOrCleanId(id)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/rafaksi-types", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    no: 1,
    code: r.code || data.code || "",
    name: r.name || data.name,
    description: r.description || data.description || "",
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  };
}

export async function deleteRafaksiTypeApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/rafaksi-types/${toNumericOrCleanId(id)}`);
}

export async function toggleRafaksiTypeStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/rafaksi-types/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterCurrencies(): Promise<CurrencyRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/currencies", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    currencyCode: r.code || "",
    currencyName: r.name || "",
    symbol: r.symbol || r.code || "",
    syncStatus: (isTruthyStatus(r.status) ? "Synced" : "Not Synced") as CurrencyRecord["syncStatus"],
    lastSynced: formatDisplayDate(r.updated_at || r.created_at),
    createdBy: r.created_by_name || r.created_by_user?.name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.created_at),
  }));
}

export async function saveCurrencyApi(
  data: { currencyCode: string; currencyName: string; symbol?: string; status?: boolean },
  id?: string
): Promise<CurrencyRecord | null> {
  const payload = {
    code: data.currencyCode,
    name: data.currencyName,
    symbol: data.symbol || data.currencyCode,
    status: data.status === false ? 0 : 1,
  };
  const res = id
    ? await apiPut<{ data: any }>(`/api/procurement/master/currencies/${toNumericOrCleanId(id)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/currencies", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    no: 1,
    currencyCode: r.code || data.currencyCode,
    currencyName: r.name || data.currencyName,
    symbol: r.symbol || data.symbol || data.currencyCode,
    syncStatus: (isTruthyStatus(r.status ?? 1) ? "Synced" : "Not Synced") as CurrencyRecord["syncStatus"],
    lastSynced: formatDisplayDate(r.updated_at || r.created_at),
    createdBy: r.created_by_name || r.created_by_user?.name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.created_at),
  };
}

export async function deleteCurrencyApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/currencies/${toNumericOrCleanId(id)}`);
}

export async function toggleCurrencyStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/currencies/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterAccounts(): Promise<AccountRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/accounts", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    accountCode: r.code || "",
    accountName: r.name || "",
    category: r.category || r.type || "Inventory",
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  }));
}

export async function saveAccountApi(
  data: { accountCode: string; accountName: string; category?: string; status: boolean },
  id?: string
): Promise<AccountRecord | null> {
  const payload = {
    code: data.accountCode,
    name: data.accountName,
    category: data.category || "Inventory",
    status: data.status ? 1 : 0,
  };
  const res = id
    ? await apiPut<{ data: any }>(`/api/exim/master/accounts/${toNumericOrCleanId(id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/accounts", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    no: 1,
    accountCode: r.code || data.accountCode,
    accountName: r.name || data.accountName,
    category: r.category || data.category || "Inventory",
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  };
}

export async function deleteAccountApi(id: string): Promise<boolean> {
  return apiDelete(`/api/exim/master/accounts/${toNumericOrCleanId(id)}`);
}

export async function toggleAccountStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/accounts/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

export async function fetchMasterJobNumbers(): Promise<JobNumberRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/procurement/master/job-numbers", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    jobNumber: r.code || r.job_number || "",
    jobName: r.description || r.name || "",
    department: r.department?.name || r.department_name || "-",
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  }));
}

export async function saveJobNumberApi(
  data: { jobNumber: string; jobName?: string; department?: string; status: boolean },
  id?: string
): Promise<JobNumberRecord | null> {
  const payload = {
    code: data.jobNumber,
    description: data.jobName || "",
    department_name: data.department || "",
    status: data.status ? 1 : 0,
  };
  const res = id
    ? await apiPut<{ data: any }>(`/api/procurement/master/job-numbers/${toNumericOrCleanId(id)}`, payload)
    : await apiPost<{ data: any }>("/api/procurement/master/job-numbers", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    no: 1,
    jobNumber: r.code || data.jobNumber,
    jobName: r.description || data.jobName || "",
    department: r.department?.name || r.department_name || data.department || "-",
    status: isTruthyStatus(r.status),
    createdBy: r.created_by_name || r.creator?.name || "-",
    createdAt: formatDisplayDate(r.updated_at || r.created_at),
  };
}

export async function deleteJobNumberApi(id: string): Promise<boolean> {
  return apiDelete(`/api/procurement/master/job-numbers/${toNumericOrCleanId(id)}`);
}

export async function toggleJobNumberStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/procurement/master/job-numbers/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

// =========================================================================
// 5. EXIM OPERATIONS (RECEIVE NOTE, RECEIVE NOTE RETURN, DOCUMENT HISTORY)
// =========================================================================

export async function fetchMasterReceiveNotes(): Promise<ReceiveNoteRecord[] | null> {
  const res = await apiGet<{ rows?: any[]; data?: any[] }>("/api/warehouse/rn", { per_page: 200 });
  const rows = res?.rows || res?.data;
  if (!Array.isArray(rows)) return null;

  return rows.map((r: any, idx: number) => {
    const rawFac = String(r.facility || "");
    const items = Array.isArray(r.items)
      ? r.items.map((it: any, iIdx: number) => ({
          id: String(it.id || iIdx + 1),
          no: iIdx + 1,
          poNumber: it.poNumber || it.po_number || "-",
          poDate: it.poDate || it.po_date || "-",
          dnNumber: it.dnNumber || it.dn_number || "-",
          dnDate: it.dnDate || it.dn_date || "-",
          jobNumber: it.jobNumber || it.job_number || "-",
          jobDate: it.jobDate || it.job_date || "-",
          itemCode: it.itemCode || it.code || "-",
          itemName: it.itemName || it.item || "-",
          qty: Number(it.quantity ?? it.qty ?? 0),
          unit: it.unit || "-",
          rafaksi: Number(it.rafaksi ?? 0),
          rafaksiPercent: Number(it.rafaksi_percent ?? 0),
          pricePerUnit: Number(it.price ?? it.pricePerUnit ?? 0),
          priceSubtotal: Number(it.subtotal ?? (Number(it.quantity || 0) * Number(it.price || 0))),
          price2PerUnit: Number(it.price2 ?? it.price ?? 0),
          price2Subtotal: Number(it.subtotal2 ?? it.subtotal ?? 0),
          remark: it.remark || "-",
          sjNumber: it.sj_number || r.sj_number || "-",
          sjDate: it.sj_date || r.sj_date || "-",
          poQty: Number(it.po_qty ?? it.quantity ?? 0),
          dlvrQty: Number(it.dlvr_qty ?? it.quantity ?? 0),
          suratJalanQty: Number(it.surat_jalan_qty ?? it.quantity ?? 0),
        }))
      : [];

    const totalSubtotal = items.reduce((s: number, it: any) => s + Number(it.priceSubtotal || 0), 0);
    const totalQty = items.reduce((s: number, it: any) => s + Number(it.qty || 0), 0);
    const bpbNumbers = Array.isArray(r.bpb_numbers) ? r.bpb_numbers : [];

    return {
      id: String(r.id || r._id || idx + 1),
      no: idx + 1,
      rnNumber: r.rn_number || r._rawRn || "",
      arrivalDate: r.arrival_date || r.date || "-",
      poNumber: r.po_number || items[0]?.poNumber || "-",
      date: r.date || r.arrival_date || "-",
      supplier: r.supplier || r._rawSupplier || "-",
      facility: /non/i.test(rawFac) ? "NON FASILITAS" : "FASILITAS",
      bcCode: r.bc_type || "-",
      ajuNumber: r.aju_number || "-",
      noDaftar: r.no_daftar || "-",
      amount: Number(r.grand_total ?? totalSubtotal),
      amountFormatted: `${r.currency || "IDR"} ${Number(r.grand_total ?? totalSubtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: r.note || r.description || "-",
      warehouseTransaction: bpbNumbers[0] || "-",
      bpb_number: bpbNumbers[0] || undefined,
      is_received_in_bpb: Boolean(r.is_received || bpbNumbers.length > 0),
      notes: r.note || r.description || "-",
      note: r.note || r.description || "-",
      remark: r.note || r.description || "-",
      currency: r.currency || "IDR",
      rate: Number(r.rate || 1),
      invoiceNumber: r.invoice_number || "-",
      invoiceDate: r.invoice_date || "-",
      taxInvoiceNumber: r.tax_invoice || "-",
      taxInvoiceDate: r.tax_invoice_date || "-",
      vehicleType: r.vehicle_type || "-",
      licensePlate: r.license_plate || "-",
      tanggalDaftar: r.tanggal_daftar || "-",
      nomorPackingList: r.pl_number || r.sj_number || "-",
      tanggalPackingList: r.pl_date || r.sj_date || "-",
      status: String(r.status || "Waiting for Approve 1"),
      createdAt: formatDisplayDate(r.created_at),
      lastUpdatedAt: formatDisplayDate(r.updated_at || r.created_at),
      approval1At: r.approval1_at || "-",
      approval2At: r.approval2_at || "-",
      items,
      totalQty: Number(r.total_qty ?? totalQty),
      biayaLain: Number(r.biaya_lain ?? 0),
      discountPercent: Number(r.discount_percent ?? 0),
      discountAmount: Number(r.discount_amount ?? 0),
      ppnPercent: Number(r.ppn_percent ?? 0),
      ppnAmount: Number(r.ppn_amount ?? 0),
      grandTotal: Number(r.grand_total ?? totalSubtotal),
    };
  });
}

export async function fetchReceiveNoteAvailablePosApi(params?: { supplierId?: string | number; facility?: string }): Promise<any[]> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/rn/available-pos", params as any);
  return res?.data ?? [];
}

export async function deleteReceiveNoteApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/warehouse/rn/${toNumericOrCleanId(id)}`);
}

export async function approveReceiveNoteApi(id: string | number, tier?: number, note?: string): Promise<any> {
  return apiPost(`/api/warehouse/rn/${toNumericOrCleanId(id)}/approve`, { tier, note });
}

export async function rejectReceiveNoteApi(id: string | number, reason: string): Promise<any> {
  return apiPost(`/api/warehouse/rn/${toNumericOrCleanId(id)}/reject`, { reason });
}

export async function fetchMasterReceiveNoteReturns(): Promise<ReceiveNoteReturnRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/returns", { per_page: 200 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => {
    const rawFac = String(r.facility || "");
    const rawStatus = String(r.status || "Waiting for Approve 1");
    let approvalStatus = "Waiting for Approve 1";
    if (/reject/i.test(rawStatus)) approvalStatus = "Rejected";
    else if (/approve\s*2|^approved$/i.test(rawStatus)) approvalStatus = "Approved";
    else if (/waiting.*2|approve\s*1/i.test(rawStatus)) approvalStatus = "Waiting for Approve 2";

    const rate = Number(r.exchange_rate || 1);
    const items = Array.isArray(r.items)
      ? r.items.map((it: any, iIdx: number) => {
          const qty = Number(it.return_qty ?? it.returnQty ?? it.quantity ?? 0);
          const price = Number(it.unit_price ?? it.price ?? 0);
          const sub = Number(it.total_amount ?? it.subtotal ?? qty * price);
          return {
            id: String(it.id || iIdx + 1),
            no: iIdx + 1,
            doNumber: it.po_number || it.doNumber || r.rn_reference || "-",
            doDate: r.return_date ? String(r.return_date).slice(0, 10) : "-",
            sjNumber: r.sj_number || "-",
            itemCode: it.item_code || it.itemCode || "-",
            itemName: it.item_name || it.itemName || "-",
            quantity: qty,
            unit: it.unit || "-",
            qtyPackage: Number(it.qty_package ?? 1),
            packageType: it.package_type || "BOX",
            price,
            subtotal: sub,
            subtotalIdr: sub * rate,
            deliveryQty: qty,
            returQty: qty,
          };
        })
      : [];

    const totalSubtotal = items.reduce((s: number, i: any) => s + Number(i.subtotal || 0), 0);
    return {
      id: String(r.id),
      no: idx + 1,
      rnNumber: r.return_number || r.rn_reference || "",
      rnDate: r.return_date ? String(r.return_date).slice(0, 10) : "-",
      deliveryOrder: r.rn_reference || r.sj_number || null,
      doDate: r.sj_date ? String(r.sj_date).slice(0, 10) : null,
      customer: r.supplier_name || "-",
      facility: /non/i.test(rawFac) ? "NON FASILITAS" : "FASILITAS",
      bcCode: r.bc_type || "-",
      ajuNumber: r.aju_number || "-",
      noDaftar: r.registration_number || null,
      amount: totalSubtotal,
      amountFormatted: `${r.currency || "IDR"} ${totalSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      description: r.reason || "-",
      warehouseTransaction: null,
      warehouseReceiveDate: null,
      approvalStatus,
      userCreated: r.created_by_name || "-",
      createdAtTimestamp: formatDisplayDate(r.created_at),
      arrivalDate: r.return_date ? String(r.return_date).slice(0, 10) : "-",
      typeOfReturn: r.reason || "Purchase Return",
      salesDeliveryNumber: r.rn_reference || "-",
      vehicleType: r.vehicle_type || "-",
      licensePlate: r.license_plate || "-",
      createdAt: formatDisplayDate(r.created_at),
      lastUpdatedAt: formatDisplayDate(r.updated_at || r.created_at),
      releasedAt: formatDisplayDate(r.created_at),
      approvedAt: r.approved2_at ? formatDisplayDate(r.approved2_at) : "-",
      items,
      totalSubtotal,
      totalAdditionalCost: 0,
      grandTotal: totalSubtotal,
      notes: r.reason || "-",
    };
  });
}

export async function fetchReceiveNoteReturnAvailableSourcesApi(supplierId?: string | number): Promise<any[]> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/returns/available-sources", supplierId ? { supplier_id: supplierId } : undefined);
  return res?.data ?? [];
}

export async function saveReceiveNoteReturnApi(newRecord: ReceiveNoteReturnRecord): Promise<ReceiveNoteReturnRecord | null> {
  const payload = {
    return_number: newRecord.rnNumber,
    rn_reference: newRecord.deliveryOrder || newRecord.salesDeliveryNumber || newRecord.items?.[0]?.doNumber,
    return_date: newRecord.rnDate || newRecord.arrivalDate,
    supplier_name: newRecord.customer,
    facility: /non/i.test(newRecord.facility) ? "Non Fasilitas" : "Fasilitas",
    sj_number: newRecord.items?.[0]?.sjNumber || newRecord.deliveryOrder,
    sj_date: newRecord.doDate || newRecord.rnDate,
    bc_type: newRecord.bcCode,
    aju_number: newRecord.ajuNumber,
    registration_number: newRecord.noDaftar,
    license_plate: newRecord.licensePlate,
    vehicle_type: newRecord.vehicleType,
    reason: newRecord.description || newRecord.notes,
    status: newRecord.approvalStatus || "Waiting for Approve 1",
    items: (newRecord.items || []).map((it) => ({
      po_number: it.doNumber,
      rn_reference: newRecord.deliveryOrder,
      item_code: it.itemCode,
      item_name: it.itemName,
      return_qty: it.returQty ?? it.quantity,
      unit: it.unit,
      unit_price: it.price,
      total_amount: it.subtotal,
      reason: newRecord.description || "-",
    })),
  };
  const res = await apiPost<{ data: any }>("/api/exim/operations/returns", payload);
  if (!res?.data) return null;
  return {
    ...newRecord,
    id: String(res.data.id),
    rnNumber: res.data.return_number || newRecord.rnNumber,
    userCreated: res.data.created_by_name || newRecord.userCreated || "-",
    lastUpdatedAt: formatDisplayDate(res.data.updated_at || res.data.created_at),
  };
}

export async function approveReceiveNoteReturnApi(id: string | number): Promise<any> {
  return apiPost(`/api/exim/operations/returns/${toNumericOrCleanId(id)}/approve`, {});
}

export async function rejectReceiveNoteReturnApi(id: string | number, reason?: string): Promise<any> {
  return apiPost(`/api/exim/operations/returns/${toNumericOrCleanId(id)}/reject`, { reason });
}

export async function deleteReceiveNoteReturnApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/exim/operations/returns/${toNumericOrCleanId(id)}`);
}

export async function fetchMasterDocumentHistories(): Promise<DocumentHistoryRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/operations/document-histories", { per_page: 200 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => {
    const cif = Number(r.cif_value || 0);
    const curr = r.currency || "IDR";
    return {
      id: String(r.id),
      no: idx + 1,
      invoiceNumber: r.reference_doc_number || r.aju_number || "-",
      mutationType: r.reference_doc_type || "INCOMING",
      invoiceDate: r.registration_date ? String(r.registration_date).slice(0, 10) : "-",
      customerSupplier: r.partner_name || "-",
      customsDocument: `${r.bc_type || "-"} / ${r.aju_number || "-"}`,
      amount: cif,
      amountFormatted: `${curr} ${cif.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      lastUpdatedUser: r.created_by_name || "-",
      lastUpdatedTimestamp: formatDisplayDate(r.updated_at || r.created_at),
      transactionNumber: r.aju_number || "-",
      invoiceAlias: r.registration_number || "-",
      customer: r.partner_name || "-",
      destination: r.customs_office || "-",
      blNumber: r.sppb_number || "-",
      currency: curr,
      createdAt: formatDisplayDate(r.created_at),
      lastUpdatedAt: formatDisplayDate(r.updated_at || r.created_at),
      items: [],
      totalUnitPrice: cif,
      totalSubtotal: cif,
    };
  });
}

export async function synchronizeDocumentHistoriesApi(): Promise<any> {
  return apiPost("/api/exim/operations/document-histories/synchronize", {});
}

export async function generateDocumentHistoryApi(payload: Record<string, any>): Promise<any> {
  return apiPost("/api/exim/operations/document-histories/generate", payload);
}

export async function deleteDocumentHistoryApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/exim/operations/document-histories/${toNumericOrCleanId(id)}`);
}

export async function fetchMasterUnitReferences(): Promise<UnitReferenceRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/exim/master/unit-references", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any) => ({
    id: String(r.id),
    code: r.code || r.unit?.nama || "",
    description: r.name || r.description || r.unit?.nama || "",
  }));
}

export async function saveUnitReferenceApi(record: Partial<UnitReferenceRecord>, isEdit?: boolean): Promise<UnitReferenceRecord | null> {
  const payload = {
    code: record.code,
    name: record.description,
    status: 1,
  };
  const res = isEdit && record.id
    ? await apiPut<{ data: any }>(`/api/exim/master/unit-references/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/exim/master/unit-references", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    id: String(r.id),
    code: r.code || record.code || "",
    description: r.name || r.description || record.description || "",
  };
}

export async function deleteUnitReferenceApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/exim/master/unit-references/${toNumericOrCleanId(id)}`);
}

export async function toggleUnitReferenceStatusApi(id: string | number): Promise<boolean> {
  const res = await apiPatch(`/api/exim/master/unit-references/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

// =========================================================================
// 6. WAREHOUSE MATERIAL REQUEST & TRANSFER STOCK RETURN
// =========================================================================

export async function fetchRequestMaterials(): Promise<RequestMaterialRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/request-materials", { per_page: 200 });
  if (!res?.data) return null;

  return res.data.map((r: any, index: number) => {
    const rawStatus = String(r.approval || r.approval_status || r.status || "Draft");
    let approval: ApprovalStatus = "Draft";
    if (/reject/i.test(rawStatus)) approval = "Rejected";
    else if (/approved\s*2|^approved$/i.test(rawStatus)) approval = "Approved 2";
    else if (/approved\s*1|waiting.*2/i.test(rawStatus)) approval = "Approved 1";
    else if (/waiting.*1/i.test(rawStatus)) approval = "Waiting Approve 1" as ApprovalStatus;

    const items = Array.isArray(r.items)
      ? r.items.map((it: any, iIdx: number) => ({
          id: String(it.id || `item-${iIdx + 1}`),
          items_id: it.items_id ? Number(it.items_id) : undefined,
          itemCode: it.itemCode || it.item_code || it.item?.code || "-",
          externalCode: it.externalCode || it.external_code || it.item?.external_code || "-",
          itemName: it.itemName || it.item_name || it.item?.name || "-",
          unit: it.unit || it.item?.unit?.name || "-",
          jobNumber: it.jobNumber || it.job_number || r.jobNumber || r.job_number || "-",
          size: it.size || "-",
          stockQty: Number(it.stockQty ?? it.stock_qty ?? 0),
          pendingQty: Number(it.pendingQty ?? it.pending_qty ?? 0),
          requestQty: Number(it.requestQty ?? it.request_qty ?? it.qty ?? 0),
          remark: it.remark || "-",
        }))
      : [];

    return {
      id: String(r.rawId ?? r.id ?? r.requestCode ?? r.code),
      no: index + 1,
      requestCode: r.requestCode || r.code || `REQ-${r.id}`,
      requestDate: r.requestDate || r.date || "-",
      destinationLocation: r.destinationLocation || r.destination_location || r.warehouse_destination || "-",
      department: r.department || "-",
      typeOfRequest: r.typeOfRequest || r.type_of_request || "-",
      jobNumber: r.jobNumber || r.job_number || "-",
      customer: r.customer || "-",
      requestNote: r.requestNote || r.note || "-",
      totalItems: Number(r.totalItems ?? r.total_items ?? items.length),
      approval,
      projectType: r.projectType || r.project_type || "-",
      createdDate: formatDisplayDate(r.createdDate || r.created_at),
      lastUpdatedDate: formatDisplayDate(r.lastUpdatedDate || r.updated_at || r.created_at),
      createdBy: r.createdBy || r.created_by || "-",
      soNumber: r.so_number || "-",
      poBuyer: r.po_buyer || "-",
      warehouseDestination: r.warehouseName || r.warehouse_destination || r.destinationLocation || r.destination_location || "-",
      approved1At: r.approved1At || r.approved_1_at || "-",
      approved2At: r.approved2At || r.approved_2_at || "-",
      revisionCount: Number(r.revision_count ?? 0),
      items,
    };
  });
}

export async function saveRequestMaterialApi(record: RequestMaterialRecord & Record<string, any>): Promise<any> {
  return apiPost("/api/warehouse/request-materials", {
    requestDate: record.requestDate,
    departments_id: record.departments_id || undefined,
    department: record.department,
    warehouses_id: record.warehouses_id || undefined,
    warehouse: record.warehouseDestination || record.warehouse || undefined,
    type_of_request_id: record.type_of_request_id || undefined,
    typeOfRequest: record.typeOfRequest,
    destination_location_id: record.destination_location_id || undefined,
    destinationLocation: record.destinationLocation,
    job_number_id: record.job_number_id || undefined,
    jobNumber: record.jobNumber && record.jobNumber !== "-" ? record.jobNumber : undefined,
    customer: record.customer,
    projectType: record.projectType,
    is_internal_warehouse: Boolean(record.isInternalWarehouse),
    is_specific_station: Boolean(record.isSpecificStation),
    requestNote: record.requestNote,
    note: record.requestNote,
    items: (record.items || []).map((it: any) => ({
      items_id: it.items_id || undefined,
      itemCode: it.itemCode,
      itemName: it.itemName,
      unit: it.unit,
      jobNumber: it.jobNumber,
      size: it.size,
      requestQty: Number(it.requestQty ?? it.qty ?? 1),
      remark: it.remark || "",
    })),
  });
}

export async function fetchTransferStockReturnsApi(): Promise<TransferStockReturnRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/transfer-stock-returns", { per_page: 200 });
  if (!res?.data) return null;
  return res.data.map((r: any) => {
    const rawStatus = String(r.status || "Waiting Approve 1");
    let status: TransferStockReturnStatus = "Waiting Approve 1";
    if (/reject/i.test(rawStatus)) status = "Rejected";
    else if (/approved\s*1|waiting.*2/i.test(rawStatus)) status = "Waiting Approve 2";
    else if (/^approved$|approved\s*2/i.test(rawStatus)) status = "Approved";
    else if (/draft/i.test(rawStatus)) status = "Draft";
    else if (/waiting.*1/i.test(rawStatus)) status = "Waiting Approve 1";

    const items = Array.isArray(r.items)
      ? r.items.map((it: any, idx: number) => ({
          id: String(it.id || idx + 1),
          items_id: it.items_id ? Number(it.items_id) : undefined,
          itemCode: it.itemCode || it.item_code || "-",
          itemName: it.itemName || it.item_name || "-",
          quantity: Number(it.quantity ?? it.return_qty ?? 0),
          unit: it.unit || "-",
          sourceLocation: it.sourceLocation || it.source_location || "-",
          destinationLocation: it.destinationLocation || it.destination_location || "-",
          reason: it.remark || it.reason || "-",
        }))
      : [];

    return {
      id: String(r.rawId ?? r.id),
      warehouses_id: r.warehouses_id ?? r.warehouseId ? Number(r.warehouses_id ?? r.warehouseId) : undefined,
      warehouseName: r.warehouse || r.warehouseName || "",
      request_material_id: r.request_material_id ?? r.requestMaterialId ? Number(r.request_material_id ?? r.requestMaterialId) : undefined,
      job_number_id: r.job_number_id ?? r.jobNumberId ? Number(r.job_number_id ?? r.jobNumberId) : undefined,
      mutationCode: r.returnNumber || r.mutationCode || r.mutation_code || "",
      productionCode: r.productionCode || r.production_code || "",
      jobNumber: r.jobNumber || r.job_number || "-",
      transferDate: r.returnDateFormatted || r.returnDate || r.transferDate || r.transfer_date || "-",
      transferNote: r.note || r.transferNote || r.transfer_note || "-",
      totalItems: Number(r.itemCount ?? r.totalItems ?? items.length),
      status,
      userCreated: r.createdBy || r.userCreated || r.created_by || "-",
      userLastUpdated: formatDisplayDate(r.updatedAt || r.createdAt || r.userLastUpdated),
      items,
    };
  });
}

export async function fetchTransferStockReturnAvailableSourcesApi(): Promise<any[]> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/transfer-stock-returns/available-sources");
  return res?.data ?? [];
}

export async function saveTransferStockReturnApi(payload: Record<string, any>, editId?: string | number): Promise<any> {
  if (editId !== undefined && editId !== null && String(editId).trim() !== "" && /^\d+$/.test(toNumericOrCleanId(editId))) {
    return apiPut(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(editId)}`, payload);
  }
  return apiPost("/api/warehouse/transfer-stock-returns", payload);
}

export async function approveTransferStockReturnApi(id: string | number, tier?: number, note?: string): Promise<any> {
  return apiPost(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(id)}/approve`, { tier, note });
}

export async function rejectTransferStockReturnApi(id: string | number, reason: string): Promise<any> {
  return apiPost(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(id)}/reject`, { note: reason, reason });
}

export async function deleteTransferStockReturnApi(id: string | number): Promise<boolean> {
  return apiDelete(`/api/warehouse/transfer-stock-returns/${toNumericOrCleanId(id)}`);
}

// =========================================================================
// 7. DASHBOARD EXCHANGE RATES & STOCK NOTIFICATIONS / ALERTS
// =========================================================================

export async function fetchExchangeRatesApi(params?: {
  currency_code?: string;
  rate_type?: string;
  start_date?: string;
  end_date?: string;
}): Promise<ExchangeRateRecord[]> {
  const queryParams = params
    ? {
        currency: params.currency_code,
        rateType: params.rate_type,
        startDate: params.start_date,
        endDate: params.end_date,
      }
    : undefined;
  const res = await apiGet<{ data: any[] }>("/api/dashboard/exchange-rates", { per_page: 200, ...queryParams });
  if (!res?.data) return [];
  return res.data.map((r: any, idx: number) => {
    const rawRateType = String(r.rate_type || "");
    let rateType: RateType = "Bank Indonesia (BI)";
    if (/pajak|kmk/i.test(rawRateType)) rateType = "Pajak (KMK)";
    else if (/commercial|counter|komersial/i.test(rawRateType)) rateType = "Commercial Bank (Counter)";
    else if (/bi|tengah|indonesia/i.test(rawRateType)) rateType = "Bank Indonesia (BI)";

    const buyingRaw = r.buy_rate ?? r.buying_rate;
    const sellingRaw = r.sell_rate ?? r.selling_rate;
    const middleRaw = r.middle_rate ?? r.rate;

    return {
      id: String(r.id),
      no: idx + 1,
      rateDate: r.rate_date ? String(r.rate_date).slice(0, 10) : "-",
      currencyCode: r.currency_code || "USD",
      currencyName: r.currency?.name || r.currency_name || r.currency_code || "-",
      rateType,
      buyingRate: buyingRaw !== null && buyingRaw !== undefined ? Number(buyingRaw) : null,
      sellingRate: sellingRaw !== null && sellingRaw !== undefined ? Number(sellingRaw) : null,
      rate: middleRaw !== null && middleRaw !== undefined ? Number(middleRaw) : null,
      flag: r.flag || r.reference_document || "-",
      availability: (["Available", "Unavailable", "Pending"].includes(r.availability)
        ? r.availability
        : "Available") as RateAvailability,
      note: r.notes || r.note || undefined,
    };
  });
}

export async function fetchLatestExchangeRatesApi(): Promise<Record<string, number>> {
  const res = await apiGet<{ data: any }>("/api/dashboard/exchange-rates/latest");
  const out: Record<string, number> = { IDR: 1 };
  if (Array.isArray(res?.data)) {
    res.data.forEach((r: any) => {
      if (r.currency_code && (r.middle_rate || r.rate)) {
        out[String(r.currency_code).toUpperCase()] = Number(r.middle_rate || r.rate);
      }
    });
  } else if (res?.data && typeof res.data === "object") {
    Object.entries(res.data).forEach(([k, v]: [string, any]) => {
      if (typeof v === "number") out[k.toUpperCase()] = v;
      else if (v && typeof v === "object" && (v.middle_rate || v.rate)) {
        out[k.toUpperCase()] = Number(v.middle_rate || v.rate);
      }
    });
  }
  return out;
}

export async function saveExchangeRateApi(record: Partial<ExchangeRateRecord>, editId?: string): Promise<any> {
  const payload = {
    rate_date: record.rateDate,
    currency_code: record.currencyCode,
    rate_type: record.rateType,
    buying_rate: record.buyingRate,
    selling_rate: record.sellingRate,
    middle_rate: record.rate,
    reference_document: record.flag,
    availability: record.availability || "Available",
    notes: record.note,
  };
  if (editId) {
    return apiPut(`/api/dashboard/exchange-rates/${toNumericOrCleanId(editId)}`, payload);
  }
  return apiPost("/api/dashboard/exchange-rates", payload);
}

export async function deleteExchangeRateApi(id: string): Promise<boolean> {
  return apiDelete(`/api/dashboard/exchange-rates/${toNumericOrCleanId(id)}`);
}

export async function fetchStockNotificationsApi(): Promise<StockNotificationRecord[] | null> {
  const res = await apiGet<{ data: any[] }>("/api/dashboard/stock-notifications", { per_page: 500 });
  if (!res?.data) return null;
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    itemCode: r.item_code || r.item?.code || "-",
    itemName: r.item_name || r.item?.name || "-",
    category: r.category || r.item?.category?.name || "-",
    unit: r.unit || r.item?.unit?.unit?.nama || "-",
    currentStock: Number(r.current_stock ?? 0),
    bufferQuantity: Number(r.buffer_quantity ?? 0),
    triggerCondition: (r.trigger_condition === "Stock < Buffer" ? "Stock < Buffer" : "Stock <= Buffer") as StockNotificationRecord["triggerCondition"],
    notificationLevel: (["Critical", "Warning", "Standard"].includes(r.notification_level)
      ? r.notification_level
      : "Warning") as StockNotificationRecord["notificationLevel"],
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    lastTriggered: r.last_triggered_at ? formatDisplayDate(r.last_triggered_at) : undefined,
    notes: r.notes || undefined,
    createdAt: formatDisplayDate(r.created_at),
    createdBy: r.created_by || r.creator?.name || "-",
    updatedAt: r.updated_at ? formatDisplayDate(r.updated_at) : undefined,
    updatedBy: r.updated_by || undefined,
  }));
}

export async function fetchStockAlertsApi(): Promise<StockNotificationRecord[]> {
  const res = await apiGet<{ data: any[] }>("/api/dashboard/stock-alerts");
  if (!res?.data) return [];
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id),
    no: idx + 1,
    itemCode: r.item_code || r.item?.code || "-",
    itemName: r.item_name || r.item?.name || "-",
    category: r.category || "-",
    unit: r.unit || "-",
    currentStock: Number(r.current_stock ?? 0),
    bufferQuantity: Number(r.buffer_quantity ?? 0),
    triggerCondition: (r.trigger_condition === "Stock < Buffer" ? "Stock < Buffer" : "Stock <= Buffer") as StockNotificationRecord["triggerCondition"],
    notificationLevel: (["Critical", "Warning", "Standard"].includes(r.notification_level)
      ? r.notification_level
      : "Critical") as StockNotificationRecord["notificationLevel"],
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    lastTriggered: r.last_triggered_at ? formatDisplayDate(r.last_triggered_at) : undefined,
    notes: r.notes || undefined,
    createdAt: formatDisplayDate(r.created_at),
    createdBy: r.created_by || "-",
  }));
}

export async function saveStockNotificationApi(record: StockNotificationRecord, isEdit?: boolean): Promise<StockNotificationRecord | null> {
  const payload = {
    item_code: record.itemCode,
    item_name: record.itemName,
    category: record.category,
    unit: record.unit,
    current_stock: record.currentStock,
    buffer_quantity: record.bufferQuantity,
    trigger_condition: record.triggerCondition,
    notification_level: record.notificationLevel,
    status: record.status === "Active" ? 1 : 0,
    notes: record.notes,
  };
  const res = isEdit && record.id
    ? await apiPut<{ data: any }>(`/api/dashboard/stock-notifications/${toNumericOrCleanId(record.id)}`, payload)
    : await apiPost<{ data: any }>("/api/dashboard/stock-notifications", payload);
  if (!res?.data) return null;
  const r = res.data;
  return {
    ...record,
    id: String(r.id),
    currentStock: Number(r.current_stock ?? record.currentStock),
    bufferQuantity: Number(r.buffer_quantity ?? record.bufferQuantity),
    status: isTruthyStatus(r.status) ? "Active" : "Inactive",
    createdAt: formatDisplayDate(r.created_at || record.createdAt),
    createdBy: r.created_by || record.createdBy || "-",
  };
}

export async function deleteStockNotificationApi(id: string): Promise<boolean> {
  return apiDelete(`/api/dashboard/stock-notifications/${toNumericOrCleanId(id)}`);
}

export async function toggleStockNotificationStatusApi(id: string): Promise<boolean> {
  const res = await apiPatch(`/api/dashboard/stock-notifications/${toNumericOrCleanId(id)}/toggle-status`);
  return Boolean(res);
}

// =========================================================================
// 8. WAREHOUSE & PROCUREMENT REPORTS (STOCK ITEM, STOCK CARD, PR, PO)
// =========================================================================

export async function fetchStockItemsReportApi(params?: Record<string, any>): Promise<WarehouseStockRecord[]> {
  const res = await apiGet<{ data: any[] }>("/api/warehouse/reports/stock-item", params);
  if (!Array.isArray(res?.data)) return [];
  return res.data.map((r: any, idx: number) => ({
    id: String(r.id || idx + 1),
    number: Number(r.number || idx + 1),
    materialCode: r.materialCode || r.item_code || "-",
    externalCode: r.externalCode || r.external_code || "-",
    materialItem: r.materialItem || r.item_name || "-",
    classification: r.classification || "-",
    facility: r.facility || "FASILITAS",
    coordinate: r.coordinate || "-",
    locationType: (r.locationType === "Production Area" ? "Production Area" : "Warehouse") as WarehouseStockRecord["locationType"],
    warehouseName: r.warehouseName || r.warehouse || "-",
    quantity: Number(r.quantity ?? 0),
    unit: r.unit || "-",
    stockStatus: (Number(r.quantity ?? 0) > 0 ? "Available" : "Not Available") as WarehouseStockRecord["stockStatus"],
    date: r.date || "-",
    lotNumber: r.lotNumber || r.lot_number || "-",
    zone: r.zone || "-",
    rack: r.rack || "-",
    bin: r.bin || "-",
    allocatedQty: Number(r.allocatedQty ?? 0),
    availableQty: Number(r.availableQty ?? r.quantity ?? 0),
    lastMovementDate: r.lastMovementDate || r.date || "-",
    remark: r.remark || "-",
  }));
}

export async function fetchStockCardReportApi(params?: Record<string, any>): Promise<{
  data: StockCardRecord[];
  items?: any[];
  warehouses?: string[];
  units?: string[];
}> {
  const res = await apiGet<{ data: any[]; items?: any[]; warehouses?: string[]; units?: string[] }>("/api/warehouse/reports/stock-card", params);
  const rows: StockCardRecord[] = Array.isArray(res?.data)
    ? res.data.map((r: any, idx: number) => ({
        id: String(r.id || idx + 1),
        no: Number(r.no || idx + 1),
        itemCode: r.itemCode || r.item_code || "-",
        itemName: r.itemName || r.item_name || "-",
        unitCode: r.unitCode || r.unit || "-",
        warehouse: r.warehouse || "-",
        date: r.date || "-",
        ref: r.ref || "-",
        description: r.description || "-",
        in: r.in !== null && r.in !== undefined ? Number(r.in) : null,
        out: r.out !== null && r.out !== undefined ? Number(r.out) : null,
        stock: Number(r.stock ?? 0),
        historyDocIn: r.historyDocIn || "-",
        docOutRef: r.docOutRef || "-",
        noLot: r.noLot || "-",
        jobNumber: r.jobNumber || "-",
        lastUpdate: r.lastUpdate || "-",
      }))
    : [];
  return {
    data: rows,
    items: res?.items,
    warehouses: res?.warehouses,
    units: res?.units,
  };
}

export async function fetchPrReportApi(params?: Record<string, any>): Promise<PrReportRecord[]> {
  const res = await apiGet<{ data?: any[]; rows?: any[] }>("/api/reporting/pr-report", params);
  const list = res?.data || res?.rows || [];
  if (!Array.isArray(list)) return [];
  return list.map((r: any, idx: number) => ({
    id: String(r.id || idx + 1),
    prNumber: r.prNumber || r.pr_number || r.code || "-",
    prDate: r.prDate || r.pr_date || r.date || "-",
    prDateRaw: r.prDateRaw || r.pr_date_raw || r.date || "",
    dateRequired: r.dateRequired || r.date_required || r.dueDate || "-",
    dateRequiredRaw: r.dateRequiredRaw || r.date_required_raw || r.dueDate || "",
    facilityType: r.facilityType || r.facility || "FASILITAS",
    itemCode: r.itemCode || r.item_code || r.items?.[0]?.itemCode || "-",
    itemName: r.itemName || r.item_name || r.items?.[0]?.itemName || "-",
    unitCode: r.unitCode || r.unit || r.items?.[0]?.unit || "-",
    qtyRequest: Number(r.qtyRequest ?? r.qty_request ?? r.totalQuantity ?? r.qty ?? 0),
    qtyPurchase: Number(r.qtyPurchase ?? r.qty_purchase ?? 0),
    qtyRemain: Number(r.qtyRemain ?? r.qty_remain ?? 0),
    status: (r.status === "Completed" || r.status === "Ordered" ? "Completed" : "Outstanding") as PrReportRecord["status"],
    approvalDate1: r.approvalDate1 || r.approval1_at || "-",
    approvalDate2: r.approvalDate2 || r.approval2_at || "-",
    approvalStatus: (["Ready", "Approve 1", "Approve 2", "Closed"].includes(r.approvalStatus)
      ? r.approvalStatus
      : "Approve 2") as PrReportRecord["approvalStatus"],
    lastUpdatedBy: r.lastUpdatedBy || r.createdBy || r.created_by || "-",
    lastUpdatedAt: r.lastUpdatedAt || r.updated_at || r.date || "-",
    deptRequest: r.deptRequest || r.department || "-",
    section: r.section || "-",
    poDetails: Array.isArray(r.poDetails) ? r.poDetails : [],
  }));
}

export async function fetchPoReportApi(params?: Record<string, any>): Promise<PoReportRecord[]> {
  const res = await apiGet<{ data?: any[]; rows?: any[] }>("/api/reporting/po-report", params);
  const list = res?.data || res?.rows || [];
  if (!Array.isArray(list)) return [];
  return list.map((r: any, idx: number) => ({
    id: String(r.id || idx + 1),
    poNumber: r.poNumber || r.po_number || r.code || "-",
    purchaseDate: r.purchaseDate || r.purchase_date || r.date || "-",
    purchaseDateRaw: r.purchaseDateRaw || r.purchase_date_raw || r.date || "",
    supplier: r.supplier || r.supplier_name || "-",
    discount: Number(r.discount ?? 0),
    vat: Number(r.vat ?? r.ppn ?? r.ppn_amount ?? 0),
    subtotal: Number(r.subtotal ?? r.grandTotal ?? r.grand_total ?? 0),
    description: r.description || r.note || "-",
    poStatus: (["Approved", "Ready", "Draft", "Closed"].includes(r.poStatus || r.status)
      ? (r.poStatus || r.status)
      : "Approved") as PoReportRecord["poStatus"],
    receivingStatus: (r.receivingStatus === "Complete" ? "Complete" : "Outstanding") as PoReportRecord["receivingStatus"],
    facilityType: (/non/i.test(String(r.facilityType || r.facility || "")) ? "NON FASILITAS" : "FASILITAS") as PoReportRecord["facilityType"],
    createdBy: r.createdBy || r.created_by || "-",
    createdAt: r.createdAt || r.created_at || r.date || "-",
    items: Array.isArray(r.items) ? r.items : [],
  }));
}

// =========================================================================
// 9. ADMIN AUDIT LOGS & USER PROFILE
// =========================================================================

export async function fetchAuditLogsApi(params?: Record<string, any>): Promise<{ data: any[]; meta?: any }> {
  const res = await apiGet<{ data: any[]; meta?: any }>("/api/admin/audit-logs", params);
  return { data: res?.data ?? [], meta: res?.meta };
}

export async function fetchApprovalHistoriesApi(params?: Record<string, any>): Promise<{ data: any[]; meta?: any }> {
  const res = await apiGet<{ data: any[]; meta?: any }>("/api/admin/approval-histories", params);
  return { data: res?.data ?? [], meta: res?.meta };
}

export async function fetchUserProfileApi(): Promise<any> {
  const res = await apiGet<{ data: any }>("/api/user/profile");
  return res?.data ?? null;
}

export async function updateUserProfileApi(payload: Record<string, any>): Promise<any> {
  const res = await apiPut<{ data: any }>("/api/user/profile", payload);
  return res?.data ?? null;
}
