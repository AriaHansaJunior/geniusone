/**
 * GENIUSONE UI 2.0 — Reject Dialog
 * Interactive modal requiring a revision reason before rejecting a document.
 */

import React, { useState, useEffect } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";
import type { ApprovalTier } from "../../types/approval";

interface RejectDialogProps {
  isOpen: boolean;
  documentNumber: string;
  tier: ApprovalTier;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  isLoading?: boolean;
}

export function RejectDialog({
  isOpen,
  documentNumber,
  tier,
  onClose,
  onConfirm,
  isLoading = false,
}: RejectDialogProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Please provide a specific revision note explaining what must be corrected.");
      return;
    }
    if (trimmed.length < 5) {
      setError("Revision note must be at least 5 characters long.");
      return;
    }
    setError(null);
    onConfirm(trimmed);
  };

  return (
    <div className="dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="reject-dialog-title">
      <div className="dialog-card dialog-card--md">
        {/* Header */}
        <div className="dialog-card__header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "#dc2626",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="close" size={16} strokeWidth={2.5} />
            </span>
            <div>
              <h3 id="reject-dialog-title" style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>
                Reject Document & Request Revision
              </h3>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--muted)" }}>
                Stage {tier} Rejection · {documentNumber}
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
        <form onSubmit={handleSubmit}>
          <div className="dialog-card__body">
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "var(--radius-md, 8px)",
                background: "rgba(239, 68, 68, 0.06)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                marginBottom: "16px",
                fontSize: "12px",
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              <strong>Notice:</strong> Rejecting will return this document to the creator for revision. The revision note below will be prominently displayed on the document. After the creator revises and resubmits it, approval will restart from <strong>Stage 1</strong>.
            </div>

            <div className="form-field">
              <label htmlFor="reject-reason" className="form-label" style={{ fontWeight: 700 }}>
                Revision Reason / Note <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <textarea
                id="reject-reason"
                className={`form-input ${error ? "form-input--error" : ""}`}
                rows={4}
                placeholder="Describe clearly what needs to be revised (e.g., unit price discrepancy, incorrect quantity, missing attachment)..."
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
                required
                style={{
                  width: "100%",
                  resize: "vertical",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  lineHeight: 1.5,
                  padding: "10px 12px",
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                {error ? (
                  <span style={{ fontSize: "11px", color: "#dc2626", fontWeight: 600 }}>{error}</span>
                ) : (
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>This note is saved and visible to the creator</span>
                )}
                <span style={{ fontSize: "11px", color: "var(--muted)" }}>{reason.length} chars</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="dialog-card__footer" style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              variant="danger"
              icon="close"
              type="submit"
              disabled={isLoading || !reason.trim()}
            >
              {isLoading ? "Rejecting..." : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RejectDialog;
