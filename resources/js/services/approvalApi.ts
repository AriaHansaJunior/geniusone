/**
 * GENIUSONE UI 2.0 — Approval API Client & Isolated Development Adapter
 * Coordinates backend API contracts with seamless development fallback.
 */

import type {
  ApprovalAction,
  ApprovalHistoryAction,
  ApprovalHistoryEntry,
  ApprovalModule,
  ApprovalStatus,
  ApprovalTier,
  DocumentApprovalState,
} from "../types/approval";

const STORAGE_KEY_PREFIX = "geniusone_approval_state_";

/**
 * In-memory / localStorage adapter to persist approval states in development.
 */
function getStorageKey(module: ApprovalModule, documentId: string): string {
  return `${STORAGE_KEY_PREFIX}${module}_${documentId}`;
}

export function getLocalApprovalState(
  module: ApprovalModule,
  documentId: string,
  initialStatus: ApprovalStatus = "WAITING_APPROVE_1"
): DocumentApprovalState {
  try {
    const raw =
      localStorage.getItem(getStorageKey(module, documentId)) ||
      localStorage.getItem(getStorageKey(module, documentId.replace(/-/g, "/"))) ||
      localStorage.getItem(getStorageKey(module, documentId.replace(/[\/\\]/g, "-")));
    if (raw) {
      const parsed: DocumentApprovalState = JSON.parse(raw);
      if (initialStatus === "APPROVED" && parsed.status !== "APPROVED") {
        parsed.status = "APPROVED";
        parsed.currentTier = 2;
        saveLocalApprovalState(module, documentId, parsed);
      } else if (initialStatus === "WAITING_APPROVE_2" && parsed.status === "WAITING_APPROVE_1") {
        parsed.status = "WAITING_APPROVE_2";
        parsed.currentTier = 2;
        saveLocalApprovalState(module, documentId, parsed);
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Error reading local approval state:", err);
  }

  // Initial canonical state
  return {
    status: initialStatus,
    currentTier: initialStatus === "WAITING_APPROVE_2" ? 2 : 1,
    history: [],
  };
}

export function saveLocalApprovalState(
  module: ApprovalModule,
  documentId: string,
  state: DocumentApprovalState
): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(getStorageKey(module, documentId), serialized);
    const slashKey = documentId.replace(/-/g, "/");
    const dashKey = documentId.replace(/[\/\\]/g, "-");
    if (slashKey !== documentId) {
      localStorage.setItem(getStorageKey(module, slashKey), serialized);
    }
    if (dashKey !== documentId) {
      localStorage.setItem(getStorageKey(module, dashKey), serialized);
    }
  } catch (err) {
    console.warn("Error saving local approval state:", err);
  }
}

export interface ApprovalApiResponse {
  success: boolean;
  status: ApprovalStatus;
  message: string;
  state: DocumentApprovalState;
  data?: any;
  error?: string;
}

/**
 * Execute Approve action for Tier 1 or Tier 2.
 */
export async function executeApprove(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  tier: ApprovalTier;
  userId: string | number;
  userName: string;
  userRole?: string;
  note?: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber, tier, userId, userName, userRole, note } = params;
  const docIdStr = String(documentId);

  // Try calling real backend API first if numeric ID or available endpoint
  let backendSuccess = false;
  let backendData: any = null;

  try {
    const safeId = encodeURIComponent(String(documentId).replace(/[\/\\]/g, "-"));
    const endpointMap: Partial<Record<ApprovalModule, string>> = {
      purchase_requisition: `/api/approval/pr/${safeId}/approve`,
      purchase_order: `/api/approval/po/${safeId}/approve`,
      receive_note: `/api/approval/rn/${safeId}/approve`,
      bpb: `/api/approval/bpb/${safeId}/approve`,
      request_material: `/api/approval/request-materials/${safeId}/approve`,
    };

    const endpoint = endpointMap[module];
    if (endpoint) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN":
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
        },
        body: JSON.stringify({ tier, note }),
      });

      if (response.ok) {
        backendSuccess = true;
        backendData = await response.json();
      }
    }
  } catch (err) {
    console.info("Backend API unavailable or returned error, using local adapter:", err);
  }

  // Update local state adapter for seamless responsive UI state
  const currentState = getLocalApprovalState(module, docIdStr);
  const now = new Date();
  const timestamp = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const nextStatus: ApprovalStatus = tier === 1 ? "WAITING_APPROVE_2" : "APPROVED";
  const nextTier: ApprovalTier = tier === 1 ? 2 : 2;

  const historyEntry: ApprovalHistoryEntry = {
    id: `appr_${Date.now()}`,
    tier,
    action: "approved",
    userId,
    userName,
    userRole: userRole || (tier === 1 ? "Approver 1" : "Approver 2"),
    timestamp,
    note: note || undefined,
  };

  const updatedState: DocumentApprovalState = {
    ...currentState,
    status: nextStatus,
    currentTier: nextTier,
    rejectionNote: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    approved1By: tier === 1 ? userName : currentState.approved1By,
    approved1At: tier === 1 ? timestamp : currentState.approved1At,
    approved2By: tier === 2 ? userName : currentState.approved2By,
    approved2At: tier === 2 ? timestamp : currentState.approved2At,
    history: [historyEntry, ...currentState.history],
  };

  saveLocalApprovalState(module, docIdStr, updatedState);
  if (documentNumber && documentNumber !== docIdStr) {
    saveLocalApprovalState(module, documentNumber, updatedState);
  }

  return {
    success: true,
    status: nextStatus,
    message: `Document successfully approved (Stage ${tier}).`,
    state: updatedState,
    data: backendData,
  };
}

/**
 * Execute Reject action with required reason note.
 */
export async function executeReject(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  tier: ApprovalTier;
  userId: string | number;
  userName: string;
  userRole?: string;
  reason: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber, tier, userId, userName, userRole, reason } = params;
  const docIdStr = String(documentId);

  if (!reason || !reason.trim()) {
    return {
      success: false,
      status: "REJECTED",
      message: "Rejection reason is strictly required.",
      state: getLocalApprovalState(module, docIdStr),
      error: "Rejection reason cannot be blank.",
    };
  }

  // Attempt backend API
  let backendData: any = null;
  try {
    const safeId = encodeURIComponent(String(documentId).replace(/[\/\\]/g, "-"));
    const endpointMap: Partial<Record<ApprovalModule, string>> = {
      purchase_requisition: `/api/approval/pr/${safeId}/reject`,
      purchase_order: `/api/approval/po/${safeId}/reject`,
      receive_note: `/api/approval/rn/${safeId}/reject`,
      bpb: `/api/approval/bpb/${safeId}/reject`,
      request_material: `/api/approval/request-materials/${safeId}/reject`,
    };

    const endpoint = endpointMap[module];
    if (endpoint) {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN":
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
        },
        body: JSON.stringify({ tier, reason }),
      });
      if (response.ok) {
        backendData = await response.json();
      }
    }
  } catch (err) {
    console.info("Backend reject API error or offline, fallback to local adapter:", err);
  }

  const currentState = getLocalApprovalState(module, docIdStr);
  const now = new Date();
  const timestamp = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const historyEntry: ApprovalHistoryEntry = {
    id: `rej_${Date.now()}`,
    tier,
    action: "rejected",
    userId,
    userName,
    userRole: userRole || (tier === 1 ? "Approver 1" : "Approver 2"),
    timestamp,
    note: reason,
  };

  const updatedState: DocumentApprovalState = {
    ...currentState,
    status: "REJECTED",
    currentTier: tier,
    rejectionNote: reason,
    rejectedBy: userName,
    rejectedAt: timestamp,
    history: [historyEntry, ...currentState.history],
  };

  saveLocalApprovalState(module, docIdStr, updatedState);
  if (documentNumber && documentNumber !== docIdStr) {
    saveLocalApprovalState(module, documentNumber, updatedState);
  }

  return {
    success: true,
    status: "REJECTED",
    message: "Document has been rejected and returned to creator for revision.",
    state: updatedState,
    data: backendData,
  };
}

/**
 * Execute UnApprove action (UnApprove 1 or UnApprove 2).
 */
export async function executeUnapprove(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  tier: ApprovalTier;
  userId: string | number;
  userName: string;
  userRole?: string;
  reason?: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber, tier, userId, userName, userRole, reason } = params;
  const docIdStr = String(documentId);

  // Call real backend API unapproval
  try {
    const safeId = encodeURIComponent(String(documentId).replace(/[\/\\]/g, "-"));
    const endpointMap: Partial<Record<ApprovalModule, string>> = {
      purchase_requisition: `/api/approval/pr/${safeId}/unapprove`,
      purchase_order: `/api/approval/po/${safeId}/unapprove`,
      receive_note: `/api/approval/rn/${safeId}/unapprove`,
      bpb: `/api/approval/bpb/${safeId}/unapprove`,
      request_material: `/api/approval/request-materials/${safeId}/unapprove`,
    };

    const endpoint = endpointMap[module];
    if (endpoint) {
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN":
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
        },
        body: JSON.stringify({ tier, reason }),
      });
    }
  } catch (err) {
    console.info("Backend unapprove API error or offline:", err);
  }

  const currentState = getLocalApprovalState(module, docIdStr);
  const now = new Date();
  const timestamp = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  // If UnApprove 1 is performed when document is Approved (or Waiting 2),
  // both approval stages are invalidated and document returns to WAITING_APPROVE_1 for revision.
  // If UnApprove 2 is performed, document rolls back to WAITING_APPROVE_2.
  const nextStatus: ApprovalStatus = tier === 1 ? "WAITING_APPROVE_1" : "WAITING_APPROVE_2";
  const nextTier: ApprovalTier = tier === 1 ? 1 : 2;

  const historyEntry: ApprovalHistoryEntry = {
    id: `unappr_${Date.now()}`,
    tier,
    action: "unapproved",
    userId,
    userName,
    userRole: userRole || `Approver ${tier}`,
    timestamp,
    note: reason || `Unapproved Stage ${tier}`,
  };

  const updatedState: DocumentApprovalState = {
    ...currentState,
    status: nextStatus,
    currentTier: nextTier,
    rejectionNote: undefined,
    approved1By: tier === 1 ? undefined : currentState.approved1By,
    approved1At: tier === 1 ? undefined : currentState.approved1At,
    approved2By: undefined,
    approved2At: undefined,
    history: [historyEntry, ...currentState.history],
  };

  saveLocalApprovalState(module, docIdStr, updatedState);
  if (documentNumber && documentNumber !== docIdStr) {
    saveLocalApprovalState(module, documentNumber, updatedState);
  }

  return {
    success: true,
    status: nextStatus,
    message: `Stage ${tier} approval revoked. Document returned for revision.`,
    state: updatedState,
  };
}

/**
 * Resubmits a revised rejected document back to WAITING_APPROVE_1.
 */
export async function executeResubmit(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  userId: string | number;
  userName: string;
}): Promise<ApprovalApiResponse> {
  const { module, documentId, documentNumber, userId, userName } = params;
  const docIdStr = String(documentId);

  const currentState = getLocalApprovalState(module, docIdStr);
  const now = new Date();
  const timestamp = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const historyEntry: ApprovalHistoryEntry = {
    id: `resubmit_${Date.now()}`,
    tier: 1,
    action: "revised",
    userId,
    userName,
    userRole: "Document Creator",
    timestamp,
    note: "Document revised and resubmitted for approval",
  };

  const updatedState: DocumentApprovalState = {
    ...currentState,
    status: "WAITING_APPROVE_1",
    currentTier: 1,
    rejectionNote: undefined,
    rejectedBy: undefined,
    rejectedAt: undefined,
    history: [historyEntry, ...currentState.history],
  };

  saveLocalApprovalState(module, docIdStr, updatedState);
  if (documentNumber && documentNumber !== docIdStr) {
    saveLocalApprovalState(module, documentNumber, updatedState);
  }

  return {
    success: true,
    status: "WAITING_APPROVE_1",
    message: "Document revised and resubmitted. Approval workflow restarted at Stage 1.",
    state: updatedState,
  };
}

/**
 * Records a general transaction activity (e.g. printed, revised, created, closed_item, unclosed_item)
 * into the document's activity history.
 */
export function recordDocumentActivity(params: {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber?: string;
  action: ApprovalHistoryAction;
  userId: string | number;
  userName: string;
  userRole?: string;
  note?: string;
  tier?: ApprovalTier;
}): DocumentApprovalState {
  const { module, documentId, documentNumber, action, userId, userName, userRole, note, tier } = params;
  const docIdStr = String(documentId);
  const currentState = getLocalApprovalState(module, documentNumber || docIdStr);

  const now = new Date();
  const timestamp = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const entry: ApprovalHistoryEntry = {
    id: `act_${action}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    tier,
    action,
    userId,
    userName,
    userRole: userRole || "User",
    timestamp,
    note,
  };

  const updatedState: DocumentApprovalState = {
    ...currentState,
    history: [entry, ...currentState.history],
  };

  saveLocalApprovalState(module, docIdStr, updatedState);
  if (documentNumber && documentNumber !== docIdStr) {
    saveLocalApprovalState(module, documentNumber, updatedState);
  }

  // Optional async notification to backend activity log if available
  try {
    const safeId = encodeURIComponent(String(documentId).replace(/[\/\\]/g, "-"));
    const endpointMap: Partial<Record<ApprovalModule, string>> = {
      purchase_requisition: `/api/approval/pr/${safeId}/activity`,
      purchase_order: `/api/approval/po/${safeId}/activity`,
    };
    const ep = endpointMap[module];
    if (ep && typeof fetch !== "undefined") {
      fetch(ep, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-CSRF-TOKEN":
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
        },
        body: JSON.stringify({ action, note, documentNumber }),
      }).catch(() => { });
    }
  } catch {
    // ignore
  }

  return updatedState;
}

// ============================================================================
// PR ITEM CLOSING / UNCLOSING PERSISTENCE ADAPTER (UI-05)
// ============================================================================

const PR_CLOSED_ITEMS_KEY = "geniusone_pr_closed_items_v1";

export interface PrClosedItemInfo {
  closed: boolean;
  closedBy: string;
  closedAt: string;
  itemName?: string;
  itemCode?: string;
}

function normalizePrKey(prNumber: string): string {
  return String(prNumber || "")
    .trim()
    .replace(/[-\\]/g, "/")
    .toUpperCase();
}

export function getPrItemKey(item: any, index?: number): string {
  const code = String(item?.itemCode || item?.code || "").trim();
  const name = String(item?.item || item?.itemName || item?.name || "").trim();
  if (item?.id) return `id_${item.id}`;
  if (code && code !== "-") return `code_${code.toUpperCase()}_${index ?? 0}`;
  if (name) return `name_${name.toUpperCase()}_${index ?? 0}`;
  return `idx_${index ?? 0}`;
}

export function getPrClosedItemsMap(prNumber: string): Record<string, PrClosedItemInfo> {
  const normPr = normalizePrKey(prNumber);
  if (!normPr) return {};
  try {
    const raw = localStorage.getItem(PR_CLOSED_ITEMS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed[normPr] || {};
    }
  } catch {
    // ignore
  }
  return {};
}

export function isPrItemClosed(prNumber: string, item: any, index?: number): boolean {
  if (!item) return false;
  // Check backend item flags first
  if (
    item.is_closed === true ||
    item.is_closed === 1 ||
    item.isClosed === true ||
    String(item.status || "").toLowerCase() === "closing" ||
    String(item.status || "").toLowerCase() === "closed" ||
    String(item.closing_status || "").toLowerCase() === "closing" ||
    String(item.closing_status || "").toLowerCase() === "closed"
  ) {
    return true;
  }

  const map = getPrClosedItemsMap(prNumber);
  const key = getPrItemKey(item, index);
  if (map[key]?.closed) return true;

  // Also check by itemCode or itemName without index so PO population matches reliably
  const code = String(item?.itemCode || item?.code || "").trim().toUpperCase();
  const name = String(item?.item || item?.itemName || item?.name || "").trim().toUpperCase();
  for (const [k, info] of Object.entries(map)) {
    if (!info?.closed) continue;
    if (code && code !== "-" && info.itemCode?.toUpperCase() === code) return true;
    if (name && info.itemName?.toUpperCase() === name) return true;
    if (code && k.startsWith(`code_${code}_`)) return true;
    if (name && k.startsWith(`name_${name}_`)) return true;
  }

  return false;
}

export function togglePrItemClosing(params: {
  prNumber: string;
  prId?: string | number;
  item: any;
  index: number;
  close: boolean;
  userId: string | number;
  userName: string;
  userRole?: string;
}): {
  closedMap: Record<string, PrClosedItemInfo>;
  approvalState: DocumentApprovalState;
} {
  const { prNumber, prId, item, index, close, userId, userName, userRole } = params;
  const normPr = normalizePrKey(prNumber);
  const key = getPrItemKey(item, index);
  const itemName = String(item?.item || item?.itemName || item?.name || "Material Item");
  const itemCode = String(item?.itemCode || item?.code || "-");

  const now = new Date();
  const timestamp = now.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let allMaps: Record<string, Record<string, PrClosedItemInfo>> = {};
  try {
    const raw = localStorage.getItem(PR_CLOSED_ITEMS_KEY);
    if (raw) allMaps = JSON.parse(raw) || {};
  } catch {
    allMaps = {};
  }

  const currentPrMap = { ...(allMaps[normPr] || {}) };
  if (close) {
    currentPrMap[key] = {
      closed: true,
      closedBy: userName,
      closedAt: timestamp,
      itemName,
      itemCode,
    };
  } else {
    delete currentPrMap[key];
    // Also remove any matching code/name entry
    for (const k of Object.keys(currentPrMap)) {
      if (
        (itemCode !== "-" && currentPrMap[k]?.itemCode?.toUpperCase() === itemCode.toUpperCase()) ||
        currentPrMap[k]?.itemName?.toUpperCase() === itemName.toUpperCase()
      ) {
        delete currentPrMap[k];
      }
    }
  }

  allMaps[normPr] = currentPrMap;
  try {
    localStorage.setItem(PR_CLOSED_ITEMS_KEY, JSON.stringify(allMaps));
  } catch {
    // ignore
  }

  // Attempt backend sync if endpoint exists
  if (typeof fetch !== "undefined") {
    const rawTarget = String(prId || prNumber || "").trim();
    const safeTargetId = rawTarget.replace(/[\/\\]/g, "-");
    const rawItemId = item?.id || item?.pr_has_items_id || (index + 1);
    fetch(`/api/procurement/purchase-requisitions/${encodeURIComponent(safeTargetId)}/items/${encodeURIComponent(rawItemId)}/${close ? "close" : "unclose"}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-CSRF-TOKEN":
          (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || "",
      },
      body: JSON.stringify({ itemCode, itemName, is_closed: close }),
    }).catch((err) => {
      console.warn("[togglePrItemClosing] Backend sync warning:", err);
    });
  }

  const approvalState = recordDocumentActivity({
    module: "purchase_requisition",
    documentId: prId || prNumber,
    documentNumber: prNumber,
    action: close ? "closed_item" : "unclosed_item",
    userId,
    userName,
    userRole,
    note: `${close ? "Closed" : "Unclosed (reactivated)"} PR item: ${itemName} (${itemCode})`,
  });

  return {
    closedMap: currentPrMap,
    approvalState,
  };
}
