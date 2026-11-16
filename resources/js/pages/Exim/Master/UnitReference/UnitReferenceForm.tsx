import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { UnitReferenceRecord } from "./unit-reference-types";

export interface UnitReferenceFormProps {
  mode: "create" | "edit";
  initialRecord?: UnitReferenceRecord | null;
  recordId?: string;
  records?: UnitReferenceRecord[];
  isLoading?: boolean;
  onSave: (data: Partial<UnitReferenceRecord>, id?: string) => Promise<void> | void;
  onCancel: () => void;
}

export function UnitReferenceForm({
  mode,
  initialRecord,
  recordId,
  records,
  isLoading = false,
  onSave,
  onCancel,
}: UnitReferenceFormProps) {
  const resolvedRecord =
    initialRecord ??
    (mode === "edit" && recordId
      ? records?.find((r) => String(r.id) === String(recordId)) ?? null
      : null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ code?: string; name?: string; description?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && resolvedRecord) {
      setCode(resolvedRecord.code || "");
      setName(resolvedRecord.name || "");
      setDescription(resolvedRecord.description || "");
      setStatus(resolvedRecord.status ?? true);
    } else if (mode === "create") {
      setCode("");
      setName("");
      setDescription("");
      setStatus(true);
    }
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [mode, resolvedRecord]);

  const validate = () => {
    const nextErrors: { code?: string; name?: string; description?: string } = {};
    if (code.trim().length > 45) {
      nextErrors.code = "Code cannot exceed 45 characters.";
    }
    if (!name.trim()) {
      nextErrors.name = "Unit Name is required.";
    } else if (name.trim().length > 45) {
      nextErrors.name = "Unit Name cannot exceed 45 characters.";
    }
    if (description.trim().length > 255) {
      nextErrors.description = "Description cannot exceed 255 characters.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave(
        {
          code: code.trim().toUpperCase(),
          name: name.trim(),
          description: description.trim(),
          status,
        },
        resolvedRecord?.id ?? recordId
      );
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save Unit Reference. Please check inputs.");
      setIsSubmitting(false);
    }
  };

  if (mode === "edit" && isLoading && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-loading">Loading Unit Reference data...</div>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !isLoading && recordId && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-alert--error">Unit Reference record was not found.</div>
          <div className="master-form-actions">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Back to List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {mode === "edit" ? "Edit Unit Reference" : "Add Unit Reference"}
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
            <label htmlFor="unitRefCode" className="master-form-label">
              Unit Code
            </label>
            <input
              id="unitRefCode"
              type="text"
              maxLength={45}
              className={`master-form-input font-mono ${errors.code ? "is-invalid" : ""}`}
              placeholder="e.g. KG, PCE, MTR, LTR"
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
            <label htmlFor="unitRefName" className="master-form-label">
              Unit Name <span className="required-mark">*</span>
            </label>
            <input
              id="unitRefName"
              type="text"
              maxLength={45}
              className={`master-form-input ${errors.name ? "is-invalid" : ""}`}
              placeholder="e.g. KG, PCS, METER"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {errors.name && <span className="master-form-error-text">{errors.name}</span>}
          </div>

          <div className="master-form-group master-form-col-span-2">
            <label htmlFor="unitRefDescription" className="master-form-label">
              Description
            </label>
            <input
              id="unitRefDescription"
              type="text"
              maxLength={255}
              className={`master-form-input ${errors.description ? "is-invalid" : ""}`}
              placeholder="e.g. Kilogram, Pieces, Meter..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
            />
            {errors.description && (
              <span className="master-form-error-text">{errors.description}</span>
            )}
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
                <span>Active Unit Reference</span>
              </span>
            </label>
          </div>
        </div>

        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default UnitReferenceForm;
