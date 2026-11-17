import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { LoadingBuffer } from "../../../../components/ui/LoadingBuffer";
import type { CountryRecord } from "./country-types";

export interface CountryFormData {
  code: string;
  name: string;
  status: boolean;
}

export interface CountryFormProps {
  mode: "create" | "edit";
  initialRecord?: CountryRecord | null;
  recordId?: string;
  records?: CountryRecord[];
  isLoading?: boolean;
  onSave: (data: CountryFormData, id?: string) => Promise<void> | void;
  onCancel: () => void;
}

export function CountryForm({
  mode,
  initialRecord,
  recordId,
  records,
  isLoading = false,
  onSave,
  onCancel,
}: CountryFormProps) {
  const resolvedRecord =
    initialRecord ??
    (mode === "edit" && recordId
      ? records?.find((r) => String(r.id) === String(recordId)) ?? null
      : null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && resolvedRecord) {
      setCode(resolvedRecord.code || "");
      setName(resolvedRecord.name || "");
      setStatus(resolvedRecord.status ?? true);
    } else if (mode === "create") {
      setCode("");
      setName("");
      setStatus(true);
    }
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [mode, resolvedRecord]);

  const validate = () => {
    const newErrors: { code?: string; name?: string } = {};
    if (!code.trim()) {
      newErrors.code = "Country code is required.";
    } else if (code.trim().length > 10) {
      newErrors.code = "Country code cannot exceed 10 characters.";
    }
    if (!name.trim()) {
      newErrors.name = "Country name is required.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
          name: name.trim().toUpperCase(),
          status,
        },
        resolvedRecord?.id ?? recordId
      );
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save Country. Please verify the inputs.");
      setIsSubmitting(false);
    }
  };

  if (mode === "edit" && isLoading && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <LoadingBuffer variant="panel" label="Loading Country data..." />
        </div>
      </div>
    );
  }

  if (mode === "edit" && !isLoading && recordId && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-alert--error">Country record was not found.</div>
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
      <form onSubmit={handleSubmit} className="master-form-card">
        <div className="master-form-header">
          <h3 className="master-form-header-title">
            {mode === "edit" ? "Edit Country" : "Add Country"}
          </h3>
        </div>

        {submitError && <div className="master-form-alert--error">{submitError}</div>}

        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label htmlFor="countryCode" className="master-form-label">
              Country Code <span className="master-required-star">*</span>
            </label>
            <input
              id="countryCode"
              type="text"
              className={`master-form-input ${errors.code ? "has-error" : ""}`}
              placeholder="e.g. ID, US, CN, SG"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
              }}
              maxLength={10}
              required
              autoFocus
            />
            {errors.code && <span className="master-error-msg">{errors.code}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="countryName" className="master-form-label">
              Country Name <span className="master-required-star">*</span>
            </label>
            <input
              id="countryName"
              type="text"
              className={`master-form-input ${errors.name ? "has-error" : ""}`}
              placeholder="e.g. INDONESIA, UNITED STATES"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              maxLength={45}
              required
            />
            {errors.name && <span className="master-error-msg">{errors.name}</span>}
          </div>
        </div>

        <div className="master-form-group">
          <label className="master-checkbox-label">
            <input
              type="checkbox"
              checked={status}
              onChange={(e) => setStatus(e.target.checked)}
            />
            <span>Active Status</span>
          </label>
        </div>

        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="success" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CountryForm;
