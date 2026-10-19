import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { ItemPickerModal } from "../../Exim/Master/Item/ItemPickerModal";
import { initialItemRecords } from "../../Exim/Master/Item/item-data";
import { initialJobNumberRecords } from "../PurchaseMaster/JobNumber/job-number-types";
import type { ItemRecord } from "../../Exim/Master/Item/item-types";
import { createPurchaseRequisition } from "../../../data/api";

export interface PRItemRow {
  id: string;
  jobNumber: string;
  itemCode?: string;
  itemName: string;
  unit: string;
  currentStock: number;
  quantity: number;
  dueDate: string;
  facility: "Fasilitas" | "Non Fasilitas";
  remark: string;
}

interface PurchaseRequisitionCreateProps {
  onBack: () => void;
  onSaveSuccess?: (newPR: any) => void;
  availableJobNumbers?: string[];
}

export function PurchaseRequisitionCreate({
  onBack,
  onSaveSuccess,
  availableJobNumbers,
}: PurchaseRequisitionCreateProps) {
  const today = new Date().toISOString().slice(0, 10);
  const defaultDue = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Header State
  const [date, setDate] = useState(today);
  const [dueDate, setDueDate] = useState(defaultDue);
  const [deptRequest, setDeptRequest] = useState("");
  const [section, setSection] = useState("");
  const [attachmentName, setAttachmentName] = useState<string>("");
  const [note, setNote] = useState("");

  // Items Grid State
  const [items, setItems] = useState<PRItemRow[]>([]);

  // UI Dialog States
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Available job numbers list
  const jobOptions = availableJobNumbers && availableJobNumbers.length > 0
    ? availableJobNumbers
    : initialJobNumberRecords.map((j) => j.jobNumber);

  // Add Empty Row
  const handleAddBlankRow = () => {
    const newRow: PRItemRow = {
      id: `pr-item-${Date.now()}`,
      jobNumber: "",
      itemName: "",
      unit: "PCE",
      currentStock: 0,
      quantity: 1,
      dueDate: dueDate || today,
      facility: "Non Fasilitas",
      remark: "",
    };
    setItems((prev) => [...prev, newRow]);
  };

  // Add Items from Master Item Picker
  const handleAddFromMasterPicker = (selectedMasterItems: ItemRecord[]) => {
    const newRows: PRItemRow[] = selectedMasterItems.map((masterItem) => ({
      id: `pr-item-${Date.now()}-${masterItem.id}`,
      jobNumber: jobOptions[0] || "—",
      itemCode: masterItem.itemCode,
      itemName: masterItem.itemName,
      unit: masterItem.smallestUnitName || masterItem.smallestUnitCode || "PCE",
      currentStock: typeof masterItem.stock === "number" ? masterItem.stock : 0,
      quantity: 1,
      dueDate: dueDate || today,
      facility: masterItem.facility === "FASILITAS" ? "Fasilitas" : "Non Fasilitas",
      remark: "",
    }));
    setItems((prev) => [...prev, ...newRows]);
    setIsItemPickerOpen(false);
  };

  // Delete Row
  const handleDeleteRow = (id: string) => {
    setItems((prev) => prev.filter((r) => r.id !== id));
  };

  // Update Row Field
  const handleUpdateRow = (id: string, field: keyof PRItemRow, value: any) => {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  // Handle Attachment Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Attachment exceeds maximum allowed size of 2MB.");
        e.target.value = "";
        return;
      }
      setAttachmentName(file.name);
    }
  };

  // Validation
  const validate = () => {
    const errors: Record<string, string> = {};
    if (!date) errors.date = "Date is required.";
    if (!dueDate) errors.dueDate = "Due Date is required.";
    if (!deptRequest) errors.deptRequest = "Department Request is required.";
    if (!section) errors.section = "Section is required.";

    if (items.length === 0) {
      errors.items = "At least one requisition item is required.";
    } else {
      items.forEach((item, index) => {
        if (!item.itemName.trim()) {
          errors[`item_${index}_name`] = `Row ${index + 1}: Item Name is required.`;
        }
        if (!item.quantity || Number(item.quantity) <= 0) {
          errors[`item_${index}_qty`] = `Row ${index + 1}: Quantity must be greater than 0.`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save Click
  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      setNotification({
        type: "error",
        message: "Please correct the highlighted errors before submitting the requisition.",
      });
      return;
    }
    setShowSaveConfirm(true);
  };

  // Confirm Submit
  const handleConfirmSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        deptRequest,
        section,
        date,
        due_date: dueDate,
        items: items.map((it) => ({
          itemCode: it.itemCode,
          itemName: it.itemName,
          quantity: it.quantity,
          dueDate: it.dueDate,
          remark: it.remark || note || "Purchase Requisition Item",
        })),
      };

      const res = await createPurchaseRequisition(payload);
      if (res && res.data) {
        if (onSaveSuccess) {
          onSaveSuccess(res.data);
        }
      } else {
        const prNumber = `${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, "0")}/PR-IMLI/X/2026`;
        const newPR = {
          _id: `pr-${Date.now()}`,
          _type: "pr",
          _rawNumber: prNumber,
          _rawStatus: "Ready",
          _rawDate: date,
          _rawDueDate: dueDate,
          _rawDept: deptRequest,
          _rawRemark: note || items[0]?.remark || "New Requisition",
          _rawCreatedBy: "ADMINISTRATOR " + today,
          _items: items,
          totalItem: items.length,
          totalQuantity: items.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0),
        };
        if (onSaveSuccess) onSaveSuccess(newPR);
      }
    } catch (err: any) {
      console.error("Failed to submit PR to backend:", err);
      setNotification({
        type: "error",
        message: err.message || "Failed to create Purchase Requisition. Please try again.",
      });
      setIsSubmitting(false);
      setShowSaveConfirm(false);
      return;
    }

    setShowSaveConfirm(false);
    setIsSubmitting(false);
    onBack();
  };

  return (
    <div className="transaction-create-page">
      {/* Top Header */}
      <div className="tx-page-header">
        <h1 className="tx-page-title">Add Purchase Requisition</h1>
      </div>

      {notification && (
        <div
          style={{
            padding: "10px 16px",
            background: notification.type === "error" ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${notification.type === "error" ? "#fecaca" : "#bbf7d0"}`,
            borderRadius: "var(--radius-sm)",
            color: notification.type === "error" ? "#b91c1c" : "#15803d",
            fontSize: "12.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{notification.message}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ border: 0, background: "transparent", cursor: "pointer", fontWeight: 700 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Panel */}
      <div className="tx-panel">
        <form onSubmit={handleSaveClick}>
          {/* Header 5-column layout */}
          <div className="tx-header-grid">
            {/* 1. Date */}
            <div className="master-form-group">
              <label htmlFor="prDate" className="master-form-label">
                Date <span className="required-asterisk">*</span>
              </label>
              <input
                id="prDate"
                type="date"
                className={`master-form-input ${formErrors.date ? "has-error" : ""}`}
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: "" }));
                }}
              />
              {formErrors.date && <span className="master-form-error">{formErrors.date}</span>}
            </div>

            {/* 2. Due Date */}
            <div className="master-form-group">
              <label htmlFor="prDueDate" className="master-form-label">
                Due Date <span className="required-asterisk">*</span>
              </label>
              <input
                id="prDueDate"
                type="date"
                className={`master-form-input ${formErrors.dueDate ? "has-error" : ""}`}
                value={dueDate}
                onChange={(e) => {
                  setDueDate(e.target.value);
                  if (formErrors.dueDate) setFormErrors((prev) => ({ ...prev, dueDate: "" }));
                }}
              />
              {formErrors.dueDate && <span className="master-form-error">{formErrors.dueDate}</span>}
            </div>

            {/* 3. Dept. Request */}
            <div className="master-form-group">
              <label htmlFor="prDept" className="master-form-label">
                Dept. Request <span className="required-asterisk">*</span>
              </label>
              <select
                id="prDept"
                className={`master-form-select ${formErrors.deptRequest ? "has-error" : ""}`}
                value={deptRequest}
                onChange={(e) => {
                  setDeptRequest(e.target.value);
                  if (formErrors.deptRequest) setFormErrors((prev) => ({ ...prev, deptRequest: "" }));
                }}
              >
                <option value="">Select Data . . .</option>
                <option value="REVERB">REVERB</option>
                <option value="SMELTING">SMELTING</option>
                <option value="REFINING">REFINING</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="LOGISTICS">LOGISTICS</option>
                <option value="LABORATORY">LABORATORY</option>
                <option value="PROCUREMENT">PROCUREMENT</option>
                <option value="HSE">HSE</option>
                <option value="TEKNIK">TEKNIK</option>
                <option value="PPIC">PPIC</option>
                <option value="HRD">HRD</option>
              </select>
              {formErrors.deptRequest && <span className="master-form-error">{formErrors.deptRequest}</span>}
            </div>

            {/* 4. Section */}
            <div className="master-form-group">
              <label htmlFor="prSection" className="master-form-label">
                Section <span className="required-asterisk">*</span>
              </label>
              <select
                id="prSection"
                className={`master-form-select ${formErrors.section ? "has-error" : ""}`}
                value={section}
                onChange={(e) => {
                  setSection(e.target.value);
                  if (formErrors.section) setFormErrors((prev) => ({ ...prev, section: "" }));
                }}
              >
                <option value="">Select Data . . .</option>
                <option value="Section 01">Section 01</option>
                <option value="Section 02">Section 02</option>
                <option value="Furnace A">Furnace A</option>
                <option value="Furnace B">Furnace B</option>
                <option value="General Maintenance">General Maintenance</option>
                <option value="Utility">Utility</option>
              </select>
              {formErrors.section && <span className="master-form-error">{formErrors.section}</span>}
            </div>

            {/* 5. Attachment File */}
            <div className="master-form-group">
              <label htmlFor="prAttachment" className="master-form-label">
                Attachment file <span style={{ textTransform: "none", fontSize: "10.5px", color: "var(--muted)", fontWeight: 400 }}>(Max: 2MB)</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <label
                  style={{
                    padding: "6px 12px",
                    background: "#f1f5f9",
                    border: "1px solid var(--line-strong)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "11.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Choose File
                  <input
                    id="prAttachment"
                    type="file"
                    style={{ display: "none" }}
                    accept=".doc,.docx,.xls,.xlsx,.jpg,.png,.pdf"
                    onChange={handleFileChange}
                  />
                </label>
                <span style={{ fontSize: "11px", color: "var(--muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {attachmentName || "No file chosen"}
                </span>
              </div>
            </div>
          </div>

          {/* Context bar with Dept. Create and Action Buttons */}
          <div className="tx-context-bar">
            <div className="tx-context-text">
              Dept. Create: <strong>{deptRequest || "—"}</strong>
            </div>

            <div className="tx-context-actions">
              <button
                type="button"
                onClick={() => setIsItemPickerOpen(true)}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "1px solid #15803d",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <Icon name="upload" size={13} />
                <span>Upload From Master Item</span>
              </button>

              <button
                type="button"
                onClick={handleAddBlankRow}
                style={{
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "1px solid #15803d",
                  padding: "6px 14px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11.5px",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer",
                }}
              >
                <Icon name="plus" size={13} />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          {formErrors.items && (
            <div style={{ color: "var(--red-600)", fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>
              {formErrors.items}
            </div>
          )}

          {/* Item Table Grid */}
          <div className="tx-table-container">
            <table className="tx-grid-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No</th>
                  <th style={{ width: "170px" }}>Job Number</th>
                  <th style={{ minWidth: "260px" }}>Item Name</th>
                  <th style={{ width: "100px" }}>Unit</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Current Stock</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Quantity *</th>
                  <th style={{ width: "140px" }}>Due Date</th>
                  <th style={{ width: "140px" }}>Fasilitas / Non Fasilitas</th>
                  <th style={{ minWidth: "200px" }}>Remark</th>
                  <th style={{ width: "60px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? (
                  items.map((row, index) => (
                    <tr key={row.id}>
                      {/* 1. Sequential No */}
                      <td style={{ textAlign: "center", fontWeight: 600, color: "var(--muted)" }}>
                        {index + 1}
                      </td>

                      {/* 2. Job Number */}
                      <td>
                        <select
                          className="tx-input-cell"
                          value={row.jobNumber}
                          onChange={(e) => handleUpdateRow(row.id, "jobNumber", e.target.value)}
                        >
                          <option value="">Select Data . . .</option>
                          <option value="—">— None —</option>
                          {jobOptions.map((job) => (
                            <option key={job} value={job}>
                              {job}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 3. Item Name */}
                      <td>
                        <input
                          type="text"
                          className={`tx-input-cell ${formErrors[`item_${index}_name`] ? "has-error" : ""}`}
                          placeholder="Item name..."
                          value={row.itemName}
                          onChange={(e) => handleUpdateRow(row.id, "itemName", e.target.value)}
                        />
                        {formErrors[`item_${index}_name`] && (
                          <span style={{ color: "var(--red-600)", fontSize: "10.5px", display: "block" }}>
                            {formErrors[`item_${index}_name`]}
                          </span>
                        )}
                      </td>

                      {/* 4. Unit */}
                      <td>
                        <select
                          className="tx-input-cell"
                          value={row.unit}
                          onChange={(e) => handleUpdateRow(row.id, "unit", e.target.value)}
                        >
                          <option value="PCE">PCE</option>
                          <option value="KG">KG</option>
                          <option value="SET">SET</option>
                          <option value="ROLL">ROLL</option>
                          <option value="MTR">MTR</option>
                          <option value="BOX">BOX</option>
                          <option value="LTR">LTR</option>
                        </select>
                      </td>

                      {/* 5. Current Stock (Read-only Reference) */}
                      <td style={{ textAlign: "right", fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "var(--ink-soft)" }}>
                        {row.currentStock.toFixed(2)}
                      </td>

                      {/* 6. Quantity */}
                      <td>
                        <input
                          type="number"
                          step="any"
                          min="0.0001"
                          className={`tx-input-cell tx-input-cell--num ${formErrors[`item_${index}_qty`] ? "has-error" : ""}`}
                          value={row.quantity}
                          onChange={(e) => handleUpdateRow(row.id, "quantity", parseFloat(e.target.value) || 0)}
                        />
                        {formErrors[`item_${index}_qty`] && (
                          <span style={{ color: "var(--red-600)", fontSize: "10.5px", display: "block" }}>
                            {formErrors[`item_${index}_qty`]}
                          </span>
                        )}
                      </td>

                      {/* 7. Due Date */}
                      <td>
                        <input
                          type="date"
                          className="tx-input-cell"
                          value={row.dueDate}
                          onChange={(e) => handleUpdateRow(row.id, "dueDate", e.target.value)}
                        />
                      </td>

                      {/* 8. Fasilitas / Non Fasilitas */}
                      <td>
                        <select
                          className="tx-input-cell"
                          value={row.facility}
                          onChange={(e) => handleUpdateRow(row.id, "facility", e.target.value as any)}
                        >
                          <option value="Non Fasilitas">Non Fasilitas</option>
                          <option value="Fasilitas">Fasilitas</option>
                        </select>
                      </td>

                      {/* 9. Remark */}
                      <td>
                        <input
                          type="text"
                          className="tx-input-cell"
                          placeholder="Item remark..."
                          value={row.remark}
                          onChange={(e) => handleUpdateRow(row.id, "remark", e.target.value)}
                        />
                      </td>

                      {/* 10. Action */}
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="tx-row-delete-btn"
                          title="Remove item row"
                          onClick={() => handleDeleteRow(row.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} style={{ padding: "24px", textAlign: "center", color: "var(--muted)" }}>
                      No items added yet. Click "Add Item" or "Upload From Master Item" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Form-level Note */}
          <div className="master-form-group" style={{ marginBottom: "20px" }}>
            <label htmlFor="prNote" className="master-form-label">
              Note
            </label>
            <textarea
              id="prNote"
              className="master-form-textarea"
              placeholder="Enter purchase requisition general notes..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* Bottom Action Bar */}
          <div className="tx-actions-bar">
            <button
              type="submit"
              className="btn-tx-save"
              disabled={isSubmitting}
            >
              <Icon name="check" size={14} />
              <span>{isSubmitting ? "Saving..." : "Save"}</span>
            </button>

            <button
              type="button"
              className="btn-tx-cancel"
              onClick={() => setShowCancelConfirm(true)}
            >
              <Icon name="close" size={14} />
              <span>Cancel</span>
            </button>
          </div>
        </form>
      </div>

      {/* Item Picker Modal from Master Items */}
      <ItemPickerModal
        isOpen={isItemPickerOpen}
        items={initialItemRecords}
        alreadySelectedCodes={items.map((i) => i.itemCode || "").filter(Boolean)}
        onAddItems={handleAddFromMasterPicker}
        onClose={() => setIsItemPickerOpen(false)}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes?"
        message="Are you sure you want to cancel? Any unsaved requisition details will be lost."
        confirmLabel="Discard & Exit"
        cancelLabel="Continue Editing"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={onBack}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Submit Purchase Requisition?"
        message={`Are you sure you want to submit this requisition with ${items.length} item(s) for ${deptRequest}?`}
        confirmLabel="Confirm & Save"
        cancelLabel="Review Form"
        confirmVariant="primary"
        icon="check"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setShowSaveConfirm(false)}
      />
    </div>
  );
}

export default PurchaseRequisitionCreate;
