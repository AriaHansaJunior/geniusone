import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface PaymentTermFormProps {
  onBack: () => void;
}

export function PaymentTermForm({ onBack }: PaymentTermFormProps) {
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
        message: "Please enter the Payment Term Name before proceeding.",
      });
      return;
    }

    // Honest feedback conforming to strict technical constraints (no fake persistence)
    setNotification({
      type: "info",
      message:
        "Frontend validation passed. Please note: Backend persistence and database storage are intentionally not implemented in this phase.",
    });
  };

  return (
    <div className="payment-term-form-page" style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%", animation: "fadeIn 0.15s ease-in-out" }}>
      {/* Page Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.3px" }}>
          Add Payment Term
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
      <form onSubmit={handleSave} className="panel" style={{ background: "var(--white)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", padding: "24px 28px", display: "flex", flexDirection: "column", gap: "24px", maxWidth: "600px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label htmlFor="paymentTermName" style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}>
            Payment Term Name
          </label>
          <input
            id="paymentTermName"
            type="text"
            className="form-input"
            placeholder="Payment Term Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Action Buttons Footer */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", paddingTop: "14px", borderTop: "1px solid var(--line)" }}>
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

export default PaymentTermForm;
