import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { AccountRecord } from "../Account/account-types";
import type {
  ClassificationRecord,
  ReportingTypeOption,
} from "./classification-types";

interface ClassificationFormProps {
  initialRecord?: ClassificationRecord | null;
  reportingTypes: ReportingTypeOption[];
  accounts: AccountRecord[];
  isReportingTypesLoading?: boolean;
  isAccountsLoading?: boolean;
  onBack: () => void;
  onSave?: (record: ClassificationRecord, isEdit: boolean) => Promise<void> | void;
}

export function ClassificationForm({
  initialRecord,
  reportingTypes,
  accounts,
  isReportingTypesLoading = false,
  isAccountsLoading = false,
  onBack,
  onSave,
}: ClassificationFormProps) {
  const isEdit = !!initialRecord;

  const [code, setCode] = useState(initialRecord?.code || "");
  const [name, setName] = useState(initialRecord?.name || "");
  const [description, setDescription] = useState(
    initialRecord?.description && initialRecord.description !== "-"
      ? initialRecord.description
      : ""
  );
  const [reportingTypeId, setReportingTypeId] = useState(initialRecord?.reportingTypeId || "");
  const [accountId, setAccountId] = useState(initialRecord?.accountId || "");
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<{
    code?: string;
    name?: string;
    reportingType?: string;
    account?: string;
  }>({});

  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const newErrors: {
      code?: string;
      name?: string;
      reportingType?: string;
      account?: string;
    } = {};

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      newErrors.code = "Classification Code is required.";
    }
    if (!trimmedName) {
      newErrors.name = "Name is required.";
    }
    if (!reportingTypeId) {
      newErrors.reportingType = "Reporting Type is required.";
    }
    if (!accountId) {
      newErrors.account = "Account is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setNotification({
        type: "warning",
        message: "Please fill in all required fields before saving.",
      });
      return;
    }

    setErrors({});
    setNotification(null);

    const selectedReportingType = reportingTypes.find((option) => option.id === reportingTypeId);
    const selectedAccount = accounts.find((option) => option.id === accountId);
    const accountLabel = selectedAccount
      ? `${selectedAccount.accountCode} - ${selectedAccount.accountName}`.replace(/^ - | - $/g, "")
      : initialRecord?.account;

    const updatedRecord: ClassificationRecord = {
      id: initialRecord ? initialRecord.id : `cls-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      code: trimmedCode,
      name: trimmedName,
      description: description.trim() || "-",
      reportingTypeId,
      reportingType: selectedReportingType?.name || initialRecord?.reportingType || "-",
      accountId,
      account: accountLabel,
      status: initialRecord ? initialRecord.status : true,
    };

    if (onSave) {
      try {
        setSaving(true);
        await onSave(updatedRecord, isEdit);
      } catch (err: any) {
        setNotification({
          type: "warning",
          message: err?.message || "Failed to save classification to database.",
        });
        setSaving(false);
      }
    }
  };

  return (
    <div className="classification-form-page">
      {/* Page Header */}
      <div className="classification-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Classification" : "Add Classification"}
        </h1>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`classification-alert classification-alert--${notification.type}`}>
          <Icon
            name={
              notification.type === "warning"
                ? "alertTriangle"
                : notification.type === "success"
                ? "check"
                : "alertTriangle"
            }
            size={16}
          />
          <div className="classification-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="classification-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="classification-form-card">
        <div className="master-form-grid-2">
          {/* 1. Classification Code */}
          <div className="classification-form-group">
            <label htmlFor="classificationCode" className="classification-form-label">
              Classification Code <span className="required-mark">*</span>
            </label>
            <input
              id="classificationCode"
              type="text"
              className={`classification-form-input ${
                errors.code ? "has-error" : ""
              }`}
              placeholder="e.g. 01, 02, RM-01..."
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
              }}
              autoFocus={!isEdit}
            />
            {errors.code && (
              <span className="classification-form-error-msg">{errors.code}</span>
            )}
          </div>

          {/* 2. Name */}
          <div className="classification-form-group">
            <label htmlFor="classificationName" className="classification-form-label">
              Name <span className="required-mark">*</span>
            </label>
            <input
              id="classificationName"
              type="text"
              className={`classification-form-input ${
                errors.name ? "has-error" : ""
              }`}
              placeholder="e.g. RAW MATERIAL (BAHAN BAKU)..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name && (
              <span className="classification-form-error-msg">{errors.name}</span>
            )}
          </div>
        </div>

        <div className="master-form-grid-2">
          {/* 3. Reporting Type */}
          <div className="classification-form-group">
            <label htmlFor="classificationReportingType" className="classification-form-label">
              Reporting Type <span className="required-mark">*</span>
            </label>
            <CustomSelect
              id="classificationReportingType"
              searchable
              value={reportingTypeId}
              onChange={(val) => {
                setReportingTypeId(val);
                if (errors.reportingType) {
                  setErrors((prev) => ({ ...prev, reportingType: undefined }));
                }
              }}
              options={[
                {
                  value: "",
                  label: isReportingTypesLoading
                    ? "Loading reporting types..."
                    : reportingTypes.length === 0
                    ? "No reporting types available"
                    : "Select Reporting Type",
                },
                ...reportingTypes.map((option) => ({
                  value: option.id,
                  label: option.name,
                })),
              ]}
            />
            {errors.reportingType && (
              <span className="classification-form-error-msg">{errors.reportingType}</span>
            )}
          </div>

          {/* 4. Account */}
          <div className="classification-form-group">
            <label htmlFor="classificationAccount" className="classification-form-label">
              Account <span className="required-mark">*</span>
            </label>
            <CustomSelect
              id="classificationAccount"
              searchable
              value={accountId}
              onChange={(val) => {
                setAccountId(val);
                if (errors.account) {
                  setErrors((prev) => ({ ...prev, account: undefined }));
                }
              }}
              options={[
                {
                  value: "",
                  label: isAccountsLoading
                    ? "Loading accounts..."
                    : accounts.length === 0
                    ? "No accounts available"
                    : "Select Account",
                },
                ...accounts.map((option) => ({
                  value: option.id,
                  label: `${option.accountCode} - ${option.accountName}`.replace(/^ - | - $/g, ""),
                })),
              ]}
            />
            {errors.account && (
              <span className="classification-form-error-msg">{errors.account}</span>
            )}
          </div>
        </div>

        {/* 5. Description */}
        <div className="classification-form-group">
          <label htmlFor="classificationDescription" className="classification-form-label">
            Description
          </label>
          <textarea
            id="classificationDescription"
            className="classification-form-textarea master-form-textarea"
            rows={3}
            placeholder="e.g. Untuk Keperluan Kesejahteraan..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="classification-form-actions">
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ClassificationForm;
