import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { CustomSelect } from "../../components/ui/CustomSelect";
import { Pagination } from "../../components/ui/Pagination";
import { SearchField } from "../../components/ui/SearchField";
import { TableLoadingRow } from "../../components/ui/LoadingBuffer";
import { useAuthPermission } from "../../context/AuthPermissionContext";
import {
  fetchDashboardOverviewApi,
  fetchDashboardTrackingApi,
  type DashboardOverviewData,
  type DashboardTrackedDocument,
} from "../../data/operationsAndDashboardApi";
import { docToSlug } from "../../utils/docSlug";

interface DashboardDocumentAnalyticsProps {
  onNavigateDetail?: (module: "pr" | "po" | "report" | "warehouse", identifier: string) => void;
  onNavigateReceiveNoteDetail?: (rnNumber: string) => void;
  onNavigateRequestMaterialDetail?: (id: string) => void;
  onNavigateTransferStockReturnDetail?: (code: string) => void;
  onNavigateStockTransferDetail?: (code: string) => void;
}

const MODULE_LABELS: Record<string, string> = {
  PR: "Purchase Requisition",
  PO: "Purchase Order",
  RN: "Receive Note",
  BPB: "Receive Material (BPB)",
  RM: "Request Material",
  TSR: "Transfer Stock Return",
  STOCK_TRANSFER: "Warehouse Transfer",
};

function getStatusTone(status: string): "green" | "blue" | "orange" | "red" | "purple" | "gray" {
  const s = status.toLowerCase();
  if (s === "approved" || s === "approved 2" || s === "closed" || s === "posted") return "green";
  if (s.includes("waiting") || s === "approved 1") return "orange";
  if (s === "rejected" || s === "cancelled") return "red";
  return "gray";
}

export function DashboardDocumentAnalytics({
  onNavigateDetail,
  onNavigateReceiveNoteDetail,
  onNavigateRequestMaterialDetail,
  onNavigateTransferStockReturnDetail,
  onNavigateStockTransferDetail,
}: DashboardDocumentAnalyticsProps) {
  const { currentUser } = useAuthPermission();
  const isAdminUser =
    currentUser?.role === "superadmin" || currentUser?.role === "admin";

  const [overview, setOverview] = useState<DashboardOverviewData | null>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  const [trackingRows, setTrackingRows] = useState<DashboardTrackedDocument[]>([]);
  const [loadingTracking, setLoadingTracking] = useState(true);
  const [trackingTotal, setTrackingTotal] = useState(0);

  const [docTypeFilter, setDocTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [scopeFilter, setScopeFilter] = useState<"own" | "all">("own");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      const data = await fetchDashboardOverviewApi();
      setOverview(data);
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const loadTracking = useCallback(async () => {
    setLoadingTracking(true);
    try {
      const res = await fetchDashboardTrackingApi({
        document_type: docTypeFilter !== "ALL" ? docTypeFilter : undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        search: searchQuery.trim() || undefined,
        scope: isAdminUser ? scopeFilter : "own",
        page: currentPage,
        per_page: pageSize,
      });
      setTrackingRows(res.rows);
      setTrackingTotal(res.meta.total);
    } finally {
      setLoadingTracking(false);
    }
  }, [docTypeFilter, statusFilter, searchQuery, scopeFilter, isAdminUser, currentPage, pageSize]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadTracking();
  }, [loadTracking]);

  useEffect(() => {
    const refresh = () => {
      loadOverview();
      loadTracking();
    };
    window.addEventListener("geniusone_approval_changed", refresh);
    return () => window.removeEventListener("geniusone_approval_changed", refresh);
  }, [loadOverview, loadTracking]);

  const handleNavigateDocument = (docType: string, docNumber: string, docId: number) => {
    const slug = docToSlug(docNumber || String(docId));
    switch (docType.toUpperCase()) {
      case "PR":
        onNavigateDetail?.("pr", slug);
        break;
      case "PO":
        onNavigateDetail?.("po", slug);
        break;
      case "BPB":
        onNavigateDetail?.("warehouse", slug);
        break;
      case "RN":
        onNavigateReceiveNoteDetail?.(docNumber || String(docId));
        break;
      case "RM":
        onNavigateRequestMaterialDetail?.(docNumber || String(docId));
        break;
      case "TSR":
        onNavigateTransferStockReturnDetail?.(slug);
        break;
      case "STOCK_TRANSFER":
        onNavigateStockTransferDetail?.(slug);
        break;
      default:
        break;
    }
  };

  const agg = overview?.completion_aggregation;
  const totalDocs = agg?.total ?? 0;
  const completedDocs = agg?.completed ?? 0;
  const incompleteDocs = agg?.incomplete ?? 0;
  const completionRate = agg?.completion_rate ?? 0;
  const accessibleModules = agg?.accessible_modules ?? [];

  // SVG donut geometry (circumference = 2 * PI * 48)
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const completedLength =
    totalDocs > 0 ? Math.min(circumference, (completedDocs / totalDocs) * circumference) : 0;

  return (
    <section className="dashboard-analytics-grid" aria-label="Role-Based Document Analytics">
      {/* 1. Pie Chart Card — Document Completion */}
      <div className="dashboard-pie-card">
        <div className="dashboard-analytics-card__header">
          <h3 className="dashboard-analytics-card__title">Document Completion</h3>
          <div className="dashboard-analytics-card__badges">
            <Badge tone="blue">{(agg?.role || currentUser?.role || "user").toUpperCase()}</Badge>
            <Badge tone="gray">
              {agg?.scope === "own_documents" ? "My Scope" : "Role Scope"}
            </Badge>
          </div>
        </div>

        <div className="dashboard-pie-card__body">
          {loadingOverview && !overview ? (
            <div className="dashboard-analytics-empty">Loading completion chart...</div>
          ) : (
            <>
              <div className="dashboard-pie-wrap">
                <svg className="dashboard-pie-svg" viewBox="0 0 120 120" role="img" aria-label={`Document completion ${completionRate}%`}>
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="none"
                    stroke={totalDocs > 0 ? "#fde68a" : "#e2e8f0"}
                    strokeWidth="16"
                  />
                  {completedLength > 0 && (
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="16"
                      strokeDasharray={`${completedLength} ${circumference}`}
                      transform="rotate(-90 60 60)"
                    />
                  )}
                  <text x="60" y="57" textAnchor="middle" className="dashboard-pie-center-pct">
                    {completionRate}%
                  </text>
                  <text x="60" y="73" textAnchor="middle" className="dashboard-pie-center-label">
                    COMPLETE
                  </text>
                </svg>

                <div className="dashboard-pie-legend">
                  <div className="dashboard-pie-metric">
                    <span>
                      <span className="dashboard-pie-dot dashboard-pie-dot--total" />
                      Total Documents
                    </span>
                    <strong>{totalDocs}</strong>
                  </div>
                  <div className="dashboard-pie-metric">
                    <span>
                      <span className="dashboard-pie-dot dashboard-pie-dot--done" />
                      Completed
                    </span>
                    <strong>{completedDocs}</strong>
                  </div>
                  <div className="dashboard-pie-metric">
                    <span>
                      <span className="dashboard-pie-dot dashboard-pie-dot--pending" />
                      In Progress
                    </span>
                    <strong>{incompleteDocs}</strong>
                  </div>
                </div>
              </div>

              <div className="dashboard-module-breakdown">
                {(agg?.by_module || []).map((mod) => {
                  const isActive = docTypeFilter === mod.module;
                  return (
                    <button
                      key={mod.module}
                      type="button"
                      className={`dashboard-module-row ${isActive ? "dashboard-module-row--active" : ""}`}
                      onClick={() => {
                        setDocTypeFilter((prev) => (prev === mod.module ? "ALL" : mod.module));
                        setCurrentPage(1);
                      }}
                    >
                      <span className="dashboard-module-row__name">
                        {MODULE_LABELS[mod.module] || mod.module}
                      </span>
                      <span className="dashboard-module-row__stats">
                        {mod.completed}/{mod.total} ({mod.completion_rate}%)
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Role-Scoped Document Tracking Card */}
      <div className="dashboard-tracking-card">
        <div className="dashboard-analytics-card__header">
          <h3 className="dashboard-analytics-card__title">Document Tracking</h3>
          <div className="dashboard-analytics-card__badges">
            {isAdminUser && (
              <Button
                type="button"
                size="sm"
                variant={scopeFilter === "all" ? "primary" : "secondary"}
                onClick={() => {
                  setScopeFilter((prev) => (prev === "all" ? "own" : "all"));
                  setCurrentPage(1);
                }}
              >
                {scopeFilter === "all" ? "All Users" : "My Documents"}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                loadOverview();
                loadTracking();
              }}
            >
              Refresh
            </Button>
          </div>
        </div>

        <div className="dashboard-tracking-toolbar">
          <div className="dashboard-tracking-search">
            <SearchField
              value={searchQuery}
              onChange={(val) => {
                setSearchQuery(val);
                setCurrentPage(1);
              }}
              placeholder="Search document number..."
            />
          </div>

          <div className="dashboard-tracking-filter-select">
            <CustomSelect
              value={docTypeFilter}
              onChange={(val) => {
                setDocTypeFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All Modules" },
                ...accessibleModules.map((m) => ({
                  value: m,
                  label: MODULE_LABELS[m] || m,
                })),
              ]}
            />
          </div>

          <div className="dashboard-tracking-filter-select">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All Statuses" },
                { value: "completed", label: "Completed Only" },
                { value: "incomplete", label: "In Progress Only" },
              ]}
            />
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="col-no">No</th>
                  <th>Document Number</th>
                  <th>Module</th>
                  <th>Created Date</th>
                  <th>Status</th>
                  <th>Workflow Stage</th>
                  <th>Downstream Documents</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loadingTracking && trackingRows.length === 0 ? (
                  <TableLoadingRow
                    colSpan={8}
                    label="Loading Document Tracking..."
                    sublabel="Fetching role-authorized workflow statuses..."
                  />
                ) : trackingRows.length > 0 ? (
                  trackingRows.map((doc, idx) => {
                    const rowNo = (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={`${doc.document_type}-${doc.document_id}`}>
                        <td className="col-no">{rowNo}</td>
                        <td>
                          <button
                            type="button"
                            className="dashboard-doc-link-btn"
                            onClick={() =>
                              handleNavigateDocument(doc.document_type, doc.document_number, doc.document_id)
                            }
                          >
                            {doc.document_number}
                          </button>
                        </td>
                        <td>
                          <Badge tone="blue">{doc.document_type}</Badge>
                        </td>
                        <td>{doc.created_at ? doc.created_at.slice(0, 10) : "—"}</td>
                        <td>
                          <Badge tone={getStatusTone(doc.status)}>{doc.status}</Badge>
                        </td>
                        <td>{doc.workflow_stage}</td>
                        <td>
                          {doc.downstream_documents && doc.downstream_documents.length > 0 ? (
                            <div className="dashboard-downstream-list">
                              {doc.downstream_documents.map((ds) => (
                                <button
                                  key={`${ds.document_type}-${ds.document_id}`}
                                  type="button"
                                  className="dashboard-downstream-btn"
                                  onClick={() =>
                                    handleNavigateDocument(
                                      ds.document_type,
                                      ds.document_number,
                                      ds.document_id
                                    )
                                  }
                                >
                                  {ds.document_type}: {ds.document_number}
                                </button>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleNavigateDocument(doc.document_type, doc.document_number, doc.document_id)
                            }
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="dashboard-analytics-empty">
                      No documents found for the current filters and user permissions.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            totalRecords={trackingTotal}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </section>
  );
}
