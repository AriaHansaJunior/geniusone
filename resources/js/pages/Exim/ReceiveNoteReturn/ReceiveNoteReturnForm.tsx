import React, { useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { PickSalesDeliveryItemModal } from "./PickSalesDeliveryItemModal";
import { initialAdditionalCostRecords } from "../../Procurement/PurchaseMaster/AdditionalCosts/additional-costs-types";
import {
  customerList,
  docTypesList,
  returnTypesList,
  vehicleTypesList,
  currencyList,
} from "./receive-note-return-data";
import type {
  ReceiveNoteReturnRecord,
  ReceiveNoteReturnItem,
  SalesReturnItemToPick,
} from "./receive-note-return-types";

interface ReceiveNoteReturnFormProps {
  onBack: () => void;
  onSave?: (newRecord: ReceiveNoteReturnRecord) => void;
}

export function ReceiveNoteReturnForm({
  onBack,
  onSave,
}: ReceiveNoteReturnFormProps) {
  // Active Tab
  const [activeTab, setActiveTab] = useState<"item-detail" | "additional-costs">(
    "item-detail"
  );

  // Form Fields - First Row
  const [arrivalDate, setArrivalDate] = useState("2026-10-14");
  const [customer, setCustomer] = useState("");
  const [currency, setCurrency] = useState("IDR - RUPIAH");
  const [jenisRetur, setJenisRetur] = useState("Sales Delivery");

  // Form Fields - Second Row
  const [vehicleType, setVehicleType] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [typeOfDocument, setTypeOfDocument] = useState("BC 4.0");

  // Notes
  const [notes, setNotes] = useState("");

  // Additional Costs State (preserved across tab switching)
  const [additionalCostRemark, setAdditionalCostRemark] = useState("");
  const [additionalCostAmount, setAdditionalCostAmount] = useState<number>(0);

  // Item Detail table state
  const [items, setItems] = useState<ReceiveNoteReturnItem[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Validation alerts
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [notice, setNotice] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  // Totals calculations
  const totalSubtotal = items.reduce((sum, it) => sum + it.subtotal, 0);
  const grandTotal = totalSubtotal + (additionalCostAmount || 0);

  // Handle adding picked sales items
  const handleAddPickedItems = (pickedItems: SalesReturnItemToPick[]) => {
    const newItems: ReceiveNoteReturnItem[] = pickedItems.map((p, idx) => {
      const nextNo = items.length + idx + 1;
      const initialReturQty = p.availableReturnQty;
      const subtotal = initialReturQty * p.price;

      return {
        id: `rnr-item-${Date.now()}-${p.id}`,
        no: nextNo,
        doNumber: p.doNumber,
        doDate: p.doDate,
        sjNumber: p.sjNumber,
        itemCode: p.itemCode,
        itemName: p.itemName,
        quantity: initialReturQty,
        unit: p.unit,
        qtyPackage: p.packageQty,
        packageType: p.packageType,
        price: p.price,
        subtotal: subtotal,
        subtotalIdr: subtotal,
        deliveryQty: p.deliveryQty,
        returQty: initialReturQty,
      };
    });

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it, idx) => ({ ...it, no: idx + 1 }))
    );
  };

  const handleUpdateItemReturQty = (id: string, newQtyVal: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        const validQty = isNaN(newQtyVal) || newQtyVal < 0 ? 0 : newQtyVal;
        const newSubtotal = validQty * it.price;
        return {
          ...it,
          quantity: validQty,
          returQty: validQty,
          subtotal: newSubtotal,
          subtotalIdr: newSubtotal,
        };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errors: { [key: string]: string } = {};
    if (!customer) errors.customer = "Customer is required.";
    if (!currency || currency === "Select Currency") errors.currency = "Currency is required.";
    if (!jenisRetur || jenisRetur === "Select Type of Return") errors.jenisRetur = "Type of Return is required.";

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setNotice({
        type: "warning",
        message: "Please select Customer, Currency, and Type of Return before saving.",
      });
      return;
    }

    setFormErrors({});

    const formattedArrivalDate = arrivalDate.includes("-")
      ? arrivalDate.split("-").reverse().join("-")
      : arrivalDate;

    const rnNumber = `0592/RN-IMLI/I/${new Date().getFullYear()}`;

    const newRecord: ReceiveNoteReturnRecord = {
      id: `rnr-${Date.now()}`,
      no: 1,
      rnNumber,
      rnDate: formattedArrivalDate,
      deliveryOrder: items.length > 0 ? items[0].doNumber : null,
      doDate: items.length > 0 ? items[0].doDate || "-" : null,
      customer: customer,
      facility: "FASILITAS",
      bcCode: typeOfDocument && typeOfDocument !== "Select Option..." ? typeOfDocument : "BC 4.0",
      ajuNumber: "00004001456220260127000999",
      noDaftar: "008100",
      amount: grandTotal,
      amountFormatted: `IDR ${grandTotal.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      description: notes || "-",
      warehouseTransaction: `0619/WHIN-IMLI/T/I/${new Date().getFullYear()}`,
      warehouseReceiveDate: formattedArrivalDate,
      approvalStatus: "Draft",
      userCreated: "USER",
      createdAtTimestamp: `${formattedArrivalDate} 10:00`,
      arrivalDate: formattedArrivalDate,
      typeOfReturn: jenisRetur,
      salesDeliveryNumber: items.length > 0 ? items[0].sjNumber || items[0].doNumber : "0095/SJ-LKL/IMLI/2026",
      salesDeliveryLine: "01",
      vehicleType: vehicleType && vehicleType !== "Select Option..." ? vehicleType : "-",
      licensePlate: licensePlate || "-",
      createdAt: `${formattedArrivalDate} 10:00 by USER`,
      lastUpdatedAt: `${formattedArrivalDate} 10:00 by USER`,
      releasedAt: "-",
      approvedAt: "-",
      items: items,
      totalSubtotal: totalSubtotal,
      totalAdditionalCost: additionalCostAmount,
      grandTotal: grandTotal,
      notes: notes,
    };

    if (onSave) {
      onSave(newRecord);
    }
  };

  const alreadySelectedKeys = items.map(
    (it) => `${it.doNumber}-${it.itemCode}`
  );

  return (
    <div className="transaction-create-page">
      {/* Page Title */}
      <div className="tx-page-header">
        <h1 className="tx-page-title">Add Receive Note Retur</h1>
      </div>

      {/* Notice Message */}
      {notice && (
        <div
          style={{
            padding: "10px 16px",
            background:
              notice.type === "warning"
                ? "#fffbeb"
                : notice.type === "success"
                ? "#f0fdf4"
                : "#eff6ff",
            border: `1px solid ${
              notice.type === "warning"
                ? "#fde68a"
                : notice.type === "success"
                ? "#bbf7d0"
                : "#bfdbfe"
            }`,
            borderRadius: "var(--radius-sm)",
            color:
              notice.type === "warning"
                ? "#92400e"
                : notice.type === "success"
                ? "#166534"
                : "#1e40af",
            fontSize: "12.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={
                notice.type === "warning"
                  ? "alertTriangle"
                  : notice.type === "success"
                  ? "check"
                  : "info"
              }
              size={16}
            />
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            style={{
              border: 0,
              background: "transparent",
              cursor: "pointer",
              fontWeight: 700,
              color: "inherit",
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Panel */}
      <div className="tx-panel">
        <form onSubmit={handleSubmit}>
          {/* Header Row 1: Arrival Date, Customer, Currency, Jenis Retur */}
          <div className="tx-header-grid" style={{ marginBottom: "14px" }}>
            {/* Arrival Date */}
            <div className="master-form-group">
              <label className="master-form-label">
                Arrival Date <span className="required-asterisk">*</span>
              </label>
              <CustomDatePicker
                value={arrivalDate}
                onChange={(val) => setArrivalDate(val)}
              />
            </div>

            {/* Customer */}
            <div className="master-form-group">
              <label className="master-form-label">
                Customer <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                value={customer}
                onChange={(val) => {
                  setCustomer(val);
                  if (formErrors.customer) {
                    setFormErrors((prev) => ({ ...prev, customer: "" }));
                  }
                }}
                placeholder="Select Customer"
                options={[
                  { value: "", label: "Select Customer" },
                  ...customerList
                    .filter((c) => c !== "Choose Customer")
                    .map((cust) => ({ value: cust, label: cust })),
                ]}
              />
              {formErrors.customer && (
                <span className="master-form-error">{formErrors.customer}</span>
              )}
            </div>

            {/* Currency */}
            <div className="master-form-group">
              <label className="master-form-label">
                Currency <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                value={currency}
                onChange={(val) => {
                  setCurrency(val);
                  if (formErrors.currency) {
                    setFormErrors((prev) => ({ ...prev, currency: "" }));
                  }
                }}
                options={currencyList.map((cur) => ({ value: cur, label: cur }))}
              />
              {formErrors.currency && (
                <span className="master-form-error">{formErrors.currency}</span>
              )}
            </div>

            {/* Jenis Retur */}
            <div className="master-form-group">
              <label className="master-form-label">
                Jenis Retur <span className="required-asterisk">*</span>
              </label>
              <CustomSelect
                value={jenisRetur}
                onChange={(val) => {
                  setJenisRetur(val);
                  if (formErrors.jenisRetur) {
                    setFormErrors((prev) => ({ ...prev, jenisRetur: "" }));
                  }
                }}
                options={returnTypesList.map((rt) => ({ value: rt, label: rt }))}
              />
              {formErrors.jenisRetur && (
                <span className="master-form-error">{formErrors.jenisRetur}</span>
              )}
            </div>
          </div>

          {/* Header Row 2: Vehicle Type, License Plate, Type of Document */}
          <div className="tx-header-grid" style={{ marginBottom: "16px" }}>
            {/* Vehicle Type */}
            <div className="master-form-group">
              <label className="master-form-label">Vehicle Type</label>
              <CustomSelect
                value={vehicleType}
                onChange={(val) => setVehicleType(val)}
                options={vehicleTypesList.map((vt) => ({ value: vt, label: vt }))}
              />
            </div>

            {/* License Plate */}
            <div className="master-form-group">
              <label className="master-form-label">License Plate</label>
              <input
                type="text"
                className="master-form-input"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value)}
                placeholder="e.g. 123, L 8821 UZ"
              />
            </div>

            {/* Type of Document */}
            <div className="master-form-group">
              <label className="master-form-label">Type of Document</label>
              <CustomSelect
                value={typeOfDocument}
                onChange={(val) => setTypeOfDocument(val)}
                placeholder="Select Option..."
                options={[
                  { value: "", label: "Select Option..." },
                  ...docTypesList
                    .filter((d) => d !== "All Type of Documents")
                    .map((dt) => ({ value: dt, label: dt })),
                ]}
              />
            </div>
          </div>

          {/* Interactive Tabs */}
          <div className="tx-tabs-header">
            <button
              type="button"
              className={`tx-tab-btn ${activeTab === "item-detail" ? "active" : ""}`}
              onClick={() => setActiveTab("item-detail")}
            >
              Item Detail
            </button>
            <button
              type="button"
              className={`tx-tab-btn ${activeTab === "additional-costs" ? "active" : ""}`}
              onClick={() => setActiveTab("additional-costs")}
            >
              Additional Costs
            </button>
          </div>

          {/* Tab 1: Item Detail Content */}
          {activeTab === "item-detail" && (
            <div>
              {/* Add Item Button */}
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "10px" }}>
                <button
                  type="button"
                  onClick={() => setIsPickerOpen(true)}
                  style={{
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "1px solid #15803d",
                    padding: "7px 14px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                  }}
                >
                  <span>Add Item</span>
                </button>
              </div>

              {/* Grouped Item Table */}
              <div className="tx-table-container">
                <table className="tx-grid-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} style={{ width: "45px", textAlign: "center" }}>
                        No
                      </th>
                      <th rowSpan={2} style={{ width: "140px" }}>SJ Number</th>
                      <th rowSpan={2} style={{ minWidth: "200px" }}>Item Name</th>
                      <th rowSpan={2} className="th-right" style={{ width: "110px" }}>
                        Price
                      </th>
                      <th colSpan={2} className="th-center" style={{ borderBottom: "1px solid var(--line)" }}>
                        Quantity
                      </th>
                      <th rowSpan={2} className="th-right" style={{ width: "120px" }}>
                        Sub Total
                      </th>
                      <th colSpan={2} className="th-center" style={{ borderBottom: "1px solid var(--line)" }}>
                        Package
                      </th>
                      <th rowSpan={2} className="th-center" style={{ width: "50px" }}>
                        Action
                      </th>
                    </tr>
                    <tr>
                      <th className="th-right" style={{ width: "80px" }}>Delivery</th>
                      <th className="th-right" style={{ width: "80px" }}>Retur</th>
                      <th className="th-right" style={{ width: "70px" }}>Qty</th>
                      <th style={{ width: "90px" }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ textAlign: "center", padding: "40px 20px", color: "var(--muted)" }}>
                          No items selected yet. Click the green <strong>Add Item</strong> button above to pick return items.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={it.id}>
                          <td className="td-center">{idx + 1}</td>
                          <td style={{ fontWeight: 600 }}>{it.sjNumber || it.doNumber}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{it.itemName}</div>
                            <div style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "monospace" }}>{it.itemCode}</div>
                          </td>
                          <td className="td-right" style={{ fontFamily: "monospace" }}>
                            {it.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="td-right" style={{ fontFamily: "monospace", color: "var(--muted)" }}>
                            {(it.deliveryQty ?? it.quantity).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="td-right">
                            <input
                              type="number"
                              className="tx-input-cell tx-input-cell--num"
                              value={it.returQty ?? it.quantity}
                              onChange={(e) =>
                                handleUpdateItemReturQty(it.id, parseFloat(e.target.value))
                              }
                              min="0"
                              step="any"
                              style={{ width: "75px", height: "28px" }}
                            />
                          </td>
                          <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                            {it.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="td-right" style={{ fontFamily: "monospace" }}>{it.qtyPackage}</td>
                          <td>{it.packageType}</td>
                          <td className="td-center">
                            <button
                              type="button"
                              className="tx-row-delete-btn"
                              onClick={() => handleRemoveItem(it.id)}
                              title="Remove Item"
                              aria-label="Remove item"
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    {/* Summary Row 1: Total */}
                    <tr style={{ background: "var(--slate-50)", borderTop: "2px solid var(--line)" }}>
                      <td colSpan={6} className="td-right" style={{ fontWeight: 700 }}>
                        Total
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 700 }}>
                        {totalSubtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={3}></td>
                    </tr>

                    {/* Summary Row 2: Total Additional Cost */}
                    <tr style={{ background: "var(--slate-50)" }}>
                      <td colSpan={6} className="td-right" style={{ fontWeight: 600, color: "var(--muted)" }}>
                        Total Additional Cost
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 600 }}>
                        {additionalCostAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={3}></td>
                    </tr>

                    {/* Summary Row 3: Grand Total */}
                    <tr style={{ background: "var(--slate-100)", borderTop: "1px solid var(--line)" }}>
                      <td colSpan={6} className="td-right" style={{ fontWeight: 800 }}>
                        Grand Total
                      </td>
                      <td className="td-right" style={{ fontFamily: "monospace", fontWeight: 800, color: "var(--blue-700)", fontSize: "13px" }}>
                        {grandTotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Tab 2: Additional Costs Content */}
          {activeTab === "additional-costs" && (
            <div style={{ padding: "16px", background: "rgba(248, 250, 252, 0.7)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", marginBottom: "16px" }}>
              <div style={{ marginBottom: "14px" }}>
                <h4 style={{ margin: "0 0 4px", fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>Additional Return Costs</h4>
                <p style={{ margin: 0, fontSize: "11.5px", color: "var(--muted)" }}>
                  Optionally record packaging, delivery discrepancy, or transport fees associated with this sales return.
                </p>
              </div>
              <div className="tx-header-grid">
                <div className="master-form-group">
                  <label className="master-form-label">Additional Cost</label>
                  <CustomSelect
                    value={additionalCostRemark}
                    onChange={(val) => setAdditionalCostRemark(val)}
                    placeholder="Select Additional Cost..."
                    options={[
                      { value: "", label: "Select Additional Cost..." },
                      ...initialAdditionalCostRecords
                        .filter((ac) => !ac.hidden)
                        .map((ac) => ({
                          value: ac.costName,
                          label: ac.costCode ? `${ac.costCode} — ${ac.costName}` : ac.costName,
                        })),
                    ]}
                  />
                </div>
                <div className="master-form-group">
                  <label className="master-form-label">Amount (IDR)</label>
                  <input
                    type="number"
                    className="master-form-input"
                    value={additionalCostAmount || ""}
                    onChange={(e) =>
                      setAdditionalCostAmount(parseFloat(e.target.value) || 0)
                    }
                    placeholder="0.00"
                    min="0"
                    step="any"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Full-width Notes textarea */}
          <div className="master-form-group" style={{ marginTop: "14px", marginBottom: "16px" }}>
            <label className="master-form-label">Notes</label>
            <textarea
              className="master-form-input"
              rows={3}
              style={{ height: "auto", padding: "8px 12px" }}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional remarks or notes..."
            />
          </div>

          {/* Form Actions: Save & Cancel */}
          <div className="tx-actions-bar">
            <button type="submit" className="btn-tx-save">
              <span>Save</span>
            </button>
            <button
              type="button"
              className="btn-tx-cancel"
              onClick={onBack}
            >
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>

      {/* Item Picker Modal */}
      <PickSalesDeliveryItemModal
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        onAddItems={handleAddPickedItems}
        alreadySelectedKeys={alreadySelectedKeys}
      />
    </div>
  );
}

export default ReceiveNoteReturnForm;
