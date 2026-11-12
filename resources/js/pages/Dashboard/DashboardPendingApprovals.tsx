import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { SearchField } from "../../components/ui/SearchField";
import { Pagination } from "../../components/ui/Pagination";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { ApprovalStatusBadge } from "../../components/approval/ApprovalStatusBadge";
import {
  getLocalApprovalState,
  executeApprove,
} from "../../services/approvalApi";
import {
  normalizeApprovalStatus,
  type ApprovalModule,
  type ApprovalStatus,
} from "../../types/approval";
import { fetchList } from "../../data/api";
import { prRows, poRows, warehouseRows } from "../../data/mockData";
import { initialReceiveNoteRecords } from "../Exim/ReceiveNote/receive-note-data";
import { initialRequestMaterialRecords } from "../Warehouse/Request/RequestMaterial/request-material-data";
import type { ReceiveNoteRecord } from "../Exim/ReceiveNote/receive-note-types";
import type { RequestMaterialRecord } from "../Warehouse/Request/RequestMaterial/request-material-types";

export interface PendingApprovalItem {
  id: string;
  module: ApprovalModule;
  docType: "PR" | "PO" | "Receive Note" | "Receive Material (BPB)" | "Request Material";
  docNumber: string;
  date: string;
  party: string;
  amountFormatted: string;
  amountNumeric: number;
  itemsSummary: string;
  status: "WAITING_APPROVE_1" | "WAITING_APPROVE_2";
  currentTier: 1 | 2;
  createdAtRaw: number;
}

interface DashboardPendingApprovalsProps {
  onNavigateDetail?: (module: "pr" | "po" | "report" | "warehouse", identifier: string) => void;
  onNavigateReceiveNoteDetail?: (rnNumber: string) => void;
  onNavigateRequestMaterialDetail?: (id: string) => void;
  receiveNoteRecords?: ReceiveNoteRecord[];
  requestMaterialRecords?: RequestMaterialRecord[];
  onReceiveNotesUpdate?: React.Dispatch<React.SetStateAction<ReceiveNoteRecord[]>>;
}

function parseDateToTimestamp(dateStr?: string): number {
  if (!dateStr || dateStr === "-") return 0;
  const clean = dateStr.trim();
  const dmyMatch = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  const isoMatch = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  const textMonthMatch = clean.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{4})/);
  if (textMonthMatch) {
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };
    const [, d, mStr, y] = textMonthMatch;
    const m = months[mStr.toLowerCase().slice(0, 3)] ?? 0;
    return new Date(Number(y), m, Number(d)).getTime();
  }
  const parsed = Date.parse(clean);
  return isNaN(parsed) ? 0 : parsed;
}

export function DashboardPendingApprovals({
  onNavigateDetail,
  onNavigateReceiveNoteDetail,
  onNavigateRequestMaterialDetail,
  receiveNoteRecords,
  requestMaterialRecords,
  onReceiveNotesUpdate,
}: DashboardPendingApprovalsProps) {
  const [items, setItems] = useState<PendingApprovalItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Filters and Sorting
  const [stageFilter, setStageFilter] = useState<"all" | "WAITING_APPROVE_1" | "WAITING_APPROVE_2">("all");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_desc">("newest");
  const [search, setSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  // Load all pending approval records across modules
  const loadApprovals = useCallback(async () => {
    setIsLoading(true);
    const collected: PendingApprovalItem[] = [];

    // 1. Purchase Requisitions (PR)
    try {
      const prRes = await fetchList("pr");
      const list = prRes && Array.isArray(prRes.rows) && prRes.rows.length > 0 ? prRes.rows : prRows;
      for (const row of list) {
        const docNum = String(row._rawNumber || row._rawPr || row.prNumber || row.id || "").trim();
        if (!docNum) continue;
        const norm = normalizeApprovalStatus(String(row._rawStatus || row.status || ""));
        const local = getLocalApprovalState("purchase_requisition", docNum, norm);

        if (local.status === "WAITING_APPROVE_1" || local.status === "WAITING_APPROVE_2") {
          collected.push({
            id: `pr-${docNum}`,
            module: "purchase_requisition",
            docType: "PR",
            docNumber: docNum,
            date: String(row._rawDate || row.date || "-"),
            party: String(row._rawDept || row.deptRequest || "Purchasing"),
            amountFormatted: String(row._rawTotal || row.totalEstimatedAmount || "—"),
            amountNumeric: typeof row._numericTotal === "number" ? row._numericTotal : 0,
            itemsSummary: String(row._rawItemCount ? `${row._rawItemCount} items` : "PR Requisition items"),
            status: local.status,
            currentTier: local.currentTier,
            createdAtRaw: parseDateToTimestamp(String(row._rawDate || row.date || "")),
          });
        }
      }
    } catch (err) {
      console.warn("Dashboard approvals: Failed to load PR:", err);
    }

    // 2. Purchase Orders (PO)
    try {
      const poRes = await fetchList("po");
      const list = poRes && Array.isArray(poRes.rows) && poRes.rows.length > 0 ? poRes.rows : poRows;
      for (const row of list) {
        const docNum = String(row._rawPo || row._rawNumber || row.poNumber || row.id || "").trim();
        if (!docNum) continue;
        const norm = normalizeApprovalStatus(String(row._rawStatus || row.status || ""));
        const local = getLocalApprovalState("purchase_order", docNum, norm);

        if (local.status === "WAITING_APPROVE_1" || local.status === "WAITING_APPROVE_2") {
          const rawAmount = String(row._rawTotalPrice || row.totalPrice || "");
          const numAmount = parseFloat(rawAmount.replace(/[^0-9.-]/g, "")) || 0;
          collected.push({
            id: `po-${docNum}`,
            module: "purchase_order",
            docType: "PO",
            docNumber: docNum,
            date: String(row._rawDate || row.date || "-"),
            party: String(row._rawSupplier || row.supplier || "Vendor"),
            amountFormatted: rawAmount || "—",
            amountNumeric: numAmount,
            itemsSummary: String(row._rawItemCount ? `${row._rawItemCount} items` : "PO items"),
            status: local.status,
            currentTier: local.currentTier,
            createdAtRaw: parseDateToTimestamp(String(row._rawDate || row.date || "")),
          });
        }
      }
    } catch (err) {
      console.warn("Dashboard approvals: Failed to load PO:", err);
    }

    // 3. Receive Notes (RN)
    try {
      const rnList =
        receiveNoteRecords && receiveNoteRecords.length > 0
          ? receiveNoteRecords
          : initialReceiveNoteRecords;
      for (const rn of rnList) {
        const docNum = String(rn.rnNumber || rn.id || "").trim();
        if (!docNum) continue;
        const norm = normalizeApprovalStatus(rn.status);
        const local = getLocalApprovalState("receive_note", docNum, norm);

        if (local.status === "WAITING_APPROVE_1" || local.status === "WAITING_APPROVE_2") {
          collected.push({
            id: `rn-${docNum}`,
            module: "receive_note",
            docType: "Receive Note",
            docNumber: docNum,
            date: rn.arrivalDate || rn.date || "-",
            party: rn.supplier || "Supplier",
            amountFormatted:
              rn.amountFormatted ||
              `IDR ${Number(rn.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
            amountNumeric: Number(rn.amount || 0),
            itemsSummary: `${rn.items?.length || 1} items (${rn.poNumber || "PO"})`,
            status: local.status,
            currentTier: local.currentTier,
            createdAtRaw: parseDateToTimestamp(rn.arrivalDate || rn.date || ""),
          });
        }
      }
    } catch (err) {
      console.warn("Dashboard approvals: Failed to load RN:", err);
    }

    // 4. Receive Material (BPB)
    try {
      const whRes = await fetchList("warehouse");
      const list = whRes && Array.isArray(whRes.rows) && whRes.rows.length > 0 ? whRes.rows : warehouseRows;
      for (const row of list) {
        const docNum = String(row._rawNumber || row._rawRn || row.bpbNumber || row.id || "").trim();
        if (!docNum) continue;
        const norm = normalizeApprovalStatus(String(row._rawStatus || row.status || ""));
        const local = getLocalApprovalState("bpb", docNum, norm);

        if (local.status === "WAITING_APPROVE_1" || local.status === "WAITING_APPROVE_2") {
          collected.push({
            id: `bpb-${docNum}`,
            module: "bpb",
            docType: "Receive Material (BPB)",
            docNumber: docNum,
            date: String(row._rawDate || row.date || "-"),
            party: String(row._rawSupplier || row.supplier || "Warehouse Inbound"),
            amountFormatted: "—",
            amountNumeric: 0,
            itemsSummary: String(row._rawItemCount ? `${row._rawItemCount} received items` : "BPB items"),
            status: local.status,
            currentTier: local.currentTier,
            createdAtRaw: parseDateToTimestamp(String(row._rawDate || row.date || "")),
          });
        }
      }
    } catch (err) {
      console.warn("Dashboard approvals: Failed to load BPB:", err);
    }

    // 5. Request Material
    try {
      const reqList =
        requestMaterialRecords && requestMaterialRecords.length > 0
          ? requestMaterialRecords
          : initialRequestMaterialRecords;
      for (const req of reqList) {
        const docNum = String(req.requestCode || req.id || "").trim();
        if (!docNum) continue;
        const norm = normalizeApprovalStatus(req.approval);
        const local = getLocalApprovalState("request_material", docNum, norm);

        if (local.status === "WAITING_APPROVE_1" || local.status === "WAITING_APPROVE_2") {
          collected.push({
            id: `req-${docNum}`,
            module: "request_material",
            docType: "Request Material",
            docNumber: docNum,
            date: req.requestDate || req.createdDate || "-",
            party: `${req.department} (${req.createdBy || "Staff"})`,
            amountFormatted: "—",
            amountNumeric: 0,
            itemsSummary: `${req.totalItems || req.items?.length || 1} material items`,
            status: local.status,
            currentTier: local.currentTier,
            createdAtRaw: parseDateToTimestamp(req.requestDate || req.createdDate || ""),
          });
        }
      }
    } catch (err) {
      console.warn("Dashboard approvals: Failed to load Request Material:", err);
    }

    setItems(collected);
    setIsLoading(false);
  }, [receiveNoteRecords, requestMaterialRecords]);

  // Initial load & subscribe to approval events across tabs/pages
  useEffect(() => {
    loadApprovals();

    const handleApprovalChanged = () => {
      loadApprovals();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("geniusone_approval_changed", handleApprovalChanged);
      window.addEventListener("storage", handleApprovalChanged);
      return () => {
        window.removeEventListener("geniusone_approval_changed", handleApprovalChanged);
        window.removeEventListener("storage", handleApprovalChanged);
      };
    }
  }, [loadApprovals]);

  // Handle Quick Approve
  const handleQuickApprove = async (item: PendingApprovalItem, tier: 1 | 2) => {
    setApprovingId(item.id);
    try {
      const res = await executeApprove({
        module: item.module,
        documentId: item.docNumber,
        documentNumber: item.docNumber,
        tier,
        userId: "superadmin-1",
        userName: "Administrator GeniusOne",
        userRole: tier === 1 ? "Department Lead" : "Director / Management",
        note: `Approved via Dashboard Quick Authorization (Stage ${tier})`,
      });

      if (res.success) {
        const nextStatus = res.status;
        setNotification({
          type: "success",
          message: `${item.docType} "${item.docNumber}" successfully approved for Stage ${tier}! (${
            nextStatus === "APPROVED"
              ? "Fully Approved ✓"
              : "Advanced to Waiting Approve 2"
          })`,
        });

        // Update local item list immediately
        setItems((prev) => {
          if (nextStatus === "APPROVED") {
            return prev.filter((i) => i.id !== item.id);
          }
          return prev.map((i) =>
            i.id === item.id
              ? {
                  ...i,
                  status: nextStatus as "WAITING_APPROVE_2",
                  currentTier: 2,
                }
              : i
          );
        });

        // Synchronize parent state if Receive Note
        if (item.module === "receive_note" && onReceiveNotesUpdate) {
          onReceiveNotesUpdate((prev) =>
            prev.map((r) =>
              r.rnNumber === item.docNumber
                ? {
                    ...r,
                    status: nextStatus === "APPROVED" ? "Approved" : "Waiting for Approve 2",
                    approval1At:
                      tier === 1
                        ? `${new Date().toLocaleDateString("id-ID")} by Administrator GeniusOne`
                        : r.approval1At,
                    approval2At:
                      tier === 2
                        ? `${new Date().toLocaleDateString("id-ID")} by Administrator GeniusOne`
                        : r.approval2At,
                  }
                : r
            )
          );
        }

        setTimeout(() => setNotification(null), 4500);
      } else {
        setNotification({
          type: "error",
          message: res.message || "Failed to execute approval.",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "An unexpected error occurred during approval.",
      });
    } finally {
      setApprovingId(null);
    }
  };

  // Navigate to document detail view
  const handleOpenDetail = (item: PendingApprovalItem) => {
    if (item.module === "purchase_requisition" && onNavigateDetail) {
      onNavigateDetail("pr", item.docNumber);
    } else if (item.module === "purchase_order" && onNavigateDetail) {
      onNavigateDetail("po", item.docNumber);
    } else if (item.module === "bpb" && onNavigateDetail) {
      onNavigateDetail("warehouse", item.docNumber);
    } else if (item.module === "receive_note" && onNavigateReceiveNoteDetail) {
      onNavigateReceiveNoteDetail(item.docNumber);
    } else if (item.module === "request_material" && onNavigateRequestMaterialDetail) {
      onNavigateRequestMaterialDetail(item.docNumber);
    }
  };

  // Filter & Sort
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Stage filter
    if (stageFilter !== "all") {
      result = result.filter((i) => i.status === stageFilter);
    }

    // Doc Type filter
    if (docTypeFilter !== "all") {
      result = result.filter((i) => {
        if (docTypeFilter === "pr") return i.docType === "PR";
        if (docTypeFilter === "po") return i.docType === "PO";
        if (docTypeFilter === "rn") return i.docType === "Receive Note";
        if (docTypeFilter === "bpb") return i.docType === "Receive Material (BPB)";
        if (docTypeFilter === "req") return i.docType === "Request Material";
        return true;
      });
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.docNumber.toLowerCase().includes(q) ||
          i.party.toLowerCase().includes(q) ||
          i.docType.toLowerCase().includes(q) ||
          i.itemsSummary.toLowerCase().includes(q)
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "newest") {
        return b.createdAtRaw - a.createdAtRaw;
      }
      if (sortBy === "oldest") {
        return a.createdAtRaw - b.createdAtRaw;
      }
      if (sortBy === "amount_desc") {
        return b.amountNumeric - a.amountNumeric;
      }
      return 0;
    });

    return result;
  }, [items, stageFilter, docTypeFilter, search, sortBy]);

  // Counts
  const totalWaiting = items.length;
  const waiting1Count = items.filter((i) => i.status === "WAITING_APPROVE_1").length;
  const waiting2Count = items.filter((i) => i.status === "WAITING_APPROVE_2").length;

  // Pagination calculation
  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  const getDocTypeBadgeTone = (type: PendingApprovalItem["docType"]) => {
    switch (type) {
      case "PR":
        return "blue";
      case "PO":
        return "purple";
      case "Receive Note":
        return "green";
      case "Receive Material (BPB)":
        return "orange";
      case "Request Material":
        return "gray";
      default:
        return "gray";
    }
  };

  return (
    <div
      className="dashboard-approval-card"
      style={{
        background: "#ffffff",
        border: "1px solid var(--line, #e2e8f0)",
        borderRadius: "var(--radius-sm, 6px)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        marginBottom: "16px",
      }}
    >
      {/* Card Header matching Dashboard Style */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: "linear-gradient(180deg, #f8faff 0%, #f0f5ff 100%)",
          borderBottom: "1px solid rgba(0, 113, 227, 0.15)",
          flexWrap: "wrap",
          gap: "10px",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 auto" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "#eff6ff",
              color: "#0071e3",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
              border: "1px solid rgba(0, 113, 227, 0.2)",
            }}
          >
            <Icon name="checkCircle" size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", whiteSpace: "nowrap" }}>
                Pending Approvals
              </span>
              <Badge tone="blue">{totalWaiting} Pending</Badge>
              {waiting1Count > 0 && <Badge tone="orange">{waiting1Count} Stage 1</Badge>}
              {waiting2Count > 0 && <Badge tone="purple">{waiting2Count} Stage 2</Badge>}
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "var(--slate-500, #64748b)" }}>
              Direct authorization shortcut across Procurement, EXIM, and Warehouse modules.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
          <Button
            type="button"
            className="button-refresh-sky"
            size="sm"
            onClick={loadApprovals}
            title="Refresh pending approvals queue"
            loading={isLoading}
          >
            Refresh
          </Button>

          <Button
            type="button"
            variant="warning"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand approvals panel" : "Collapse approvals panel"}
          >
            {isCollapsed ? "Show" : "Hide"}
          </Button>
        </div>
      </div>

      {/* Body Content */}
      {!isCollapsed && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Notification Feedback Toast */}
          {notification && (
            <div
              style={{
                padding: "8px 18px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: notification.type === "success" ? "#ecfdf5" : "#fef2f2",
                borderBottom: `1px solid ${notification.type === "success" ? "#a7f3d0" : "#fecaca"}`,
                color: notification.type === "success" ? "#065f46" : "#991b1b",
                fontWeight: 600,
              }}
            >
              <Icon
                name={notification.type === "success" ? "checkCircle" : "alertTriangle"}
                size={14}
              />
              <span>{notification.message}</span>
            </div>
          )}

          {/* Controls Bar: Stage Filter Pills, Doc Type, Sort & Search */}
          <div className="dashboard-approval-controls">
            {/* Left: Quick Stage Filter Pills */}
            <div className="dashboard-approval-pills">
              <button
                type="button"
                onClick={() => {
                  setStageFilter("all");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  borderRadius: "20px",
                  border: stageFilter === "all" ? "1px solid var(--blue-600, #0071e3)" : "1px solid var(--line, #cbd5e1)",
                  background: stageFilter === "all" ? "var(--blue-50, #eff6ff)" : "#ffffff",
                  color: stageFilter === "all" ? "var(--blue-700, #0071e3)" : "var(--slate-600, #475569)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                All ({totalWaiting})
              </button>

              <button
                type="button"
                onClick={() => {
                  setStageFilter("WAITING_APPROVE_1");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  borderRadius: "20px",
                  border:
                    stageFilter === "WAITING_APPROVE_1"
                      ? "1px solid var(--orange-500, #f97316)"
                      : "1px solid var(--line, #cbd5e1)",
                  background: stageFilter === "WAITING_APPROVE_1" ? "#fff7ed" : "#ffffff",
                  color: stageFilter === "WAITING_APPROVE_1" ? "#c2410c" : "var(--slate-600, #475569)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Waiting Approve 1 ({waiting1Count})
              </button>

              <button
                type="button"
                onClick={() => {
                  setStageFilter("WAITING_APPROVE_2");
                  setCurrentPage(1);
                }}
                style={{
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  borderRadius: "20px",
                  border:
                    stageFilter === "WAITING_APPROVE_2"
                      ? "1px solid var(--purple-600, #7c3aed)"
                      : "1px solid var(--line, #cbd5e1)",
                  background: stageFilter === "WAITING_APPROVE_2" ? "#f5f3ff" : "#ffffff",
                  color: stageFilter === "WAITING_APPROVE_2" ? "#6d28d9" : "var(--slate-600, #475569)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                Waiting Approve 2 ({waiting2Count})
              </button>
            </div>

            {/* Right: Dropdown Filters & Search */}
            <div className="dashboard-approval-filters">
              <div className="dashboard-approval-filter-item dashboard-approval-filter-item--doctype">
                <CustomSelect
                  value={docTypeFilter}
                  onChange={(val) => {
                    setDocTypeFilter(val);
                    setCurrentPage(1);
                  }}
                  options={[
                    { value: "all", label: "All Document Types" },
                    { value: "pr", label: "Purchase Requisition" },
                    { value: "po", label: "Purchase Order" },
                    { value: "rn", label: "Receive Note (RN)" },
                    { value: "bpb", label: "Receive Material (BPB)" },
                    { value: "req", label: "Request Material" },
                  ]}
                />
              </div>

              <div className="dashboard-approval-filter-item dashboard-approval-filter-item--sort">
                <CustomSelect
                  value={sortBy}
                  onChange={(val) => setSortBy(val as any)}
                  options={[
                    { value: "newest", label: "Newest Created" },
                    { value: "oldest", label: "Oldest Created" },
                    { value: "amount_desc", label: "Highest Value" },
                  ]}
                />
              </div>

              <div className="dashboard-approval-filter-item dashboard-approval-filter-item--search">
                <SearchField
                  value={search}
                  onChange={(val) => {
                    setSearch(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Search doc, vendor, party..."
                />
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="dashboard-approval-table-wrapper" style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", width: "100%", background: "#ffffff" }}>
            <table style={{ width: "100%", minWidth: "980px", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
                  <th style={{ width: "45px", padding: "10px 14px", textAlign: "center", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    No
                  </th>
                  <th style={{ width: "120px", padding: "10px 14px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Doc Type
                  </th>
                  <th style={{ minWidth: "180px", padding: "10px 14px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Document No
                  </th>
                  <th style={{ width: "110px", padding: "10px 14px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Date
                  </th>
                  <th style={{ minWidth: "160px", padding: "10px 14px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Requester / Supplier
                  </th>
                  <th style={{ width: "140px", padding: "10px 14px", textAlign: "right", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Amount
                  </th>
                  <th style={{ width: "135px", padding: "10px 14px", textAlign: "center", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Approval Status
                  </th>
                  <th style={{ width: "160px", padding: "10px 14px", textAlign: "center", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: "36px 20px",
                        textAlign: "center",
                        color: "var(--slate-500, #64748b)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "var(--green-50, #f0fdf4)",
                            color: "var(--green-600, #16a34a)",
                            display: "grid",
                            placeItems: "center",
                          }}
                        >
                          <Icon name="check" size={20} />
                        </div>
                        <strong style={{ fontSize: "13px", color: "var(--ink, #0f172a)" }}>
                          All caught up! No pending approvals found.
                        </strong>
                        <span style={{ fontSize: "12px", color: "var(--slate-400)" }}>
                          {search.trim() || stageFilter !== "all" || docTypeFilter !== "all"
                            ? "Try resetting filters or search criteria."
                            : "All documents across Procurement, EXIM, and Warehouse are fully verified."}
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((it, idx) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                    const isProcessing = approvingId === it.id;

                    return (
                      <tr
                        key={it.id}
                        style={{
                          borderBottom: "1px solid var(--line, #e2e8f0)",
                          transition: "background 0.12s ease",
                        }}
                      >
                        {/* No */}
                        <td style={{ padding: "10px 14px", textAlign: "center", color: "var(--slate-500)" }}>
                          {rowNumber}
                        </td>

                        {/* Doc Type */}
                        <td style={{ padding: "10px 14px" }}>
                          <Badge tone={getDocTypeBadgeTone(it.docType)} style={{ fontSize: "10.5px" }}>
                            {it.docType}
                          </Badge>
                        </td>

                        {/* Doc Number (clickable link) */}
                        <td style={{ padding: "10px 14px" }}>
                          <strong
                            onClick={() => handleOpenDetail(it)}
                            style={{
                              color: "var(--blue-700, #1d4ed8)",
                              textDecoration: "underline",
                              cursor: "pointer",
                              fontSize: "12px",
                              fontFamily: "monospace",
                            }}
                            title={`Open detail for ${it.docNumber}`}
                          >
                            {it.docNumber}
                          </strong>
                          <div style={{ fontSize: "11px", color: "var(--slate-400)", marginTop: "2px" }}>
                            {it.itemsSummary}
                          </div>
                        </td>

                        {/* Date */}
                        <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--slate-600)" }}>
                          {it.date}
                        </td>

                        {/* Requester / Supplier */}
                        <td style={{ padding: "10px 14px", color: "var(--ink)" }}>
                          <div style={{ fontWeight: 600 }}>{it.party}</div>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "monospace", color: "var(--ink)" }}>
                          {it.amountFormatted}
                        </td>

                        {/* Status */}
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <ApprovalStatusBadge status={it.status} showIcon />
                        </td>

                        {/* Action buttons */}
                        <td style={{ padding: "10px 14px", textAlign: "center" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}>
                            {it.status === "WAITING_APPROVE_1" ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleQuickApprove(it, 1)}
                                loading={isProcessing}
                                disabled={isProcessing}
                                title="Approve Stage 1 directly from Dashboard"
                              >
                                Approve 1
                              </Button>
                            ) : (
                              <Button
                                variant="success"
                                size="sm"
                                style={{
                                  background: "var(--green-600, #16a34a)",
                                  borderColor: "var(--green-600, #16a34a)",
                                  color: "#ffffff",
                                }}
                                onClick={() => handleQuickApprove(it, 2)}
                                loading={isProcessing}
                                disabled={isProcessing}
                                title="Finalize Stage 2 approval directly from Dashboard"
                              >
                                Approve 2
                              </Button>
                            )}

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDetail(it)}
                              title="Inspect full document before approving"
                            >
                              Detail
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer with Pagination */}
          <Pagination
            totalRecords={totalRecords}
            currentPage={safeCurrentPage}
            pageSize={pageSize}
            showPageSize={true}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default DashboardPendingApprovals;

