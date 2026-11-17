import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { docToSlug } from "../../../utils/docSlug";
import type { DocumentApprovalState } from "../../../types/approval";
import type { TableRow } from "../../../types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface PoHistoryEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  timestamp: string;
  statusLabel: string;
  tone: "green" | "blue" | "orange" | "red" | "purple" | "gray";
}

interface PurchaseOrderDefaultDetailProps {
  row: TableRow;
  docNumber: string;
  supplierName: string;
  dateStr: string;
  dueDate: string;
  currency: string;
  rate: string;
  paymentMethod: string;
  paymentTerm: string;
  createdBy: string;
  releasedBy: string;
  approvedBy: string;
  poNote: string;
  facility: string;
  isHeaderNonFac: boolean;
  isKawasanBerikat: boolean;
  isApproved: boolean;
  poItems: any[];
  otherCosts: any[];
  prNumbersList: string[];
  receivingNumbersList: string[];
  prNumber: string;
  totalMaterialQtyStr: string;
  materialSubtotal: number;
  discountAmount: number;
  dppAmount: number;
  ppnAmount: number;
  ppnRate: number;
  totalOtherCosts: number;
  totalPph: number;
  displayOrderTotal: string;
  approvalState: DocumentApprovalState;
  setApprovalState: React.Dispatch<React.SetStateAction<DocumentApprovalState>>;
  onStateStatusSync: (nextStatus: string) => void;
  onResubmitRevision: () => void;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
  onPrintPdf: () => void;
  isAddingCost: boolean;
  setIsAddingCost: React.Dispatch<React.SetStateAction<boolean>>;
  costName: string;
  setCostName: React.Dispatch<React.SetStateAction<string>>;
  costAmount: number | "";
  setCostAmount: React.Dispatch<React.SetStateAction<number | "">>;
  costNote: string;
  setCostNote: React.Dispatch<React.SetStateAction<string>>;
  isSubmittingCost: boolean;
  costError: string | null;
  setCostError: React.Dispatch<React.SetStateAction<string | null>>;
  availableCostTypes: any[];
  onSaveAdditionalCost: () => void;
  onDownloadAttachment?: () => void;
  activityLogEntries: PoHistoryEntry[];
}

export function PurchaseOrderDefaultDetail({
  row,
  docNumber,
  supplierName,
  dateStr,
  dueDate,
  currency,
  rate,
  paymentMethod,
  paymentTerm,
  createdBy,
  releasedBy,
  approvedBy,
  poNote,
  facility,
  isHeaderNonFac,
  isKawasanBerikat,
  isApproved,
  poItems,
  otherCosts,
  prNumbersList,
  receivingNumbersList,
  prNumber,
  totalMaterialQtyStr,
  materialSubtotal,
  discountAmount,
  dppAmount,
  ppnAmount,
  ppnRate,
  totalOtherCosts,
  totalPph,
  displayOrderTotal,
  approvalState,
  setApprovalState,
  onStateStatusSync,
  onResubmitRevision,
  onBack,
  onNavigateDetail,
  onPrintPdf,
  isAddingCost,
  setIsAddingCost,
  costName,
  setCostName,
  costAmount,
  setCostAmount,
  costNote,
  setCostNote,
  isSubmittingCost,
  costError,
  setCostError,
  availableCostTypes,
  onSaveAdditionalCost,
  onDownloadAttachment,
  activityLogEntries,
}: PurchaseOrderDefaultDetailProps) {
  const [activeTab, setActiveTab] = useState<"material" | "otherCosts">("material");
  const [showHistory, setShowHistory] = useState(false);

  const prRefValue =
    prNumbersList.length > 0 ? (
      <div className="smartone-inline-links">
        {prNumbersList.map((pr, idx) => (
          <button
            key={pr}
            type="button"
            className="smartone-kv-link"
            onClick={() => onNavigateDetail?.("pr", docToSlug(pr))}
          >
            {pr}
            {idx < prNumbersList.length - 1 ? "," : ""}
          </button>
        ))}
      </div>
    ) : (
      prNumber || "-"
    );

  const receivingRefValue =
    receivingNumbersList.length > 0 ? (
      <div className="smartone-inline-links">
        {receivingNumbersList.map((rn, idx) => (
          <button
            key={rn}
            type="button"
            className="smartone-kv-link"
            onClick={() => onNavigateDetail?.("warehouse", docToSlug(rn))}
          >
            {rn}
            {idx < receivingNumbersList.length - 1 ? "," : ""}
          </button>
        ))}
      </div>
    ) : isApproved ? (
      <button
        type="button"
        className="smartone-kv-link"
        onClick={() =>
          onNavigateDetail?.(
            (isKawasanBerikat ? "receive-note-create" : "warehouse-create") as any,
            docNumber
          )
        }
      >
        {isKawasanBerikat ? "+ Create Receive Note" : "+ Create Direct BPB"}
      </button>
    ) : (
      "Awaiting PO Approval"
    );

  const columns: SmartOneField[][] = [
    [
      { label: "PO Number", value: <strong>{docNumber}</strong> },
      { label: "Order Date", value: dateStr },
      { label: "Due Date", value: dueDate },
      { label: "Supplier", value: supplierName },
      { label: "PR Reference", value: prRefValue },
    ],
    [
      { label: "Currency / Rate", value: `${currency} · ${rate}` },
      { label: "Payment Method", value: paymentMethod },
      {
        label: "Payment Terms",
        value:
          paymentTerm && paymentTerm !== "—" && paymentTerm !== "-"
            ? paymentTerm
            : "100% by TT",
      },
      {
        label: isKawasanBerikat ? "Receive Note" : "Warehouse BPB",
        value: receivingRefValue,
      },
      { label: "Grand Total", value: <strong>{displayOrderTotal}</strong> },
    ],
    [
      { label: "Created By", value: createdBy },
      { label: "Released By", value: releasedBy },
      { label: "Approved By", value: approvedBy },
      { label: "Revision", value: String(row._rawRevision || "0") },
      { label: "Subcon", value: String(row._rawSubkon || "No") },
      {
        label: "Attachment file",
        value:
          row.attachment_file || row.attachment_url ? (
            <button
              type="button"
              className="smartone-kv-link"
              onClick={onDownloadAttachment}
            >
              {row.attachment_file || "Download Attachment"}
            </button>
          ) : (
            "-"
          ),
      },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle="Detail Purchase Order"
      onBack={onBack}
      toolbarLeft={
        <>
          <ApprovalStatusBadge status={approvalState.status} />
          <Badge tone={isHeaderNonFac ? "gray" : "purple"}>
            {isHeaderNonFac ? "NON FASILITAS" : "FASILITAS"}
          </Badge>
          <Badge tone={isKawasanBerikat ? "purple" : "gray"}>
            {isKawasanBerikat ? "Kawasan Berikat (Via RN)" : "Direct BPB"}
          </Badge>
          <Button type="button" variant="secondary" size="sm" onClick={onPrintPdf}>
            Print PDF
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            {showHistory
              ? "Hide History"
              : `History Transaction (${activityLogEntries.length})`}
          </Button>
        </>
      }
      toolbarRight={
        row.attachment_file || row.attachment_url ? (
          <Button type="button" variant="outline" size="sm" onClick={onDownloadAttachment}>
            Download Attachments
          </Button>
        ) : undefined
      }
      approvalSection={
        <ApprovalActionBar
          module="purchase_order"
          documentId={row.id ? String(row.id) : docNumber}
          documentNumber={docNumber}
          state={approvalState}
          onResubmitClick={onResubmitRevision}
          onStateChange={(newState) => {
            setApprovalState(newState);
            onStateStatusSync(newState.status);
          }}
        />
      }
      columns={columns}
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <div className="smartone-card-bar__group">
              <Button
                type="button"
                variant={activeTab === "material" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("material")}
              >
                {`Material Items (${poItems.length})`}
              </Button>
              <Button
                type="button"
                variant={activeTab === "otherCosts" ? "primary" : "outline"}
                size="sm"
                onClick={() => setActiveTab("otherCosts")}
              >
                {`Other Costs (${otherCosts.length})`}
              </Button>
            </div>
            {activeTab === "otherCosts" && !isAddingCost && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddingCost(true)}
              >
                Add Additional Cost
              </Button>
            )}
          </div>

          <div className="smartone-card-section__body smartone-card-section__body--flush">
            {activeTab === "material" ? (
              <div className="smartone-table-wrap">
                <table className="detail-data-table">
                  <thead>
                    <tr>
                      <th className="smartone-td-center">No</th>
                      <th>Material Item</th>
                      <th>PR Ref</th>
                      <th>Facility</th>
                      <th className="smartone-td-right">Qty</th>
                      <th className="smartone-td-right">Price</th>
                      <th className="smartone-td-right">Discount</th>
                      <th className="smartone-td-right">Subtotal</th>
                      <th className="smartone-td-right">PPh</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poItems.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="smartone-empty-cell">
                          No material items recorded for this Purchase Order.
                        </td>
                      </tr>
                    ) : (
                      poItems.map((item, idx) => {
                        const itemFac = String(item.facility || item.facility_status || facility);
                        const isNon = /non/i.test(itemFac);
                        const rawPrItem = String(item.prNumber || prNumber || "—");
                        const rowPrs =
                          rawPrItem !== "—"
                            ? rawPrItem.split(",").map((s) => s.trim()).filter(Boolean)
                            : [];
                        const rawSub = item.subtotalRp || item.subtotal;
                        const numSub = parseFloat(String(rawSub || 0).replace(/[^0-9.]/g, ""));
                        const prc = parseFloat(String(item.priceRp || item.price || 0).replace(/[^0-9.]/g, ""));
                        const oQty = parseFloat(String(item.orderQty || item.quantity || 1).replace(/[^0-9.]/g, "")) || 1;
                        const computedSub =
                          numSub > 0
                            ? rawSub
                            : (prc * oQty).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              });

                        return (
                          <tr key={item.id || idx}>
                            <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                            <td>
                              <span className="smartone-td-bold">{item.item || item.itemName || "-"}</span>
                              {item.itemCode && (
                                <span className="smartone-td-sub smartone-td-mono">{item.itemCode}</span>
                              )}
                            </td>
                            <td>
                              {rowPrs.length > 0 ? (
                                <div className="smartone-inline-links">
                                  {rowPrs.map((pr, pIdx) => (
                                    <button
                                      key={pr}
                                      type="button"
                                      className="smartone-kv-link"
                                      onClick={() => onNavigateDetail?.("pr", docToSlug(pr))}
                                    >
                                      {pr}
                                      {pIdx < rowPrs.length - 1 ? "," : ""}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <span className="smartone-td-muted">-</span>
                              )}
                            </td>
                            <td>
                              <Badge tone={isNon ? "gray" : "purple"}>
                                {isNon ? "NON FASILITAS" : "FASILITAS"}
                              </Badge>
                            </td>
                            <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                              {item.quantity}
                            </td>
                            <td className="smartone-td-right smartone-td-mono">
                              {currency} {item.priceRp || item.price || "0.00"}
                            </td>
                            <td className="smartone-td-right smartone-td-mono smartone-td-muted">
                              {item.discountRp || item.discount || "0.00"}
                            </td>
                            <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                              {currency} {computedSub}
                            </td>
                            <td className="smartone-td-right smartone-td-mono">
                              {item.subtotalPph || "0.00"}
                            </td>
                            <td className="smartone-td-muted">{item.remark || "-"}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="smartone-tfoot-row">
                      <td colSpan={4} className="smartone-td-right">
                        Total:
                      </td>
                      <td className="smartone-td-right smartone-td-mono">{totalMaterialQtyStr}</td>
                      <td colSpan={2} />
                      <td className="smartone-td-right smartone-td-mono">
                        {currency}{" "}
                        {materialSubtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="smartone-td-right smartone-td-mono">
                        {currency}{" "}
                        {totalPph.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <div className="smartone-card-section__body">
                {isAddingCost && (
                  <div className="smartone-cost-form">
                    <div className="smartone-cost-form__title">
                      Add Additional Cost to {docNumber}
                    </div>
                    {costError && <div className="smartone-cost-form__error">{costError}</div>}
                    <div className="smartone-cost-form__grid">
                      <div className="master-form-group">
                        <label className="master-form-label">Cost Name / Type *</label>
                        <input
                          type="text"
                          list="smartone-cost-type-suggestions"
                          className="master-form-input"
                          value={costName}
                          onChange={(e) => setCostName(e.target.value)}
                          placeholder="e.g. Freight"
                        />
                        <datalist id="smartone-cost-type-suggestions">
                          {availableCostTypes.map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.code ? `${t.code} - ${t.name}` : t.name}
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div className="master-form-group">
                        <label className="master-form-label">Amount ({currency}) *</label>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          className="master-form-input"
                          value={costAmount}
                          onChange={(e) =>
                            setCostAmount(e.target.value === "" ? "" : parseFloat(e.target.value))
                          }
                          placeholder="0.00"
                        />
                      </div>
                      <div className="master-form-group">
                        <label className="master-form-label">Remark</label>
                        <input
                          type="text"
                          className="master-form-input"
                          value={costNote}
                          onChange={(e) => setCostNote(e.target.value)}
                          placeholder="Optional note..."
                        />
                      </div>
                    </div>
                    <div className="smartone-cost-form__actions">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={isSubmittingCost}
                        onClick={() => {
                          setIsAddingCost(false);
                          setCostError(null);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={isSubmittingCost}
                        onClick={onSaveAdditionalCost}
                      >
                        {isSubmittingCost ? "Saving..." : "Save Cost"}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="smartone-table-wrap">
                  <table className="detail-data-table">
                    <thead>
                      <tr>
                        <th className="smartone-td-center">No</th>
                        <th>Cost Name / Description</th>
                        <th className="smartone-td-right">Amount ({currency})</th>
                        <th>Remark</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otherCosts.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="smartone-empty-cell">
                            No additional costs recorded for this Purchase Order.
                          </td>
                        </tr>
                      ) : (
                        otherCosts.map((c, idx) => {
                          const cVal = Number(
                            c.value ??
                              c.amount ??
                              parseFloat(String(c.nominal || "0").replace(/[^0-9.]/g, "")) ??
                              0
                          );
                          return (
                            <tr key={c.id || idx}>
                              <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                              <td className="smartone-td-bold">
                                {c.name || c.costName || "Operational Cost"}
                              </td>
                              <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                                {currency}{" "}
                                {cVal.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </td>
                              <td className="smartone-td-muted">{c.note || c.remark || "-"}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      }
      summarySection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">Financial Summary &amp; PO Note</h2>
          </div>
          <div className="smartone-card-section__body">
            <div className="smartone-summary-band">
              <div className="smartone-ledger-list">
                <div className="smartone-ledger-row">
                  <span>Material Subtotal</span>
                  <span className="smartone-ledger-amount">
                    {currency}{" "}
                    {materialSubtotal.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {discountAmount > 0 && (
                  <div className="smartone-ledger-row">
                    <span>Discount</span>
                    <span className="smartone-ledger-amount smartone-ledger-amount--danger">
                      - {currency}{" "}
                      {discountAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="smartone-ledger-row">
                  <span>DPP (Tax Base)</span>
                  <span className="smartone-ledger-amount">
                    {currency}{" "}
                    {dppAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="smartone-ledger-row">
                  <span>
                    {isKawasanBerikat
                      ? "VAT (PPN Ditangguhkan)"
                      : `VAT / PPn (${ppnRate}%)`}
                  </span>
                  <span className="smartone-ledger-amount">
                    {currency}{" "}
                    {ppnAmount.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="smartone-ledger-row">
                  <span>Total Other Costs</span>
                  <span className="smartone-ledger-amount">
                    {currency}{" "}
                    {totalOtherCosts.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                {totalPph > 0 && (
                  <div className="smartone-ledger-row">
                    <span>PPh Deduction</span>
                    <span className="smartone-ledger-amount smartone-ledger-amount--danger">
                      - {currency}{" "}
                      {totalPph.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                )}
                <div className="smartone-ledger-row smartone-ledger-row--total">
                  <span>Grand Total</span>
                  <span className="smartone-ledger-amount smartone-ledger-amount--primary">
                    {displayOrderTotal}
                  </span>
                </div>
              </div>

              <div className="smartone-notes-box">
                <strong>PO Note &amp; Delivery Instructions</strong>
                <div>{poNote || "No delivery remarks entered."}</div>
              </div>
            </div>
          </div>
        </div>
      }
      historySection={
        showHistory ? (
          <div className="smartone-card-section">
            <div className="smartone-card-section__header">
              <h2 className="smartone-card-section__title">
                Transaction History &amp; Activity Log
              </h2>
              <span className="smartone-card-section__meta">
                {activityLogEntries.length} records
              </span>
            </div>
            <div className="smartone-card-section__body smartone-card-section__body--flush">
              <div className="smartone-table-wrap">
                <table className="audit-log-table">
                  <thead>
                    <tr>
                      <th>Actor</th>
                      <th>Activity Performed</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogEntries.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.actor}</strong>
                          <span className="smartone-td-sub">{log.role}</span>
                        </td>
                        <td>{log.action}</td>
                        <td className="smartone-td-mono smartone-td-muted">{log.timestamp}</td>
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
        ) : undefined
      }
    />
  );
}
