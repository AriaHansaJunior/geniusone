import { useMemo } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Material } from "../components/common/CommonCells";
import { prRows, findRowBySlug, docToSlug } from "../data/mockData";
import type { TableRow } from "../types";

interface PurchaseRequestDetailProps {
  code: string;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function PurchaseRequestDetail({
  code,
  onBack,
  onNavigateDetail,
}: PurchaseRequestDetailProps) {
  const row: TableRow = useMemo(() => {
    return findRowBySlug(prRows, code) || prRows[0];
  }, [code]);

  const docNumber = row._rawNumber || "0026/PR-IMLI/X/2026";
  const status = row._rawStatus || "Approved 1";
  const reqDate = row._rawDate || "07-Oct-2026";
  const dueDate = row._rawDueDate || "21-Oct-2026";
  const dept = String(row._rawDept || "HSE");
  const remark = row._rawRemark || "PP Sby (UGT-26-004)";
  const createdBy = row._rawCreatedBy || "Arsyeila 07-10-2026 15:08";
  const totalQty = String(row._totalQty || "15.0000 PCE");

  const badgeTone =
    status === "Approved 1" || status === "Approved"
      ? "green"
      : status === "Approved 2"
      ? "blue"
      : "gray";

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <button type="button" className="btn-back-pill" onClick={onBack}>
            <Icon name="arrowLeft" size={14} />
            <span>Back to Purchase Requests</span>
          </button>
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Procurement</a>
            <span>/</span>
            <a onClick={onBack}>Purchase Request</a>
            <span>/</span>
            <span className="current">{docNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone={badgeTone}>✓ {status}</Badge>
          <Badge tone="purple">{dept}</Badge>
          <Button variant="secondary" icon="print">
            Print PDF
          </Button>
          <Button icon="download">Export XLSX</Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">REQUISITION SPECIFICATION</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{docNumber}</h2>
            <Badge tone={badgeTone}>✓ {status}</Badge>
          </div>
          <span className="detail-header-card__meta">
            Requested by <strong>{createdBy}</strong> · Department: <strong>{dept}</strong> · Required before <strong>{dueDate}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" icon="file">
            Download Attachments
          </Button>
        </div>
      </div>

      {/* 4-Column Hero KPI Summary Grid */}
      <div className="detail-kpi-grid detail-kpi-grid--4">
        <div className="detail-kpi-card">
          <span>DEPARTMENT & SECTION</span>
          <strong>{dept}</strong>
          <small>Section 2 Operations · Production Support</small>
        </div>

        <div className="detail-kpi-card">
          <span>REQUISITION DATES</span>
          <strong>{reqDate}</strong>
          <small>Required Target: {dueDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>TOTAL ITEMS & QUANTITY</span>
          <strong>{totalQty}</strong>
          <small>1 Material Item Record Requested</small>
        </div>

        <div className="detail-kpi-card">
          <span>AUTHORIZATION STAGE</span>
          <strong>{status}</strong>
          <small>Verified by Section Head: Arsyeila</small>
        </div>
      </div>

      {/* Document Relationship Workflow Pipeline */}
      <div className="detail-pipeline">
        <div className="pipeline-node current">
          <div className="pipeline-node__icon">
            <Icon name="file" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 1 · Purchase Request</span>
            <strong>{docNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className="pipeline-node"
          style={{ cursor: "pointer" }}
          onClick={() => onNavigateDetail && onNavigateDetail("po", "POL-1026-0040")}
        >
          <div className="pipeline-node__icon">
            <Icon name="archive" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 2 · Purchase Order</span>
            <strong>POL-1026-0040</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className="pipeline-node"
          style={{ cursor: "pointer" }}
          onClick={() => onNavigateDetail && onNavigateDetail("warehouse", "0138-WHIN-IMLI-G-X-2026")}
        >
          <div className="pipeline-node__icon">
            <Icon name="box" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 3 · Receive Material</span>
            <strong>0138/WHIN-IMLI/G/X/2026</strong>
          </div>
        </div>
      </div>

      {/* Full-Width Requisition Items Table */}
      <div className="detail-table-card">
        <div className="detail-table-card__header">
          <div className="detail-table-card__title">
            <Icon name="list" size={16} />
            <span>Requested Material Items (1)</span>
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Document Reference: <strong style={{ color: "var(--ink)" }}>{docNumber}</strong>
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="detail-data-table">
            <thead>
              <tr>
                <th style={{ width: "45px", textAlign: "center" }}>No</th>
                <th style={{ minWidth: "260px" }}>Material Item</th>
                <th style={{ width: "130px" }}>Facility Type</th>
                <th style={{ width: "120px", textAlign: "right" }}>Quantity</th>
                <th style={{ width: "80px" }}>Unit</th>
                <th style={{ width: "120px" }}>Due Date</th>
                <th style={{ width: "110px" }}>Job Number</th>
                <th style={{ width: "120px" }}>Department</th>
                <th style={{ minWidth: "240px" }}>Purpose / Remark</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>1</td>
                <td>
                  <Material name="Safety Body Harness" code="80.500.003.200" />
                </td>
                <td>
                  <Badge tone="purple">NON FASILITAS</Badge>
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                  15.0000
                </td>
                <td style={{ fontWeight: 600 }}>PCE</td>
                <td>{dueDate}</td>
                <td>—</td>
                <td><strong style={{ color: "var(--ink)" }}>{dept}</strong> (Sec 2)</td>
                <td style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                  U/APD Kry MTC dan Furnace
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: "right", padding: "12px 14px" }}>
                  Total Requested Quantity:
                </td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>
                  15.0000
                </td>
                <td style={{ padding: "12px 14px" }}>PCE</td>
                <td colSpan={4} style={{ padding: "12px 14px", color: "var(--muted)", fontSize: "11px" }}>
                  Complete single requisition item line
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
                <Button variant="ghost" icon="download" style={{ padding: "6px 12px", fontSize: "11px" }}>
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
                  <td>Approve 1 Purchase Request</td>
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

export default PurchaseRequestDetail;
