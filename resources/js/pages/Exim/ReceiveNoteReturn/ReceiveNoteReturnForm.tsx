import React, { useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { PickSalesDeliveryItemModal } from "./PickSalesDeliveryItemModal";
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
    <div className="rnr-form-page">
      {/* Page Title */}
      <div className="rnr-form-header">
        <h1 className="rnr-form-title">Add Receive Note Retur</h1>
      </div>

      {/* Notice Message */}
      {notice && (
        <div className={`rnr-alert rnr-alert--${notice.type}`}>
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
          <div className="rnr-alert__content">
            <p>{notice.message}</p>
          </div>
          <button
            type="button"
            className="rnr-alert-close"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSubmit} className="rnr-form-card">
        {/* Row 1: Arrival Date, Customer, Currency, Jenis Retur */}
        <div className="rnr-form-row">
          <div className="rnr-form-col-4">
            <label className="rnr-label">Arrival Date</label>
            <input
              type="date"
              className="rnr-input"
              value={arrivalDate}
              onChange={(e) => setArrivalDate(e.target.value)}
            />
          </div>

          <div className="rnr-form-col-4">
            <label className="rnr-label">Customer</label>
            <select
              className={`rnr-select ${formErrors.customer ? "has-error" : ""}`}
              value={customer}
              onChange={(e) => {
                setCustomer(e.target.value);
                if (formErrors.customer) {
                  setFormErrors((prev) => ({ ...prev, customer: "" }));
                }
              }}
            >
              <option value="">Select Customer</option>
              {customerList
                .filter((c) => c !== "Choose Customer")
                .map((cust) => (
                  <option key={cust} value={cust}>
                    {cust}
                  </option>
                ))}
            </select>
            {formErrors.customer && (
              <span className="rnr-error-msg">{formErrors.customer}</span>
            )}
          </div>

          <div className="rnr-form-col-4">
            <label className="rnr-label">Currency</label>
            <select
              className={`rnr-select ${formErrors.currency ? "has-error" : ""}`}
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                if (formErrors.currency) {
                  setFormErrors((prev) => ({ ...prev, currency: "" }));
                }
              }}
            >
              {currencyList.map((cur) => (
                <option key={cur} value={cur}>
                  {cur}
                </option>
              ))}
            </select>
            {formErrors.currency && (
              <span className="rnr-error-msg">{formErrors.currency}</span>
            )}
          </div>

          <div className="rnr-form-col-4">
            <label className="rnr-label">Jenis Retur</label>
            <select
              className={`rnr-select ${formErrors.jenisRetur ? "has-error" : ""}`}
              value={jenisRetur}
              onChange={(e) => {
                setJenisRetur(e.target.value);
                if (formErrors.jenisRetur) {
                  setFormErrors((prev) => ({ ...prev, jenisRetur: "" }));
                }
              }}
            >
              {returnTypesList.map((rt) => (
                <option key={rt} value={rt}>
                  {rt}
                </option>
              ))}
            </select>
            {formErrors.jenisRetur && (
              <span className="rnr-error-msg">{formErrors.jenisRetur}</span>
            )}
          </div>
        </div>

        {/* Row 2: Vehicle Type, License Plate, Type of Document */}
        <div className="rnr-form-row">
          <div className="rnr-form-col-4">
            <label className="rnr-label">Vehicle Type</label>
            <select
              className="rnr-select"
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
            >
              {vehicleTypesList.map((vt) => (
                <option key={vt} value={vt}>
                  {vt}
                </option>
              ))}
            </select>
          </div>

          <div className="rnr-form-col-4">
            <label className="rnr-label">License Plate</label>
            <input
              type="text"
              className="rnr-input"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. 123, L 8821 UZ"
            />
          </div>

          <div className="rnr-form-col-4">
            <label className="rnr-label">Type of Document</label>
            <select
              className="rnr-select"
              value={typeOfDocument}
              onChange={(e) => setTypeOfDocument(e.target.value)}
            >
              <option value="">Select Option...</option>
              {docTypesList
                .filter((d) => d !== "All Type of Documents")
                .map((dt) => (
                  <option key={dt} value={dt}>
                    {dt}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Interactive Tabs: Item Detail & Additional Costs */}
        <div className="rnr-tabs-container">
          <div className="rnr-tabs-header">
            <button
              type="button"
              className={`rnr-tab-btn ${
                activeTab === "item-detail" ? "rnr-tab-btn--active" : ""
              }`}
              onClick={() => setActiveTab("item-detail")}
            >
              Item Detail
            </button>
            <button
              type="button"
              className={`rnr-tab-btn ${
                activeTab === "additional-costs" ? "rnr-tab-btn--active" : ""
              }`}
              onClick={() => setActiveTab("additional-costs")}
            >
              Additional Costs
            </button>
          </div>

          {/* Tab 1: Item Detail Content */}
          {activeTab === "item-detail" && (
            <div className="rnr-tab-pane">
              {/* Add Item Button at upper right */}
              <div className="rnr-tab-actions">
                <button
                  type="button"
                  className="rnr-btn-add-item"
                  onClick={() => setIsPickerOpen(true)}
                >
                  <span>Add Item</span>
                </button>
              </div>

              {/* Grouped Item Table */}
              <div className="rnr-item-table-wrapper">
                <table className="rnr-form-table">
                  <thead>
                    <tr>
                      <th rowSpan={2} className="rnr-th-no">
                        No
                      </th>
                      <th rowSpan={2}>SJ Number</th>
                      <th rowSpan={2}>Item Name</th>
                      <th rowSpan={2} className="text-right">
                        Price
                      </th>
                      <th colSpan={2} className="text-center rnr-th-grouped">
                        Quantity
                      </th>
                      <th rowSpan={2} className="text-right">
                        Sub Total
                      </th>
                      <th colSpan={2} className="text-center rnr-th-grouped">
                        Package
                      </th>
                      <th rowSpan={2} className="rnr-th-action text-center">
                        Action
                      </th>
                    </tr>
                    <tr>
                      <th className="rnr-th-sub text-right">Delivery</th>
                      <th className="rnr-th-sub text-right">Retur</th>
                      <th className="rnr-th-sub text-right">Qty</th>
                      <th className="rnr-th-sub">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="rnr-table-empty">
                          No items selected yet. Click the green <strong>+ Add Item</strong> button above to pick return items.
                        </td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={it.id}>
                          <td className="text-center">{idx + 1}</td>
                          <td className="font-medium text-ink">{it.sjNumber || it.doNumber}</td>
                          <td>
                            <div className="font-medium text-ink">{it.itemName}</div>
                            <div className="text-xs text-muted font-mono">{it.itemCode}</div>
                          </td>
                          <td className="text-right font-mono">
                            {it.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right font-mono text-muted">
                            {(it.deliveryQty ?? it.quantity).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="text-right font-mono">
                            <input
                              type="number"
                              className="rnr-table-input text-right"
                              value={it.returQty ?? it.quantity}
                              onChange={(e) =>
                                handleUpdateItemReturQty(it.id, parseFloat(e.target.value))
                              }
                              min="0"
                              step="any"
                            />
                          </td>
                          <td className="text-right font-mono font-medium text-ink">
                            {it.subtotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="text-right font-mono">{it.qtyPackage}</td>
                          <td>{it.packageType}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="rnr-btn-remove-row"
                              onClick={() => handleRemoveItem(it.id)}
                              title="Remove Item"
                              aria-label="Remove item"
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    {/* Summary Row 1: Total */}
                    <tr className="rnr-table-summary-row">
                      <td colSpan={6} className="text-right font-bold text-ink">
                        Total
                      </td>
                      <td className="text-right font-mono font-bold text-ink">
                        {totalSubtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={3}></td>
                    </tr>

                    {/* Summary Row 2: Total Additional Cost */}
                    <tr className="rnr-table-summary-row">
                      <td colSpan={6} className="text-right font-medium text-ink">
                        Total Additional Cost
                      </td>
                      <td className="text-right font-mono font-medium text-ink">
                        {additionalCostAmount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td colSpan={3}></td>
                    </tr>

                    {/* Summary Row 3: Grand Total */}
                    <tr className="rnr-table-summary-row rnr-table-summary-row--grand">
                      <td colSpan={6} className="text-right font-bold text-ink">
                        Grand Total
                      </td>
                      <td className="text-right font-mono font-bold text-ink">
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
            <div className="rnr-tab-pane rnr-additional-costs-pane">
              <div className="rnr-add-costs-card">
                <div className="rnr-add-costs-header">
                  <h3 className="rnr-add-costs-title">Additional Return Costs</h3>
                  <p className="rnr-add-costs-subtitle">
                    Optionally record packaging, delivery discrepancy, or transport fees associated with this sales return.
                  </p>
                </div>
                <div className="rnr-form-row">
                  <div className="rnr-form-col-4">
                    <label className="rnr-label">Cost Description</label>
                    <input
                      type="text"
                      className="rnr-input"
                      value={additionalCostRemark}
                      onChange={(e) => setAdditionalCostRemark(e.target.value)}
                      placeholder="e.g. Transport inspection fee, repackaging"
                    />
                  </div>
                  <div className="rnr-form-col-4">
                    <label className="rnr-label">Amount (IDR)</label>
                    <input
                      type="number"
                      className="rnr-input"
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
            </div>
          )}
        </div>

        {/* Full-width Notes textarea */}
        <div className="rnr-notes-section">
          <label className="rnr-label">Notes</label>
          <textarea
            className="rnr-textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional remarks or notes..."
          />
        </div>

        {/* Form Actions: Save & Cancel */}
        <div className="rnr-form-footer">
          <div className="rnr-footer-actions">
            <button type="submit" className="rnr-btn-save">
              <span>Save</span>
            </button>
            <button
              type="button"
              className="rnr-btn-cancel"
              onClick={onBack}
            >
              <span>Cancel</span>
            </button>
          </div>
        </div>
      </form>

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
