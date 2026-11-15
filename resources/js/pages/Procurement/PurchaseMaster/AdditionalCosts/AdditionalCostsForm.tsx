import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface AdditionalCostsFormProps {
  onBack: () => void;
  onSave?: (data: { code: string; name: string }) => void;
}

export function AdditionalCostsForm({ onBack, onSave }: AdditionalCostsFormProps) {
  const [costCode, setCostCode] = useState("");
  const [costName, setCostName] = useState("");
  const [notification, setNotification] = useState<{
    type: "info" | "warning";
    message: string;
  } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!costCode.trim() || !costName.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter both Cost Code and Cost Name before proceeding.",
      });
      return;
    }

    if (onSave) {
      onSave({ code: costCode.trim(), name: costName.trim() });
    }

    setNotification({
      type: "info",
      message: "Additional cost saved successfully and synchronized with database.",
    });
  };

  return (
    <div className="additional-costs-form-page master-form-page">
      {/* Page Header */}
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          Add Additional Costs
        </h1>
      </div>

      {/* Status Notice Banner */}
      {notification && (
        <div
          className={`supplier-form-alert supplier-form-alert--${notification.type}`}
        >
          <Icon
            name={notification.type === "info" ? "check" : "alertTriangle"}
            size={16}
          />
          <div className="supplier-form-alert__content">
            <strong>
              {notification.type === "info"
                ? "Form Validated"
                : "Required Information Missing"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="alert-close-btn"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Form Card */}
      <form onSubmit={handleSave} className="master-form-card">
        <div className="master-form-grid-2">
          {/* Field 1: Cost Code */}
          <div className="master-form-group">
            <label htmlFor="costCode" className="master-form-label">
              Cost Code <span className="required-mark">*</span>
            </label>
            <input
              id="costCode"
              type="text"
              className="master-form-input font-mono"
              value={costCode}
              onChange={(e) => setCostCode(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Field 2: Cost Name */}
          <div className="master-form-group">
            <label htmlFor="costName" className="master-form-label">
              Cost Name <span className="required-mark">*</span>
            </label>
            <input
              id="costName"
              type="text"
              className="master-form-input"
              value={costName}
              onChange={(e) => setCostName(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="master-form-actions">
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

export default AdditionalCostsForm;
