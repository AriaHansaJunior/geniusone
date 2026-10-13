import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface PurchaseCategoryFormProps {
  onBack: () => void;
}

export function PurchaseCategoryForm({ onBack }: PurchaseCategoryFormProps) {
  const [categoryCode, setCategoryCode] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [notification, setNotification] = useState<{
    type: "info" | "warning";
    message: string;
  } | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryCode.trim() || !categoryName.trim()) {
      setNotification({
        type: "warning",
        message: "Please enter both Category Code and Category Name before proceeding.",
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
      className="purchase-category-form-page"
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
          Add Purchase Category
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
        {/* Field 1: Category Code */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="categoryCode"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Category Code
          </label>
          <input
            id="categoryCode"
            type="text"
            className="form-input font-mono"
            placeholder="Purchase Category Code"
            value={categoryCode}
            onChange={(e) => setCategoryCode(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* Field 2: Category Name */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label
            htmlFor="categoryName"
            style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)" }}
          >
            Category Name
          </label>
          <input
            id="categoryName"
            type="text"
            className="form-input"
            placeholder="Purchase Category Name"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
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

export default PurchaseCategoryForm;
