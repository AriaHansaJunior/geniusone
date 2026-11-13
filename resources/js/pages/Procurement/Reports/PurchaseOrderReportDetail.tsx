import { useEffect, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Material } from "../../../components/common/CommonCells";
import { docToSlug } from "../../../utils/docSlug";
import { fetchDetail } from "../../../data/api";
import type { TableRow } from "../../../types";

interface PurchaseOrderReportDetailProps {
  code: string;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function PurchaseOrderReportDetail({
  code,
  onBack,
  onNavigateDetail,
}: PurchaseOrderReportDetailProps) {
  const [row, setRow] = useState<TableRow>({} as TableRow);

  useEffect(() => {
    let isMounted = true;
    fetchDetail("report", code).then((item) => {
      if (isMounted && item) {
        setRow(item);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [code]);

  const prNumber = String(row._rawPr || "—");
  const poNumber = String(row._rawPo || "—");
  const bpbNumber = String(row._rawBpbNumber || "—");
  const supplier = String(row._rawSupplier || "—");
  const dept = String(row._rawDeptRequest || "—");
  const section = String(row._rawSection || "—");
  const statusPr = String(row._rawStatusPr || "—");
  const statusPo = String(row._rawStatusPo || "—");
  const facility = String(row._rawFacility || "—");
  const currency = String(row._rawCurrency || "—");
  const subTotal = String(row._rawSubTotal || "—");
  const price = String(row._rawPrice || "—");
  const ppn = String(row._rawTotalPpn || "—");
  const pph = String(row._rawTotalPph || "—");
  const qtyPr = String(row._rawQtyPr || "—");
  const qtyPo = String(row._rawQtyPo || "—");
  const qtyBpb = String(row._rawQtyBpb || "—");
  const outstandingPp = String(row._rawOutstandingPp || "—");
  const bcType = String(row._rawBc || "—");
  const ajuNumber = String(row._rawAju || "—");
  const dnNumber = String(row._rawSj || "—");
  const description = String(row._rawDescription || "—");
  const materialName = String(row._rawMaterialName || "—");
  const materialCode = String(row._rawMaterialCode || "—");

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Reporting</a>
            <span>/</span>
            <a onClick={onBack}>Combined PR–PO Report</a>
            <span>/</span>
            <span className="current">{poNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone="blue">PO: {statusPo}</Badge>
          <Badge tone="green">PR: {statusPr}</Badge>
          <Badge tone="purple">{facility}</Badge>
          <Button variant="secondary" icon="print">
            Print PDF
          </Button>
          <Button variant="excel">Export XLSX</Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">CROSS-DOCUMENT AUDIT & TRACEABILITY</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{poNumber}</h2>
            <Badge tone="blue">✓ {statusPo}</Badge>
            <Badge tone="purple">{facility}</Badge>
          </div>
          <span className="detail-header-card__meta">
            Supplier: <strong>{supplier}</strong> · Requesting Dept: <strong>{dept} ({section})</strong> · PR Ref: <strong>{prNumber}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" icon="file">
            Trace Full Chain
          </Button>
        </div>
      </div>

      {/* 6-Column Summary KPI Grid */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-card">
          <span>PR DOCUMENT</span>
          <strong>{prNumber}</strong>
          <small>Req: {String(row._rawDate || "01-10-2026")} · {dept}</small>
        </div>

        <div className="detail-kpi-card">
          <span>PO DOCUMENT</span>
          <strong>{poNumber}</strong>
          <small>Order Date: {String(row._rawDate || "08-10-2026")}</small>
        </div>

        <div className="detail-kpi-card">
          <span>BPB WAREHOUSE RECEIPT</span>
          <strong>{bpbNumber}</strong>
          <small>Received: {qtyBpb} · Status: Verified</small>
        </div>

        <div className="detail-kpi-card">
          <span>SUPPLIER & ENTITY</span>
          <strong>{supplier}</strong>
          <small>Direct Corporate Supplier</small>
        </div>

        <div className="detail-kpi-card">
          <span>QUANTITIES & FULFILLMENT</span>
          <strong>{qtyPo} PO / {qtyBpb} BPB</strong>
          <small>Outstanding PP: {outstandingPp}</small>
        </div>

        <div className="detail-kpi-card">
          <span>FINANCIAL RECAP</span>
          <strong>IDR {subTotal}</strong>
          <small>VAT PPn: IDR {ppn}</small>
        </div>
      </div>

      {/* Document Relationship Workflow Pipeline */}
      <div className="detail-pipeline">
        <div
          className="pipeline-node active"
          style={{ cursor: "pointer" }}
          onClick={() => onNavigateDetail && onNavigateDetail("pr", docToSlug(prNumber))}
        >
          <div className="pipeline-node__icon">
            <Icon name="file" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Requisition · PR</span>
            <strong>{prNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className="pipeline-node current"
          style={{ cursor: "pointer" }}
          onClick={() => onNavigateDetail && onNavigateDetail("po", docToSlug(poNumber))}
        >
          <div className="pipeline-node__icon">
            <Icon name="archive" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Purchase Order · PO</span>
            <strong>{poNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className="pipeline-node active"
          style={{ cursor: "pointer" }}
          onClick={() => onNavigateDetail && onNavigateDetail("warehouse", docToSlug(bpbNumber))}
        >
          <div className="pipeline-node__icon">
            <Icon name="box" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Warehouse BPB · RN</span>
            <strong>{bpbNumber}</strong>
          </div>
        </div>
      </div>

      {/* Full-Width Comprehensive Tracking Table */}
      <div className="detail-table-card">
        <div className="detail-table-card__header">
          <div className="detail-table-card__title">
            <Icon name="layers" size={16} />
            <span>Document Line Item Cross-Match</span>
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Linked Records: <strong>PR → PO → BPB</strong>
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="detail-data-table">
            <thead>
              <tr>
                <th style={{ width: "36px", textAlign: "center" }}>No</th>
                <th style={{ minWidth: "150px" }}>Material Name & Code</th>
                <th style={{ width: "85px" }}>Dept / Section</th>
                <th style={{ width: "65px", textAlign: "right" }}>Qty PR</th>
                <th style={{ width: "65px", textAlign: "right" }}>Qty PO</th>
                <th style={{ width: "65px", textAlign: "right" }}>Qty BPB</th>
                <th style={{ width: "70px", textAlign: "right" }}>Outst. PP</th>
                <th style={{ width: "80px", textAlign: "right" }}>Unit Price</th>
                <th style={{ width: "80px", textAlign: "right" }}>Total PPn</th>
                <th style={{ width: "75px", textAlign: "right" }}>Total PPh</th>
                <th style={{ width: "90px", textAlign: "right" }}>Sub Total</th>
                <th style={{ width: "70px" }}>Customs</th>
                <th style={{ minWidth: "100px" }}>Delivery Note (SJ)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>1</td>
                <td>
                  <Material name={materialName} code={materialCode} />
                </td>
                <td>
                  <strong style={{ color: "var(--ink)" }}>{dept}</strong>
                  <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>{section}</small>
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>{qtyPr}</td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>{qtyPo}</td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--blue-600)" }}>
                  {qtyBpb}
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--green-600)", fontWeight: 700 }}>
                  {outstandingPp}
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                  IDR {price}
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                  IDR {ppn}
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                  IDR {pph}
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink)" }}>
                  IDR {subTotal}
                </td>
                <td>
                  <Badge tone="cyan">{bcType}</Badge>
                </td>
                <td style={{ fontSize: "11px", fontFamily: "ui-monospace, monospace" }}>
                  {dnNumber}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td colSpan={3} style={{ textAlign: "right", padding: "12px 14px" }}>
                  Fulfillment Total:
                </td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>{qtyPr}</td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>{qtyPo}</td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>{qtyBpb}</td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>{outstandingPp}</td>
                <td colSpan={3} style={{ textAlign: "right", padding: "12px 14px" }}>Grand Total:</td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>IDR {subTotal}</td>
                <td colSpan={2} style={{ padding: "12px 14px", color: "var(--green-600)", fontSize: "11px" }}>
                  ✓ 100% Fulfilled
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Two-Column Lower Content Grid */}
      <div className="detail-lower-grid">
        {/* Left Card: Customs & Logistics Documentation */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Customs & Logistics Compliance</strong>
            <span>Taxation & Delivery References</span>
          </div>
          <div className="detail-section-card__body">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div style={{ background: "var(--canvas)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Aju Number</span>
                <strong style={{ display: "block", fontSize: "11.5px", marginTop: "3px", wordBreak: "break-all" }}>{ajuNumber}</strong>
              </div>
              <div style={{ background: "var(--canvas)", padding: "12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Customs Type (BC)</span>
                <strong style={{ display: "block", fontSize: "12px", marginTop: "3px" }}>{bcType}</strong>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Item Description / Purpose
              </span>
              <div
                style={{
                  background: "var(--white)",
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: "var(--ink)",
                  marginTop: "6px",
                  border: "1px solid var(--line)",
                  lineHeight: "1.45",
                }}
              >
                {description}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Card: Lifecycle Milestones (Full Width with Horizontal Scroll Support) */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Document Lifecycle Milestones</strong>
            <span>Authorization & Receipt Verification</span>
          </div>
          <div className="detail-section-card__body" style={{ padding: 0 }}>
            <div className="table-scroll">
              <table className="audit-log-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>Milestone</th>
                    <th>Reference</th>
                    <th style={{ width: "160px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>PR Approved</strong>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Requisition authorized</small>
                    </td>
                    <td>{prNumber}</td>
                    <td><Badge tone="green">✓ Completed</Badge></td>
                  </tr>
                  <tr>
                    <td>
                      <strong>PO Authorized</strong>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Approve 2 completed</small>
                    </td>
                    <td>{poNumber}</td>
                    <td><Badge tone="blue">✓ Approved</Badge></td>
                  </tr>
                  <tr>
                    <td>
                      <strong>BPB Verified</strong>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Stock receipt recorded</small>
                    </td>
                    <td>{bpbNumber}</td>
                    <td><Badge tone="green">✓ Received</Badge></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrderReportDetail;
