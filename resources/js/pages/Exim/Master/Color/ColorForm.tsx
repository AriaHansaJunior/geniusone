import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { ColorRecord } from "./color-types";

interface ColorFormProps {
  initialRecord?: ColorRecord | null;
  onBack: () => void;
  onSave?: (record: ColorRecord, isEdit: boolean) => Promise<void> | void;
}

export function ColorForm({ initialRecord, onBack, onSave }: ColorFormProps) {
  const isEdit = Boolean(initialRecord);

  const [code, setCode] = useState(initialRecord?.code || "");
  const [name, setName] = useState(initialRecord?.name || "");
  const [grade, setGrade] = useState(initialRecord?.grade || "");
  const [status, setStatus] = useState(initialRecord?.status ?? true);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<{
    code?: string;
    name?: string;
  }>({});

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setCode(initialRecord?.code || "");
    setName(initialRecord?.name || "");
    setGrade(initialRecord?.grade || "");
    setStatus(initialRecord?.status ?? true);
    setErrors({});
    setSubmitError(null);
    setSaving(false);
  }, [initialRecord]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    const newErrors: { code?: string; name?: string } = {};

    if (!trimmedCode) {
      newErrors.code = "Color Code is required.";
    } else if (trimmedCode.length > 45) {
      newErrors.code = "Color Code cannot exceed 45 characters.";
    }

    if (!trimmedName) {
      newErrors.name = "Color Name is required.";
    } else if (trimmedName.length > 45) {
      newErrors.name = "Color Name cannot exceed 45 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitError("Please fill in both Color Code and Color Name before saving.");
      return;
    }

    setErrors({});
    setSubmitError(null);

    const payload: ColorRecord = {
      id: initialRecord ? initialRecord.id : "",
      no: initialRecord ? initialRecord.no : 1,
      code: trimmedCode,
      name: trimmedName,
      grade: grade.trim(),
      status,
    };

    if (onSave) {
      try {
        setSaving(true);
        await onSave(payload, isEdit);
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to save Colour. Please verify inputs.");
        setSaving(false);
      }
    }
  };

  return (
    <div className="master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Colour" : "Add Colour"}
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

      <form onSubmit={handleSubmit} className="master-form-card" noValidate>
        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label htmlFor="colorCode" className="master-form-label">
              Color Code <span className="required-mark">*</span>
            </label>
            <input
              id="colorCode"
              type="text"
              maxLength={45}
              className={`master-form-input font-mono ${errors.code ? "is-invalid" : ""}`}
              placeholder="e.g. BLCK, SILV, R130..."
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
              }}
              autoFocus
            />
            {errors.code && <span className="master-form-error-text">{errors.code}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="colorName" className="master-form-label">
              Color Name <span className="required-mark">*</span>
            </label>
            <input
              id="colorName"
              type="text"
              maxLength={45}
              className={`master-form-input ${errors.name ? "is-invalid" : ""}`}
              placeholder="e.g. BLACK, SILVER, RED..."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name && <span className="master-form-error-text">{errors.name}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="colorGrade" className="master-form-label">
              Grade
            </label>
            <input
              id="colorGrade"
              type="text"
              maxLength={45}
              className="master-form-input"
              placeholder="Optional grade / shade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
            />
          </div>

          <div className="master-form-group">
            <span className="master-form-label">Status</span>
            <label className="master-form-switch-box">
              <span className="master-form-inline-check">
                <input
                  type="checkbox"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                />
                <span>Active Colour</span>
              </span>
            </label>
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

export default ColorForm;
