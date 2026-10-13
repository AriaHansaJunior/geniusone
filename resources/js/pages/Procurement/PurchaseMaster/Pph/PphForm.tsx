import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
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
    <div
      className="pph-form-page"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        animation: "fadeIn 0.15s ease-in-out",
      }}
    >
      {/* Page Header: Single clean title, no redundant back button pill */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
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
      <form
        onSubmit={handleFormSubmit}
        className="panel"
        style={{
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "600px",
        }}
      >
        {/* Field 1: Nama PPH */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="namaPph"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Nama PPH
          </label>
          <input
            id="namaPph"
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Field 2: Nilai PPH % */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="nilaiPph"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Nilai PPH %
          </label>
          <input
            id="nilaiPph"
            type="number"
            step="0.0001"
            min="0"
            className="form-input font-mono"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            onBlur={handleRateBlur}
            required
          />
        </div>

        {/* Field 3: Jenis PPH */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="jenisPph"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Jenis PPH
          </label>
          <select
            id="jenisPph"
            className="form-select"
            value={pphType}
            onChange={(e) => setPphType(e.target.value)}
          >
            <option value="">Select PPH Type</option>
            <option value="PPh 21">PPh 21</option>
            <option value="PPh 22">PPh 22</option>
            <option value="PPh 23">PPh 23</option>
            <option value="PPh 4 (2)">PPh 4 (2)</option>
            <option value="PPh 31 E">PPh 31 E</option>
            <option value="PBBKB">PBBKB</option>
          </select>
        </div>

        {/* Field 4: Deduction */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="deduction"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Deduction
          </label>
          <select
            id="deduction"
            className="form-select"
            value={deduction}
            onChange={(e) => setDeduction(e.target.value)}
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
        </div>

        {/* Action Buttons Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            paddingTop: "14px",
            borderTop: "1px solid var(--line)",
          }}
        >
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
