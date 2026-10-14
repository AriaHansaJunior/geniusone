import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import {
  reportingTypeOptions,
  accountOptions,
} from "./classification-data";
import type { ClassificationRecord } from "./classification-types";

interface ClassificationFormProps {
  initialRecord?: ClassificationRecord | null;
  onBack: () => void;
  onSave?: (record: ClassificationRecord, isEdit: boolean) => void;
}

export function ClassificationForm({
  initialRecord,
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
  const [reportingType, setReportingType] = useState(
    initialRecord?.reportingType && initialRecord.reportingType !== "-"
      ? initialRecord.reportingType
      : "Select Classification"
  );
  const [account, setAccount] = useState(
    initialRecord?.account || "Find Account"
  );

  const [errors, setErrors] = useState<{
    code?: string;
    name?: string;
  }>({});

  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { code?: string; name?: string } = {};

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      newErrors.code = "Classification Code is required.";
    }
    if (!trimmedName) {
      newErrors.name = "Name is required.";
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

    const updatedRecord: ClassificationRecord = {
      id: initialRecord ? initialRecord.id : `cls-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      code: trimmedCode,
      name: trimmedName,
      description: description.trim() || "-",
      reportingType:
        reportingType === "Select Classification" ? "-" : reportingType,
      account: account === "Find Account" ? undefined : account,
      status: initialRecord ? initialRecord.status : true,
    };

    if (onSave) {
      onSave(updatedRecord, isEdit);
    }
  };

  return (
    <div className="classification-form-page">
      {/* Page Header */}
      <div className="classification-form-header">
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
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

        {/* 3. Description */}
        <div className="classification-form-group">
          <label htmlFor="classificationDescription" className="classification-form-label">
            Description
          </label>
          <input
            id="classificationDescription"
            type="text"
            className="classification-form-input"
            placeholder="e.g. Untuk Keperluan Kesejahteraan..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* 4. Reporting Type */}
        <div className="classification-form-group">
          <label htmlFor="classificationReportingType" className="classification-form-label">
            Reporting Type
          </label>
          <select
            id="classificationReportingType"
            className="classification-form-select"
            value={reportingType}
            onChange={(e) => setReportingType(e.target.value)}
          >
            {reportingTypeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* 5. Account */}
        <div className="classification-form-group">
          <label htmlFor="classificationAccount" className="classification-form-label">
            Account
          </label>
          <select
            id="classificationAccount"
            className="classification-form-select"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
          >
            {accountOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="classification-form-actions">
          <Button type="button" variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ClassificationForm;
