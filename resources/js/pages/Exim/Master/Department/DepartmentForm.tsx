import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { unitOptions } from "./department-data";
import type { DepartmentRecord } from "./department-types";

interface DepartmentFormProps {
  initialRecord?: DepartmentRecord | null;
  onBack: () => void;
  onSave?: (record: DepartmentRecord, isEdit: boolean) => void;
}

export function DepartmentForm({
  initialRecord,
  onBack,
  onSave,
}: DepartmentFormProps) {
  const isEdit = !!initialRecord;

  const [sectionName, setSectionName] = useState(
    initialRecord?.sectionName || ""
  );
  const [unit, setUnit] = useState(
    initialRecord?.unit && initialRecord.unit !== "-"
      ? initialRecord.unit
      : "Select Unit"
  );

  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = sectionName.trim();

    if (!trimmedName) {
      setError("Section Name is required.");
      setNotification({
        type: "warning",
        message: "Please enter a valid Section Name before saving.",
      });
      return;
    }

    setError(null);
    setNotification(null);

    const updatedRecord: DepartmentRecord = {
      id: initialRecord ? initialRecord.id : `dept-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      sectionName: trimmedName,
      unit: unit === "Select Unit" ? "-" : unit,
      status: initialRecord ? initialRecord.status : true,
    };

    if (onSave) {
      onSave(updatedRecord, isEdit);
    }
  };

  return (
    <div className="department-form-page">
      {/* Page Header */}
      <div className="department-form-header">
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
          {isEdit ? "Edit Department" : "Add Department"}
        </h1>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`department-alert department-alert--${notification.type}`}>
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
          <div className="department-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="department-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="department-form-card">
        {/* 1. Section Name */}
        <div className="department-form-group">
          <label htmlFor="sectionName" className="department-form-label">
            Section Name <span className="required-mark">*</span>
          </label>
          <input
            id="sectionName"
            type="text"
            className={`department-form-input ${error ? "has-error" : ""}`}
            placeholder="e.g. MARKETING, PPIC, IT..."
            value={sectionName}
            onChange={(e) => {
              setSectionName(e.target.value);
              if (error) setError(null);
            }}
            autoFocus={!isEdit}
          />
          {error && (
            <span className="department-form-error-msg">{error}</span>
          )}
        </div>

        {/* 2. Unit */}
        <div className="department-form-group">
          <label htmlFor="departmentUnit" className="department-form-label">
            Unit
          </label>
          <select
            id="departmentUnit"
            className="department-form-select"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          >
            {unitOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="department-form-actions">
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

export default DepartmentForm;
