import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { BrandRecord } from "./brand-types";

interface BrandFormProps {
  initialRecord?: BrandRecord | null;
  onBack: () => void;
  onSave?: (record: BrandRecord, isEdit: boolean) => void;
}

export function BrandForm({
  initialRecord,
  onBack,
  onSave,
}: BrandFormProps) {
  const isEdit = !!initialRecord;

  const [code, setCode] = useState(initialRecord?.code || "");
  const [name, setName] = useState(initialRecord?.name || "");
  const [description, setDescription] = useState(
    initialRecord?.description || ""
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

    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    const newErrors: { code?: string; name?: string } = {};

    if (!trimmedCode) {
      newErrors.code = "Code is required.";
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

    const updatedRecord: BrandRecord = {
      id: initialRecord ? initialRecord.id : `brand-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      code: trimmedCode,
      name: trimmedName,
      description: trimmedDesc,
      status: initialRecord ? initialRecord.status : true,
    };

    if (onSave) {
      onSave(updatedRecord, isEdit);
    }
  };

  return (
    <div className="brand-form-page">
      {/* Page Header */}
      <div className="brand-form-header">
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
          {isEdit ? "Edit Brand" : "Add Brand"}
        </h1>
      </div>

      {/* Notification Alert Banner */}
      {notification && (
        <div className={`brand-alert brand-alert--${notification.type}`}>
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
          <div className="brand-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="brand-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="brand-form-card">
        {/* 1. Code */}
        <div className="brand-form-group">
          <label htmlFor="brandCode" className="brand-form-label">
            Code <span className="required-mark">*</span>
          </label>
          <input
            id="brandCode"
            type="text"
            className={`brand-form-input ${errors.code ? "has-error" : ""}`}
            placeholder="e.g. 00, 01, MIT..."
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
            }}
            autoFocus={!isEdit}
          />
          {errors.code && (
            <span className="brand-form-error-msg">{errors.code}</span>
          )}
        </div>

        {/* 2. Name */}
        <div className="brand-form-group">
          <label htmlFor="brandName" className="brand-form-label">
            Name <span className="required-mark">*</span>
          </label>
          <input
            id="brandName"
            type="text"
            className={`brand-form-input ${errors.name ? "has-error" : ""}`}
            placeholder="e.g. NO BRAND, SANDVIK, MITSUBISHI..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name && (
            <span className="brand-form-error-msg">{errors.name}</span>
          )}
        </div>

        {/* 3. Description */}
        <div className="brand-form-group">
          <label htmlFor="brandDescription" className="brand-form-label">
            Description
          </label>
          <input
            id="brandDescription"
            type="text"
            className="brand-form-input"
            placeholder="Optional brand notes or description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="brand-form-actions">
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

export default BrandForm;
