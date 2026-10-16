import React, { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { AccountRecord } from "./account-types";

export interface AccountFormProps {
  isOpen: boolean;
  mode: "create" | "edit";
  record?: AccountRecord | null;
  onSave: (data: { accountCode: string; accountName: string; category: string; status: boolean }) => void;
  onCancel: () => void;
}

export function AccountForm({
  isOpen,
  mode,
  record,
  onSave,
  onCancel,
}: AccountFormProps) {
  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ accountCode?: string; accountName?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && record) {
        setAccountCode(record.accountCode || "");
        setAccountName(record.accountName || "");
        setCategory(record.category || "");
        setStatus(record.status ?? true);
      } else {
        setAccountCode("");
        setAccountName("");
        setCategory("");
        setStatus(true);
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, mode, record]);

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    onSave({
      accountCode: accountCode.trim().toUpperCase(),
      accountName: accountName.trim().toUpperCase(),
      category: category.trim(),
      status,
    });
  };

  return (
    <div className="master-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="master-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="master-modal-header">
          <h3 id="account-modal-title" className="master-modal-title">
            {mode === "edit" ? "Edit Account" : "Add Account"}
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
              <label htmlFor="accountCode" className="master-form-label">
                Account Code <span className="required-asterisk">*</span>
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
              {errors.accountCode && (
                <span className="master-form-error">{errors.accountCode}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="accountName" className="master-form-label">
                Account Name <span className="required-asterisk">*</span>
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
              />
              {errors.accountName && (
                <span className="master-form-error">{errors.accountName}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="accountCategory" className="master-form-label">
                Category / Classification
              </label>
              <select
                id="accountCategory"
                className="master-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Select Category . . .</option>
                <option value="Current Asset">Current Asset</option>
                <option value="Fixed Asset">Fixed Asset</option>
                <option value="Current Liability">Current Liability</option>
                <option value="Long Term Liability">Long Term Liability</option>
                <option value="Equity">Equity</option>
                <option value="Cost of Sales">Cost of Sales</option>
                <option value="Operating Expense">Operating Expense</option>
                <option value="Other Income/Expense">Other Income/Expense</option>
              </select>
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

export default AccountForm;
