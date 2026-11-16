import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { AdditionalCostRecord } from "./additional-costs-types";

interface AdditionalCostsFormProps {
  initialRecord?: AdditionalCostRecord | null;
  onBack: () => void;
  onSave?: (data: { code: string; name: string }, editId?: string) => void | Promise<any>;
}

export function AdditionalCostsForm({
  initialRecord,
  onBack,
  onSave,
}: AdditionalCostsFormProps) {
  const isEdit = Boolean(initialRecord);
  const [costCode, setCostCode] = useState(initialRecord?.costCode || "");
  const [costName, setCostName] = useState(initialRecord?.costName || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setCostCode(initialRecord?.costCode || "");
    setCostName(initialRecord?.costName || "");
    setSubmitError(null);
    setSaving(false);
  }, [initialRecord]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!costCode.trim() || !costName.trim()) {
      setSubmitError("Please enter both Cost Code and Cost Name before proceeding.");
      return;
    }

    if (onSave) {
      try {
        setSaving(true);
        setSubmitError(null);
        await onSave(
          { code: costCode.trim(), name: costName.trim() },
          initialRecord?.id
        );
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to save additional cost to database.");
        setSaving(false);
      }
    }
  };

  return (
    <div className="additional-costs-form-page master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Additional Costs" : "Add Additional Costs"}
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
            <label htmlFor="costCode" className="master-form-label">
              Cost Code <span className="required-mark">*</span>
            </label>
            <input
              id="costCode"
              type="text"
              maxLength={45}
              className="master-form-input font-mono"
              value={costCode}
              onChange={(e) => setCostCode(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="costName" className="master-form-label">
              Cost Name <span className="required-mark">*</span>
            </label>
            <input
              id="costName"
              type="text"
              maxLength={45}
              className="master-form-input"
              value={costName}
              onChange={(e) => setCostName(e.target.value)}
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

export default AdditionalCostsForm;
