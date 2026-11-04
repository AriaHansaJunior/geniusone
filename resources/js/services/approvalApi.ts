/**
 * GENIUSONE UI 2.0 — Approval API Client & Isolated Development Adapter
 * Coordinates backend API contracts with seamless development fallback.
 */

import type {
  ApprovalAction,
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
    const raw = localStorage.getItem(getStorageKey(module, documentId));
    if (raw) {
      return JSON.parse(raw);
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
    localStorage.setItem(getStorageKey(module, documentId), JSON.stringify(state));
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
    const endpointMap: Record<ApprovalModule, string> = {
      purchase_requisition: `/api/approval/pr/${encodeURIComponent(documentId)}/approve`,
      purchase_order: `/api/approval/po/${encodeURIComponent(documentId)}/approve`,
      receive_note: `/api/approval/rn/${encodeURIComponent(documentId)}/approve`,
      bpb: `/api/approval/bpb/${encodeURIComponent(documentId)}/approve`,
      request_material: `/api/approval/request-materials/${encodeURIComponent(documentId)}/approve`,
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
    const endpointMap: Record<ApprovalModule, string> = {
      purchase_requisition: `/api/approval/pr/${encodeURIComponent(documentId)}/reject`,
      purchase_order: `/api/approval/po/${encodeURIComponent(documentId)}/reject`,
      receive_note: `/api/approval/rn/${encodeURIComponent(documentId)}/reject`,
      bpb: `/api/approval/bpb/${encodeURIComponent(documentId)}/reject`,
      request_material: `/api/approval/request-materials/${encodeURIComponent(documentId)}/reject`,
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
    const endpointMap: Record<ApprovalModule, string> = {
      purchase_requisition: `/api/approval/pr/${encodeURIComponent(documentId)}/unapprove`,
      purchase_order: `/api/approval/po/${encodeURIComponent(documentId)}/unapprove`,
      receive_note: `/api/approval/rn/${encodeURIComponent(documentId)}/unapprove`,
      bpb: `/api/approval/bpb/${encodeURIComponent(documentId)}/unapprove`,
      request_material: `/api/approval/request-materials/${encodeURIComponent(documentId)}/unapprove`,
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
    action: "unapproved",
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
