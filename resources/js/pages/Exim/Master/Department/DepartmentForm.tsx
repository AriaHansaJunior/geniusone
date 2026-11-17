import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { DepartmentRecord } from "./department-types";
import type { UnitRecord } from "../Unit/unit-types";

interface DepartmentFormProps {
  initialRecord?: DepartmentRecord | null;
  units: UnitRecord[];
  onBack: () => void;
  onSave?: (record: DepartmentRecord, isEdit: boolean) => Promise<void> | void;
}

export function DepartmentForm({
  initialRecord,
  units,
  onBack,
  onSave,
}: DepartmentFormProps) {
  const isEdit = !!initialRecord;

  const [sectionName, setSectionName] = useState(
    initialRecord?.sectionName || ""
  );
  const [unitId, setUnitId] = useState(initialRecord?.unitId || "");
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

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
      unit: units.find((item) => item.id === unitId)?.name || "",
      unitId,
      status: initialRecord ? initialRecord.status : true,
    };

    if (onSave) {
      try {
        setSaving(true);
        await onSave(updatedRecord, isEdit);
      } catch (err: any) {
        setNotification({
          type: "warning",
          message: err?.message || "Failed to save department to database.",
        });
        setSaving(false);
      }
    }
  };

  return (
    <div className="department-form-page">
      {/* Page Header */}
      <div className="department-form-header">
        <h1 className="master-form-page-title">
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
        <div className="master-form-grid-2">
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
              required
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
            <CustomSelect
              id="departmentUnit"
              searchable
              value={unitId}
              onChange={setUnitId}
              placeholder="Select Unit"
              options={units.map((unit) => ({
                value: unit.id,
                label: unit.name,
              }))}
            />
          </div>
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="department-form-actions">
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

export default DepartmentForm;
