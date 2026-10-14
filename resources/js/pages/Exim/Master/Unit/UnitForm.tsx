import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { UnitRecord } from "./unit-types";

interface UnitFormProps {
  initialRecord?: UnitRecord | null;
  onBack: () => void;
  onSave?: (record: UnitRecord, isEdit: boolean) => void;
}

export function UnitForm({ initialRecord, onBack, onSave }: UnitFormProps) {
  const isEdit = !!initialRecord;
  const [name, setName] = useState(initialRecord?.name || "");
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Unit name is required.");
      setNotification({
        type: "warning",
        message: "Please enter a valid unit name before proceeding.",
      });
      return;
    }

    setError(null);

    const updatedRecord: UnitRecord = {
      id: initialRecord ? initialRecord.id : `unit-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      name: trimmed,
      createdAt:
        initialRecord?.createdAt ||
        new Date().toISOString().replace("T", " ").substring(0, 19),
      createdBy: initialRecord?.createdBy || "ADMINISTRATOR",
    };

    if (onSave) {
      onSave(updatedRecord, isEdit);
    }
  };

  return (
    <div className="unit-form-page">
      {/* Page Header: Single clean heading without duplicate back buttons */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
          {isEdit ? "Edit Unit" : "Add Unit"}
        </h1>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`unit-alert unit-alert--${notification.type}`}>
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
          <div className="unit-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Form Processed"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="unit-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Well-proportioned Form Content Card */}
      <form onSubmit={handleSubmit} className="unit-form-card">
        {/* Single required field: Unit */}
        <div className="unit-form-group">
          <label htmlFor="unitName" className="unit-form-label">
            Unit <span className="required-mark">*</span>
          </label>
          <input
            id="unitName"
            type="text"
            className={`unit-form-input ${error ? "has-error" : ""}`}
            placeholder="e.g. Marketing, PPIC, Procurement..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            autoFocus
          />
          {error && <span className="unit-form-error-msg">{error}</span>}
        </div>

        {/* Consistently aligned action buttons */}
        <div className="unit-form-actions">
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

export default UnitForm;
