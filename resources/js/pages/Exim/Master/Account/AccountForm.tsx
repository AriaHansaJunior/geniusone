import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { AccountRecord } from "./account-types";

export interface AccountFormData {
  accountCode: string;
  accountName: string;
  category: string;
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

const DEFAULT_CATEGORIES = [
  "Current Asset",
  "Fixed Asset",
  "Current Liability",
  "Long Term Liability",
  "Equity",
  "Cost of Sales",
  "Operating Expense",
  "Other Income/Expense",
  "Inventory",
];

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
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ accountCode?: string; accountName?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && resolvedRecord) {
      setAccountCode(resolvedRecord.accountCode || "");
      setAccountName(resolvedRecord.accountName || "");
      setCategory(resolvedRecord.category || "");
      setStatus(resolvedRecord.status ?? true);
    } else if (mode === "create") {
      setAccountCode("");
      setAccountName("");
      setCategory("");
      setStatus(true);
    }
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [mode, resolvedRecord]);

  const categoryOptions = useMemo(() => {
    const list = [...DEFAULT_CATEGORIES];
    if (category && !list.includes(category)) {
      list.unshift(category);
    }
    return [
      { value: "", label: "Select Category . . ." },
      ...list.map((c) => ({ value: c, label: c })),
    ];
  }, [category]);

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
          category: category.trim(),
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
          <div className="master-form-loading">Loading Account data...</div>
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

        <div className="master-form-grid-3">
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
            />
            {errors.accountName && <span className="master-error-msg">{errors.accountName}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="accountCategory" className="master-form-label">
              Category / Classification
            </label>
            <CustomSelect
              id="accountCategory"
              searchable
              value={category}
              onChange={(val) => setCategory(val)}
              placeholder="Select Category . . ."
              options={categoryOptions}
            />
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
