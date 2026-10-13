import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface AdditionalCostsFormProps {
  onBack: () => void;
}

export function AdditionalCostsForm({ onBack }: AdditionalCostsFormProps) {
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

    // Honest feedback conforming to strict technical constraints (no fake persistence)
    setNotification({
      type: "info",
      message:
        "Frontend validation passed. Please note: Backend persistence and database storage are intentionally not implemented in this phase.",
    });
  };

  return (
    <div
      className="additional-costs-form-page"
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
        {/* Field 1: Cost Code */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="costCode"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Cost Code
          </label>
          <input
            id="costCode"
            type="text"
            className="form-input font-mono"
            value={costCode}
            onChange={(e) => setCostCode(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Field 2: Cost Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="costName"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Cost Name
          </label>
          <input
            id="costName"
            type="text"
            className="form-input"
            value={costName}
            onChange={(e) => setCostName(e.target.value)}
            required
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

export default AdditionalCostsForm;
