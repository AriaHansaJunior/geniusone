import React from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { type AdditionalCostRecord } from "../PurchaseMaster/AdditionalCosts/additional-costs-types";
import type { POItemRow, POAdditionalCostRow } from "./PurchaseOrderCreate";

interface PurchaseOrderTabsAndSummaryProps {
  activeTab: "items" | "costs";
  setActiveTab: (tab: "items" | "costs") => void;
  items: POItemRow[];
  additionalCosts: POAdditionalCostRow[];
  setIsPrPickerOpen: (open: boolean) => void;
  formErrors: Record<string, string>;
  allPrOptions: { prNumber: string; label: string }[];
  handleSelectPr: (rowId: string, prNumber: string) => void;
  findExistingPoForPr: (prNumber: string) => any;
  handleUpdateItemField: (id: string, field: keyof POItemRow, val: any) => void;
  handleDeleteItemRow: (id: string) => void;
  handleAddCostRow: () => void;
  masterAdditionalCosts: AdditionalCostRecord[];
  handleUpdateCostField: (id: string, field: keyof POAdditionalCostRow, val: any) => void;
  handleDeleteCostRow: (id: string) => void;
  totalSubtotal: number;
  discountOverallPercent: number;
  setDiscountOverallPercent: (val: number) => void;
  discountAmount: number;
  dpp: number;
  isPpnActive: boolean;
  setIsPpnActive: (val: boolean) => void;
  ppnAmount: number;
  statusFacility: "Non Facility" | "Facility";
  isKawasanBerikat: boolean;
  setIsKawasanBerikat: (val: boolean) => void;
  totalAdditionalCosts: number;
  totalPph: number;
  currency: string;
  grandTotal: number;
  safeExtractString: (val: any) => string;
}

export function PurchaseOrderTabsAndSummary({
  activeTab,
  setActiveTab,
  items,
  additionalCosts,
  setIsPrPickerOpen,
  formErrors,
  allPrOptions,
  handleSelectPr,
  findExistingPoForPr,
  handleUpdateItemField,
  handleDeleteItemRow,
  handleAddCostRow,
  masterAdditionalCosts,
  handleUpdateCostField,
  handleDeleteCostRow,
  totalSubtotal,
  discountOverallPercent,
  setDiscountOverallPercent,
  discountAmount,
  dpp,
  isPpnActive,
  setIsPpnActive,
  ppnAmount,
  statusFacility,
  isKawasanBerikat,
  setIsKawasanBerikat,
  totalAdditionalCosts,
  totalPph,
  currency,
  grandTotal,
  safeExtractString,
}: PurchaseOrderTabsAndSummaryProps) {
  return (
    <>
      {/* Tab Navigation: Item Detail & Additional costs */}
      <div className="tx-tabs-header">
        <button
          type="button"
          className={`tx-tab-btn ${activeTab === "items" ? "active" : ""}`}
          onClick={() => setActiveTab("items")}
        >
          Item Detail ({items.length})
        </button>
        <button
          type="button"
          className={`tx-tab-btn ${activeTab === "costs" ? "active" : ""}`}
          onClick={() => setActiveTab("costs")}
        >
          Additional Costs ({additionalCosts.length})
        </button>
      </div>

      {/* Tab 1: Item Detail */}
      {activeTab === "items" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
              Select an approved PR Number below to auto-populate requisition items and quantities.
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <Button
                variant="secondary"
                onClick={() => setIsPrPickerOpen(true)}
                type="button"
              >
                Add Item
              </Button>
            </div>
          </div>

          {formErrors.items && (
            <div style={{ color: "var(--red-600)", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
              {formErrors.items}
            </div>
          )}

          <div className="tx-table-container">
            <table className="tx-grid-table">
              <thead>
                <tr>
                  <th rowSpan={2} style={{ minWidth: "46px", width: "46px", textAlign: "center" }}>No</th>
                  <th rowSpan={2} style={{ minWidth: "230px" }}>PR Number</th>
                  <th rowSpan={2} style={{ minWidth: "210px" }}>Item Name</th>
                  <th rowSpan={2} style={{ minWidth: "140px" }}>Item Code</th>
                  <th rowSpan={2} style={{ minWidth: "160px" }}>Item Alias *</th>
                  <th rowSpan={2} style={{ minWidth: "125px", textAlign: "right" }}>Price</th>
                  <th rowSpan={2} style={{ minWidth: "90px" }}>Unit</th>
                  {/* Grouped Header for Quantity */}
                  <th colSpan={3} style={{ textAlign: "center", background: "var(--surface-muted, #f8fafc)", borderBottom: "1px solid var(--line, #e2e8f0)" }}>Quantity</th>
                  <th rowSpan={2} style={{ minWidth: "220px", textAlign: "center" }}>Discount</th>
                  <th rowSpan={2} style={{ minWidth: "125px", textAlign: "right" }}>Subtotal</th>
                  <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>LME</th>
                  <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>Optional Rate</th>
                  <th rowSpan={2} style={{ minWidth: "95px", textAlign: "right" }}>LME (%)</th>
                  <th rowSpan={2} style={{ minWidth: "125px" }}>PPH</th>
                  <th rowSpan={2} style={{ minWidth: "120px", textAlign: "right" }}>Subtotal PPH</th>
                  <th rowSpan={2} style={{ minWidth: "160px" }}>Remark</th>
                  <th rowSpan={2} style={{ minWidth: "52px", width: "52px", textAlign: "center" }}>Action</th>
                </tr>
                <tr>
                  {/* Sub-headers for Quantity with consistent GeniusOne design tokens */}
                  <th style={{ minWidth: "95px", textAlign: "right", fontSize: "10.5px", fontWeight: 700, background: "var(--surface-muted, #f8fafc)", color: "var(--ink-muted, #64748b)" }}>Requested</th>
                  <th style={{ minWidth: "95px", textAlign: "right", fontSize: "10.5px", fontWeight: 700, background: "var(--surface-muted, #f8fafc)", color: "var(--ink-muted, #64748b)" }}>Purchased</th>
                  <th style={{ minWidth: "105px", textAlign: "right", fontSize: "10.5px", fontWeight: 700, background: "var(--surface-muted, #f8fafc)", color: "var(--ink-muted, #64748b)" }}>Order *</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((row, index) => (
                    <tr key={row.id}>
                      {/* 1. No */}
                      <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>
                        {index + 1}
                      </td>

                      {/* 2. PR Number */}
                      <td>
                        {row.prNumber && row.prNumber !== "—" ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: "12px" }}>
                              {row.prNumber}
                            </span>
                            {row.pr_has_items_id && (
                              <span
                                style={{
                                  fontSize: "10px",
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  background: "#e0f2fe",
                                  color: "#0369a1",
                                }}
                              >
                                PR Item
                              </span>
                            )}
                          </div>
                        ) : (
                          <CustomSelect
                            className="tx-custom-select-cell"
                            value={row.prNumber}
                            onChange={(val) => handleSelectPr(row.id, val)}
                            placeholder="Select PR Number..."
                            options={[
                              { value: "", label: "Select PR Number..." },
                              { value: "—", label: "— None (Direct PO Item) —" },
                              ...allPrOptions.map((p) => ({
                                value: p.prNumber,
                                label: p.label,
                              })),
                            ]}
                          />
                        )}
                        {(() => {
                          const dupPo = findExistingPoForPr(row.prNumber);
                          if (dupPo) {
                            return (
                              <div
                                style={{
                                  fontSize: "10.5px",
                                  color: "#b45309",
                                  background: "#fef3c7",
                                  border: "1px solid #fde68a",
                                  borderRadius: "3px",
                                  padding: "2px 5px",
                                  marginTop: "3px",
                                  lineHeight: 1.2,
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "3px",
                                }}
                              >
                                <span>⚠️ In PO: <strong>{dupPo.poNumber}</strong></span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>

                      {/* 3. Item Name (Read-Only) */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell tx-input-cell--disabled"
                          placeholder="Item name..."
                          value={row.itemName}
                          readOnly
                          disabled
                        />
                      </td>

                      {/* 4. Item Code (Read-Only) */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell tx-input-cell--disabled"
                          placeholder="Code..."
                          value={row.itemCode || "—"}
                          readOnly
                          disabled
                        />
                      </td>

                      {/* 5. Item Alias (Editable) */}
                      <td>
                        <input
                          type="text"
                          className={`tx-input-cell ${formErrors[`item_${index}_name`] ? "has-error" : ""}`}
                          placeholder="Alias..."
                          value={row.itemAlias}
                          onChange={(e) => handleUpdateItemField(row.id, "itemAlias", e.target.value)}
                        />
                      </td>

                      {/* 6. Price */}
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="tx-input-cell tx-input-cell--num"
                          value={row.price}
                          onChange={(e) => handleUpdateItemField(row.id, "price", parseFloat(e.target.value) || 0)}
                        />
                      </td>

                      {/* 7. Unit (Read-only) */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell tx-input-cell--disabled"
                          value={row.unit || "PCE"}
                          readOnly
                          disabled
                          style={{ textAlign: "center" }}
                          title="Unit cannot be changed"
                        />
                      </td>

                      {/* 8. Quantity: Requested */}
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)", fontWeight: 600 }}>
                        {(Number(row.requestedQty) || 0).toFixed(4)}
                      </td>

                      {/* 8. Quantity: Purchased */}
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--muted)" }}>
                        {(Number(row.purchasedQty) || 0).toFixed(4)}
                      </td>

                      {/* 8. Quantity: Order */}
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          className="tx-input-cell tx-input-cell--num"
                          value={row.orderQty}
                          onChange={(e) => handleUpdateItemField(row.id, "orderQty", parseFloat(e.target.value) || 0)}
                        />
                      </td>

                      {/* 9. Discount: Dropdown Selector + Value Input */}
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <div style={{ width: "125px", flexShrink: 0 }}>
                            <CustomSelect
                              className="tx-custom-select-cell"
                              value={row.discountType || "none"}
                              onChange={(val) => handleUpdateItemField(row.id, "discountType", val)}
                              options={[
                                { value: "none", label: "None" },
                                { value: "percent", label: "Percentage (%)" },
                                { value: "amount", label: "Amount" },
                              ]}
                            />
                          </div>
                          <div style={{ position: "relative", flex: 1, minWidth: "75px" }}>
                            <input
                              type="number"
                              step="any"
                              min="0"
                              max={row.discountType === "percent" ? 100 : undefined}
                              disabled={!row.discountType || row.discountType === "none"}
                              className={`tx-input-cell tx-input-cell--num ${!row.discountType || row.discountType === "none" ? "tx-input-cell--disabled" : ""
                                }`}
                              style={{
                                paddingRight: row.discountType === "percent" ? "20px" : undefined,
                              }}
                              placeholder={
                                !row.discountType || row.discountType === "none"
                                  ? "—"
                                  : row.discountType === "percent"
                                    ? "0"
                                    : "0.00"
                              }
                              value={
                                !row.discountType || row.discountType === "none"
                                  ? ""
                                  : row.discountVal !== undefined && row.discountVal !== null && row.discountVal !== 0
                                    ? row.discountVal
                                    : row.discountVal === 0
                                      ? 0
                                      : ""
                              }
                              onChange={(e) =>
                                handleUpdateItemField(
                                  row.id,
                                  "discountVal",
                                  e.target.value === "" ? 0 : parseFloat(e.target.value) || 0
                                )
                              }
                              title={
                                !row.discountType || row.discountType === "none"
                                  ? "Select discount type from dropdown first"
                                  : `Enter discount ${row.discountType === "percent" ? "percentage (0-100%)" : "amount"}`
                              }
                            />
                            {row.discountType === "percent" && (
                              <span
                                style={{
                                  position: "absolute",
                                  right: "8px",
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  color: "var(--ink-soft)",
                                  pointerEvents: "none",
                                }}
                              >
                                %
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 9. Subtotal */}
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink)" }}>
                        {row.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 10. LME */}
                      <td>
                        <input
                          type="number"
                          step="any"
                          className="tx-input-cell tx-input-cell--num"
                          value={row.lme}
                          onChange={(e) => handleUpdateItemField(row.id, "lme", parseFloat(e.target.value) || 0)}
                        />
                      </td>

                      {/* 11. Optional Rate */}
                      <td>
                        <input
                          type="number"
                          step="any"
                          className="tx-input-cell tx-input-cell--num"
                          value={row.optionalRate}
                          onChange={(e) => handleUpdateItemField(row.id, "optionalRate", parseFloat(e.target.value) || 1)}
                        />
                      </td>

                      {/* 12. Percentage LME (Read-only) */}
                      <td>
                        <input
                          type="number"
                          step="any"
                          className="tx-input-cell tx-input-cell--num tx-input-cell--disabled"
                          value={row.percentageLme}
                          readOnly
                          disabled
                          title="LME (%) cannot be changed"
                        />
                      </td>

                      {/* 13. PPH */}
                      <td>
                        <CustomSelect
                          className="tx-custom-select-cell"
                          value={String(row.pphRate)}
                          onChange={(val) => handleUpdateItemField(row.id, "pphRate", parseFloat(val) || 0)}
                          options={[
                            { value: "0", label: "0% (None)" },
                            { value: "0.02", label: "2% (PPH 23)" },
                            { value: "0.005", label: "0.5% (Final)" },
                            { value: "0.025", label: "2.5% (PPH 22)" },
                          ]}
                        />
                      </td>

                      {/* 14. Subtotal PPH */}
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", color: "var(--ink-soft)" }}>
                        {row.subtotalPph.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 15. Remark */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell"
                          placeholder="Line remark..."
                          value={row.remark}
                          onChange={(e) => handleUpdateItemField(row.id, "remark", e.target.value)}
                        />
                      </td>

                      {/* 16. Action Delete */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="tx-row-delete-btn"
                          title="Remove item"
                          onClick={() => handleDeleteItemRow(row.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={18}
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        color: "var(--muted)",
                        fontSize: "13px",
                      }}
                    >
                      No items added yet. Click "Add Item" above to choose requisition items.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Additional costs */}
      {activeTab === "costs" && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
            <Button variant="secondary" onClick={handleAddCostRow} type="button">
              Add Cost Row
            </Button>
          </div>

          <div className="tx-table-container">
            <table className="tx-grid-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "240px" }}>Cost Description</th>
                  <th style={{ width: "180px", textAlign: "right" }}>Amount</th>
                  <th style={{ minWidth: "260px" }}>Remark</th>
                  <th style={{ width: "60px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {additionalCosts.map((cost, idx) => (
                  <tr key={cost.id}>
                    <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 700 }}>
                      {idx + 1}
                    </td>
                    <td>
                      <CustomSelect
                        className="tx-custom-select-cell"
                        value={cost.costName}
                        onChange={(val) => handleUpdateCostField(cost.id, "costName", val)}
                        placeholder="Select Additional Cost..."
                        options={[
                          { value: "", label: "Select Additional Cost..." },
                          ...masterAdditionalCosts
                            .filter((ac) => !ac.hidden)
                            .map((ac) => ({
                              value: ac.costName,
                              label: ac.costCode ? `${ac.costCode} — ${ac.costName}` : ac.costName,
                            })),
                          ...(cost.costName && !masterAdditionalCosts.some((ac) => ac.costName === cost.costName)
                            ? [{ value: cost.costName, label: cost.costName }]
                            : []),
                        ]}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        className="tx-input-cell tx-input-cell--num"
                        value={cost.amount}
                        onChange={(e) => handleUpdateCostField(cost.id, "amount", parseFloat(e.target.value) || 0)}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="tx-input-cell"
                        placeholder="Cost remark..."
                        value={cost.remark}
                        onChange={(e) => handleUpdateCostField(cost.id, "remark", e.target.value)}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        className="tx-row-delete-btn"
                        title="Remove cost"
                        onClick={() => handleDeleteCostRow(cost.id)}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
                {additionalCosts.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                      No additional costs registered. Click "Add Cost Row" above if incidental fees apply.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Financial Summary Card */}
      <div className="po-summary-container">
        <div className="po-summary-card">
          <div className="po-summary-row">
            <span>TOTAL</span>
            <span>{totalSubtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="po-summary-row">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              Discount (%)
              <input
                type="number"
                min="0"
                max="100"
                style={{ width: "55px", padding: "2px 4px", fontSize: "11px", border: "1px solid var(--line)" }}
                value={discountOverallPercent}
                onChange={(e) => setDiscountOverallPercent(parseFloat(e.target.value) || 0)}
              />
            </span>
            <span>{discountAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="po-summary-row">
            <span>DPP</span>
            <span>{dpp.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="po-summary-row">
            <label className="master-checkbox-label" style={{ fontSize: "12px", gap: "6px" }}>
              <input
                type="checkbox"
                checked={isPpnActive}
                onChange={(e) => setIsPpnActive(e.target.checked)}
              />
              <span>PPN (11%)</span>
            </label>
            <span>{ppnAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          {/* Kawasan Berikat Routing & Tax Rule: Facility = mandatory Kawasan Berikat; Non Facility = optional */}
          <div
            className="po-summary-row"
            style={{
              padding: "4px 8px",
              background: "rgba(241, 245, 249, 0.7)",
              borderRadius: "var(--radius-xs)",
              fontSize: "11.5px",
            }}
          >
            <label
              className="master-checkbox-label"
              style={{
                fontSize: "11.5px",
                gap: "6px",
                opacity: statusFacility === "Facility" ? 0.85 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={statusFacility === "Facility" ? true : isKawasanBerikat}
                disabled={statusFacility === "Facility"}
                onChange={(e) => setIsKawasanBerikat(e.target.checked)}
              />
              <span style={{ fontWeight: 600 }}>
                Kawasan Berikat {statusFacility === "Facility" ? "(Mandatory)" : "(Optional)"}
              </span>
            </label>
            <span
              style={{
                fontSize: "11px",
                color: (statusFacility === "Facility" || isKawasanBerikat) ? "var(--blue-700)" : "var(--muted)",
                fontWeight: 700,
              }}
            >
              {statusFacility === "Facility" || isKawasanBerikat ? "Via Receive Note (RN)" : "Direct to BPB"}
            </span>
          </div>

          <div className="po-summary-row">
            <span>Total Additional Costs</span>
            <span>{totalAdditionalCosts.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="po-summary-row">
            <span>Total PPH</span>
            <span>{totalPph.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <div className="po-summary-row grand-total">
            <span>GRAND TOTAL</span>
            <span>
              {safeExtractString(currency).split(" ")[0]} {(Number(grandTotal) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
