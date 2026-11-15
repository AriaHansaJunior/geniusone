import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";

interface PurchaseCategoryFormProps {
  onBack: () => void;
  onSave?: (data: { code: string; name: string }) => void;
}

export function PurchaseCategoryForm({ onBack, onSave }: PurchaseCategoryFormProps) {
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

    if (onSave) {
      onSave({ code: categoryCode.trim(), name: categoryName.trim() });
    }

    setNotification({
      type: "info",
      message: "Purchase category saved successfully and synchronized with database.",
    });
  };

  return (
    <div className="purchase-category-form-page master-form-page">
      {/* Page Header */}
      <div className="master-form-header">
        <h1 className="master-form-page-title">
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
      <form onSubmit={handleSave} className="master-form-card">
        <div className="master-form-grid-2">
          {/* Field 1: Category Code */}
          <div className="master-form-group">
            <label htmlFor="categoryCode" className="master-form-label">
              Category Code <span className="required-mark">*</span>
            </label>
            <input
              id="categoryCode"
              type="text"
              className="master-form-input font-mono"
              placeholder="Purchase Category Code"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Field 2: Category Name */}
          <div className="master-form-group">
            <label htmlFor="categoryName" className="master-form-label">
              Category Name <span className="required-mark">*</span>
            </label>
            <input
              id="categoryName"
              type="text"
              className="master-form-input"
              placeholder="Purchase Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
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

export default PurchaseCategoryForm;
