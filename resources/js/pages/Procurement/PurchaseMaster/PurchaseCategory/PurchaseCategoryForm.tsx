import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { PurchaseCategoryRecord } from "./purchase-category-types";

interface PurchaseCategoryFormProps {
  initialRecord?: PurchaseCategoryRecord | null;
  onBack: () => void;
  onSave?: (data: { code: string; name: string }, editId?: string) => void | Promise<any>;
}

export function PurchaseCategoryForm({
  initialRecord,
  onBack,
  onSave,
}: PurchaseCategoryFormProps) {
  const isEdit = Boolean(initialRecord);
  const [categoryCode, setCategoryCode] = useState(initialRecord?.categoryCode || "");
  const [categoryName, setCategoryName] = useState(initialRecord?.categoryName || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setCategoryCode(initialRecord?.categoryCode || "");
    setCategoryName(initialRecord?.categoryName || "");
    setSubmitError(null);
    setSaving(false);
  }, [initialRecord]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!categoryCode.trim() || !categoryName.trim()) {
      setSubmitError("Please enter both Category Code and Category Name before proceeding.");
      return;
    }

    if (onSave) {
      try {
        setSaving(true);
        setSubmitError(null);
        await onSave(
          { code: categoryCode.trim(), name: categoryName.trim() },
          initialRecord?.id
        );
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to save purchase category to database.");
        setSaving(false);
      }
    }
  };

  return (
    <div className="purchase-category-form-page master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Purchase Category" : "Add Purchase Category"}
        </h1>
      </div>

      {submitError && (
        <div className="master-form-alert--error" role="alert">
          <div className="master-form-alert-row">
            <Icon name="alertTriangle" size={16} />
            <span>{submitError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="master-form-card" noValidate>
        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label htmlFor="categoryCode" className="master-form-label">
              Category Code <span className="required-mark">*</span>
            </label>
            <input
              id="categoryCode"
              type="text"
              maxLength={45}
              className="master-form-input font-mono"
              placeholder="Purchase Category Code"
              value={categoryCode}
              onChange={(e) => setCategoryCode(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="categoryName" className="master-form-label">
              Category Name <span className="required-mark">*</span>
            </label>
            <input
              id="categoryName"
              type="text"
              maxLength={45}
              className="master-form-input"
              placeholder="Purchase Category Name"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
          </div>
        </div>

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

export default PurchaseCategoryForm;
