import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { FacilityRecord } from "./facility-types";

interface FacilityFormProps {
  initialRecord?: FacilityRecord | null;
  onBack: () => void;
  onSave?: (record: FacilityRecord, isEdit: boolean) => Promise<void> | void;
}

export function FacilityForm({
  initialRecord,
  onBack,
  onSave,
}: FacilityFormProps) {
  const isEdit = !!initialRecord;

  const [name, setName] = useState(initialRecord?.name || "");
  const [description, setDescription] = useState(
    initialRecord?.description || ""
  );
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName) {
      setError("Facility Name is required.");
      setNotification({
        type: "warning",
        message: "Please enter a valid Facility Name before saving.",
      });
      return;
    }

    setError(null);
    setNotification(null);

    const updatedRecord: FacilityRecord = {
      id: initialRecord ? initialRecord.id : `fac-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      name: trimmedName,
      description: trimmedDesc,
      status: initialRecord ? initialRecord.status : true,
    };

    if (onSave) {
      try {
        setSaving(true);
        await onSave(updatedRecord, isEdit);
      } catch (err: any) {
        setNotification({
          type: "warning",
          message: err?.message || "Failed to save facility to database.",
        });
        setSaving(false);
      }
    }
  };

  return (
    <div className="facility-form-page">
      {/* Page Header */}
      <div className="facility-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Facility" : "Add Facility"}
        </h1>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`facility-alert facility-alert--${notification.type}`}>
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
          <div className="facility-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="facility-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="facility-form-card">
        {/* 1. Facility Name */}
        <div className="facility-form-group">
          <label htmlFor="facilityName" className="facility-form-label">
            Facility Name <span className="required-mark">*</span>
          </label>
          <input
            id="facilityName"
            type="text"
            className={`facility-form-input ${error ? "has-error" : ""}`}
            placeholder="e.g. FASILITAS, NON FASILITAS..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            required
            autoFocus={!isEdit}
          />
          {error && (
            <span className="facility-form-error-msg">{error}</span>
          )}
        </div>

        {/* 2. Description */}
        <div className="facility-form-group">
          <label htmlFor="facilityDescription" className="facility-form-label">
            Description
          </label>
          <textarea
            id="facilityDescription"
            className="facility-form-textarea master-form-textarea"
            rows={3}
            placeholder="Optional facility description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="facility-form-actions">
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

export default FacilityForm;
