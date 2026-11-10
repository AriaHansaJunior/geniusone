import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Material } from "../../../components/common/CommonCells";
import { prRows, findRowBySlug } from "../../../data/mockData";
import { fetchDetail } from "../../../data/api";
import type { TableRow } from "../../../types";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import {
  getLocalApprovalState,
  getPrClosedItemsMap,
  isPrItemClosed,
  recordDocumentActivity,
  togglePrItemClosing,
} from "../../../services/approvalApi";
import { normalizeApprovalStatus, type DocumentApprovalState } from "../../../types/approval";
import { useAuthPermission } from "../../../context/AuthPermissionContext";

interface PurchaseRequisitionDetailProps {
  code: string;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function PurchaseRequisitionDetail({
  code,
  onBack,
  onNavigateDetail,
}: PurchaseRequisitionDetailProps) {
  const [row, setRow] = useState<TableRow>(() => {
    if (typeof document !== "undefined") {
      const rootEl = document.getElementById("root");
      if (rootEl?.dataset?.initialJson) {
        try {
          const parsed = JSON.parse(rootEl.dataset.initialJson);
          if (parsed?.item) {
            const parsedNum = String(parsed.item._rawNumber || parsed.item.prNumber || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
            const targetCode = String(code || "").replace(/[^A-Za-z0-9]/g, "").toLowerCase();
            if (!targetCode || parsedNum === targetCode) {
              return parsed.item;
            }
          }
        } catch (_) {}
      }
    }
    const match = findRowBySlug(prRows, code);
    if (match) return match;
    const cleanDoc = code ? code.replace(/-/g, "/") : "PR";
    return {
      _id: `pr-${code}`,
      _type: "pr",
      prNumber: cleanDoc,
      _rawNumber: cleanDoc,
      status: "Waiting for Approve 1",
      _rawStatus: "Waiting for Approve 1",
      date: "-",
      dueDate: "-",
      deptRequest: "Loading...",
      section: "Operations",
      remark: "-",
      createdBy: "-",
      totalQuantity: "-",
      items: [],
      _items: [],
    } as TableRow;
  });

  useEffect(() => {
    let isMounted = true;
    fetchDetail("pr", code).then((item) => {
      if (isMounted && item) {
        setRow(item);
        const norm = normalizeApprovalStatus(item._rawStatus || item.status);
        if (norm) {
          const local = getLocalApprovalState("purchase_requisition", item._rawNumber || item.prNumber || code, norm);
          setApprovalState({
            ...local,
            status: norm,
            currentTier: norm === "WAITING_APPROVE_2" ? 2 : norm === "APPROVED" ? 2 : 1,
          });
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [code]);

  const docNumber = typeof row._rawNumber === "string" && row._rawNumber
    ? row._rawNumber
    : typeof row.prNumber === "string" && row.prNumber
    ? row.prNumber
    : typeof code === "string"
    ? code.replace(/-/g, "/")
    : "PR";
  const rawStatus = row._rawStatus || row.status || "Waiting for Approve 1";
  const reqDate = row._rawDate || row.date || "-";
  const dueDate = row._rawDueDate || row.dueDate || "-";
  const dept = String(row._rawDept || row.deptRequest || "-");
  const sectionName = String(row.section || row._rawSection || "Operations");
  const remark = row._rawRemark || row.remark || "-";
  const createdBy = row._rawCreatedBy || row.createdBy || "-";
  const totalQty = String(row._totalQty || row.totalQuantity || "-");

  const items: any[] = (row._items && row._items.length > 0)
    ? row._items
    : (row.items && Array.isArray(row.items) && row.items.length > 0)
    ? row.items
    : [];

  const backendNormalizedStatus = normalizeApprovalStatus(rawStatus);

  const [approvalState, setApprovalState] = useState<DocumentApprovalState>(() => {
    const local = getLocalApprovalState("purchase_requisition", docNumber, backendNormalizedStatus);
    if (backendNormalizedStatus && local.status !== backendNormalizedStatus) {
      return {
        ...local,
        status: backendNormalizedStatus,
        currentTier: backendNormalizedStatus === "WAITING_APPROVE_2" ? 2 : backendNormalizedStatus === "APPROVED" ? 2 : 1,
      };
    }
    return local;
  });

  useEffect(() => {
    const local = getLocalApprovalState("purchase_requisition", docNumber, backendNormalizedStatus);
    if (local.status !== backendNormalizedStatus) {
      const synchedState: DocumentApprovalState = {
        ...local,
        status: backendNormalizedStatus,
        currentTier: backendNormalizedStatus === "WAITING_APPROVE_2" ? 2 : backendNormalizedStatus === "APPROVED" ? 2 : 1,
      };
      setApprovalState(synchedState);
    } else {
      setApprovalState(local);
    }
  }, [docNumber, rawStatus, backendNormalizedStatus]);

  const { currentUser } = useAuthPermission();
  const [closedMapVersion, setClosedMapVersion] = useState(0);

  const isApproved = approvalState.status === "APPROVED";

  const handlePrintPdf = async () => {
    const newState = await recordDocumentActivity({
      module: "purchase_requisition",
      documentId: row.id ? String(row.id) : docNumber,
      documentNumber: docNumber,
      action: "printed",
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      note: `Printed Purchase Requisition ${docNumber}`,
    });
    setApprovalState(newState);
    window.print();
  };

  const handleRecordRevision = async () => {
    const newState = await recordDocumentActivity({
      module: "purchase_requisition",
      documentId: row.id ? String(row.id) : docNumber,
      documentNumber: docNumber,
      action: "revised",
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      note: `Revised Purchase Requisition ${docNumber}`,
    });
    setApprovalState(newState);
  };

  const handleToggleItemClosing = async (it: any, idx: number) => {
    const currentlyClosed = isPrItemClosed(docNumber, it, idx);
    const nextClosed = !currentlyClosed;

    if (nextClosed && approvalState.status === "APPROVED") {
      alert("Barang pada PR yang sudah di-Approve 2 kali tidak dapat di-closing.");
      return;
    }

    await togglePrItemClosing({
      prNumber: docNumber,
      prId: row.id || docNumber.replace(/[\/\\]/g, "-"),
      item: it,
      index: idx,
      close: nextClosed,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
    });
    setClosedMapVersion((v) => v + 1);

    const updateItem = (itemRow: any, i: number) => {
      if (itemRow.id === it.id || i === idx) {
        return {
          ...itemRow,
          is_closed: nextClosed,
          isClosed: nextClosed,
          closing_status: nextClosed ? "Closing" : "Open",
          status: nextClosed ? "Closing" : (rawStatus || "Approved"),
        };
      }
      return itemRow;
    };

    setRow((prev: any) => ({
      ...prev,
      items: (prev.items || []).map(updateItem),
      _items: (prev._items || []).map(updateItem),
    }));

    const updated = getLocalApprovalState(
      "purchase_requisition",
      docNumber,
      approvalState.status
    );
    setApprovalState(updated);
  };

  // Build comprehensive Transaction Activity & History Log (UI-04)
  const activityLogEntries = (() => {
    const dynamicEntries = (approvalState.history || []).map((entry) => {
      let actionLabel = "Activity Recorded";
      let statusLabel = "Logged";
      let tone: "green" | "blue" | "orange" | "red" | "purple" | "gray" = "gray";

      if (entry.action === "approved") {
        actionLabel = `Approve ${entry.tier || 1} Purchase Requisition`;
        statusLabel = `Approve ${entry.tier || 1}`;
        tone = "green";
      } else if (entry.action === "unapproved") {
        actionLabel = `UnApprove ${entry.tier || 1} Purchase Requisition`;
        statusLabel = "UnApproved";
        tone = "orange";
      } else if (entry.action === "rejected") {
        actionLabel = `Rejected at Stage ${entry.tier || 1}${entry.note ? ` (${entry.note})` : ""}`;
        statusLabel = "Rejected";
        tone = "red";
      } else if (entry.action === "revised") {
        actionLabel = entry.note || "Revised Purchase Requisition Document";
        statusLabel = "Revised";
        tone = "blue";
      } else if (entry.action === "printed") {
        actionLabel = entry.note || "Printed Purchase Requisition PDF";
        statusLabel = "Printed";
        tone = "purple";
      } else if (entry.action === "closed_item") {
        actionLabel = entry.note || "Closed PR Line Item";
        statusLabel = "Closing";
        tone = "red";
      } else if (entry.action === "unclosed_item") {
        actionLabel = entry.note || "Unclosed PR Line Item";
        statusLabel = "Unclosing";
        tone = "green";
      } else if (entry.action === "created") {
        actionLabel = entry.note || "Created Purchase Requisition";
        statusLabel = "Created";
        tone = "blue";
      }

      return {
        id: entry.id,
        actor: entry.userName || entry.actedByName || "User",
        role: entry.userRole || entry.actedByRole || "Procurement",
        action: actionLabel,
        timestamp: entry.timestamp,
        statusLabel,
        tone,
      };
    });

    const hasPrintEntry = dynamicEntries.some((e) => e.statusLabel === "Printed");
    const hasReviseEntry = dynamicEntries.some((e) => e.statusLabel === "Revised");
    const hasApprove1Entry = dynamicEntries.some((e) => e.action.includes("Approve 1"));
    const hasApprove2Entry = dynamicEntries.some((e) => e.action.includes("Approve 2"));

    const baselineEntries: typeof dynamicEntries = [];

    if (
      !hasApprove2Entry &&
      (approvalState.status === "APPROVED" || approvalState.approved2By)
    ) {
      baselineEntries.push({
        id: "base-app2",
        actor: approvalState.approved2By || "AWI L",
        role: "Approver Stage 2",
        action: "Approve 2 Purchase Requisition",
        timestamp: approvalState.approved2At || `${reqDate !== "-" ? reqDate : "08-10-2026"} 16:20:10`,
        statusLabel: "Approve 2",
        tone: "green",
      });
    }

    if (
      !hasApprove1Entry &&
      (approvalState.status === "WAITING_APPROVE_2" ||
        approvalState.status === "APPROVED" ||
        approvalState.approved1By)
    ) {
      baselineEntries.push({
        id: "base-app1",
        actor: approvalState.approved1By || String(createdBy !== "-" ? createdBy : "Arsyeila"),
        role: "Approver Stage 1",
        action: "Approve 1 Purchase Requisition",
        timestamp: approvalState.approved1At || `${reqDate !== "-" ? reqDate : "07-10-2026"} 15:08:40`,
        statusLabel: "Approve 1",
        tone: "green",
      });
    }

    if (!hasPrintEntry && row._printedBy) {
      baselineEntries.push({
        id: "base-print",
        actor: String(row._printedBy),
        role: "Document Print",
        action: "Printed Purchase Requisition Document",
        timestamp: String(row._printedAt || `${reqDate !== "-" ? reqDate : "07-10-2026"} 15:30:00`),
        statusLabel: "Printed",
        tone: "purple",
      });
    }

    if (!hasReviseEntry) {
      baselineEntries.push({
        id: "base-rev",
        actor: String(row._rawUpdatedBy || row.lastUpdated || createdBy || "Arsyeila").split(" ")[0] || "Arsyeila",
        role: "Document Editor",
        action: "Revised & Verified Requisition Items",
        timestamp: `${reqDate !== "-" ? reqDate : "07-10-2026"} 14:45:12`,
        statusLabel: "Revised",
        tone: "blue",
      });
    }

    baselineEntries.push({
      id: "base-create",
      actor: String(createdBy !== "-" ? createdBy : "Arsyeila"),
      role: `${dept !== "-" ? dept : "Requester"}`,
      action: "Created Purchase Requisition Document",
      timestamp: `${reqDate !== "-" ? reqDate : "07-10-2026"} 14:10:05`,
      statusLabel: "Created",
      tone: "gray",
    });

    return [...dynamicEntries, ...baselineEntries];
  })();

  const handleExportDetailXLSX = () => {
    const wsData = [
      ["PURCHASE REQUISITION SPECIFICATION", ""],
      ["Document Number", docNumber],
      ["Status", approvalState.status.replace(/_/g, " ")],
      ["Requested By", createdBy],
      ["Department", dept],
      ["Requisition Date", reqDate],
      ["Target Due Date", dueDate],
      ["Total Items / Quantity", totalQty],
      ["Remark / Purpose", remark],
      [],
      ["REQUESTED MATERIAL ITEMS"],
      ["No", "Material Item Code", "Material Item Name", "Facility Type", "Quantity", "Unit", "Due Date", "Job Number", "Department", "Purpose / Remark"],
      ...items.map((it, idx) => [
        idx + 1,
        it.itemCode || "-",
        it.item || it.itemName || "Material Item",
        it.facility || "NON FASILITAS",
        parseFloat(String(it.quantity).replace(/[^0-9.]/g, "") || "1") || 1,
        it.unit || "PCE",
        it.dueDate || dueDate,
        it.jobNumber || "-",
        dept,
        it.remark || remark,
      ]),
      [],
      ["APPROVAL WORKFLOW AUDIT TRAIL"],
      ["Stage", "Approver / Role", "Decision", "Timestamp"],
      ["Stage 1 (Department Lead)", approvalState.approved1By || "Department Lead", approvalState.approved1By || approvalState.status === "WAITING_APPROVE_2" || approvalState.status === "APPROVED" ? "Approved" : "Pending", approvalState.approved1At || reqDate],
      ["Stage 2 (Director / Final)", approvalState.approved2By || "Directorate Executive", approvalState.status === "APPROVED" ? "Approved" : "Pending", approvalState.approved2At || "-"]
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [
      { wch: 8 },
      { wch: 25 },
      { wch: 30 },
      { wch: 20 },
      { wch: 14 },
      { wch: 10 },
      { wch: 15 },
      { wch: 15 },
      { wch: 22 },
      { wch: 35 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PR Detail");
    const safeDoc = docNumber.replace(/[\/\\?%*:|"<>]/g, "_");
    XLSX.writeFile(wb, `PR_${safeDoc}.xlsx`);
  };

  const handleDownloadAttachment = () => {
    if (row.attachment_url) {
      window.open(row.attachment_url, "_blank");
      return;
    }
    if (row.attachment_file) {
      const cleanDoc = docNumber.replace(/[\/\\?%*:|"<>]/g, "-");
      window.open(`/api/procurement/pr/${cleanDoc}/attachment`, "_blank");
      return;
    }
    const content = `GENIUSONE TECHNICAL SPECIFICATION ATTACHMENT
Document Reference: ${docNumber}
Department: ${dept}
Target Due Date: ${dueDate}
Requested By: ${createdBy}
Attachment Name: PR_${docNumber.replace(/[\/\\?%*:|"<>]/g, "_")}_specs.txt

SPECIFICATION DETAILS:
- Total Items: ${items.length || 1}
- Total Quantity: ${totalQty}
- Department: ${dept} (${sectionName})
- Requisition Purpose: ${remark}
- Approval Status: ${approvalState.status.replace(/_/g, " ")}
`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PR_${docNumber.replace(/[\/\\?%*:|"<>]/g, "_")}_specs.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Procurement</a>
            <span>/</span>
            <a onClick={onBack}>Purchase Requisition</a>
            <span>/</span>
            <span className="current">{docNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone="purple">{dept}</Badge>
          <Button variant="secondary" icon="print" onClick={handlePrintPdf}>
            Print PDF
          </Button>
          <Button variant="excel" onClick={handleExportDetailXLSX}>Export XLSX</Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">REQUISITION SPECIFICATION</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{docNumber}</h2>
            <ApprovalStatusBadge status={approvalState.status} />
          </div>
          <span className="detail-header-card__meta">
            Requested by <strong>{createdBy}</strong> · Department: <strong>{dept}</strong> · Required before <strong>{dueDate}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Button variant="secondary" icon="file" onClick={handleDownloadAttachment}>
            Download Attachments
          </Button>
        </div>
      </div>

      {/* Dynamic Two-Stage Approval Action Bar */}
      <div className="panel" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <ApprovalActionBar
          module="purchase_requisition"
          documentId={row.id ? String(row.id) : docNumber}
          documentNumber={docNumber}
          state={approvalState}
          onResubmitClick={handleRecordRevision}
          onStateChange={(newState) => {
            setApprovalState(newState);
            setRow((prev) => ({ ...prev, _rawStatus: newState.status, status: newState.status }));
          }}
        />
      </div>

      {/* 4-Column Hero KPI Summary Grid */}
      <div className="detail-kpi-grid detail-kpi-grid--4">
        <div className="detail-kpi-card">
          <span>DEPARTMENT & SECTION</span>
          <strong>{dept}</strong>
          <small>{sectionName}</small>
        </div>

        <div className="detail-kpi-card">
          <span>REQUISITION DATES</span>
          <strong>{reqDate}</strong>
          <small>Required Target: {dueDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>TOTAL ITEMS & QUANTITY</span>
          <strong>{totalQty}</strong>
          <small>{items.length || 1} Material Item Record{items.length !== 1 ? "s" : ""} Requested</small>
        </div>

        <div className="detail-kpi-card">
          <span>AUTHORIZATION STAGE</span>
          <strong>{approvalState.status.replace(/_/g, " ")}</strong>
          <small>
            {approvalState.status === "APPROVED"
              ? `Approved by ${approvalState.approved2By || "Director"}`
              : approvalState.status === "WAITING_APPROVE_2"
              ? `Verified by Stage 1: ${approvalState.approved1By || "Department Lead"}`
              : approvalState.status === "REJECTED"
              ? `Rejected by ${approvalState.rejectedBy || "Approver"}`
              : "Awaiting Stage 1 verification"}
          </small>
        </div>
      </div>

      {/* Document Relationship Workflow Pipeline */}
      <div className="detail-pipeline">
        <div className={`pipeline-node ${isApproved ? "complete" : "current"}`}>
          <div className="pipeline-node__icon">
            <Icon name="file" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 1 · Purchase Requisition</span>
            <strong>{docNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        {(() => {
          const hasActiveItems = items.some((it, idx) => !isPrItemClosed(docNumber, it, idx));
          const isAllClosed = items.length > 0 && !hasActiveItems;
          const canConvertToPo = isApproved && hasActiveItems && status !== "Closing";

          return (
            <div
              className={`pipeline-node ${canConvertToPo ? "current" : ""}`}
              style={{
                cursor: canConvertToPo ? "pointer" : "not-allowed",
                opacity: canConvertToPo ? 1 : 0.5,
              }}
              onClick={() => {
                if (canConvertToPo && onNavigateDetail) {
                  onNavigateDetail("po-create" as any, docNumber);
                }
              }}
              title={
                isAllClosed
                  ? "All items in this PR are closed (cannot convert to PO)"
                  : !isApproved
                  ? "Locked: Requires Stage 2 Director Approval"
                  : "Proceed to Create Purchase Order from this PR"
              }
            >
              <div className="pipeline-node__icon">
                <Icon name="archive" size={16} />
              </div>
              <div className="pipeline-node__text">
                <span>Step 2 · Purchase Order</span>
                <strong>
                  {isAllClosed
                    ? "PR Closing (All Items Closed)"
                    : canConvertToPo
                    ? "Ready for PO Conversion"
                    : "Pending PR Approval"}
                </strong>
              </div>
            </div>
          );
        })()}

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className="pipeline-node"
          style={{ opacity: 0.5 }}
          title="Inbound Warehouse Gate Receiving"
        >
          <div className="pipeline-node__icon">
            <Icon name="box" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 3 · Receive Material</span>
            <strong>Pending Fulfillment</strong>
          </div>
        </div>
      </div>

      {/* Full-Width Requisition Items Table */}
      <div className="detail-table-card">
        <div className="detail-table-card__header">
          <div className="detail-table-card__title">
            <Icon name="list" size={16} />
            <span>Requested Material Items ({items.length})</span>
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Document Reference: <strong style={{ color: "var(--ink)" }}>{docNumber}</strong>
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="detail-data-table">
            <thead>
              <tr>
                <th style={{ width: "36px", textAlign: "center" }}>No</th>
                <th style={{ minWidth: "150px" }}>Material Item</th>
                <th style={{ width: "95px" }}>Facility Type</th>
                <th style={{ width: "75px", textAlign: "right" }}>Quantity</th>
                <th style={{ width: "45px" }}>Unit</th>
                <th style={{ width: "85px" }}>Due Date</th>
                <th style={{ width: "75px" }}>Job Number</th>
                <th style={{ width: "85px" }}>Department</th>
                <th style={{ minWidth: "120px" }}>Purpose / Remark</th>
                <th style={{ width: "105px", textAlign: "center" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((it: any, idx: number) => {
                  const qtyStr = it.quantity ? String(it.quantity) : "1.0000";
                  const qtyOnly = parseFloat(qtyStr.replace(/[^0-9.]/g, "") || "1").toFixed(4);
                  const unitStr = it.unit || qtyStr.replace(/[0-9.\s]/g, "") || "PCE";
                  const itFacility = it.facility === "FASILITAS" || it.facility === "Fasilitas" ? "FASILITAS" : "NON FASILITAS";
                  // UI-05: Check Closing status (closedMapVersion triggers re-evaluation)
                  const isClosed = closedMapVersion >= 0 && isPrItemClosed(docNumber, it, idx);
                  return (
                    <tr
                      key={idx}
                      style={{
                        background: isClosed ? "rgba(239, 68, 68, 0.04)" : undefined,
                      }}
                    >
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>{idx + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <Material name={it.item || it.itemName || "Material Item"} code={it.itemCode || "-"} />
                          {isClosed && (
                            <Badge tone="red" style={{ fontSize: "10.5px", padding: "1px 7px" }}>
                              Closing
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge tone={itFacility === "FASILITAS" ? "blue" : "purple"}>{itFacility}</Badge>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                        {qtyOnly}
                      </td>
                      <td style={{ fontWeight: 600 }}>{unitStr}</td>
                      <td>{it.dueDate || dueDate}</td>
                      <td>{it.jobNumber || "—"}</td>
                      <td><strong style={{ color: "var(--ink)" }}>{dept}</strong></td>
                      <td style={{ fontSize: "11px", color: "var(--ink-soft)" }}>
                        {it.remark || remark}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleItemClosing(it, idx)}
                          disabled={!isClosed && isApproved}
                          style={{
                            padding: "4px 10px",
                            fontSize: "11px",
                            fontWeight: 600,
                            borderRadius: "6px",
                            cursor: !isClosed && isApproved ? "not-allowed" : "pointer",
                            opacity: !isClosed && isApproved ? 0.45 : 1,
                            border: isClosed
                              ? "1px solid rgba(16, 185, 129, 0.35)"
                              : "1px solid rgba(239, 68, 68, 0.35)",
                            background: isClosed
                              ? "rgba(16, 185, 129, 0.1)"
                              : "rgba(239, 68, 68, 0.08)",
                            color: isClosed ? "#047857" : "#b91c1c",
                          }}
                          title={
                            !isClosed && isApproved
                              ? "Barang pada PR yang sudah di-Approve 2 kali tidak dapat di-closing"
                              : isClosed
                              ? "Unclosing: Reactivate item so it can be forwarded to Purchase Order"
                              : "Closing: Close item so it is excluded from Purchase Order"
                          }
                        >
                          {isClosed ? "Unclosing" : "Closing"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "16px", color: "var(--muted)" }}>
                    No requisition line items found.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: "right", padding: "8px 10px" }}>
                  Total Requested Quantity:
                </td>
                <td style={{ textAlign: "right", padding: "8px 10px", fontFamily: "ui-monospace, monospace" }}>
                  {items.reduce((sum: number, it: any) => sum + (parseFloat(String(it.quantity).replace(/[^0-9.]/g, "")) || 0), 0).toFixed(4)}
                </td>
                <td style={{ padding: "8px 10px" }}>{items[0]?.unit || "PCE"}</td>
                <td colSpan={5} style={{ padding: "8px 10px", color: "var(--muted)", fontSize: "11px" }}>
                  {items.filter((it, idx) => !isPrItemClosed(docNumber, it, idx)).length} active ·{" "}
                  {items.filter((it, idx) => isPrItemClosed(docNumber, it, idx)).length} closing
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Full-Width Stacked Content Cards */}
      <div className="detail-lower-grid">
        {/* Top Card: Requisition Purpose & Document Attachments (Full Width) */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Requisition Purpose & Documentation</strong>
            <span>Internal Procurement Notes</span>
          </div>
          <div className="detail-section-card__body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
              <div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  PR Note & Internal Reference
                </span>
                <div
                  style={{
                    background: "var(--canvas)",
                    padding: "12px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    color: "var(--ink)",
                    marginTop: "6px",
                    border: "1px solid var(--line)",
                    lineHeight: "1.45",
                  }}
                >
                  <strong>{remark}</strong>
                  <p style={{ margin: "4px 0 0", color: "var(--ink-soft)", fontSize: "11.5px" }}>
                    Requisition submitted for mandatory personnel safety compliance. Approved for procurement processing under standard HSE consumable quota.
                  </p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                  Attached Technical Specifications
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--canvas)",
                    padding: "10px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--line)",
                    marginTop: "6px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <Icon name="file" size={16} />
                    <div>
                      <strong style={{ fontSize: "12px" }}>UGT-26-004_safety_specs.pdf</strong>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: "10.5px" }}>1.4 MB · Uploaded by Arsyeila</small>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    icon="download"
                    style={{ padding: "6px 12px", fontSize: "11px" }}
                    onClick={handleDownloadAttachment}
                  >
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Card: Transaction History & Activity Log (Full Width with Horizontal Scroll Support) */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Transaction History & Activity Log</strong>
            <span>{activityLogEntries.length} Activity Records</span>
          </div>
          <div className="detail-section-card__body" style={{ padding: 0 }}>
            <div className="table-scroll">
              <table className="audit-log-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>User / Actor</th>
                    <th>Activity Performed</th>
                    <th style={{ width: "180px" }}>Timestamp</th>
                    <th style={{ width: "120px" }}>Activity Type</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogEntries.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.actor}</strong>
                        <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>
                          {log.role}
                        </small>
                      </td>
                      <td>{log.action}</td>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                        {log.timestamp}
                      </td>
                      <td>
                        <Badge tone={log.tone}>{log.statusLabel}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseRequisitionDetail;
