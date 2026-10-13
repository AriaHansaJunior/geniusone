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
 * Create a new Warehouse Material Receipt (BPB).
 */
export async function createWarehouseBpb(payload: {
  rn_number?: string;
  receive_date?: string;
  note?: string;
  warehouse_id?: number;
}): Promise<{ status: string; message?: string; data?: TableRow }> {
  const response = await fetch("/api/warehouse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Failed to create BPB" }));
    throw new Error(err.error || "Failed to create BPB");
  }

  return response.json();
}
