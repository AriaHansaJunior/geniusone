import type { TableRow } from "../types";

export interface ListResponse {
  stats: [string, string, string][];
  rows: TableRow[];
}

/* -------------------------------------------------------------------------- */
/*  Authenticated HTTP client                                                  */
/* -------------------------------------------------------------------------- */

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");
  } catch {
    return null;
  }
}

export function getCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute("content") : null;
}

export function buildAuthHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/json", ...extra };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const csrf = getCsrfToken();
  if (csrf) headers["X-CSRF-TOKEN"] = csrf;
  return headers;
}

/**
 * Low-level fetch wrapper: attaches Bearer token, CSRF token and session cookies,
 * and broadcasts `geniusone_unauthorized` when the server rejects the session.
 */
export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
  const extra: Record<string, string> = {};
  if (init.body !== undefined && !isFormData) extra["Content-Type"] = "application/json";
  const headers = { ...buildAuthHeaders(extra), ...((init.headers as Record<string, string>) || {}) };
  const res = await fetch(input, { credentials: "include", ...init, headers });
  if (res.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("geniusone_unauthorized"));
  }
  return res;
}

async function parseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({} as any));
  const firstValidation =
    body && body.errors && typeof body.errors === "object"
      ? (Object.values(body.errors)[0] as string[] | undefined)?.[0]
      : undefined;
  return new ApiError(body.message || body.error || firstValidation || `HTTP ${res.status}`, res.status, body.errors);
}

function buildUrl(endpoint: string, params?: Record<string, string | number | undefined | null>): string {
  const url = new URL(endpoint, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
    });
  }
  return url.toString();
}

/* -------------------------------------------------------------------------- */
/*  Transaction list / detail                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Fetch list records for a transactional module from the database.
 * Returns an empty result (never mock data) when the request fails.
 */
export async function fetchList(
  module: "pr" | "po" | "report" | "warehouse",
  searchOrParams: string | { search?: string; perPage?: number } = ""
): Promise<ListResponse> {
  const params: Record<string, string | number | undefined> = {};
  if (typeof searchOrParams === "string") {
    if (searchOrParams.trim()) params.search = searchOrParams.trim();
  } else if (searchOrParams && typeof searchOrParams === "object") {
    if (searchOrParams.search && String(searchOrParams.search).trim()) params.search = String(searchOrParams.search).trim();
    if (searchOrParams.perPage) params.per_page = searchOrParams.perPage;
  }

  try {
    const res = await apiFetch(buildUrl(`/api/${module}`, params));
    if (!res.ok) {
      console.warn(`[GeniusOne API] ${module} list HTTP ${res.status}`);
      return { stats: [], rows: [] };
    }
    const data = await res.json();
    return {
      stats: Array.isArray(data?.stats) ? data.stats : [],
      rows: Array.isArray(data?.rows) ? data.rows : [],
    };
  } catch (error) {
    console.warn(`[GeniusOne API] Error fetching ${module}:`, error);
    return { stats: [], rows: [] };
  }
}

/**
 * Fetch a single document detail from the database. Returns null when not found.
 */
export async function fetchDetail(
  module: "pr" | "po" | "report" | "warehouse" | "rn",
  code: string
): Promise<TableRow | null> {
  try {
    const res = await apiFetch(`/api/${module}/${encodeURIComponent(code)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data && data.status === "success" && data.item ? data.item : null;
  } catch (error) {
    console.warn(`[GeniusOne API] Error fetching ${module} detail for ${code}:`, error);
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Generic JSON helpers                                                       */
/* -------------------------------------------------------------------------- */

/** GET returns null on failure so read-only screens can render an empty state. */
export async function apiGet<T = any>(
  endpoint: string,
  params?: Record<string, string | number | undefined | null>
): Promise<T | null> {
  try {
    const res = await apiFetch(buildUrl(endpoint, params));
    if (!res.ok) {
      console.warn(`[GeniusOne API GET] ${endpoint} HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (e) {
    console.warn(`[GeniusOne API GET] ${endpoint} failed:`, e);
    return null;
  }
}

async function sendJson<T>(method: string, endpoint: string, data?: any): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const res = await apiFetch(endpoint, {
    method,
    body: data === undefined ? undefined : isFormData ? data : JSON.stringify(data),
  });
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return {} as T;
  return (await res.json().catch(() => ({}))) as T;
}

/** POST / PUT / PATCH throw an ApiError carrying the server message on failure. */
export function apiPost<T = any>(endpoint: string, data: any = {}): Promise<T> {
  return sendJson<T>("POST", endpoint, data);
}

export function apiPut<T = any>(endpoint: string, data: any = {}): Promise<T> {
  return sendJson<T>("PUT", endpoint, data);
}

export function apiPatch<T = any>(endpoint: string, data: any = {}): Promise<T> {
  return sendJson<T>("PATCH", endpoint, data);
}

/** DELETE throws an ApiError carrying the server message on failure. */
export async function apiDelete(endpoint: string): Promise<boolean> {
  await sendJson("DELETE", endpoint);
  return true;
}

  /**
   * Create a new Warehouse Material Receipt (BPB).
   */
  export async function createWarehouseBpb(
    payload: Record<string, any>
  ): Promise<{ status: string; message?: string; data?: TableRow } | null> {
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
      prNumber?: string;
      item_code?: string;
      item_alias?: string;
      price: number;
      order: number;
      purchased?: number;
      discount_type?: string;
      discount_types_id?: number | null;
      discount_val?: number;
      discountPercent?: number;
      pph_id?: number | null;
      ppn_id?: number | null;
      itemName?: string;
      remark?: string;
    }>;
    additional_costs?: Array<{
      additional_cost_types_id?: number;
      name?: string;
      value: number;
      note?: string;
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
    facility?: string;
    invoice_number?: string;
    invoice_date?: string;
    tax_invoice?: string;
    tax_invoice_date?: string;
    license_plate?: string;
    licensePlate?: string;
    vehicle_type?: string;
    vehicleType?: string;
    aju_number?: string;
    ajuNumber?: string;
    no_daftar?: string;
    noDaftar?: string;
    tanggal_daftar?: string;
    tanggalDaftar?: string;
    note?: string;
    notes?: string;
    remark?: string;
    description?: string;
    sj_number?: string;
    sjNumber?: string;
    sj_date?: string;
    pl_number?: string;
    pl_date?: string;
    items?: Array<any>;
  }): Promise<{ status: string; message?: string; data?: any } | null> {
    return apiPost("/api/warehouse/rn", payload);
  }

