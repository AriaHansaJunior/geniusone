/**
 * GENIUSONE UI 2.0 — Approval System Canonical Types
 * Strict frontend contract adhering to enterprise two-stage approval workflow.
 */

export type ApprovalStatus =
  | "WAITING_APPROVE_1"
  | "WAITING_APPROVE_2"
  | "APPROVED"
  | "REJECTED";

export type ApprovalTier = 1 | 2;

export type ApprovalAction =
  | "approve_1"
  | "unapprove_1"
  | "approve_2"
  | "unapprove_2"
  | "reject";

export type ApprovalModule =
  | "purchase_requisition"
  | "purchase_order"
  | "receive_note"
  | "request_material";

export interface ApprovalHistoryEntry {
  id: string;
  tier: ApprovalTier;
  action: "approved" | "rejected" | "unapproved";
  userId: string | number;
  userName: string;
  userRole?: string;
  timestamp: string;
  note?: string;
}

export interface DocumentApprovalState {
  status: ApprovalStatus;
  currentTier: ApprovalTier;
  rejectionNote?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  approved1By?: string;
  approved1At?: string;
  approved2By?: string;
  approved2At?: string;
  history: ApprovalHistoryEntry[];
}

/**
 * Normalizes legacy or raw status strings from backend/mock data to canonical ApprovalStatus.
 */
export function normalizeApprovalStatus(rawStatus?: string | null): ApprovalStatus {
  if (!rawStatus) return "WAITING_APPROVE_1";

  const s = rawStatus.trim().toUpperCase().replace(/[\s_-]+/g, "_");

  if (s === "APPROVED" || s === "COMPLETE" || s === "APPROVED_2" || s === "STAGE_2_APPROVED") {
    return "APPROVED";
  }

  if (s === "WAITING_APPROVE_2" || s === "APPROVED_1" || s === "STAGE_1_APPROVED" || s === "WAITING_2") {
    return "WAITING_APPROVE_2";
  }

  if (s === "REJECTED" || s === "DECLINED") {
    return "REJECTED";
  }

  // Default initial state
  return "WAITING_APPROVE_1";
}

/**
 * Returns human-readable label for canonical approval status.
 */
export function getApprovalStatusLabel(status: ApprovalStatus): string {
  switch (status) {
    case "WAITING_APPROVE_1":
      return "Waiting for Approve 1";
    case "WAITING_APPROVE_2":
      return "Waiting for Approve 2";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    default:
      return "Waiting for Approve 1";
  }
}

/**
 * Returns UI 2.0 Badge tone for canonical approval status.
 */
export function getApprovalStatusBadgeTone(status: ApprovalStatus): "orange" | "blue" | "green" | "red" {
  switch (status) {
    case "WAITING_APPROVE_1":
      return "orange";
    case "WAITING_APPROVE_2":
      return "blue";
    case "APPROVED":
      return "green";
    case "REJECTED":
      return "red";
    default:
      return "orange";
  }
}
