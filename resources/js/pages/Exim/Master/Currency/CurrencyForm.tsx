import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { CurrencyRecord, SyncStatus } from "./currency-types";

export interface CurrencyFormData {
  currencyCode: string;
  currencyName: string;
  symbol: string;
  syncStatus: SyncStatus;
}

export interface CurrencyFormProps {
  mode: "create" | "edit";
  initialRecord?: CurrencyRecord | null;
  recordId?: string;
  records?: CurrencyRecord[];
  isLoading?: boolean;
  onSave: (data: CurrencyFormData, id?: string) => Promise<void> | void;
  onCancel: () => void;
}

export function CurrencyForm({
  mode,
  initialRecord,
  recordId,
  records,
  isLoading = false,
  onSave,
  onCancel,
}: CurrencyFormProps) {
  const resolvedRecord =
    initialRecord ??
    (mode === "edit" && recordId
      ? records?.find((r) => String(r.id) === String(recordId)) ?? null
      : null);

  const [currencyCode, setCurrencyCode] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("Synced");
  const [errors, setErrors] = useState<{ currencyCode?: string; currencyName?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && resolvedRecord) {
      setCurrencyCode(resolvedRecord.currencyCode || "");
      setCurrencyName(resolvedRecord.currencyName || "");
      setSymbol(resolvedRecord.symbol || "");
      setSyncStatus(resolvedRecord.syncStatus || "Synced");
    } else if (mode === "create") {
      setCurrencyCode("");
      setCurrencyName("");
      setSymbol("");
      setSyncStatus("Synced");
    }
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [mode, resolvedRecord]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave(
        {
          currencyCode: currencyCode.trim().toUpperCase(),
          currencyName: currencyName.trim(),
          symbol: symbol.trim(),
          syncStatus,
        },
        resolvedRecord?.id ?? recordId
      );
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save Currency. Please verify the inputs.");
      setIsSubmitting(false);
    }
  };

  if (mode === "edit" && isLoading && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-loading">Loading Currency data...</div>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !isLoading && recordId && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-alert--error">Currency record was not found.</div>
          <div className="master-form-actions">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Back to List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="master-form-page">
      <form onSubmit={handleSubmit} className="master-form-card">
        <div className="master-form-header">
          <h3 className="master-form-header-title">
            {mode === "edit" ? "Edit Currency" : "Add Currency"}
          </h3>
        </div>

        {submitError && <div className="master-form-alert--error">{submitError}</div>}

        <div className="master-form-grid-4">
          <div className="master-form-group">
            <label htmlFor="currencyCode" className="master-form-label">
              Currency Code <span className="master-required-star">*</span>
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
            {errors.currencyCode && <span className="master-error-msg">{errors.currencyCode}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="currencyName" className="master-form-label">
              Currency Name <span className="master-required-star">*</span>
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
              maxLength={45}
            />
            {errors.currencyName && <span className="master-error-msg">{errors.currencyName}</span>}
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
            <CustomSelect
              id="currencySyncStatus"
              value={syncStatus}
              onChange={(val) => setSyncStatus(val as SyncStatus)}
              options={[
                { value: "Synced", label: "Synced" },
                { value: "Pending", label: "Pending" },
                { value: "Failed", label: "Failed" },
                { value: "Not Synced", label: "Not Synced" },
              ]}
            />
          </div>
        </div>

        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CurrencyForm;
