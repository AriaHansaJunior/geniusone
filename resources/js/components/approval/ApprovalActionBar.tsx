/**
 * GENIUSONE UI 2.0 — Approval Action Bar
 * Master interactive bar for Stage 1 & 2 approvals, rejections, unapprovals, and permission-based controls.
 */

import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import { ApprovalStatusBadge } from "./ApprovalStatusBadge";
import { RejectDialog } from "./RejectDialog";
import { UnapproveConfirmDialog } from "./UnapproveConfirmDialog";
import { useAuthPermission } from "../../context/AuthPermissionContext";
import type { ApprovalModule, ApprovalStatus, ApprovalTier, DocumentApprovalState } from "../../types/approval";
import {
  executeApprove,
  executeReject,
  executeResubmit,
  executeUnapprove,
} from "../../services/approvalApi";

interface ApprovalActionBarProps {
  module: ApprovalModule;
  documentId: string | number;
  documentNumber: string;
  state: DocumentApprovalState;
  onStateChange: (newState: DocumentApprovalState) => void;
  onResubmitClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function ApprovalActionBar({
  module,
  documentId,
  documentNumber,
  state,
  onStateChange,
  onResubmitClick,
  className = "",
  compact = false,
}: ApprovalActionBarProps) {
  const { currentUser, can, isSuperAdmin } = useAuthPermission();

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Dialog states
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [rejectTier, setRejectTier] = useState<ApprovalTier>(1);

  const [isUnapproveOpen, setIsUnapproveOpen] = useState(false);
  const [unapproveTier, setUnapproveTier] = useState<ApprovalTier>(1);

  const status = state.status;

  // Granular Permission checks
  const canApprove1 = can(module, "approve_1");
  const canApprove2 = can(module, "approve_2");
  const canUnapprove1 = can(module, "unapprove_1");
  const canUnapprove2 = can(module, "unapprove_2");
  const canUpdate = can(module, "update");

  // Determine button visibilities according to strict state & permissions
  const showApprove1 = status === "WAITING_APPROVE_1" && canApprove1;
  const showReject1 = status === "WAITING_APPROVE_1" && canApprove1;

  const showApprove2 = status === "WAITING_APPROVE_2" && canApprove2;
  const showReject2 = status === "WAITING_APPROVE_2" && canApprove2;

  // UnApprove 1 is available if approved at stage 1 or stage 2, and user has permission
  const showUnapprove1 =
    (status === "WAITING_APPROVE_2" || status === "APPROVED") && canUnapprove1;

  // UnApprove 2 is available if fully approved, and user has permission
  const showUnapprove2 = status === "APPROVED" && canUnapprove2;

  // Resubmit is available if document is REJECTED and user has update permission
  const showResubmit = status === "REJECTED" && canUpdate;

  // Handlers
  const handleApprove = async (tier: ApprovalTier) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await executeApprove({
        module,
        documentId,
        tier,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
      });

      if (res.success) {
        onStateChange(res.state);
        setSuccessMessage(res.message);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || "Failed to approve document.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "An unexpected error occurred during approval.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReject = (tier: ApprovalTier) => {
    setRejectTier(tier);
    setIsRejectOpen(true);
  };

  const handleConfirmReject = async (reason: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await executeReject({
        module,
        documentId,
        tier: rejectTier,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        reason,
      });

      if (res.success) {
        onStateChange(res.state);
        setIsRejectOpen(false);
        setSuccessMessage("Document rejected and returned to creator for revision.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || "Failed to reject document.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error rejecting document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenUnapprove = (tier: ApprovalTier) => {
    setUnapproveTier(tier);
    setIsUnapproveOpen(true);
  };

  const handleConfirmUnapprove = async (reason?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await executeUnapprove({
        module,
        documentId,
        tier: unapproveTier,
        userId: currentUser.id,
        userName: currentUser.name,
        userRole: currentUser.role,
        reason,
      });

      if (res.success) {
        onStateChange(res.state);
        setIsUnapproveOpen(false);
        setSuccessMessage(res.message);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(res.error || "Failed to unapprove document.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Error unapproving document.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (onResubmitClick) {
      onResubmitClick();
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await executeResubmit({
        module,
        documentId,
        userId: currentUser.id,
        userName: currentUser.name,
      });

      if (res.success) {
        onStateChange(res.state);
        setSuccessMessage("Document resubmitted! Approval restarted at Stage 1.");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to resubmit document.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`approval-action-bar ${compact ? "approval-action-bar--compact" : ""} ${className}`.trim()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        {/* Status display & Waiting messages */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <ApprovalStatusBadge status={status} />

          {status === "WAITING_APPROVE_1" && !canApprove1 && (
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
              (Awaiting Stage 1 approval by Department Head)
            </span>
          )}

          {status === "WAITING_APPROVE_2" && !canApprove2 && (
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 500 }}>
              (Awaiting Stage 2 approval by Executive Director)
            </span>
          )}

          {status === "APPROVED" && (
            <span style={{ fontSize: "12px", color: "#059669", fontWeight: 600 }}>
              ✓ Fully Approved · Document is locked from editing
            </span>
          )}
        </div>

        {/* Dynamic Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          {/* Stage 1 Actions */}
          {showApprove1 && (
            <Button
              variant="success"
              icon="check"
              onClick={() => handleApprove(1)}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Approve 1"}
            </Button>
          )}

          {showReject1 && (
            <Button
              variant="danger"
              icon="close"
              onClick={() => handleOpenReject(1)}
              disabled={isLoading}
            >
              Reject
            </Button>
          )}

          {/* Stage 2 Actions */}
          {showApprove2 && (
            <Button
              variant="primary"
              icon="check"
              onClick={() => handleApprove(2)}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Approve 2"}
            </Button>
          )}

          {showReject2 && (
            <Button
              variant="danger"
              icon="close"
              onClick={() => handleOpenReject(2)}
              disabled={isLoading}
            >
              Reject
            </Button>
          )}

          {/* UnApprove Actions */}
          {showUnapprove2 && (
            <Button
              variant="secondary"
              icon="arrowLeft"
              onClick={() => handleOpenUnapprove(2)}
              disabled={isLoading}
              title="Revoke Stage 2 Final Approval"
            >
              UnApprove 2
            </Button>
          )}

          {showUnapprove1 && (
            <Button
              variant="secondary"
              icon="arrowLeft"
              onClick={() => handleOpenUnapprove(1)}
              disabled={isLoading}
              title="Revoke Stage 1 Approval"
            >
              UnApprove 1
            </Button>
          )}

          {/* Resubmit Action for Rejected document */}
          {showResubmit && (
            <Button
              variant="primary"
              icon="check"
              onClick={handleResubmit}
              disabled={isLoading}
            >
              Revise & Resubmit
            </Button>
          )}
        </div>
      </div>

      {/* Inline Feedback Alerts */}
      {successMessage && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 12px",
            borderRadius: "var(--radius-sm, 6px)",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(16, 185, 129, 0.25)",
            color: "#047857",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="check" size={14} />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div
          style={{
            marginTop: "10px",
            padding: "8px 12px",
            borderRadius: "var(--radius-sm, 6px)",
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            color: "#b91c1c",
            fontSize: "12px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Icon name="alertTriangle" size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Reject Modal */}
      <RejectDialog
        isOpen={isRejectOpen}
        documentNumber={documentNumber}
        tier={rejectTier}
        onClose={() => setIsRejectOpen(false)}
        onConfirm={handleConfirmReject}
        isLoading={isLoading}
      />

      {/* Unapprove Confirmation Modal */}
      <UnapproveConfirmDialog
        isOpen={isUnapproveOpen}
        documentNumber={documentNumber}
        tier={unapproveTier}
        isFullyApproved={status === "APPROVED"}
        onClose={() => setIsUnapproveOpen(false)}
        onConfirm={handleConfirmUnapprove}
        isLoading={isLoading}
      />
    </div>
  );
}

export default ApprovalActionBar;
