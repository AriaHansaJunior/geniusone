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
  showIcon = true,
}: ApprovalStatusBadgeProps) {
  const normalized = normalizeApprovalStatus(status);
  const tone = getApprovalStatusBadgeTone(normalized);
  const label = getApprovalStatusLabel(normalized);

  let iconName: "check" | "close" | "clock" | "alertTriangle" = "clock";
  if (normalized === "APPROVED") {
    iconName = "check";
  } else if (normalized === "REJECTED") {
    iconName = "close";
  } else if (normalized === "WAITING_APPROVE_2") {
    iconName = "clock";
  }

  return (
    <Badge tone={tone} className={`approval-status-badge approval-status--${normalized.toLowerCase()} ${className}`.trim()}>
      {showIcon && (
        <span style={{ display: "inline-flex", marginRight: "4px", verticalAlign: "middle" }}>
          <Icon name={iconName} size={12} strokeWidth={2.5} />
        </span>
      )}
      <span>{label}</span>
    </Badge>
  );
}

export default ApprovalStatusBadge;
