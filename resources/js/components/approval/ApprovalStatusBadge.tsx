/**
 * GENIUSONE UI 2.0 — Approval Status Badge
 * Reusable badge for displaying canonical approval status in tables and headers.
 */

import React from "react";
import { Badge } from "../ui/Badge";
import { Icon } from "../ui/Icon";
import {
  type ApprovalStatus,
  getApprovalStatusBadgeTone,
  getApprovalStatusLabel,
  normalizeApprovalStatus,
} from "../../types/approval";

interface ApprovalStatusBadgeProps {
  status: ApprovalStatus | string | null | undefined;
  className?: string;
  showIcon?: boolean;
}

export function ApprovalStatusBadge({
  status,
  className = "",
  showIcon = false,
}: ApprovalStatusBadgeProps) {
  const normalized = normalizeApprovalStatus(status);
  const tone = getApprovalStatusBadgeTone(normalized);
  const label = getApprovalStatusLabel(normalized);

  let iconName: "check" | "close" | "clock" | "alertTriangle" = "clock";
  if (normalized === "APPROVED") {
    iconName = "check";
  } else if (normalized === "REJECTED" || normalized === "CLOSING") {
    iconName = "close";
  } else if (normalized === "PARTIAL_CLOSING" || normalized === "OUTSTANDING") {
    iconName = "alertTriangle";
  } else if (normalized === "WAITING_APPROVE_2") {
    iconName = "clock";
  }

  return (
    <Badge
      tone={tone}
      className={`approval-status-badge approval-status--${normalized.toLowerCase()} ${className}`.trim()}
      style={{
        fontSize: "11px",
        padding: "2px 8px",
        lineHeight: 1.3,
        fontWeight: 600,
      }}
    >
      {showIcon && (
        <span style={{ display: "inline-flex", marginRight: "4px", verticalAlign: "middle" }}>
          <Icon name={iconName} size={11} strokeWidth={2.2} />
        </span>
      )}
      <span>{label}</span>
    </Badge>
  );
}

export default ApprovalStatusBadge;
