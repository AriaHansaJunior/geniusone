import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { ColorRecord } from "./color-types";

interface ColorFormProps {
  onBack: () => void;
  onSave?: (record: ColorRecord) => void;
}

export function ColorForm({ onBack, onSave }: ColorFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

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

    const newErrors: { code?: string; name?: string } = {};

    if (!trimmedCode) {
      newErrors.code = "Color Code is required.";
    }

    if (!trimmedName) {
      newErrors.name = "Color Name is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setNotification({
        type: "warning",
        message: "Please fill in both Color Code and Color Name before saving.",
      });
      return;
    }

    setErrors({});
    setNotification(null);

    const newRecord: ColorRecord = {
      id: `col-${Date.now()}`,
      no: 1, // dynamically computed in listing
      code: trimmedCode,
      name: trimmedName,
    };

    if (onSave) {
      onSave(newRecord);
    }
  };

  return (
    <div className="color-form-page">
      {/* Page Header */}
      <div className="color-form-header">
        <h1 className="color-form-title">Add Color</h1>
      </div>

      {/* Notification Alert Banner */}
      {notification && (
        <div className={`color-alert color-alert--${notification.type}`}>
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
          <div className="color-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="color-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="color-form-card">
        {/* Two-Column Form Grid for Color Code & Color Name */}
        <div className="color-form-grid">
          {/* 1. Color Code */}
          <div className="color-form-group">
            <label htmlFor="colorCode" className="color-form-label">
              Color Code <span className="required-mark">*</span>
            </label>
            <input
              id="colorCode"
              type="text"
              className={`color-form-input ${errors.code ? "has-error" : ""}`}
              placeholder="e.g. BLCK, SILV, R130..."
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
              }}
              autoFocus
            />
            {errors.code && (
              <span className="color-form-error-msg">{errors.code}</span>
            )}
          </div>

          {/* 2. Color Name */}
          <div className="color-form-group">
            <label htmlFor="colorName" className="color-form-label">
              Color Name <span className="required-mark">*</span>
            </label>
            <input
              id="colorName"
              type="text"
              className={`color-form-input ${errors.name ? "has-error" : ""}`}
              placeholder="e.g. BLACK, SILVER, RED..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name && (
              <span className="color-form-error-msg">{errors.name}</span>
            )}
          </div>
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="color-form-actions">
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

export default ColorForm;
