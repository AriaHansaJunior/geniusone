import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface DeliveryTermsFormProps {
  onBack: () => void;
  onSave?: (data: { name: string }) => void | Promise<any>;
}

export function DeliveryTermsForm({ onBack, onSave }: DeliveryTermsFormProps) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    type: "info" | "warning";
    message: string;
  } | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter the Delivery Term before proceeding.",
      });
      return;
    }

    if (onSave) {
      try {
        setSaving(true);
        setNotification(null);
        await onSave({ name: name.trim() });
      } catch (err: any) {
        setNotification({
          type: "warning",
          message: err?.message || "Failed to save delivery term to database.",
        });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div
      className="delivery-terms-form-page master-form-page"
    >
      {/* Page Header */}
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          Add Delivery Term
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
        <div className="master-form-group">
          <label htmlFor="deliveryTermName" className="master-form-label">
            Delivery Term <span className="required-mark">*</span>
          </label>
          <input
            id="deliveryTermName"
            type="text"
            className="master-form-input"
            placeholder="Delivery Terms"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Action Buttons Footer */}
        <div className="master-form-actions">
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

export default DeliveryTermsForm;
