/**
 * GENIUSONE UI 2.0 — Approval System Canonical Types
 * Strict frontend contract adhering to enterprise two-stage approval workflow.
 */

export type ApprovalStatus =
  | "WAITING_APPROVE_1"
  | "WAITING_APPROVE_2"
  | "APPROVED"
  | "REJECTED"
  | "CLOSING"
  | "PARTIAL_CLOSING"
  | "OUTSTANDING"
  | "ORDERED";

export type ApprovalTier = 1 | 2;

export type ApprovalAction =
  | "approve_1"
  | "unapprove_1"
  | "approve_2"
  | "unapprove_2"
  | "reject";

export type ApprovalModule =
  | "master_item"
  | "purchase_requisition"
  | "purchase_order"
  | "receive_note"
  | "receive_note_return"
  | "bpb"
  | "request_material"
  | "transfer_stock_return";

export type ApprovalHistoryAction =
  | "created"
  | "revised"
  | "approved"
  | "rejected"
  | "unapproved"
  | "printed"
  | "closed_item"
  | "unclosed_item";

export interface ApprovalHistoryEntry {
  id: string;
  tier?: ApprovalTier;
  action: ApprovalHistoryAction;
  userId: string | number;
  userName: string;
  userRole?: string;
  actedByName?: string;
  actedByRole?: string;
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

  if (s === "ORDERED") {
    return "ORDERED";
  }

  if (s === "OUTSTANDING") {
    return "OUTSTANDING";
  }

  if (s === "CLOSING" || s === "CLOSED") {
    return "CLOSING";
  }

  if (s === "PARTIAL_CLOSING" || s === "PARTIALLY_CLOSED" || s === "PARTIAL") {
    return "PARTIAL_CLOSING";
  }

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
      return "Waiting Approve 1";
    case "WAITING_APPROVE_2":
      return "Waiting Approve 2";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "CLOSING":
      return "Closing";
    case "PARTIAL_CLOSING":
      return "Partial Closing";
    case "OUTSTANDING":
      return "Outstanding";
    case "ORDERED":
      return "Ordered";
    default:
      return "Waiting Approve 1";
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
    case "ORDERED":
      return "blue";
    case "REJECTED":
    case "CLOSING":
      return "red";
    case "PARTIAL_CLOSING":
    case "OUTSTANDING":
      return "orange";
    default:
      return "orange";
  }
}
