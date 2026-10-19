import { pageConfigs, prRows, poRows, reportRows, warehouseRows, findRowBySlug } from "./mockData";
import type { TableRow } from "../types";

export interface ListResponse {
  stats: [string, string, string][];
  rows: TableRow[];
}

/**
 * Fetch list records and KPI cards for a specific module from the Laravel backend.
 * Falls back to local mock data gracefully if network fails.
 */
export async function fetchList(
  module: "pr" | "po" | "report" | "warehouse",
  search: string = ""
): Promise<ListResponse> {
  const fallback = pageConfigs[module];

  try {
    const url = new URL(`/api/${module}`, window.location.origin);
    if (search.trim()) {
      url.searchParams.set("search", search.trim());
    }

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`[GeniusOne API] ${module} list HTTP ${response.status}, using fallback.`);
      return fallback;
    }

    const data = await response.json();
    if (data && data.status === "success" && Array.isArray(data.rows) && data.rows.length > 0) {
      return {
        stats: data.stats || fallback.stats,
        rows: data.rows,
      };
    }
  } catch (error) {
    console.warn(`[GeniusOne API] Error fetching ${module}:`, error);
  }

  return fallback;
}

/**
 * Fetch single document detail from the backend.
 * Falls back to local row finder if network fails or 404.
 */
export async function fetchDetail(
  module: "pr" | "po" | "report" | "warehouse",
  code: string
): Promise<TableRow | null> {
  try {
    const encoded = encodeURIComponent(code);
    const response = await fetch(`/api/${module}/${encoded}`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.status === "success" && data.item) {
        return data.item;
      }
    }
  } catch (error) {
    console.warn(`[GeniusOne API] Error fetching ${module} detail for ${code}:`, error);
  }

  // Graceful Fallback
  const list =
    module === "pr"
      ? prRows
      : module === "po"
      ? poRows
      : module === "report"
      ? reportRows
      : warehouseRows;

  return findRowBySlug(list, code) || list[0] || null;
}

/**
 * Generic JSON API request helpers
 */
export async function apiGet<T = any>(endpoint: string, params?: Record<string, string | number>): Promise<T | null> {
  try {
    const url = new URL(endpoint, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          url.searchParams.set(k, String(v));
        }
      });
    }
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn(`[GeniusOne API GET] ${endpoint} failed:`, e);
    return null;
  }
}

export async function apiPost<T = any>(endpoint: string, data: any): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.warn(`[GeniusOne API POST] ${endpoint} failed:`, e);
    throw e;
  }
}

export async function apiPut<T = any>(endpoint: string, data: any): Promise<T | null> {
  try {
    const res = await fetch(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.warn(`[GeniusOne API PUT] ${endpoint} failed:`, e);
    throw e;
  }
}

export async function apiDelete(endpoint: string): Promise<boolean> {
  try {
    const res = await fetch(endpoint, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
    return res.ok;
  } catch (e) {
    console.warn(`[GeniusOne API DELETE] ${endpoint} failed:`, e);
    return false;
  }
}

/**
 * Create a new Warehouse Material Receipt (BPB).
 */
export async function createWarehouseBpb(payload: {
  rn_number?: string;
  receive_date?: string;
  note?: string;
  warehouse_id?: number;
}): Promise<{ status: string; message?: string; data?: TableRow } | null> {
  return apiPost("/api/warehouse", payload);
}

/**
 * Create a new Purchase Requisition (PR).
 */
export async function createPurchaseRequisition(payload: {
  pr_number?: string;
  departments_id?: number | string;
  sections_id?: number | string;
  deptRequest?: string;
  section?: string;
  date?: string;
  due_date: string;
  items: Array<{
    items_id?: number;
    itemCode?: string;
    itemName?: string;
    quantity: number | string;
    dueDate?: string;
    due_date?: string;
    remark?: string;
  }>;
}): Promise<{ status: string; message?: string; data?: any } | null> {
  return apiPost("/api/procurement/pr", payload);
}

/**
 * Create a new Purchase Order (PO).
 */
export async function createPurchaseOrder(payload: {
  po_number?: string;
  po_types_id?: number | string;
  poType?: string;
  supliers_id?: number | string;
  supplierId?: string;
  date?: string;
  due_date: string;
  valutas_id?: number | string;
  currency?: string;
  rate?: string | number;
  address?: string;
  payment_terms_id?: number;
  paymentTerm?: string;
  payment_methods_id?: number;
  paymentMethod?: string;
  delivery_terms_id?: number;
  deliveryTerm?: string;
  latest_delivery?: string;
  service_subkon?: boolean;
  facility_status?: string;
  remark?: string;
  items: Array<{
    pr_has_items_id?: number;
    price: number;
    order: number;
    purchased?: number;
    discount_types_id?: number;
    discount_val?: number;
    discountPercent?: number;
    pph_id?: number;
    ppn_id?: number;
    itemName?: string;
  }>;
  additional_costs?: Array<{
    additional_cost_types_id: number;
    value: number;
  }>;
}): Promise<{ status: string; message?: string; data?: any } | null> {
  return apiPost("/api/procurement/po", payload);
}

/**
 * Create a new Receive Note (RN).
 */
export async function createReceiveNote(payload: {
  rn_number?: string;
  rnNumber?: string;
  supliers_id?: number | string;
  supplier?: string;
  currencies_id?: number;
  currency?: string;
  rate?: number;
  arrival_date: string;
  invoice_number?: string;
  invoice_date?: string;
  tax_invoice?: string;
  tax_invoice_date?: string;
  license_plate?: string;
  note?: string;
  sj_number?: string;
  sj_date?: string;
  items?: Array<any>;
}): Promise<{ status: string; message?: string; data?: any } | null> {
  return apiPost("/api/warehouse/rn", payload);
}

