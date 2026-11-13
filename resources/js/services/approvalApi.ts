/**
 * GENIUSONE UI 2.0 — Approval API Client
 * All approval state, history and PR item closing are persisted in the database.
 * Nothing is cached or simulated in browser storage: a failed request is reported as a failure.
 */

import { apiFetch } from "../data/api";
import { normalizeApprovalStatus } from "../types/approval";
import type {
  ApprovalHistoryAction,
  ApprovalHistoryEntry,
  ApprovalModule,
  ApprovalStatus,
  ApprovalTier,
  DocumentApprovalState,
} from "../types/approval";

export interface ApprovalApiResponse {
  success: boolean;
  status: ApprovalStatus;
  message: string;
  state: DocumentApprovalState;
  data?: any;
  error?: string;
}

const MODULE_SLUG: Partial<Record<ApprovalModule, string>> = {
  purchase_requisition: "pr",
  purchase_order: "po",
  receive_note: "rn",
  bpb: "bpb",
  request_material: "request-materials",
};

function approvalEndpoint(module: ApprovalModule, documentId: string | number, action: string): string | null {
  const slug = MODULE_SLUG[module];
  if (!slug) return null;
  const safeId = encodeURIComponent(String(documentId).replace(/[\/\\]/g, "-"));
  return `/api/approval/${slug}/${safeId}/${action}`;
}

/**
 * Builds the canonical approval state for a document from the status stored in the database.
 * History is loaded separately via `fetchDocumentApprovalHistory`.
 */
export function deriveApprovalState(
  status: ApprovalStatus = "WAITING_APPROVE_1",
  history: ApprovalHistoryEntry[] = []
): DocumentApprovalState {
  return {
    status,
    currentTier: status === "WAITING_APPROVE_1" || status === "REJECTED" ? 1 : 2,
    history,
  };
}

/**
 * Backwards-compatible alias used by list/detail pages. It no longer reads browser storage:
 * the returned state reflects only the database status passed in.
 */
export function getLocalApprovalState(
  _module: ApprovalModule,
  _documentId: string,
  status: ApprovalStatus = "WAITING_APPROVE_1"
): DocumentApprovalState {
  return deriveApprovalState(status);
}

/** Loads the full approval / activity history of a document from `approval_histories`. */
export async function fetchDocumentApprovalHistory(
  module: ApprovalModule,
  documentId: string | number
): Promise<ApprovalHistoryEntry[]> {
  const endpoint = approvalEndpoint(module, documentId, "history");
  if (!endpoint) return [];
  try {
    const res = await apiFetch(endpoint);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? (json.data as ApprovalHistoryEntry[]) : [];
  } catch (err) {
    console.warn("[approvalApi] Failed to load approval history:", err);
    return [];
  }
}

function emitApprovalChanged(detail: Record<string, any>) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("geniusone_approval_changed", { detail }));
  }
}

async function postWorkflowAction(
  module: ApprovalModule,
  documentId: string | number,
  documentNumber: string | undefined,
  action: "approve" | "unapprove" | "reject" | "resubmit",
  body: Record<string, any>,
  successMessage: string,
  fallbackStatus: ApprovalStatus
): Promise<ApprovalApiResponse> {
  const endpoint = approvalEndpoint(module, documentId, action);
  if (!endpoint) {
    return {
      success: false,
      status: fallbackStatus,
      message: "Approval workflow is not available for this document type.",
      state: deriveApprovalState(fallbackStatus),
      error: "Unsupported module",
    };
  }

  try {
    const res = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({} as any));
    if (!res.ok || json?.status === "error") {
      const message = json?.message || `Request failed (HTTP ${res.status}).`;
      return {
        success: false,
        status: fallbackStatus,
        message,
        state: deriveApprovalState(fallbackStatus),
        error: message,
      };
    }

    const rawStatus: string | undefined = json?.data?.status;
    const status = rawStatus ? normalizeApprovalStatus(rawStatus) : fallbackStatus;
    const history = await fetchDocumentApprovalHistory(module, documentId);
    const state = deriveApprovalState(status, history);

    emitApprovalChanged({ module, documentId: String(documentId), documentNumber, action, status, state });

    return { success: true, status, message: json?.message || successMessage, state, data: json?.data };
  } catch (err: any) {
    const message = err?.message || "Unable to reach the server.";
    return {
      success: false,
      status: fallbackStatus,
      message,
      state: deriveApprovalState(fallbackStatus),
      error: message,
    };
  }
}

/** Execute Approve action for Tier 1 or Tier 2. */
export async function executeApprove(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  tier: ApprovalTier;
  userId?: string | number;
  userName?: string;
  userRole?: string;
  note?: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber, tier, note } = params;
  return postWorkflowAction(
    module,
    documentId,
    documentNumber,
    "approve",
    { tier, note },
    `Document successfully approved (Stage ${tier}).`,
    tier === 1 ? "WAITING_APPROVE_1" : "WAITING_APPROVE_2"
  );
}

/** Execute Reject action with required reason note. */
export async function executeReject(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  tier: ApprovalTier;
  userId?: string | number;
  userName?: string;
  userRole?: string;
  reason: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber, tier, reason } = params;
  const current: ApprovalStatus = tier === 1 ? "WAITING_APPROVE_1" : "WAITING_APPROVE_2";
  if (!reason || !reason.trim()) {
    return {
      success: false,
      status: current,
      message: "Rejection reason is required.",
      state: deriveApprovalState(current),
      error: "Rejection reason cannot be blank.",
    };
  }
  return postWorkflowAction(
    module,
    documentId,
    documentNumber,
    "reject",
    { tier, reason },
    "Document has been rejected and returned to the creator for revision.",
    current
  );
}

/** Execute UnApprove action (UnApprove 1 or UnApprove 2). */
export async function executeUnapprove(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  tier: ApprovalTier;
  userId?: string | number;
  userName?: string;
  userRole?: string;
  reason?: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber, tier, reason } = params;
  return postWorkflowAction(
    module,
    documentId,
    documentNumber,
    "unapprove",
    { tier, reason },
    `Stage ${tier} approval revoked.`,
    tier === 1 ? "WAITING_APPROVE_2" : "APPROVED"
  );
}

/** Resubmits a revised rejected document back to WAITING_APPROVE_1. */
export async function executeResubmit(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  userId?: string | number;
  userName?: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber } = params;
  return postWorkflowAction(
    module,
    documentId,
    documentNumber,
    "resubmit",
    {},
    "Document resubmitted. Approval workflow restarted at Stage 1.",
    "REJECTED"
  );
}

/**
 * Records a document activity (printed, revised, closed_item, ...) in `approval_histories`
 * and returns the refreshed history from the database.
 */
export async function recordDocumentActivity(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  action: ApprovalHistoryAction;
  userId?: string | number;
  userName?: string;
  userRole?: string;
  note?: string;
  tier?: ApprovalTier;
}): Promise<ApprovalHistoryEntry[]> {
  const { module, documentId, documentNumber, action, note, tier } = params;
  const endpoint = approvalEndpoint(module, documentId, "activity");
  if (endpoint) {
    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify({ action, note, tier, documentNumber }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({} as any));
        console.warn("[approvalApi] Activity was not recorded:", json?.message || res.status);
      }
    } catch (err) {
      console.warn("[approvalApi] Activity was not recorded:", err);
    }
  }
  return fetchDocumentApprovalHistory(module, documentId);
}

// ============================================================================
// PR ITEM CLOSING / UNCLOSING (persisted in pr_has_items)
// ============================================================================

/** A PR item is closed only when the database says so. */
export function isPrItemClosed(_prNumber: string, item: any, _index?: number): boolean {
  if (!item) return false;
  const flag = (v: any) => String(v || "").toLowerCase();
  return (
    item.is_closed === true ||
    item.is_closed === 1 ||
    item.is_closed === "1" ||
    item.isClosed === true ||
    flag(item.status) === "closing" ||
    flag(item.status) === "closed" ||
    flag(item.closing_status) === "closing" ||
    flag(item.closing_status) === "closed"
  );
}

/**
 * Closes or re-opens a PR item on the server. Throws with the server message on failure.
 */
export async function togglePrItemClosing(params: {
  prNumber: string;
  prId?: string | number;
  item: any;
  index: number;
  close: boolean;
  userId?: string | number;
  userName?: string;
  userRole?: string;
}): Promise<{ history: ApprovalHistoryEntry[]; data?: any }> {
  const { prNumber, prId, item, close } = params;
  const itemId = item?.id ?? item?.pr_has_items_id;
  if (!itemId) {
    throw new Error("This PR item has not been saved yet and cannot be closed.");
  }
  const target = String(prId || prNumber || "").trim().replace(/[\/\\]/g, "-");
  const res = await apiFetch(
    `/api/procurement/purchase-requisitions/${encodeURIComponent(target)}/items/${encodeURIComponent(
      String(itemId)
    )}/${close ? "close" : "unclose"}`,
    { method: "POST", body: JSON.stringify({ is_closed: close }) }
  );
  const json = await res.json().catch(() => ({} as any));
  if (!res.ok || json?.status === "error") {
    throw new Error(json?.message || `Failed to ${close ? "close" : "reopen"} PR item (HTTP ${res.status}).`);
  }

  const history = await fetchDocumentApprovalHistory("purchase_requisition", prId || prNumber);
  emitApprovalChanged({ module: "purchase_requisition", documentId: String(prId || prNumber), action: close ? "closed_item" : "unclosed_item" });
  return { history, data: json?.data };
}
