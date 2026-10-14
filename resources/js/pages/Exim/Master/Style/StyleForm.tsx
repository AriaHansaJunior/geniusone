import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { StyleRecord } from "./style-types";

interface StyleFormProps {
  initialRecord?: StyleRecord | null;
  onBack: () => void;
  onSave?: (record: StyleRecord, isEdit: boolean) => void;
}

export function StyleForm({
  initialRecord,
  onBack,
  onSave,
}: StyleFormProps) {
  const isEdit = !!initialRecord;

  const [code, setCode] = useState(initialRecord?.code || "");
  const [name, setName] = useState(initialRecord?.name || "");
  const [description, setDescription] = useState(
    initialRecord?.description && initialRecord.description !== "-"
      ? initialRecord.description
      : ""
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
    const trimmedDesc = description.trim() || "-";

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

    const updatedRecord: StyleRecord = {
      id: initialRecord ? initialRecord.id : `style-${Date.now()}`,
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
    <div className="style-form-page">
      {/* Page Header */}
      <div className="style-form-header">
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
          {isEdit ? "Edit Style" : "Add Style"}
        </h1>
      </div>

      {/* Notification Alert Banner */}
      {notification && (
        <div className={`style-alert style-alert--${notification.type}`}>
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
          <div className="style-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="style-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="style-form-card">
        {/* 1. Code */}
        <div className="style-form-group">
          <label htmlFor="styleCode" className="style-form-label">
            Code <span className="required-mark">*</span>
          </label>
          <input
            id="styleCode"
            type="text"
            className={`style-form-input ${errors.code ? "has-error" : ""}`}
            placeholder="e.g. 01, 02, STY-INGOT..."
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
            }}
            autoFocus={!isEdit}
          />
          {errors.code && (
            <span className="style-form-error-msg">{errors.code}</span>
          )}
        </div>

        {/* 2. Name */}
        <div className="style-form-group">
          <label htmlFor="styleName" className="style-form-label">
            Name <span className="required-mark">*</span>
          </label>
          <input
            id="styleName"
            type="text"
            className={`style-form-input ${errors.name ? "has-error" : ""}`}
            placeholder="e.g. No Style, Lead Ingot 99.97%..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name && (
            <span className="style-form-error-msg">{errors.name}</span>
          )}
        </div>

        {/* 3. Description */}
        <div className="style-form-group">
          <label htmlFor="styleDescription" className="style-form-label">
            Description
          </label>
          <input
            id="styleDescription"
            type="text"
            className="style-form-input"
            placeholder="Optional style specification remarks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="style-form-actions">
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

export default StyleForm;
