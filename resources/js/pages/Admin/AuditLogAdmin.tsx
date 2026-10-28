/**
 * GENIUSONE UI 2.0 — SuperAdmin System Audit Trail & History
 * Real-time, centralized monitoring of all user activities, authentications, and data modifications.
 * Restricted strictly to SuperAdmin authority.
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { SearchField } from "../../components/ui/SearchField";
import { Pagination } from "../../components/ui/Pagination";
import { Badge, type BadgeTone } from "../../components/ui/Badge";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { useAuthPermission } from "../../context/AuthPermissionContext";

export interface AuditLogItem {
  id: number;
  type: string;
  action_label: string;
  category: "Authentication" | "Workflow Approval" | "Warehouse & Inventory" | "Governance & Security" | "Data Mutation";
  description: string;
  ip_address: string;
  url?: string | null;
  method?: string | null;
  user_agent?: string | null;
  created_at_utc: string;
  created_at_wib: string;
  time_ago: string;
  user: {
    id: number;
    name: string;
    username: string;
    role: string;
    is_super_admin: boolean;
  };
  old?: Record<string, any> | null;
  new?: Record<string, any> | null;
}

interface AuditLogAdminProps {
  onNavigateUsers?: () => void;
}

export function AuditLogAdmin({ onNavigateUsers }: AuditLogAdminProps) {
  const { isSuperAdmin, currentUser } = useAuthPermission();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Inspector Dialog state
  const [inspectingLog, setInspectingLog] = useState<AuditLogItem | null>(null);
  const [isRawOpen, setIsRawOpen] = useState(false);
  const [copiedRaw, setCopiedRaw] = useState(false);

  // Helper to format values cleanly
  const formatDiffValue = (field: string, val: any): string => {
    if (val === undefined || val === null || val === "(none)") return "(none)";
    if (field === "status") {
      const num = Number(val);
      if (num === 1) return "Active (1)";
      if (num === 0) return "Inactive (0)";
    }
    if (field === "password") {
      return "•••••••• (Encrypted Hash)";
    }
    if (typeof val === "boolean") {
      return val ? "True" : "False";
    }
    if (typeof val === "object") {
      return JSON.stringify(val);
    }
    return String(val);
  };

  // Determine category badge tone
  const getCategoryBadgeTone = (category: string): BadgeTone => {
    switch (category) {
      case "Authentication":
        return "blue";
      case "Workflow Approval":
        return "green";
      case "Governance & Security":
        return "purple";
      case "Warehouse & Inventory":
        return "orange";
      default:
        return "gray";
    }
  };

  // Determine badge tone based on action type or category
  const getActionTone = (type: string, category: string): BadgeTone => {
    const t = type.toUpperCase();
    if (t.includes("LOGIN_FAILED") || t.includes("BLOCKED") || t.includes("DELETE") || t.includes("REJECT")) {
      return "red";
    }
    if (t.includes("LOGIN_SUCCESS") || t.includes("CREATED") || t.includes("APPROVAL") || t.includes("ACTIVATED")) {
      return "green";
    }
    if (t.includes("UPDATED") || t.includes("PERMISSIONS")) {
      return "blue";
    }
    if (t.includes("LOGOUT") || t.includes("DEACTIVATED") || t.includes("REVOKED")) {
      return "orange";
    }
    if (category === "Governance & Security") {
      return "purple";
    }
    return "gray";
  };

  // Safe URL path parser
  const getSafePathname = (urlStr?: string | null): string => {
    if (!urlStr) return "Internal System Action";
    try {
      if (urlStr.startsWith("/")) return urlStr;
      const u = new URL(urlStr);
      return u.pathname;
    } catch {
      return urlStr;
    }
  };

  // Safe initials extractor
  const getInitials = (name?: string): string => {
    if (!name) return "SU";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  // Fetch audit logs from backend API
  const fetchAuditLogs = useCallback(async () => {
    setIsLoading(true);
    const token = sessionStorage.getItem("geniusone_token") || localStorage.getItem("geniusone_token");

    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("per_page", String(pageSize));
    if (activeCategory !== "all") params.set("category", activeCategory);
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("from_date", dateFrom);
    if (dateTo) params.set("to_date", dateTo);

    try {
      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

      if (res.ok) {
        const json = await res.json();
        if (json?.status === "success" && Array.isArray(json.data)) {
          setLogs(json.data);
          setTotalRecords(json.meta?.total ?? json.data.length);
          return;
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, pageSize, activeCategory, search, dateFrom, dateTo]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  // Keyboard escape handler for inspector dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspectingLog) {
        setInspectingLog(null);
        setIsRawOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inspectingLog]);

  // Extract changes diff for inspector (ALL HOOKS MUST RUN UNCONDITIONALLY)
  const diffEntries = useMemo(() => {
    if (!inspectingLog) return [];

    // Special semantic correction for account activation/deactivation
    if (inspectingLog.type === "USER_ACTIVATED") {
      return [
        {
          field: "status",
          oldVal: "Inactive (0)",
          newVal: "Active (1)",
        },
      ];
    }
    if (inspectingLog.type === "USER_DEACTIVATED") {
      return [
        {
          field: "status",
          oldVal: "Active (1)",
          newVal: "Inactive (0)",
        },
      ];
    }

    const newChanges = inspectingLog.new?.changes || inspectingLog.new?.attributes;
    const oldChanges = inspectingLog.old?.changes || inspectingLog.old?.attributes;

    if (newChanges && typeof newChanges === "object") {
      const keys = Object.keys(newChanges).filter(
        (k) =>
          k !== "_context" &&
          k !== "updated_at" &&
          k !== "created_at" &&
          k !== "remember_token" &&
          k !== "target_user"
      );
      return keys
        .map((key) => ({
          field: key,
          oldVal: formatDiffValue(key, oldChanges?.[key]),
          newVal: formatDiffValue(key, newChanges[key]),
        }))
        .filter((item) => item.oldVal !== item.newVal); // Only actual mutations!
    }

    // Direct old vs new keys
    if (inspectingLog.old && inspectingLog.new) {
      const allKeys = Array.from(
        new Set([...Object.keys(inspectingLog.old), ...Object.keys(inspectingLog.new)])
      ).filter(
        (k) =>
          k !== "_context" &&
          k !== "model" &&
          k !== "id" &&
          k !== "identifier" &&
          k !== "updated_at" &&
          k !== "created_at" &&
          k !== "remember_token" &&
          k !== "target_user"
      );

      if (allKeys.length > 0) {
        return allKeys
          .map((key) => ({
            field: key,
            oldVal: formatDiffValue(key, inspectingLog.old?.[key]),
            newVal: formatDiffValue(key, inspectingLog.new?.[key]),
          }))
          .filter((item) => item.oldVal !== item.newVal); // Only actual mutations!
      }
    }

    return [];
  }, [inspectingLog]);

  // Security barrier for non-SuperAdmin users (AFTER all hooks have been invoked)
  if (!isSuperAdmin) {
    return (
      <div className="panel" style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: "460px", margin: "0 auto" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 16px",
            }}
          >
            <Icon name="lock" size={24} />
          </div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 8px", color: "var(--ink)" }}>
            Access Restricted
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
            The System Audit Trail & History contains high-privilege operational telemetry and is strictly restricted to
            Super Administrator accounts.
          </p>
          <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-admin-page">
      {/* SuperAdmin Governance Navigation Tabs */}
      <div className="gov-admin-tabs">
        <button
          type="button"
          className="gov-admin-tab"
          onClick={() => {
            if (onNavigateUsers) onNavigateUsers();
            else window.location.href = "/admin/user-permissions";
          }}
          title="Manage Enterprise Users & Permissions"
        >
          <Icon name="user" size={14} />
          <span>User & Permission Management</span>
        </button>
        <button
          type="button"
          className="gov-admin-tab gov-admin-tab--active"
          title="System Audit Trail & History"
        >
          <Icon name="history" size={14} />
          <span>System Audit Trail & History</span>
          <span className="gov-admin-tab__pill">SuperAdmin Only</span>
        </button>
      </div>

      {/* Main Table Panel */}
      <div className="panel table-panel">
        {/* Audit Filter Toolbar */}
        <div className="audit-toolbar">
          {/* Top Row: Search & Meta Badges */}
          <div className="audit-toolbar__top">
            <div className="audit-toolbar__search">
              <SearchField
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setCurrentPage(1);
                }}
                placeholder="Search audit by user, username, IP address, action, or record..."
              />
            </div>

            <div className="audit-toolbar__meta">
              <div className="audit-timezone-badge" title="All timestamps are formatted in Western Indonesia Time">
                <Icon name="clock" size={13} />
                <span>Timezone: WIB (UTC+7)</span>
              </div>
              <Button
                variant="secondary"
                icon="history"
                onClick={() => fetchAuditLogs()}
                disabled={isLoading}
                title="Refresh audit trail"
              >
                {isLoading ? "Refreshing..." : "Refresh Logs"}
              </Button>
            </div>
          </div>

          {/* Bottom Row: Category Pills & Date Range Filters */}
          <div className="audit-toolbar__bottom">
            <div className="audit-category-pills">
              {[
                { id: "all", label: "All Activities" },
                { id: "auth", label: "Authentication (Login/Logout)" },
                { id: "data", label: "Data Mutations (Create/Edit/Delete)" },
                { id: "workflow", label: "Workflow Approvals" },
                { id: "inventory", label: "Warehouse & Inventory" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`audit-category-pill ${activeCategory === cat.id ? "audit-category-pill--active" : ""}`}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setCurrentPage(1);
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="audit-date-filter">
              <span>Date:</span>
              <input
                type="date"
                className="audit-date-input"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                title="From Date"
              />
              <span>to</span>
              <input
                type="date"
                className="audit-date-input"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                title="To Date"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setCurrentPage(1);
                  }}
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Master Audit Log Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "165px" }}>Timestamp (WIB)</th>
                  <th style={{ minWidth: "190px" }}>Actor / User</th>
                  <th style={{ minWidth: "140px" }}>IP Address & Method</th>
                  <th style={{ minWidth: "170px" }}>Action & Category</th>
                  <th style={{ minWidth: "280px" }}>Activity Track Record</th>
                  <th style={{ width: "100px", textAlign: "center" }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "36px", color: "var(--muted)" }}>
                      Loading system audit records...
                    </td>
                  </tr>
                ) : logs.length > 0 ? (
                  logs.map((item, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const tone = getActionTone(item.type, item.category);

                    return (
                      <tr key={item.id}>
                        {/* 1. Sequential No Column */}
                        <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                          {rowNumber}
                        </td>

                        {/* 2. Date & Time in WIB */}
                        <td>
                          <div className="audit-timestamp-cell">
                            <span className="audit-timestamp-time">{item.created_at_wib}</span>
                            <span className="audit-timestamp-ago">{item.time_ago}</span>
                          </div>
                        </td>

                        {/* 3. User Actor */}
                        <td>
                          <div className="audit-actor-cell">
                            <div
                              className={`audit-actor-avatar ${item.user.is_super_admin ? "audit-actor-avatar--super" : ""}`}
                              title={item.user.name}
                            >
                              {item.user.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="audit-actor-info">
                              <span className="audit-actor-name">{item.user.name}</span>
                              <div className="audit-actor-meta">
                                <span className="audit-actor-username">@{item.user.username}</span>
                                <Badge tone={item.user.is_super_admin ? "purple" : "gray"} style={{ fontSize: "9.5px", padding: "0 5px" }}>
                                  {item.user.role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 4. Client IP Address & HTTP Method */}
                        <td>
                          <div className="audit-ip-cell">
                            <span className="audit-ip-badge" title={`Client IP: ${item.ip_address}`}>
                              <Icon name="globe" size={12} />
                              {item.ip_address}
                            </span>
                            {item.method && (
                              <span
                                className={`audit-method-badge audit-method-badge--${item.method.toLowerCase()}`}
                                title={`HTTP Method: ${item.method}`}
                              >
                                {item.method}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 5. Action Type & Category */}
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "3px", alignItems: "flex-start" }}>
                            <Badge tone={tone}>
                              {item.action_label}
                            </Badge>
                            <span style={{ fontSize: "10.5px", color: "var(--muted)", fontWeight: 500 }}>
                              {item.category}
                            </span>
                          </div>
                        </td>

                        {/* 6. Human-Readable Track Record Description */}
                        <td>
                          <div className="audit-desc-cell">
                            {item.description}
                          </div>
                        </td>

                        {/* 7. Action Button: Inspect */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="audit-inspect-btn"
                            onClick={() => setInspectingLog(item)}
                            title={`Inspect technical audit payload for #${item.id}`}
                          >
                            <Icon name="eye" size={13} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="history" />
                        </div>
                        <strong>No audit trail records found.</strong>
                        <span>Try adjusting your category filter, date range, or search criteria.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Consistent Pagination Controls (in footer only, complying with AGENTS.md) */}
          <Pagination
            totalRecords={totalRecords}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* =====================================================================
          AUDIT LOG INSPECTION DIALOG (HIGH-FIDELITY ENTERPRISE INSPECTOR)
          ===================================================================== */}
      {inspectingLog && (
        <div
          className="dialog-overlay"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setInspectingLog(null);
              setIsRawOpen(false);
            }
          }}
        >
          <div className="audit-modal-card">
            {/* Header */}
            <div className="audit-modal-header">
              <div className="audit-modal-header__main">
                <div className="audit-modal-header__badges">
                  <Badge tone={getCategoryBadgeTone(inspectingLog.category)}>
                    {inspectingLog.category}
                  </Badge>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#64748b",
                      fontFamily: "ui-monospace, monospace",
                    }}
                  >
                    RECORD #{inspectingLog.id}
                  </span>
                </div>
                <h3 className="audit-modal-title">{inspectingLog.action_label}</h3>
                <div className="audit-modal-subtitle">
                  <span className="audit-modal-subtitle-item">
                    <Icon name="clock" size={13} />
                    <span>{inspectingLog.created_at_wib}</span>
                  </span>
                  <span className="audit-modal-subtitle-item">
                    <Icon name="globe" size={13} />
                    <span>Client IP: {inspectingLog.ip_address}</span>
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="dialog-close-btn"
                onClick={() => {
                  setInspectingLog(null);
                  setIsRawOpen(false);
                }}
                title="Close Inspector"
              >
                <Icon name="close" size={15} />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="audit-modal-body">
              {/* Overview 4-Panel Grid */}
              <div className="audit-overview-grid">
                {/* 1. Initiator / Actor */}
                <div className="audit-overview-card">
                  <div className="audit-overview-card__header">
                    <span className="audit-overview-card__label">
                      <Icon name="user" size={12} />
                      <span>Initiator / Actor</span>
                    </span>
                    <Badge tone={inspectingLog.user.is_super_admin ? "purple" : "gray"}>
                      {inspectingLog.user.is_super_admin ? "SuperAdmin" : inspectingLog.user.role}
                    </Badge>
                  </div>
                  <div className="audit-overview-card__content">
                    <div className="audit-actor-avatar">
                      {getInitials(inspectingLog.user.name)}
                    </div>
                    <div className="audit-actor-info">
                      <span className="audit-actor-name" title={inspectingLog.user.name}>
                        {inspectingLog.user.name}
                      </span>
                      <div className="audit-actor-meta">
                        <span className="audit-actor-username">@{inspectingLog.user.username}</span>
                        <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                          • ID: {inspectingLog.user.id}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Client IP & Environment */}
                <div className="audit-overview-card">
                  <div className="audit-overview-card__header">
                    <span className="audit-overview-card__label">
                      <Icon name="globe" size={12} />
                      <span>Client IP & Origin</span>
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "#166534",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: "#22c55e",
                        }}
                      />
                      Validated IP
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div className="audit-overview-val-badge">
                      <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "13px" }}>
                        {inspectingLog.ip_address}
                      </span>
                    </div>
                    <span
                      className="audit-overview-subtext"
                      title={inspectingLog.user_agent || "Standard Enterprise Browser Client"}
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "340px",
                      }}
                    >
                      {inspectingLog.user_agent || "Standard Enterprise Browser Client"}
                    </span>
                  </div>
                </div>

                {/* 3. Execution Timestamp */}
                <div className="audit-overview-card">
                  <div className="audit-overview-card__header">
                    <span className="audit-overview-card__label">
                      <Icon name="clock" size={12} />
                      <span>Execution Time (WIB)</span>
                    </span>
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--muted)" }}>
                      {inspectingLog.time_ago}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                      {inspectingLog.created_at_wib}
                    </span>
                    <span className="audit-overview-subtext">
                      UTC: {inspectingLog.created_at_utc ? new Date(inspectingLog.created_at_utc).toISOString() : "-"}
                    </span>
                  </div>
                </div>

                {/* 4. Request Route & Method */}
                <div className="audit-overview-card">
                  <div className="audit-overview-card__header">
                    <span className="audit-overview-card__label">
                      <Icon name="navigation" size={12} />
                      <span>Target Endpoint</span>
                    </span>
                    <span
                      className={`audit-method-tag audit-method-tag--${(inspectingLog.method || "get").toLowerCase()}`}
                    >
                      {inspectingLog.method || "INTERNAL"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span className="audit-url-pill" title={inspectingLog.url || "Internal Application Workflow"}>
                      {getSafePathname(inspectingLog.url)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Event Summary Banner */}
              <div
                className={`audit-event-summary-banner ${
                  inspectingLog.category === "Authentication"
                    ? "audit-event-summary-banner--auth"
                    : inspectingLog.category === "Governance & Security"
                    ? "audit-event-summary-banner--security"
                    : ""
                }`}
              >
                <div className="audit-event-summary-banner__icon">
                  <Icon
                    name={
                      inspectingLog.category === "Authentication"
                        ? "lock"
                        : inspectingLog.category === "Governance & Security"
                        ? "settings"
                        : "info"
                    }
                    size={16}
                  />
                </div>
                <div className="audit-event-summary-banner__text">
                  {inspectingLog.description}
                </div>
              </div>

              {/* Field Modifications & Changes Table */}
              <div className="audit-diff-section">
                <div className="audit-diff-section__header">
                  <div className="audit-diff-section__title">
                    <Icon name="layers" size={14} />
                    <span>Field-Level Value Changes</span>
                  </div>
                  <Badge tone={diffEntries.length > 0 ? "blue" : "gray"}>
                    {diffEntries.length > 0 ? `${diffEntries.length} Field(s) Modified` : "No Record Mutation"}
                  </Badge>
                </div>

                {diffEntries.length > 0 ? (
                  <div className="audit-diff-list">
                    {diffEntries.map((diff, dIdx) => (
                      <div key={dIdx} className="audit-diff-row">
                        <div className="audit-diff-field-info">
                          <span className="audit-diff-field-tag">
                            <code>{diff.field}</code>
                          </span>
                        </div>
                        <div className="audit-diff-values-wrapper">
                          <div className="audit-diff-val-box audit-diff-val-box--old" title="Previous Value">
                            <span className="audit-diff-val-prefix">OLD</span>
                            <span className="audit-diff-val-text">{diff.oldVal}</span>
                          </div>
                          <div className="audit-diff-transition-arrow">
                            <Icon name="arrowRight" size={14} />
                          </div>
                          <div className="audit-diff-val-box audit-diff-val-box--new" title="Modified Value">
                            <span className="audit-diff-val-prefix">NEW</span>
                            <span className="audit-diff-val-text">{diff.newVal}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="audit-diff-empty">
                    <Icon name="info" size={16} />
                    <span>This event recorded an authentication, security, or read operation. No entity attributes were mutated in the database.</span>
                  </div>
                )}
              </div>

              {/* Collapsible Complete Raw JSON Drawer */}
              <div className="audit-raw-drawer">
                <div
                  className="audit-raw-drawer__header"
                  onClick={() => setIsRawOpen((prev) => !prev)}
                >
                  <div className="audit-raw-drawer__title">
                    <Icon name="file" size={13} />
                    <span>Complete Raw Audit Payload</span>
                    <span style={{ fontSize: "11px", fontWeight: 500, color: "var(--muted)" }}>
                      ({isRawOpen ? "Click to collapse" : "Click to view raw JSON"})
                    </span>
                  </div>
                  <div className="audit-raw-drawer__actions">
                    <button
                      type="button"
                      className="audit-copy-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const payload = JSON.stringify(
                          {
                            id: inspectingLog.id,
                            type: inspectingLog.type,
                            user: inspectingLog.user,
                            ip_address: inspectingLog.ip_address,
                            url: inspectingLog.url,
                            method: inspectingLog.method,
                            user_agent: inspectingLog.user_agent,
                            created_at_utc: inspectingLog.created_at_utc,
                            created_at_wib: inspectingLog.created_at_wib,
                            old: inspectingLog.old,
                            new: inspectingLog.new,
                          },
                          null,
                          2
                        );
                        navigator.clipboard?.writeText(payload);
                        setCopiedRaw(true);
                        setTimeout(() => setCopiedRaw(false), 2000);
                      }}
                      title="Copy full JSON payload to clipboard"
                    >
                      <Icon name={copiedRaw ? "check" : "copy"} size={12} />
                      <span>{copiedRaw ? "Copied!" : "Copy JSON"}</span>
                    </button>
                    <Icon name={isRawOpen ? "chevronDown" : "chevronRight"} size={14} />
                  </div>
                </div>

                {isRawOpen && (
                  <pre className="audit-json-box">
                    {JSON.stringify(
                      {
                        id: inspectingLog.id,
                        type: inspectingLog.type,
                        user: inspectingLog.user,
                        ip_address: inspectingLog.ip_address,
                        url: inspectingLog.url,
                        method: inspectingLog.method,
                        user_agent: inspectingLog.user_agent,
                        created_at_utc: inspectingLog.created_at_utc,
                        created_at_wib: inspectingLog.created_at_wib,
                        old: inspectingLog.old,
                        new: inspectingLog.new,
                      },
                      null,
                      2
                    )}
                  </pre>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="audit-modal-footer">
              <Button
                variant="secondary"
                onClick={() => {
                  setInspectingLog(null);
                  setIsRawOpen(false);
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogAdmin;
