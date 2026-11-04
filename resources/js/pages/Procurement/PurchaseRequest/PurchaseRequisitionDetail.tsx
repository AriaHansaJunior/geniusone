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
import { getLocalApprovalState } from "../../../services/approvalApi";
import { normalizeApprovalStatus, type DocumentApprovalState } from "../../../types/approval";

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

  const isApproved = approvalState.status === "APPROVED";

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
          <button type="button" className="btn-back-pill" onClick={onBack}>
            <span>Back to Purchase Requisitions</span>
          </button>
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Procurement</a>
            <span>/</span>
            <a onClick={onBack}>Purchase Requisition</a>
            <span>/</span>
            <span className="current">{docNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <ApprovalStatusBadge status={approvalState.status} />
          <Badge tone="purple">{dept}</Badge>
          <Button variant="secondary" icon="print" onClick={() => window.print()}>
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
          {isApproved ? (
            <Badge tone="green" style={{ padding: "6px 12px", fontSize: "12px", fontWeight: 700 }}>
              <Icon name="lock" size={13} style={{ marginRight: "4px" }} /> Document Locked
            </Badge>
          ) : null}
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
          onStateChange={(newState) => {
            setApprovalState(newState);
            setRow((prev) => ({ ...prev, _rawStatus: newState.status, status: newState.status }));
          }}
        />
      </div>

      {/* Visual Two-Stage Approval Timeline */}
      <ApprovalTimeline state={approvalState} style={{ marginBottom: "16px" }} />

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

        <div
          className={`pipeline-node ${isApproved ? "current" : ""}`}
          style={{ cursor: isApproved ? "pointer" : "default", opacity: isApproved ? 1 : 0.6 }}
          onClick={() => isApproved && onNavigateDetail && onNavigateDetail("po-create" as any, docNumber)}
          title={isApproved ? "Proceed to Create Purchase Order from this PR" : "Locked: Requires Stage 2 Director Approval"}
        >
          <div className="pipeline-node__icon">
            <Icon name="archive" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 2 · Purchase Order</span>
            <strong>{isApproved ? "Ready for PO Conversion" : "Pending PR Approval"}</strong>
          </div>
        </div>

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
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((it: any, idx: number) => {
                  const qtyStr = it.quantity ? String(it.quantity) : "1.0000";
                  const qtyOnly = parseFloat(qtyStr.replace(/[^0-9.]/g, "") || "1").toFixed(4);
                  const unitStr = it.unit || qtyStr.replace(/[0-9.\s]/g, "") || "PCE";
                  const itFacility = it.facility === "FASILITAS" || it.facility === "Fasilitas" ? "FASILITAS" : "NON FASILITAS";
                  return (
                    <tr key={idx}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>{idx + 1}</td>
                      <td>
                        <Material name={it.item || it.itemName || "Material Item"} code={it.itemCode || "-"} />
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "16px", color: "var(--muted)" }}>
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
                <td colSpan={4} style={{ padding: "8px 10px", color: "var(--muted)", fontSize: "11px" }}>
                  {items.length} requisition item line{items.length !== 1 ? "s" : ""}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Two-Column Lower Content Grid */}
      <div className="detail-lower-grid">
        {/* Left Card: Requisition Purpose & Document Attachments */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Requisition Purpose & Documentation</strong>
            <span>Internal Procurement Notes</span>
          </div>
          <div className="detail-section-card__body">
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

        {/* Right Card: Approval Hierarchy & Verification Log */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Approval Hierarchy & Audit Log</strong>
            <span>3 Activity Records</span>
          </div>
          <div className="detail-section-card__body" style={{ padding: 0 }}>
            <table className="audit-log-table">
              <thead>
                <tr>
                  <th style={{ width: "120px" }}>Actor / User</th>
                  <th>Action Taken</th>
                  <th style={{ width: "160px" }}>Timestamp</th>
                  <th style={{ width: "95px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Arsyeila</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>HSE Department</small>
                  </td>
                  <td>Approve 1 Purchase Requisition</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    07-10-2026 15:08:40
                  </td>
                  <td>
                    <Badge tone="green">✓ Approved</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Arsyeila</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Requester</small>
                  </td>
                  <td>Submitted Requisition Draft</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    07-10-2026 15:08:39
                  </td>
                  <td>
                    <Badge tone="blue">✓ Submitted</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>System</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Automation Engine</small>
                  </td>
                  <td>Document Number Assigned</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    07-10-2026 15:08:38
                  </td>
                  <td>
                    <Badge tone="gray">Completed</Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseRequisitionDetail;
