/**
 * GENIUSONE UI 2.0 — Approval Timeline
 * Visual two-stage progress tracker and audit history for approvals.
 */

import React from "react";
import { Icon } from "../ui/Icon";
import type { DocumentApprovalState } from "../../types/approval";

interface ApprovalTimelineProps {
  state: DocumentApprovalState;
  className?: string;
  style?: React.CSSProperties;
}

export function ApprovalTimeline({ state, className = "", style }: ApprovalTimelineProps) {
  const { status, approved1By, approved1At, approved2By, approved2At, rejectedBy, rejectedAt, rejectionNote } = state;

  const isStage1Done = status === "WAITING_APPROVE_2" || status === "APPROVED" || (status === "REJECTED" && state.currentTier === 2);
  const isStage2Done = status === "APPROVED";
  const isRejectedStage1 = status === "REJECTED" && state.currentTier === 1;
  const isRejectedStage2 = status === "REJECTED" && state.currentTier === 2;

  return (
    <div className={`approval-timeline-card panel ${className}`.trim()} style={{ padding: "16px 20px", ...style }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h4 style={{ margin: 0, fontSize: "12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--ink)" }}>
          Two-Stage Approval Workflow
        </h4>
        <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>
          Enterprise Governance
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "16px" }}>
        {/* Stage 1 Step */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "12px 14px",
            borderRadius: "var(--radius-md, 8px)",
            background: isRejectedStage1
              ? "rgba(239, 68, 68, 0.08)"
              : isStage1Done
              ? "rgba(16, 185, 129, 0.08)"
              : "rgba(245, 158, 11, 0.08)",
            border: `1px solid ${
              isRejectedStage1
                ? "rgba(239, 68, 68, 0.25)"
                : isStage1Done
                ? "rgba(16, 185, 129, 0.25)"
                : "rgba(245, 158, 11, 0.25)"
            }`,
          }}
        >
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              background: isRejectedStage1
                ? "#dc2626"
                : isStage1Done
                ? "#059669"
                : "#d97706",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {isRejectedStage1 ? (
              <Icon name="close" size={14} strokeWidth={2.5} />
            ) : isStage1Done ? (
              <Icon name="check" size={14} strokeWidth={2.5} />
            ) : (
              "1"
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                Stage 1: Department Lead
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: isRejectedStage1 ? "#dc2626" : isStage1Done ? "#059669" : "#d97706",
                }}
              >
                {isRejectedStage1 ? "Rejected" : isStage1Done ? "Approved" : "Pending"}
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--muted)" }}>
              {isRejectedStage1
                ? `Rejected by ${rejectedBy || "Lead"} · ${rejectedAt || ""}`
                : approved1By
                ? `Approved by ${approved1By} · ${approved1At || ""}`
                : "Awaiting initial verification"}
            </p>
          </div>
        </div>

        {/* Arrow connector */}
        <div style={{ color: "var(--muted-2)", display: "flex", alignItems: "center" }}>
          <Icon name="chevronRight" size={18} />
        </div>

        {/* Stage 2 Step */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "12px 14px",
            borderRadius: "var(--radius-md, 8px)",
            background: isRejectedStage2
              ? "rgba(239, 68, 68, 0.08)"
              : isStage2Done
              ? "rgba(16, 185, 129, 0.08)"
              : isStage1Done
              ? "rgba(0, 113, 227, 0.08)"
              : "rgba(0, 0, 0, 0.02)",
            border: `1px solid ${
              isRejectedStage2
                ? "rgba(239, 68, 68, 0.25)"
                : isStage2Done
                ? "rgba(16, 185, 129, 0.25)"
                : isStage1Done
                ? "rgba(0, 113, 227, 0.25)"
                : "var(--line)"
            }`,
            opacity: isStage1Done || isRejectedStage2 ? 1 : 0.6,
          }}
        >
          <span
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              background: isRejectedStage2
                ? "#dc2626"
                : isStage2Done
                ? "#059669"
                : isStage1Done
                ? "#0071e3"
                : "var(--muted-2)",
              color: "#ffffff",
              fontSize: "12px",
              fontWeight: 800,
            }}
          >
            {isRejectedStage2 ? (
              <Icon name="close" size={14} strokeWidth={2.5} />
            ) : isStage2Done ? (
              <Icon name="check" size={14} strokeWidth={2.5} />
            ) : (
              "2"
            )}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
                Stage 2: Director / Final
              </span>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color: isRejectedStage2
                    ? "#dc2626"
                    : isStage2Done
                    ? "#059669"
                    : isStage1Done
                    ? "#0071e3"
                    : "var(--muted)",
                }}
              >
                {isRejectedStage2 ? "Rejected" : isStage2Done ? "Approved" : isStage1Done ? "Ready" : "Waiting Stage 1"}
              </span>
            </div>
            <p style={{ margin: "2px 0 0 0", fontSize: "11px", color: "var(--muted)" }}>
              {isRejectedStage2
                ? `Rejected by ${rejectedBy || "Director"} · ${rejectedAt || ""}`
                : approved2By
                ? `Approved by ${approved2By} · ${approved2At || ""}`
                : isStage1Done
                ? "Awaiting final executive approval"
                : "Locked until Stage 1 approval"}
            </p>
          </div>
        </div>
      </div>

      {/* Prominent Rejection Banner if document is rejected */}
      {status === "REJECTED" && rejectionNote && (
        <div
          style={{
            marginTop: "14px",
            padding: "12px 14px",
            borderRadius: "var(--radius-md, 8px)",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px",
          }}
        >
          <span style={{ color: "#dc2626", marginTop: "1px" }}>
            <Icon name="alertTriangle" size={16} />
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "12px", fontWeight: 700, color: "#b91c1c" }}>
              Revision Required by {rejectedBy || "Approver"}
            </div>
            <div style={{ fontSize: "12px", color: "var(--ink)", marginTop: "4px", lineHeight: 1.5 }}>
              "{rejectionNote}"
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
              Please revise the document according to the note above. When you submit the revisions, approval will restart from Stage 1.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApprovalTimeline;
