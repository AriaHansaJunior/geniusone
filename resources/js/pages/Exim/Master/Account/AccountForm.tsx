import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { LoadingBuffer } from "../../../../components/ui/LoadingBuffer";
import type { AccountRecord } from "./account-types";

export interface AccountFormData {
  accountCode: string;
  accountName: string;
  status: boolean;
}

export interface AccountFormProps {
  mode: "create" | "edit";
  initialRecord?: AccountRecord | null;
  recordId?: string;
  records?: AccountRecord[];
  isLoading?: boolean;
  onSave: (data: AccountFormData, id?: string) => Promise<void> | void;
  onCancel: () => void;
}

export function AccountForm({
  mode,
  initialRecord,
  recordId,
  records,
  isLoading = false,
  onSave,
  onCancel,
}: AccountFormProps) {
  const resolvedRecord =
    initialRecord ??
    (mode === "edit" && recordId
      ? records?.find((r) => String(r.id) === String(recordId)) ?? null
      : null);

  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ accountCode?: string; accountName?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && resolvedRecord) {
      setAccountCode(resolvedRecord.accountCode || "");
      setAccountName(resolvedRecord.accountName || "");
      setStatus(resolvedRecord.status ?? true);
    } else if (mode === "create") {
      setAccountCode("");
      setAccountName("");
      setStatus(true);
    }
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [mode, resolvedRecord]);

  const validate = () => {
    const newErrors: { accountCode?: string; accountName?: string } = {};
    if (!accountCode.trim()) {
      newErrors.accountCode = "Account code is required.";
    }
    if (!accountName.trim()) {
      newErrors.accountName = "Account name is required.";
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
          accountCode: accountCode.trim().toUpperCase(),
          accountName: accountName.trim().toUpperCase(),
          status,
        },
        resolvedRecord?.id ?? recordId
      );
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save Account. Please verify the inputs.");
      setIsSubmitting(false);
    }
  };

  if (mode === "edit" && isLoading && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <LoadingBuffer variant="panel" label="Loading Account data..." />
        </div>
      </div>
    );
  }

  if (mode === "edit" && !isLoading && recordId && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-alert--error">Account record was not found.</div>
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
            {mode === "edit" ? "Edit Account" : "Add Account"}
          </h3>
        </div>

        {submitError && <div className="master-form-alert--error">{submitError}</div>}

        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label htmlFor="accountCode" className="master-form-label">
              Account Code <span className="master-required-star">*</span>
            </label>
            <input
              id="accountCode"
              type="text"
              className={`master-form-input ${errors.accountCode ? "has-error" : ""}`}
              placeholder="e.g. 1101, 2101, 5101"
              value={accountCode}
              onChange={(e) => {
                setAccountCode(e.target.value);
                if (errors.accountCode) setErrors((prev) => ({ ...prev, accountCode: undefined }));
              }}
              maxLength={20}
              required
              autoFocus
            />
            {errors.accountCode && <span className="master-error-msg">{errors.accountCode}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="accountName" className="master-form-label">
              Account Name <span className="master-required-star">*</span>
            </label>
            <input
              id="accountName"
              type="text"
              className={`master-form-input ${errors.accountName ? "has-error" : ""}`}
              placeholder="e.g. RAW MATERIAL INVENTORY"
              value={accountName}
              onChange={(e) => {
                setAccountName(e.target.value);
                if (errors.accountName) setErrors((prev) => ({ ...prev, accountName: undefined }));
              }}
              maxLength={45}
              required
            />
            {errors.accountName && <span className="master-error-msg">{errors.accountName}</span>}
          </div>

        </div>

        <div className="master-form-group">
          <label className="master-checkbox-label">
            <input
              type="checkbox"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
            />
            <span>Active Status</span>
          </label>
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

export default AccountForm;
