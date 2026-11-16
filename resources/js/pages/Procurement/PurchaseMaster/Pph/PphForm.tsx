import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { fetchPphTypesApi } from "../../../../data/masterApi";
import type { PphRecord } from "./pph-types";

interface PphFormProps {
  initialRecord?: PphRecord | null;
  onBack: () => void;
  onSave?: (record: PphRecord, isEdit: boolean) => void | Promise<any>;
}

export function PphForm({ initialRecord, onBack, onSave }: PphFormProps) {
  const isEdit = Boolean(initialRecord);
  const [name, setName] = useState(initialRecord?.name || "");
  const [rate, setRate] = useState(
    initialRecord?.rate !== undefined ? Number(initialRecord.rate).toFixed(2) : "0.00"
  );
  const [selectedTypeId, setSelectedTypeId] = useState(
    initialRecord?.typeId ? String(initialRecord.typeId) : ""
  );
  const [pphTypes, setPphTypes] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [deduction, setDeduction] = useState(initialRecord?.deduction || "No");
  const [saving, setSaving] = useState(false);

  const [notification, setNotification] = useState<{
    type: "info" | "warning";
    message: string;
  } | null>(null);

  // Modal dialog states
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    setName(initialRecord?.name || "");
    setRate(
      initialRecord?.rate !== undefined ? Number(initialRecord.rate).toFixed(2) : "0.00"
    );
    setSelectedTypeId(initialRecord?.typeId ? String(initialRecord.typeId) : "");
    setDeduction(initialRecord?.deduction || "No");
    setNotification(null);
    setSaving(false);
  }, [initialRecord]);

  // Fetch PPh types from pph_type table
  useEffect(() => {
    let cancelled = false;
    setLoadingTypes(true);
    fetchPphTypesApi()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPphTypes(data);
          if (!selectedTypeId && initialRecord?.type) {
            const matched = data.find(
              (t) => t.name.toLowerCase() === initialRecord.type?.toLowerCase()
            );
            if (matched) setSelectedTypeId(String(matched.id));
          }
        }
      })
      .catch((err) => {
        console.warn("Failed to load PPH types from database:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingTypes(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialRecord]);

  // Form dirty check
  const isDirty = name.trim() !== "" || rate !== "0.00" || selectedTypeId !== "" || deduction !== "No";

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

    if (!selectedTypeId) {
      setNotification({
        type: "warning",
        message: "Please select a Jenis PPH before proceeding.",
      });
      return;
    }

    setNotification(null);
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = async () => {
    setShowSaveConfirm(false);

    const chosenType = pphTypes.find((t) => String(t.id) === selectedTypeId);

    const newRecord: PphRecord = {
      id: initialRecord ? initialRecord.id : "",
      name: name.trim(),
      rate: parseFloat(rate) || 0,
      deduction: deduction,
      type: chosenType ? chosenType.name : initialRecord?.type,
      typeId: chosenType ? chosenType.id : (selectedTypeId ? Number(selectedTypeId) : initialRecord?.typeId),
      hidden: initialRecord?.hidden,
    };

    if (onSave) {
      try {
        setSaving(true);
        setNotification(null);
        await onSave(newRecord, isEdit);
      } catch (err: any) {
        setNotification({
          type: "warning",
          message: err?.message || "Failed to save PPH to database.",
        });
      } finally {
        setSaving(false);
      }
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
          {isEdit ? "Edit PPH" : "Add PPH"}
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
              value={selectedTypeId}
              onChange={(val) => setSelectedTypeId(val)}
              placeholder={loadingTypes ? "Loading PPH types..." : "Select PPH Type"}
              options={[
                { value: "", label: "Select PPH Type" },
                ...pphTypes.map((t) => ({
                  value: String(t.id),
                  label: t.name,
                })),
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
          <Button type="button" variant="ghost" onClick={handleCancelClick} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
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
