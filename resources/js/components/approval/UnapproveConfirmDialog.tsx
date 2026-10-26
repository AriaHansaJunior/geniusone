/**
 * GENIUSONE UI 2.0 — UnApprove Confirmation Dialog
 * Requires explicit confirmation before revoking Stage 1 or Stage 2 approvals.
 */

import React, { useState } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import type { ApprovalTier } from "../../types/approval";

interface UnapproveConfirmDialogProps {
  isOpen: boolean;
  documentNumber: string;
  tier: ApprovalTier;
  isFullyApproved?: boolean;
  onClose: () => void;
  onConfirm: (reason?: string) => Promise<void> | void;
  isLoading?: boolean;
}

export function UnapproveConfirmDialog({
  isOpen,
  documentNumber,
  tier,
  isFullyApproved = false,
  onClose,
  onConfirm,
  isLoading = false,
}: UnapproveConfirmDialogProps) {
  const [note, setNote] = useState("");

  if (!isOpen) return null;

  const isStage1FromFinal = tier === 1 && isFullyApproved;

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="unapprove-dialog-title">
      <div className="dialog-card dialog-card--md">
        {/* Header */}
        <div className="dialog-card__header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(245, 158, 11, 0.12)",
                color: "#d97706",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="alertTriangle" size={16} strokeWidth={2.5} />
            </span>
            <div>
              <h3 id="unapprove-dialog-title" style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                Confirm UnApprove Stage {tier}
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                Document: {documentNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="dialog-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={isLoading}
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="dialog-card__body">
          <div
            style={{
              padding: "12px 14px",
              borderRadius: "var(--radius-md, 8px)",
              background: "rgba(245, 158, 11, 0.08)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              marginBottom: "16px",
              fontSize: "12px",
              color: "var(--ink)",
              lineHeight: 1.5,
            }}
          >
            {isStage1FromFinal ? (
              <div>
                <strong>Warning:</strong> Revoking <strong>Stage 1 Approval</strong> while the document is already fully approved will <strong>invalidate both Stage 1 and Stage 2 approvals</strong>. The document will return to <em>Waiting for Approve 1</em> and be unlocked for revision.
              </div>
            ) : tier === 2 ? (
              <div>
                Revoking <strong>Stage 2 Final Approval</strong> will roll back the document to <em>Waiting for Approve 2</em>.
              </div>
            ) : (
              <div>
                Revoking <strong>Stage 1 Approval</strong> will roll back the document to <em>Waiting for Approve 1</em>.
              </div>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="unapprove-note" className="form-label">
              Reason / Comment (Optional)
            </label>
            <textarea
              id="unapprove-note"
              className="form-input"
              rows={3}
              placeholder="Provide context for why this approval is being revoked..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isLoading}
              style={{
                width: "100%",
                resize: "vertical",
                fontFamily: "inherit",
                fontSize: "13px",
                lineHeight: 1.5,
                padding: "8px 12px",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="dialog-card__footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            variant="warning"
            icon="arrowLeft"
            disabled={isLoading}
            onClick={() => onConfirm(note)}
          >
            {isLoading ? "Revoking..." : `Confirm UnApprove ${tier}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UnapproveConfirmDialog;
