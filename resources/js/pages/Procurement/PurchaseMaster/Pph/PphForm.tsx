import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { PphRecord } from "./pph-types";

interface PphFormProps {
  onBack: () => void;
  onSave?: (record: PphRecord) => void;
}

export function PphForm({ onBack, onSave }: PphFormProps) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("0.00");
  const [pphType, setPphType] = useState("");
  const [deduction, setDeduction] = useState("No");

  const [notification, setNotification] = useState<{
    type: "info" | "warning";
    message: string;
  } | null>(null);

  // Modal dialog states
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Form dirty check
  const isDirty = name.trim() !== "" || rate !== "0.00" || pphType !== "" || deduction !== "No";

  const handleRateBlur = () => {
    const parsed = parseFloat(rate);
    if (!isNaN(parsed)) {
      setRate(parsed.toFixed(2));
    } else {
      setRate("0.00");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter the Nama PPH before proceeding.",
      });
      return;
    }

    const numericRate = parseFloat(rate);
    if (isNaN(numericRate) || numericRate < 0) {
      setNotification({
        type: "warning",
        message: "Please enter a valid numeric value for Nilai PPH %.",
      });
      return;
    }

    setNotification(null);
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = () => {
    setShowSaveConfirm(false);

    const newRecord: PphRecord = {
      id: `pph-${Date.now()}`,
      name: name.trim(),
      rate: parseFloat(rate) || 0,
      deduction: deduction,
      type: pphType || undefined,
    };

    if (onSave) {
      onSave(newRecord);
    } else {
      onBack();
    }
  };

  const handleCancelClick = () => {
    if (isDirty) {
      setShowCancelConfirm(true);
    } else {
      onBack();
    }
  };

  const handleConfirmDiscard = () => {
    setShowCancelConfirm(false);
    onBack();
  };

  return (
    <div className="pph-form-page master-form-page">
      {/* Page Header */}
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          Add PPH
        </h1>
      </div>

      {/* Status Notice Banner */}
      {notification && (
        <div
          className={`supplier-form-alert supplier-form-alert--${notification.type}`}
        >
          <Icon
            name={notification.type === "info" ? "check" : "alertTriangle"}
            size={16}
          />
          <div className="supplier-form-alert__content">
            <strong>
              {notification.type === "info"
                ? "Form Validated"
                : "Required Information Missing"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleFormSubmit} className="master-form-card">
        <div className="master-form-grid-4">
          {/* Field 1: Nama PPH */}
          <div className="master-form-group">
            <label htmlFor="namaPph" className="master-form-label">
              Nama PPH <span className="required-mark">*</span>
            </label>
            <input
              id="namaPph"
              type="text"
              className="master-form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Field 2: Nilai PPH % */}
          <div className="master-form-group">
            <label htmlFor="nilaiPph" className="master-form-label">
              Nilai PPH % <span className="required-mark">*</span>
            </label>
            <input
              id="nilaiPph"
              type="number"
              step="0.0001"
              min="0"
              className="master-form-input font-mono"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              onBlur={handleRateBlur}
              required
            />
          </div>

          {/* Field 3: Jenis PPH */}
          <div className="master-form-group">
            <label htmlFor="jenisPph" className="master-form-label">
              Jenis PPH <span className="required-mark">*</span>
            </label>
            <CustomSelect
              id="jenisPph"
              searchable
              value={pphType}
              onChange={(val) => setPphType(val)}
              placeholder="Select PPH Type"
              options={[
                { value: "", label: "Select PPH Type" },
                { value: "PPh 21", label: "PPh 21" },
                { value: "PPh 22", label: "PPh 22" },
                { value: "PPh 23", label: "PPh 23" },
                { value: "PPh 4 (2)", label: "PPh 4 (2)" },
                { value: "PPh 31 E", label: "PPh 31 E" },
                { value: "PBBKB", label: "PBBKB" },
              ]}
            />
          </div>

          {/* Field 4: Deduction */}
          <div className="master-form-group">
            <label htmlFor="deduction" className="master-form-label">
              Deduction
            </label>
            <CustomSelect
              id="deduction"
              value={deduction}
              onChange={(val) => setDeduction(val)}
              options={[
                { value: "No", label: "No" },
                { value: "Yes", label: "Yes" },
              ]}
            />
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={handleCancelClick}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check">
            Save
          </Button>
        </div>
      </form>

      {/* Save Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Confirm Save PPH"
        message="Are you sure the entered PPH tax data is correct?"
        confirmLabel="Save PPH"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="check"
        onConfirm={handleConfirmSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      {/* Cancel / Discard Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelConfirm}
        title="Discard Changes"
        message="You have unsaved changes. Are you sure you want to discard them and return to the PPH listing?"
        confirmLabel="Discard"
        cancelLabel="Continue Editing"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}

export default PphForm;
