import { useState } from "react";
import { Icon } from "./Icon";
import { Button } from "./Button";
import { Badge } from "./Badge";
import { Material } from "../common/CommonCells";
import type { TableRow } from "../../types";

interface DetailDrawerProps {
  row: TableRow;
  onClose: () => void;
}

export function DetailDrawer({ row, onClose }: { row: TableRow; onClose: () => void }) {
  const [poTab, setPoTab] = useState<"material" | "otherCosts">("material");
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const type = row._type || "po";
  const docNumber = row._rawNumber || "PO-2503-0039";
  const prNumber = row._rawPr || "0135/PR-IMLI/IX/2026";
  const poNumber = row._rawPo || (type === "po" ? docNumber : "POL-1026-0040");
  const rmNumber = row._rawRn || "RM-1026-0018";
  const supplierName = row._rawSupplier || "[ASSL.0002] PT. Astra Otoparts, Tbk";
  const orderTotal = row._rawTotal || "IDR 260,112,910.68";
  const status = row._rawStatus || "Approved 2";
  const dateStr = row._rawDate || "08-Oct-2026";

  const title =
    type === "pr"
      ? "Purchase Requisition Details"
      : type === "po"
      ? "Purchase Order Details"
      : type === "warehouse"
      ? "Receive Material Details"
      : "PR–PO Tracking Details";

  const badgeTone =
    status === "Approved" || status === "Complete"
      ? "green"
      : status === "Approved 1"
      ? "green"
      : status === "Outstanding" || status === "Ready"
      ? "orange"
      : status === "Approved 2" || status === "Approve 2"
      ? "blue"
      : "gray";

  // Data for PO items (defaulting to POL-1026-0040's full record from SmartOne)
  const isPo = type === "po";
  const isReport = type === "report";
  const isWarehouse = type === "warehouse";
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
            currency: String(row._rawCurrency || "IDR"),
            remark: String(row._rawRemark || "U/ Proses BB"),
          },
        ];

  const otherCosts = row._otherCosts || [];

  return (
    <>
      <div className="drawer-backdrop" onMouseDown={onClose}>
        <aside className="drawer" onMouseDown={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="drawer__header">
            <div>
              <span className="eyebrow">DOCUMENT DETAILS</span>
              <div className="drawer__title">{title}</div>
              <span>{docNumber}</span>
            </div>
            <button
              type="button"
              className="icon-action"
              onClick={onClose}
              aria-label="Close details"
            >
              <Icon name="close" />
            </button>
          </div>

          {/* Status Bar */}
          <div className="drawer__status">
            <div className="drawer__status-badges">
              <Badge tone={badgeTone}>✓ {status}</Badge>
              {isPo && (
                <>
                  <Badge tone="purple">{String(row._rawFacility || "FASILITAS")}</Badge>
                  <Badge tone="gray">
                    {String(row._rawCurrency || "IDR")} · Rate: {String(row._rawRate || "1.00")}
                  </Badge>
                </>
              )}
              {isReport && (
                <>
                  <Badge tone={row._rawFacility === "Facility" ? "purple" : "gray"}>
                    {String(row._rawFacility || "Non Facility")}
                  </Badge>
                  <Badge tone="gray">
                    {String(row._rawCurrency || "IDR")}
                  </Badge>
                </>
              )}
              {isWarehouse && (
                <>
                  <Badge tone="blue">No Pen: {String(row._rawNoPen || "088370")}</Badge>
                  <Badge tone="cyan">{String(row._rawBc || "BC 4.0")}</Badge>
                  <Badge tone="purple">{String(row._rawBpbType || "Warehouse")}</Badge>
                </>
              )}
            </div>

            {isPo ? (
              <button
                type="button"
                className="btn-history-trigger"
                onClick={() => setShowHistoryModal(true)}
              >
                <Icon name="history" size={14} />
                <span>History Transaction</span>
              </button>
            ) : (
              <span>Last updated {dateStr}</span>
            )}
          </div>

          {/* Metadata Cards Grid */}
          {type === "pr" ? (
            <div className="detail-hero">
              <div>
                <span>DEPARTMENT & SECTION</span>
                <strong>{String(row._rawDept || "HSE")}</strong>
                <small>Section 2 · Req Date: {String(row._rawDate || "07-Oct-2026")}</small>
              </div>
              <div>
                <span>DUE DATE & ATTACHMENT</span>
                <strong>{String(row._rawDueDate || "21-Oct-2026")}</strong>
                <small>
                  <a
                    href="#attachment"
                    style={{ color: "var(--blue-600)", fontWeight: 700 }}
                    onClick={(e) => e.preventDefault()}
                  >
                    Download File
                  </a>
                </small>
              </div>
            </div>
          ) : isPo ? (
            <div className="detail-hero--po">
              <div>
                <span>SUPPLIER / ENTITY</span>
                <strong>{supplierName}</strong>
                <small>Facility: {String(row._rawFacility || "FASILITAS")} · {String(row._rawDeptCreated || "PROCUREMENT")}</small>
              </div>
              <div>
                <span>PAYMENT METHOD & FX</span>
                <strong>{String(row._rawPaymentMethod || "TRANSFER")}</strong>
                <small>Currency: {String(row._rawCurrency || "IDR")} · Rate: {String(row._rawRate || "1.00")}</small>
              </div>
              <div>
                <span>TIMELINE & DATES</span>
                <strong>{String(row._rawDate || "08-10-2026")}</strong>
                <small>Due Date: {String(row._rawDueDate || "09-11-2026")}</small>
              </div>
              <div>
                <span>PAYMENT TERM</span>
                <strong>100% by TT</strong>
                <small>{String(row._rawPaymentTerm || "Full amount within 14 days after received invoice")}</small>
              </div>
              <div>
                <span>CREATED & RELEASED</span>
                <strong>{String(row._rawCreatedBy || "08-10-2026 13:44 by Michelle")}</strong>
                <small>Released: {String(row._rawReleasedBy || "08-10-2026 13:57 by YUSTINA")}</small>
              </div>
              <div>
                <span>APPROVED & REVISION</span>
                <strong>{String(row._rawApprovedBy || "08-10-2026 14:04 by AWI L")}</strong>
                <small>Revision: {String(row._rawRevision || "—")} · Subcon: {String(row._rawSubkon || "—")}</small>
              </div>
            </div>
          ) : isReport ? (
            <div className="detail-hero--po">
              <div>
                <span>PR DETAILS</span>
                <strong>{String(row._rawPr || prNumber)}</strong>
                <small>Date: {String(row._rawPrDate || "01-10-2026")} · Req: {String(row._rawRequiredDate || "22-10-2026")}</small>
              </div>
              <div>
                <span>PO DETAILS</span>
                <strong>{String(row._rawPo || poNumber)}</strong>
                <small>PO Date: {String(row._rawPoDate || "08-10-2026")}</small>
              </div>
              <div>
                <span>SUPPLIER / ENTITY</span>
                <strong>{String(row._rawSupplier || supplierName)}</strong>
                <small>Dept: {String(row._rawDeptRequest || "PPIC")} ({String(row._rawSection || "Section 2")})</small>
              </div>
              <div>
                <span>BPB WAREHOUSE RECEIPT</span>
                <strong>{String(row._rawBpbNumber || "—")}</strong>
                <small>Date: {String(row._rawBpbDate || "—")} · Qty: {String(row._rawQtyBpb || "0")}</small>
              </div>
              <div>
                <span>QUANTITIES & FULFILLMENT</span>
                <strong>PR: {String(row._rawQtyPr || "0")} · PO: {String(row._rawQtyPo || "0")}</strong>
                <small>Outstanding: {String(row._rawOutstandingPp || "0")}</small>
              </div>
              <div>
                <span>FINANCIAL & TAX SUMMARY</span>
                <strong>IDR {String(row._rawSubTotal || orderTotal)}</strong>
                <small>Unit: IDR {String(row._rawPrice || "0.00")} · PPn: IDR {String(row._rawTotalPpn || "0.00")}</small>
              </div>
            </div>
          ) : isWarehouse ? (
            <div className="detail-hero--po">
              <div>
                <span>MUTATION / RECEIVE NO.</span>
                <strong>{String(row._rawNumber || docNumber)}</strong>
                <small>Receive Date: {String(row._rawDate || "08-10-2026")}</small>
              </div>
              <div>
                <span>RECEIPT / RN NO.</span>
                <strong>{String(row._rawRn || "0131/RN-IMLI/X/2026")}</strong>
                <small>RN Date: {String(row._rawRnDate || "08-10-2026")} · SJ: {String(row._rawSj || "—")}</small>
              </div>
              <div>
                <span>AJU NUMBER & BARCODE</span>
                <strong style={{ fontSize: "11px", wordBreak: "break-all" }}>{String(row._rawAju || "00004001456220261008004282")}</strong>
                <small>Aju Date: {String(row._rawDate || "08-10-2026")}</small>
              </div>
              <div>
                <span>VEHICLE & REGISTRATION</span>
                <strong>Plate: {String(row._rawPlateNo || "L 8372 VQ")}</strong>
                <small>No Pen: {String(row._rawNoPen || "088370")} ({String(row._rawDate || "08-10-2026")})</small>
              </div>
              <div>
                <span>SUPPLIER & CUSTOMS</span>
                <strong>{String(row._rawSupplier || supplierName)}</strong>
                <small>Doc: {String(row._rawBc || "BC 4.0")} · Loc: {String(row._rawWarehouseLocation || "Gudang Sparepart")}</small>
              </div>
              <div>
                <span>TOTAL QUANTITY & ITEMS</span>
                <strong>{String(row._rawTotalQty || "25.00")} PCE</strong>
                <small>Items: {String(row._rawTotalItem || "1")} item</small>
              </div>
            </div>
          ) : (
            <div className="detail-hero">
              <div>
                <span>SUPPLIER / ENTITY</span>
                <strong>{supplierName}</strong>
                <small>Bandung, Indonesia</small>
              </div>
              <div>
                <span>{type === "warehouse" ? "TOTAL RECEIVED" : "ORDER TOTAL"}</span>
                <strong>{orderTotal}</strong>
                <small>Tax included</small>
              </div>
            </div>
          )}

          {/* Document Relationship */}
          <div className="drawer__section">
            <strong>Document relationship</strong>
            <div className="relationship">
              <div className={type === "pr" ? "active" : ""}>
                <Icon name="file" />
                <span>Purchase Requisition</span>
                <strong>{String(row._rawPr || prNumber)}</strong>
              </div>
              <Icon name="arrowRight" />
              <div className={type === "po" || type === "report" ? "active" : ""}>
                <Icon name="archive" />
                <span>Purchase Order</span>
                <strong>{String(row._rawPo || poNumber)}</strong>
              </div>
              <Icon name="arrowRight" />
              <div className={type === "warehouse" ? "active" : ""}>
                <Icon name="box" />
                <span>Receive Material</span>
                <strong>{String(row._rawNumber || rmNumber)}</strong>
              </div>
            </div>
          </div>

          {/* PO Tabs Bar */}
          {isPo && (
            <div className="drawer-tabs">
              <button
                type="button"
                className={`drawer-tab ${poTab === "material" ? "active" : ""}`}
                onClick={() => setPoTab("material")}
              >
                <span>Material</span>
                <span className="drawer-tab__badge">{poItems.length}</span>
              </button>
              <button
                type="button"
                className={`drawer-tab ${poTab === "otherCosts" ? "active" : ""}`}
                onClick={() => setPoTab("otherCosts")}
              >
                <span>Other Costs</span>
                <span className="drawer-tab__badge">{otherCosts.length}</span>
              </button>
            </div>
          )}

          {/* PR Specific Note */}
          {type === "pr" && (
            <div className="drawer__section">
              <div className="section-row">
                <strong>PR Note & Remark</strong>
              </div>
              <div
                style={{
                  background: "var(--canvas)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11.5px",
                  color: "var(--ink-soft)",
                }}
              >
                {String(row._rawRemark || "PP Sby (UGT-26-004)")}
              </div>
            </div>
          )}

          {/* Main Content Section */}
          {isPo ? (
            poTab === "material" ? (
              <div className="drawer__section">
                <div className="section-row">
                  <strong>Material Items ({poItems.length})</strong>
                  <span>Currency: {String(row._rawCurrency || "IDR")}</span>
                </div>

                {poItems.map((item, idx) => (
                  <div key={idx} className="item-card">
                    <div>
                      <div>
                        <Material
                          name={item.item || "Battery Scrap"}
                          code={item.itemCode || "10.100.100.001"}
                        />
                        <small className="muted" style={{ display: "block", fontSize: "10px", marginTop: "3px" }}>
                          PR Reference: <strong>{item.prNumber || prNumber}</strong>
                        </small>
                      </div>
                      <Badge tone="purple">FASILITAS</Badge>
                    </div>

                    <div className="po-item-metrics">
                      <div>
                        <span>Quantity</span>
                        <strong>{item.quantity}</strong>
                      </div>
                      <div>
                        <span>Unit Price (@)</span>
                        <strong>IDR {item.priceRp || item.price || "13,244.55"}</strong>
                      </div>
                      <div>
                        <span>Discount</span>
                        <strong>IDR {item.discountRp || item.discount || "0.00"}</strong>
                      </div>
                      <div>
                        <span>Subtotal Price</span>
                        <strong>IDR {item.subtotalRp || item.subtotal || "234,335,955.60"}</strong>
                      </div>
                      <div>
                        <span>LME</span>
                        <strong>{item.lme || "1,855"}</strong>
                      </div>
                      <div>
                        <span>Optional Rate</span>
                        <strong>{item.optionalRate || "17,849"}</strong>
                      </div>
                      <div>
                        <span>% LME</span>
                        <strong>{item.lmePercentage || "40.00%"}</strong>
                      </div>
                      <div>
                        <span>Subtotal PPh</span>
                        <strong>IDR {item.subtotalPph || "0.00"}</strong>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Financial Summary & Tax Calculation Breakdown */}
                <div className="po-breakdown-card">
                  <div className="po-breakdown-row">
                    <span>Total Quantity</span>
                    <span>{String(row._totalQty || "17,693.01 KGM")}</span>
                  </div>
                  <div className="po-breakdown-row">
                    <span>Material Subtotal</span>
                    <span>IDR 234,335,955.60</span>
                  </div>
                  <div className="po-breakdown-row">
                    <span>DPP (Tax Base)</span>
                    <span>IDR 214,807,959.00</span>
                  </div>
                  <div className="po-breakdown-row">
                    <span>Value Added Tax (VAT 12%)</span>
                    <span>IDR 25,776,955.08</span>
                  </div>
                  <div className="po-breakdown-row total">
                    <span>Grand Total</span>
                    <strong>{orderTotal}</strong>
                  </div>
                </div>
              </div>
            ) : (
              /* Other Costs Tab (Biaya Lain) */
              <div className="drawer__section">
                <div className="section-row">
                  <strong>Other Costs Table</strong>
                  <span>Additional Fees & Logistics</span>
                </div>

                <table className="po-costs-table">
                  <thead>
                    <tr>
                      <th style={{ width: "48px" }}>No</th>
                      <th>Cost Name</th>
                      <th style={{ width: "140px", textAlign: "right" }}>Amount</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {otherCosts.length > 0 ? (
                      otherCosts.map((c, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td><strong>{c.name}</strong></td>
                          <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace" }}>{c.amount}</td>
                          <td>{c.remark || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="po-costs-empty">
                          No additional costs recorded for this purchase order.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                      <td colSpan={2} style={{ textAlign: "right", padding: "10px 12px" }}>Total Other Costs:</td>
                      <td style={{ textAlign: "right", padding: "10px 12px", fontFamily: "ui-monospace, monospace" }}>IDR 0.00</td>
                      <td style={{ padding: "10px 12px", color: "var(--muted)", fontSize: "10.5px" }}>—</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )
          ) : (
            /* Non-PO Item Information */
            <div className="drawer__section">
              <div className="section-row">
                <strong>Item information</strong>
                <span>{type === "pr" ? "1 item · 15.00 PCE" : "2 materials"}</span>
              </div>
              {type === "pr" ? (
                <div className="item-card">
                  <div>
                    <Material name="Safety Body Harness" code="80.500.003.200" />
                    <Badge tone="purple">NON FASILITAS</Badge>
                  </div>
                  <div className="item-quantities">
                    <span>
                      Quantity <strong>15.00 PCE</strong>
                    </span>
                    <span>
                      Due Date <strong>{String(row._rawDueDate || "21-10-2026")}</strong>
                    </span>
                    <span>
                      Remark <strong>U/APD Kry MTC dan Furnace</strong>
                    </span>
                  </div>
                </div>
              ) : isReport ? (
                <>
                  <div className="item-card">
                    <div>
                      <div>
                        <Material
                          name={String(row._rawMaterialName || "LABEL TIMAH KOSONGAN")}
                          code={String(row._rawMaterialCode || "60.145.000.601")}
                        />
                        <small className="muted" style={{ display: "block", fontSize: "10px", marginTop: "3px" }}>
                          PR: <strong>{String(row._rawPr || "—")}</strong> · PO: <strong>{String(row._rawPo || "—")}</strong>
                        </small>
                      </div>
                      <Badge tone={row._rawFacility === "Facility" ? "purple" : "gray"}>
                        {String(row._rawFacility || "Non Facility")}
                      </Badge>
                    </div>

                    <div className="po-item-metrics">
                      <div>
                        <span>Qty PR</span>
                        <strong>{String(row._rawQtyPr || "0")}</strong>
                      </div>
                      <div>
                        <span>Qty PO</span>
                        <strong>{String(row._rawQtyPo || "0")}</strong>
                      </div>
                      <div>
                        <span>Qty BPB</span>
                        <strong>{String(row._rawQtyBpb || "0")}</strong>
                      </div>
                      <div>
                        <span>Outstanding PP</span>
                        <strong>{String(row._rawOutstandingPp || "0")}</strong>
                      </div>
                      <div>
                        <span>Unit Price</span>
                        <strong>IDR {String(row._rawPrice || "0.00")}</strong>
                      </div>
                      <div>
                        <span>Total PPn</span>
                        <strong>IDR {String(row._rawTotalPpn || "0.00")}</strong>
                      </div>
                      <div>
                        <span>Total PPh</span>
                        <strong>IDR {String(row._rawTotalPph || "0.00")}</strong>
                      </div>
                      <div>
                        <span>Sub Total</span>
                        <strong>IDR {String(row._rawSubTotal || "0.00")}</strong>
                      </div>
                    </div>
                  </div>

                  {row._rawDescription && row._rawDescription !== "—" && (
                    <div style={{ marginTop: "12px" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
                        Item Description / Remark
                      </span>
                      <div
                        style={{
                          background: "var(--canvas)",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11.5px",
                          color: "var(--ink-soft)",
                          marginTop: "4px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {String(row._rawDescription)}
                      </div>
                    </div>
                  )}
                </>
              ) : isWarehouse ? (
                <>
                  <div className="item-card">
                    <div>
                      <div>
                        <Material
                          name={String(row._rawMaterialName || "Mur Baut M 10 x 40 + ring pir")}
                          code={String(row._rawMaterialCode || "60.149.301.404")}
                        />
                        <small className="muted" style={{ display: "block", fontSize: "10px", marginTop: "3px" }}>
                          PO: <strong>{String(row._rawPo || "POL-0926-0332")}</strong> (Date: {String(row._rawPoDate || "29-09-2026")}) · PR: <strong>{String(row._rawPr || "0085/PR-IMLI/IX/2026")}</strong> (Date: {String(row._rawPrDate || "29-09-2026")})
                        </small>
                      </div>
                      <Badge tone="blue">
                        {String(row._rawWarehouseLocation || "Gudang Sparepart")}
                      </Badge>
                    </div>

                    <div className="po-item-metrics">
                      <div>
                        <span>Job Number</span>
                        <strong>—</strong>
                      </div>
                      <div>
                        <span>DN Number (SJ)</span>
                        <strong style={{ fontSize: "11px" }}>{String(row._rawSj || "—")}</strong>
                      </div>
                      <div>
                        <span>DN Date</span>
                        <strong>{String(row._rawDate || "08-10-2026")}</strong>
                      </div>
                      <div>
                        <span>Quantity Receive</span>
                        <strong>{String(row._rawQtyReceive || "25.0000 PCE")}</strong>
                      </div>
                      <div>
                        <span>Warehouse Location</span>
                        <strong>{String(row._rawWarehouseLocation || "Gudang Sparepart")}</strong>
                      </div>
                      <div>
                        <span>Vehicle Plate</span>
                        <strong>{String(row._rawPlateNo || "L 8372 VQ")}</strong>
                      </div>
                      <div>
                        <span>Registration Number</span>
                        <strong>{String(row._rawNoPen || "088370")}</strong>
                      </div>
                      <div>
                        <span>Customs Document</span>
                        <strong>{String(row._rawBc || "BC 4.0")}</strong>
                      </div>
                    </div>
                  </div>

                  {row._rawRemark && row._rawRemark !== "—" && (
                    <div style={{ marginTop: "12px" }}>
                      <span style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
                        Item Remark
                      </span>
                      <div
                        style={{
                          background: "var(--canvas)",
                          padding: "10px 14px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: "11.5px",
                          color: "var(--ink-soft)",
                          marginTop: "4px",
                          border: "1px solid var(--line)",
                        }}
                      >
                        {String(row._rawRemark)}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="item-card">
                    <div>
                      <Material name="Industrial V-Belt B72" code="BLT-B72" />
                      <Badge tone="orange">4 outstanding</Badge>
                    </div>
                    <div className="item-quantities">
                      <span>
                        Requested <strong>12 pcs</strong>
                      </span>
                      <span>
                        Purchased <strong>8 pcs</strong>
                      </span>
                      <span>
                        Received <strong>8 pcs</strong>
                      </span>
                    </div>
                  </div>
                  <div className="item-card">
                    <div>
                      <Material name="Drive Pulley 160mm" code="PLY-160" />
                      <Badge tone="green">Complete</Badge>
                    </div>
                    <div className="item-quantities">
                      <span>
                        Requested <strong>6 pcs</strong>
                      </span>
                      <span>
                        Purchased <strong>6 pcs</strong>
                      </span>
                      <span>
                        Received <strong>6 pcs</strong>
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* PO Remark Section */}
          {isPo && (
            <div className="drawer__section">
              <div className="section-row">
                <strong>PO Remark</strong>
              </div>
              <div
                style={{
                  background: "var(--canvas)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: "var(--ink-soft)",
                  border: "1px solid var(--line)",
                }}
              >
                {String(row._rawRemark || "U/ Proses BB")}
              </div>
            </div>
          )}

          {/* Approval & Timeline */}
          <div className="drawer__section">
            <div className="section-row">
              <strong>Approval and Audit Trail</strong>
              <span>3 recorded activities</span>
            </div>
            <div className="timeline">
              {type === "pr" ? (
                <>
                  <div className="done">
                    <span>
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Approve 1 · Arsyeila</strong>
                      <small>07-10-2026, 15:08:40</small>
                    </div>
                  </div>
                  <div className="done">
                    <span>
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Submitted by Requester · Arsyeila</strong>
                      <small>07-10-2026, 15:08:39</small>
                    </div>
                  </div>
                </>
              ) : isPo ? (
                <>
                  <div className="done">
                    <span className="tone-purple">
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Approve 2 Purchase Order · AWI L</strong>
                      <small>08-10-2026, 14:04:25</small>
                    </div>
                  </div>
                  <div className="done">
                    <span className="tone-blue">
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Approve 1 Purchase Order · YUSTINA</strong>
                      <small>08-10-2026, 13:57:26</small>
                    </div>
                  </div>
                  <div className="done">
                    <span>
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Transaction Created · Michelle</strong>
                      <small>08-10-2026, 13:44:33</small>
                    </div>
                  </div>
                </>
              ) : isReport ? (
                <>
                  <div className="done">
                    <span>
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Date Approved 2 · {String(row._rawApproved2Date || "02-10-2026")}</strong>
                      <small>Document processing authorized</small>
                    </div>
                  </div>
                  <div className="done">
                    <span className="tone-blue">
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>PR Status · {String(row._rawStatusPr || "Outstanding")}</strong>
                      <small>Requesting Dept: {String(row._rawDeptRequest || "PPIC")}</small>
                    </div>
                  </div>
                  <div className="done">
                    <span className="tone-purple">
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>PO Status · {String(row._rawStatusPo || "Outstanding")}</strong>
                      <small>Supplier: {String(row._rawSupplier || "—")}</small>
                    </div>
                  </div>
                </>
              ) : isWarehouse ? (
                <>
                  <div className="done">
                    <span className="tone-orange">
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Status · Ready</strong>
                      <small>Awaiting warehouse approval & verification</small>
                    </div>
                  </div>
                  <div className="done">
                    <span className="tone-blue">
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Created · {String(row._rawCreatedBy || "MUKHANIFAH")}</strong>
                      <small>{String(row._rawCreatedAt || "08-10-2026 15:50:49")}</small>
                    </div>
                  </div>
                  <div className="done">
                    <span>
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Receipt Reference · {String(row._rawRn || "0131/RN-IMLI/X/2026")}</strong>
                      <small>Delivery Note: {String(row._rawSj || "—")}</small>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="done">
                    <span>
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Approve 1 · Budi Santoso</strong>
                      <small>18 Mar 2025, 15:04</small>
                    </div>
                  </div>
                  <div className="done">
                    <span>
                      <Icon name="check" size={13} />
                    </span>
                    <div>
                      <strong>Approve 2 · Maya Andini</strong>
                      <small>18 Mar 2025, 16:28</small>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Drawer Sticky Footer */}
          <div className="drawer__footer">
            <Button variant="secondary" icon="print">
              Print PDF
            </Button>
            <Button icon="download">Export XLSX</Button>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </aside>
      </div>

      {/* Transaction History Modal */}
      {showHistoryModal && (
        <div className="modal-backdrop" onMouseDown={() => setShowHistoryModal(false)}>
          <div className="modal-content" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="eyebrow" style={{ fontSize: "10px", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  AUDIT LOG
                </span>
                <h3 style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: 800 }}>
                  Detail Purchase Order — History
                </h3>
                <small style={{ color: "var(--muted)", fontSize: "11px" }}>{poNumber}</small>
              </div>
              <button
                type="button"
                className="icon-action"
                onClick={() => setShowHistoryModal(false)}
                aria-label="Close modal"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="modal-body" style={{ padding: "0" }}>
              <table className="pr-items-table" style={{ margin: "0" }}>
                <thead>
                  <tr>
                    <th style={{ width: "110px" }}>User</th>
                    <th>Activity</th>
                    <th style={{ width: "190px" }}>Log Time</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Michelle</strong></td>
                    <td>Transaction Created</td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                      08-10-2026 01:44:33 pm
                    </td>
                  </tr>
                  <tr>
                    <td><strong>YUSTINA</strong></td>
                    <td>Approve 1 Purchase Order</td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                      08-10-2026 01:57:26 pm
                    </td>
                  </tr>
                  <tr>
                    <td><strong>AWI L</strong></td>
                    <td>Approve 2 Purchase Order</td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                      08-10-2026 02:04:25 pm
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="modal-footer">
              <Button onClick={() => setShowHistoryModal(false)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DetailDrawer;
