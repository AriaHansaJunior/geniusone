import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface DeliveryTermsFormProps {
  onBack: () => void;
  onSave?: (data: { name: string }) => void;
}

export function DeliveryTermsForm({ onBack, onSave }: DeliveryTermsFormProps) {
  const [name, setName] = useState("");
  const [notification, setNotification] = useState<{
    type: "info" | "warning";
    message: string;
  } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter the Delivery Term before proceeding.",
      });
      return;
    }

    if (onSave) {
      onSave({ name: name.trim() });
    }

    setNotification({
      type: "info",
      message: "Delivery term saved successfully and synchronized with database.",
    });
  };

  return (
    <div
      className="delivery-terms-form-page"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        animation: "fadeIn 0.15s ease-in-out",
      }}
    >
      {/* Page Header: Single clean title, no redundant back button pill */}
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
      <form
        onSubmit={handleSave}
        className="panel"
        style={{
          background: "var(--white)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-sm)",
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          maxWidth: "600px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="deliveryTermName"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Delivery Term
          </label>
          <input
            id="deliveryTermName"
            type="text"
            className="form-input"
            placeholder="Delivery Terms"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Action Buttons Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            paddingTop: "14px",
            borderTop: "1px solid var(--line)",
          }}
        >
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

export default DeliveryTermsForm;
