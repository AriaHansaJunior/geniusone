import React, { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { CurrencyRecord, SyncStatus } from "./currency-types";

export interface CurrencyFormProps {
  isOpen: boolean;
  mode: "create" | "edit";
  record?: CurrencyRecord | null;
  onSave: (data: {
    currencyCode: string;
    currencyName: string;
    symbol: string;
    syncStatus: SyncStatus;
  }) => void;
  onCancel: () => void;
}

export function CurrencyForm({
  isOpen,
  mode,
  record,
  onSave,
  onCancel,
}: CurrencyFormProps) {
  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("Synced");
  const [errors, setErrors] = useState<{ currencyCode?: string; currencyName?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && record) {
        setCurrencyCode(record.currencyCode || "");
        setCurrencyName(record.currencyName || "");
        setSymbol(record.symbol || "");
        setSyncStatus(record.syncStatus || "Synced");
      } else {
        setCurrencyCode("");
        setCurrencyName("");
        setSymbol("");
        setSyncStatus("Synced");
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, mode, record]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { currencyCode?: string; currencyName?: string } = {};
    if (!currencyCode.trim()) {
      newErrors.currencyCode = "Currency code is required.";
    } else if (currencyCode.trim().length > 6) {
      newErrors.currencyCode = "Currency code cannot exceed 6 characters.";
    }

    if (!currencyName.trim()) {
      newErrors.currencyName = "Currency name is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    onSave({
      currencyCode: currencyCode.trim().toUpperCase(),
      currencyName: currencyName.trim(),
      symbol: symbol.trim(),
      syncStatus,
    });
  };

  return (
    <div className="master-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="master-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="currency-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="master-modal-header">
          <h3 id="currency-modal-title" className="master-modal-title">
            {mode === "edit" ? "Edit Currency" : "Add Currency"}
          </h3>
          <button
            type="button"
            className="master-modal-close"
            onClick={onCancel}
            aria-label="Close dialog"
            title="Close dialog"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="master-modal-body">
            <div className="master-form-group">
              <label htmlFor="currencyCode" className="master-form-label">
                Currency Code <span className="required-asterisk">*</span>
              </label>
              <input
                id="currencyCode"
                type="text"
                className={`master-form-input ${errors.currencyCode ? "has-error" : ""}`}
                placeholder="e.g. USD, IDR, EUR"
                value={currencyCode}
                onChange={(e) => {
                  setCurrencyCode(e.target.value.toUpperCase());
                  if (errors.currencyCode) setErrors((prev) => ({ ...prev, currencyCode: undefined }));
                }}
                maxLength={6}
                autoFocus
              />
              {errors.currencyCode && (
                <span className="master-form-error">{errors.currencyCode}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="currencyName" className="master-form-label">
                Currency Name <span className="required-asterisk">*</span>
              </label>
              <input
                id="currencyName"
                type="text"
                className={`master-form-input ${errors.currencyName ? "has-error" : ""}`}
                placeholder="e.g. US Dollar, Indonesian Rupiah"
                value={currencyName}
                onChange={(e) => {
                  setCurrencyName(e.target.value);
                  if (errors.currencyName) setErrors((prev) => ({ ...prev, currencyName: undefined }));
                }}
              />
              {errors.currencyName && (
                <span className="master-form-error">{errors.currencyName}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="currencySymbol" className="master-form-label">
                Symbol / Prefix
              </label>
              <input
                id="currencySymbol"
                type="text"
                className="master-form-input"
                placeholder="e.g. $, Rp, €, ¥, S$"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                maxLength={8}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="currencySyncStatus" className="master-form-label">
                Sync Status
              </label>
              <select
                id="currencySyncStatus"
                className="master-form-select"
                value={syncStatus}
                onChange={(e) => setSyncStatus(e.target.value as SyncStatus)}
              >
                <option value="Synced">Synced</option>
                <option value="Pending">Pending</option>
                <option value="Failed">Failed</option>
                <option value="Not Synced">Not Synced</option>
              </select>
            </div>
          </div>

          <div className="master-modal-footer">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              icon="check"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CurrencyForm;
