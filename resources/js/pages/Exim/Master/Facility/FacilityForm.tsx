import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { FacilityRecord } from "./facility-types";

interface FacilityFormProps {
  initialRecord?: FacilityRecord | null;
  onBack: () => void;
  onSave?: (record: FacilityRecord, isEdit: boolean) => void;
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

  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      onSave(updatedRecord, isEdit);
    }
  };

  return (
    <div className="facility-form-page">
      {/* Page Header */}
      <div className="facility-form-header">
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
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
          <input
            id="facilityDescription"
            type="text"
            className="facility-form-input"
            placeholder="Optional facility description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="facility-form-actions">
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

export default FacilityForm;
