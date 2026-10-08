import { useState, useMemo } from "react";
import { Icon } from "../components/ui/Icon";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Material } from "../components/common/CommonCells";
import { poRows, findRowBySlug, docToSlug } from "../data/mockData";
import type { TableRow } from "../types";

interface PurchaseOrderDetailProps {
  code: string;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function PurchaseOrderDetail({
  code,
  onBack,
  onNavigateDetail,
}: PurchaseOrderDetailProps) {
  const [activeTab, setActiveTab] = useState<"material" | "otherCosts">("material");

  const row: TableRow = useMemo(() => {
    return findRowBySlug(poRows, code) || poRows[3] || poRows[0];
  }, [code]);

  const docNumber = row._rawNumber || "POL-1026-0040";
  const prNumber = row._rawPr || "0135/PR-IMLI/IX/2026";
  const rmNumber = row._rawRn || "RM-1026-0018";
  const supplierName = row._rawSupplier || "[ASSL.0002] PT. Astra Otoparts, Tbk";
  const orderTotal = row._rawTotal || "IDR 260,112,910.68";
  const status = row._rawStatus || "Approved 2";
  const dateStr = row._rawDate || "08-Oct-2026";
  const dueDate = row._rawDueDate || "09-Nov-2026";
  const facility = String(row._rawFacility || "FASILITAS");
  const currency = String(row._rawCurrency || "IDR");
  const rate = String(row._rawRate || "1.00");
  const paymentMethod = String(row._rawPaymentMethod || "TRANSFER");
  const paymentTerm = String(row._rawPaymentTerm || "Full amount within 14 days after received invoice");
  const createdBy = String(row._rawCreatedBy || "08-10-2026 13:44 by Michelle");
  const releasedBy = String(row._rawReleasedBy || "08-10-2026 13:57 by YUSTINA");
  const approvedBy = String(row._rawApprovedBy || "08-10-2026 14:04 by AWI L");
  const remark = String(row._rawRemark || "U/ Proses BB");

  const poItems =
    row._items && row._items.length > 0
      ? row._items
      : [
          {
            no: 1,
            prNumber: prNumber,
            item: "Battery Scrap",
            itemCode: "10.100.100.001",
            itemAlias: "—",
            quantity: String(row._totalQty || "17,693.01000 KGM"),
            unit: "KGM",
            price: "13,244.55000",
            discount: "0.00000",
            subtotal: "234,335,955.60",
            priceRp: "13,244.55",
            discountRp: "0.00",
            subtotalRp: "234,335,955.60",
            lme: "1,855",
            optionalRate: "17,849",
            lmePercentage: "40.00%",
            subtotalPph: "0.00",
            currency: currency,
            remark: remark,
          },
        ];

  const otherCosts = row._otherCosts || [];

  const badgeTone =
    status === "Approved" || status === "Complete"
      ? "green"
      : status === "Approved 1"
      ? "green"
      : status === "Approved 2" || status === "Approve 2"
      ? "blue"
      : status === "Outstanding" || status === "Ready"
      ? "orange"
      : "gray";

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <button type="button" className="btn-back-pill" onClick={onBack}>
            <Icon name="arrowLeft" size={14} />
            <span>Back to Purchase Orders</span>
          </button>
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Procurement</a>
            <span>/</span>
            <a onClick={onBack}>Purchase Orders</a>
            <span>/</span>
            <span className="current">{docNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone={badgeTone}>✓ {status}</Badge>
          <Badge tone="purple">{facility}</Badge>
          <Badge tone="gray">
            {currency} · Rate {rate}
          </Badge>
          <Button variant="secondary" icon="print">
            Print PDF
          </Button>
          <Button icon="download">Export XLSX</Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">PURCHASE ORDER ORDER COCKPIT</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{docNumber}</h2>
            <Badge tone={badgeTone}>✓ {status}</Badge>
            <Badge tone="purple">{facility}</Badge>
          </div>
          <span className="detail-header-card__meta">
            Supplier: <strong>{supplierName}</strong> · Total Value: <strong>{orderTotal}</strong> · Order Date: <strong>{dateStr}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <Button variant="secondary" icon="file">
            Download Attachments
          </Button>
        </div>
      </div>

      {/* 6-Column Hero Summary KPI Grid */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-card">
          <span>SUPPLIER / ENTITY</span>
          <strong>{supplierName}</strong>
          <small>Procurement Dept · Direct Vendor</small>
        </div>

        <div className="detail-kpi-card">
          <span>PAYMENT METHOD & FX</span>
          <strong>{paymentMethod}</strong>
          <small>{currency} · FX Rate: {rate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>ORDER TIMELINE</span>
          <strong>{dateStr}</strong>
          <small>Target Due: {dueDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>PAYMENT TERMS</span>
          <strong>100% by TT</strong>
          <small>{paymentTerm}</small>
        </div>

        <div className="detail-kpi-card">
          <span>CREATED & RELEASED</span>
          <strong>{createdBy}</strong>
          <small>Released: {releasedBy}</small>
        </div>

        <div className="detail-kpi-card">
          <span>APPROVAL & REVISION</span>
          <strong>{approvedBy}</strong>
          <small>Revision: — · Subcon: —</small>
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
            <span>Step 1 · Purchase Request</span>
            <strong>{prNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div className="pipeline-node current">
          <div className="pipeline-node__icon">
            <Icon name="archive" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 2 · Purchase Order</span>
            <strong>{docNumber}</strong>
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
            <strong>{rmNumber}</strong>
          </div>
        </div>
      </div>

      {/* Full-Width Tabbed Material & Costs Section */}
      <div className="detail-table-card">
        <div className="detail-table-card__header">
          <div className="detail-tabs-bar">
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === "material" ? "active" : ""}`}
              onClick={() => setActiveTab("material")}
            >
              <span>Material Items</span>
              <span className="detail-tab-count">{poItems.length}</span>
            </button>
            <button
              type="button"
              className={`detail-tab-btn ${activeTab === "otherCosts" ? "active" : ""}`}
              onClick={() => setActiveTab("otherCosts")}
            >
              <span>Other Costs (Biaya Lain)</span>
              <span className="detail-tab-count">{otherCosts.length}</span>
            </button>
          </div>

          <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Currency Basis: <strong style={{ color: "var(--ink)" }}>{currency}</strong> (Rate: {rate})
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          {activeTab === "material" ? (
            <table className="detail-data-table" style={{ minWidth: "1475px" }}>
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "220px" }}>Material Item</th>
                  <th style={{ minWidth: "160px" }}>PR Reference</th>
                  <th style={{ width: "115px" }}>Facility</th>
                  <th style={{ width: "140px", textAlign: "right" }}>Quantity & Unit</th>
                  <th style={{ width: "125px", textAlign: "right" }}>Unit Price (@)</th>
                  <th style={{ width: "95px", textAlign: "right" }}>Discount</th>
                  <th style={{ width: "145px", textAlign: "right" }}>Subtotal (IDR)</th>
                  <th style={{ width: "80px", textAlign: "right" }}>LME</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Opt Rate</th>
                  <th style={{ width: "80px", textAlign: "right" }}>% LME</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Subtotal PPh</th>
                  <th style={{ minWidth: "160px" }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {poItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>
                      {item.no || idx + 1}
                    </td>
                    <td>
                      <Material
                        name={item.item || "Battery Scrap"}
                        code={item.itemCode || "10.100.100.001"}
                      />
                    </td>
                    <td>
                      <strong style={{ color: "var(--ink)", fontSize: "11px" }}>
                        {item.prNumber || prNumber}
                      </strong>
                    </td>
                    <td>
                      <Badge tone="purple">{facility}</Badge>
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                      {item.quantity}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      IDR {item.priceRp || item.price || "13,244.55"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                      {item.discountRp || item.discount || "0.00"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink)" }}>
                      IDR {item.subtotalRp || item.subtotal || "234,335,955.60"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      {item.lme || "1,855"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      {item.optionalRate || "17,849"}
                    </td>
                    <td style={{ textAlign: "right", fontWeight: 700, color: "var(--blue-600)" }}>
                      {item.lmePercentage || "40.00%"}
                    </td>
                    <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>
                      {item.subtotalPph || "0.00"}
                    </td>
                    <td style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                      {item.remark || remark}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="detail-data-table" style={{ minWidth: "1475px" }}>
              <thead>
                <tr>
                  <th style={{ width: "45px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "450px" }}>Cost Name / Description</th>
                  <th style={{ width: "220px", textAlign: "right" }}>Amount (IDR)</th>
                  <th style={{ minWidth: "760px" }}>Remark / Purpose</th>
                </tr>
              </thead>
              <tbody>
                {otherCosts.length > 0 ? (
                  otherCosts.map((c, i) => (
                    <tr key={i}>
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>{i + 1}</td>
                      <td><strong>{c.name}</strong></td>
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                        {c.amount}
                      </td>
                      <td>{c.remark || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: "24px 20px", color: "var(--muted)" }}>
                      No additional logistics or transport costs recorded for this purchase order.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                  <td colSpan={2} style={{ textAlign: "right", padding: "12px 14px" }}>
                    Total Other Costs:
                  </td>
                  <td style={{ textAlign: "right", padding: "12px 14px", fontFamily: "ui-monospace, monospace" }}>
                    IDR 0.00
                  </td>
                  <td style={{ padding: "12px 14px", color: "var(--muted)", fontSize: "11px" }}>
                    No surcharge active
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Two-Column Lower Content Grid: Financial Breakdown & EMBEDDED Audit History */}
      <div className="detail-lower-grid">
        {/* Left Card: Financial Calculation Ledger & Remarks */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Financial Summary & Tax Ledger</strong>
            <span>Taxation & Commercial Totals</span>
          </div>
          <div className="detail-section-card__body">
            {/* Financial Ledger Breakdown */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                background: "var(--canvas)",
                padding: "16px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--line)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>Total Material Quantity</span>
                <strong style={{ fontFamily: "ui-monospace, monospace" }}>
                  {String(row._totalQty || "17,693.01000 KGM")}
                </strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>Material Subtotal</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                  IDR 234,335,955.60
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>DPP (Tax Base Amount)</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                  IDR 214,807,959.00
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>Value Added Tax (VAT / PPn 12%)</span>
                <span style={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--blue-600)" }}>
                  IDR 25,776,955.08
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span style={{ color: "var(--muted)" }}>Total Other Costs</span>
                <span style={{ fontFamily: "ui-monospace, monospace" }}>IDR 0.00</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "14px",
                  borderTop: "2px solid var(--line-strong)",
                  paddingTop: "10px",
                  marginTop: "4px",
                }}
              >
                <strong style={{ color: "var(--ink)" }}>Grand Total</strong>
                <strong style={{ color: "var(--blue-700)", fontFamily: "ui-monospace, monospace", fontSize: "15px" }}>
                  {orderTotal}
                </strong>
              </div>
            </div>

            {/* PO Remark Section */}
            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                PO Remark & Delivery Instructions
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
                <strong>{remark}</strong>
                <small style={{ display: "block", color: "var(--muted)", marginTop: "4px", fontSize: "11px" }}>
                  Delivery to Warehouse Raw Material yard. Vendor requires 3-day notice prior to dispatch.
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Right Card: EMBEDDED TRANSACTION HISTORY (Replaces popup modal!) */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Transaction History & Audit Trail</strong>
            <span>Recorded Document Events</span>
          </div>
          <div className="detail-section-card__body" style={{ padding: 0 }}>
            <table className="audit-log-table">
              <thead>
                <tr>
                  <th style={{ width: "125px" }}>User / Actor</th>
                  <th>Activity</th>
                  <th style={{ width: "180px" }}>Log Time</th>
                  <th style={{ width: "95px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>AWI L</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Approver 2</small>
                  </td>
                  <td>Approve 2 Purchase Order</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    08-10-2026 02:04:25 pm
                  </td>
                  <td>
                    <Badge tone="blue">✓ Approved</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>YUSTINA</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Approver 1</small>
                  </td>
                  <td>Approve 1 Purchase Order</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    08-10-2026 01:57:26 pm
                  </td>
                  <td>
                    <Badge tone="green">✓ Released</Badge>
                  </td>
                </tr>
                <tr>
                  <td>
                    <strong>Michelle</strong>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>Procurement</small>
                  </td>
                  <td>Transaction Created</td>
                  <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                    08-10-2026 01:44:33 pm
                  </td>
                  <td>
                    <Badge tone="gray">✓ Created</Badge>
                  </td>
                </tr>
              </tbody>
            </table>

            <div style={{ padding: "14px 18px", background: "var(--canvas)", borderTop: "1px solid var(--line)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "var(--muted)" }}>
                <Icon name="check" size={13} />
                <span>All authorization signatures verified cryptographically in enterprise ledger.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PurchaseOrderDetail;
