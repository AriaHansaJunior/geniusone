import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { CategoryRecord } from "./category-types";

interface CategoryFormProps {
  initialRecord?: CategoryRecord | null;
  onBack: () => void;
  onSave?: (record: CategoryRecord, isEdit: boolean) => void;
}

export function CategoryForm({
  initialRecord,
  onBack,
  onSave,
}: CategoryFormProps) {
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

    const updatedRecord: CategoryRecord = {
      id: initialRecord ? initialRecord.id : `cat-${Date.now()}`,
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
    <div className="category-form-page">
      {/* Page Header */}
      <div className="category-form-header">
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
          {isEdit ? "Edit Category" : "Add Category"}
        </h1>
      </div>

      {/* Notification Alert Banner */}
      {notification && (
        <div className={`category-alert category-alert--${notification.type}`}>
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
          <div className="category-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="category-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="category-form-card">
        {/* 1. Code */}
        <div className="category-form-group">
          <label htmlFor="categoryCode" className="category-form-label">
            Code <span className="required-mark">*</span>
          </label>
          <input
            id="categoryCode"
            type="text"
            className={`category-form-input ${errors.code ? "has-error" : ""}`}
            placeholder="e.g. CAT-RAW, CAT-SPARE, CAT-CHEM..."
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
            }}
            autoFocus={!isEdit}
          />
          {errors.code && (
            <span className="category-form-error-msg">{errors.code}</span>
          )}
        </div>

        {/* 2. Name */}
        <div className="category-form-group">
          <label htmlFor="categoryName" className="category-form-label">
            Name <span className="required-mark">*</span>
          </label>
          <input
            id="categoryName"
            type="text"
            className={`category-form-input ${errors.name ? "has-error" : ""}`}
            placeholder="e.g. Bahan Baku Logam, Suku Cadang..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
          />
          {errors.name && (
            <span className="category-form-error-msg">{errors.name}</span>
          )}
        </div>

        {/* 3. Description */}
        <div className="category-form-group">
          <label htmlFor="categoryDescription" className="category-form-label">
            Description
          </label>
          <input
            id="categoryDescription"
            type="text"
            className="category-form-input"
            placeholder="Optional category description or classification remarks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="category-form-actions">
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

export default CategoryForm;
