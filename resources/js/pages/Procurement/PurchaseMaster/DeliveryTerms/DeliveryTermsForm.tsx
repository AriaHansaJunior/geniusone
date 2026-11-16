import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { DeliveryTermRecord } from "./delivery-terms-types";

interface DeliveryTermsFormProps {
  initialRecord?: DeliveryTermRecord | null;
  onBack: () => void;
  onSave?: (data: { name: string }, editId?: string) => void | Promise<any>;
}

export function DeliveryTermsForm({
  initialRecord,
  onBack,
  onSave,
}: DeliveryTermsFormProps) {
  const isEdit = Boolean(initialRecord);
  const [name, setName] = useState(initialRecord?.name || "");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialRecord?.name || "");
    setSubmitError(null);
    setSaving(false);
  }, [initialRecord]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (!name.trim()) {
      setSubmitError("Please enter the Delivery Term before proceeding.");
      return;
    }

    if (onSave) {
      try {
        setSaving(true);
        setSubmitError(null);
        await onSave({ name: name.trim() }, initialRecord?.id);
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to save delivery term to database.");
        setSaving(false);
      }
    }
  };

  return (
    <div className="delivery-terms-form-page master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Delivery Term" : "Add Delivery Term"}
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
        <div className="master-form-group">
          <label htmlFor="deliveryTermName" className="master-form-label">
            Delivery Term <span className="required-mark">*</span>
          </label>
          <input
            id="deliveryTermName"
            type="text"
            maxLength={45}
            className="master-form-input"
            placeholder="Delivery Terms"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
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

export default DeliveryTermsForm;
