import { useMemo } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Material } from "../components/common/CommonCells";
import { warehouseRows, findRowBySlug, docToSlug } from "../data/mockData";
import type { TableRow } from "../types";

interface WarehouseDetailProps {
  code: string;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function WarehouseDetail({
  code,
  onBack,
  onNavigateDetail,
}: WarehouseDetailProps) {
  const row: TableRow = useMemo(() => {
    return findRowBySlug(warehouseRows, code) || warehouseRows[0];
  }, [code]);

  const docNumber = String(row._rawNumber || "0138/WHIN-IMLI/G/X/2026");
  const rnNumber = String(row._rawRn || "0131/RN-IMLI/X/2026");
  const poNumber = String(row._rawPo || "POL-0926-0332");
  const prNumber = String(row._rawPr || "0085/PR-IMLI/IX/2026");
  const supplierName = String(row._rawSupplier || "PT. Hasil Fastindo");
  const status = String(row._rawStatus || "Ready");
  const receiveDate = String(row._rawDate || "08-10-2026");
  const rnDate = String(row._rawRnDate || "08-10-2026");
  const sjNumber = String(row._rawSj || "SRA/H2/2610/00262");
  const ajuNumber = String(row._rawAju || "00004001456220261008004282");
  const plateNo = String(row._rawPlateNo || "L 8372 VQ");
  const noPen = String(row._rawNoPen || "088370");
  const bcType = String(row._rawBc || "BC 4.0");
  const bpbType = String(row._rawBpbType || "Gudang");
  const location = String(row._rawWarehouseLocation || "Gudang Sparepart");
  const totalQty = String(row._rawTotalQty || "25.00");
  const totalItem = String(row._rawTotalItem || "1");
  const createdBy = String(row._rawCreatedBy || "MUKHANIFAH");
  const createdAt = String(row._rawCreatedAt || "08-10-2026 15:50:49");
  const remark = String(row._rawRemark || "U/ Periodic Maintenance : Tutup motor 11 kw; 18,5 kw");
  const materialName = String(row._rawMaterialName || "Mur Baut M 10 x 40 + ring pir");
  const materialCode = String(row._rawMaterialCode || "60.149.301.404");

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <button type="button" className="btn-back-pill" onClick={onBack}>
            <Icon name="arrowLeft" size={14} />
            <span>Back to Receive Material</span>
          </button>
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Warehouse</a>
            <span>/</span>
            <a onClick={onBack}>Receive Material</a>
            <span>/</span>
            <span className="current">{docNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone="orange">✓ {status}</Badge>
          <Badge tone="cyan">{bcType}</Badge>
          <Badge tone="blue">No Pen: {noPen}</Badge>
          <Badge tone="purple">{location}</Badge>
          <Button variant="secondary" icon="print">
            Print PDF
          </Button>
          <Button icon="download">Export XLSX</Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">INVENTORY RECEIVING RECORD</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{docNumber}</h2>
            <Badge tone="orange">✓ {status}</Badge>
            <Badge tone="purple">{bpbType}</Badge>
          </div>
          <span className="detail-header-card__meta">
            Supplier: <strong>{supplierName}</strong> · Receipt: <strong>{rnNumber}</strong> · Receive Date: <strong>{receiveDate}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" icon="file">
            Download Delivery Note
          </Button>
        </div>
      </div>

      {/* 6-Column Logistics & Customs Grid */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-card">
          <span>MUTATION / RECEIVE NO.</span>
          <strong>{docNumber}</strong>
          <small>Receive Date: {receiveDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>RECEIPT / RN NO.</span>
          <strong>{rnNumber}</strong>
          <small>RN Date: {rnDate} · DN: {sjNumber}</small>
        </div>

        <div className="detail-kpi-card">
          <span>AJU NUMBER & BARCODE</span>
          <strong style={{ fontSize: "11px", wordBreak: "break-all" }}>{ajuNumber}</strong>
          <small>Customs Filing: {receiveDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>VEHICLE & REGISTRATION</span>
          <strong>Plate: {plateNo}</strong>
          <small>No Pen: {noPen} ({receiveDate})</small>
        </div>

        <div className="detail-kpi-card">
          <span>SUPPLIER & CUSTOMS</span>
          <strong>{supplierName}</strong>
          <small>Type: {bcType} · Loc: {location}</small>
        </div>

        <div className="detail-kpi-card">
          <span>TOTAL RECEIVED QUANTITY</span>
          <strong>{totalQty} PCE</strong>
          <small>{totalItem} item recorded</small>
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
            <span>Step 1 · PR Reference</span>
            <strong>{prNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className="pipeline-node active"
          style={{ cursor: "pointer" }}
          onClick={() => onNavigateDetail && onNavigateDetail("po", docToSlug(poNumber))}
        >
          <div className="pipeline-node__icon">
            <Icon name="archive" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 2 · PO Reference</span>
            <strong>{poNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div className="pipeline-node current">
          <div className="pipeline-node__icon">
            <Icon name="box" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 3 · BPB Receipt</span>
            <strong>{docNumber}</strong>
          </div>
        </div>
      </div>

      {/* Full-Width Received Material Table */}
      <div className="detail-table-card">
        <div className="detail-table-card__header">
          <div className="detail-table-card__title">
            <Icon name="box" size={16} />
            <span>Material Items Received ({totalItem})</span>
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Location: <strong style={{ color: "var(--ink)" }}>{location}</strong>
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="detail-data-table">
            <thead>
              <tr>
                <th style={{ width: "45px", textAlign: "center" }}>No</th>
                <th style={{ minWidth: "220px" }}>Material Item</th>
                <th style={{ width: "100px" }}>Job Number</th>
                <th style={{ minWidth: "150px" }}>PO Reference</th>
                <th style={{ minWidth: "160px" }}>PR Reference</th>
                <th style={{ minWidth: "160px" }}>Delivery Note (SJ)</th>
                <th style={{ width: "130px", textAlign: "right" }}>Received Qty</th>
                <th style={{ width: "135px" }}>Warehouse Loc</th>
                <th style={{ minWidth: "240px" }}>Description / Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>1</td>
                <td>
                  <Material name={materialName} code={materialCode} />
                </td>
                <td>—</td>
                <td>
                  <strong style={{ color: "var(--ink)", fontSize: "11px" }}>{poNumber}</strong>
                  <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>29-09-2026</small>
                </td>
                <td>
                  <strong style={{ color: "var(--ink)", fontSize: "11px" }}>{prNumber}</strong>
                  <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>29-09-2026</small>
                </td>
                <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                  {sjNumber}
                </td>
                <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--blue-700)" }}>
                  {totalQty} PCE
                </td>
                <td>
                  <Badge tone="blue">{location}</Badge>
                </td>
                <td style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                  {remark}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td colSpan={6} style={{ textAlign: "right", padding: "12px 14px" }}>
                  Total Received Items:
                </td>
                <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>
                  {totalQty} PCE
                </td>
                <td colSpan={2} style={{ padding: "12px 14px", color: "var(--muted)", fontSize: "11px" }}>
                  Stock verified in inventory ledger
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Two-Column Lower Content Grid */}
      <div className="detail-lower-grid">
        {/* Left Card: Warehouse Receiving Notes & Customs Information */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Warehouse Receiving Notes & Customs</strong>
            <span>Internal Inspection Log</span>
          </div>
          <div className="detail-section-card__body">
            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                Item Purpose / Maintenance Remark
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
                  Goods physically received and inspected at Sparepart Receiving Dock. Packaging intact, quantity matches delivery note exactly.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div style={{ background: "var(--white)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Registration No Pen</span>
                <strong style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>{noPen}</strong>
              </div>
              <div style={{ background: "var(--white)", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--line)" }}>
                <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", fontWeight: 700 }}>Customs Clearance Document</span>
                <strong style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>{bcType}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: Receiving & Audit Verification Log */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Receiving & Stock Verification Trail</strong>
            <span>Audit Trail & Approvals</span>
          </div>
          <div className="detail-section-card__body" style={{ padding: 0 }}>
            <table className="audit-log-table">
              <thead>
                <tr>
                  <th style={{ width: "130px" }}>Actor / Staff</th>
                  <th>Action</th>
                  <th style={{ width: "170px" }}>Timestamp</th>
                  <th style={{ width: "95px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>{createdBy}</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Warehouse Staff</small>
                  </td>
                  <td>Receive Material Created</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    {createdAt}
                  </td>
                  <td>
                    <Badge tone="blue">✓ Created</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Gudang Sparepart</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Storage Verification</small>
                  </td>
                  <td>Quantity & Bin Verified</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    08-10-2026 15:52:10
                  </td>
                  <td>
                    <Badge tone="green">✓ Verified</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Warehouse Head</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Pending Review</small>
                  </td>
                  <td>Final Stock Ledger Posting</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    Pending Sign-off
                  </td>
                  <td>
                    <Badge tone="orange">Ready</Badge>
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

export default WarehouseDetail;
