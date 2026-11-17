import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { LoadingBuffer } from "../../../../components/ui/LoadingBuffer";
import type { RafaksiTypeRecord } from "./rafaksi-type-types";

export interface RafaksiTypeFormData {
  code: string;
  name: string;
  description: string;
  status: boolean;
}

export interface RafaksiTypeFormProps {
  mode: "create" | "edit";
  initialRecord?: RafaksiTypeRecord | null;
  recordId?: string;
  records?: RafaksiTypeRecord[];
  isLoading?: boolean;
  onSave: (data: RafaksiTypeFormData, id?: string) => Promise<void> | void;
  onCancel: () => void;
}

export function RafaksiTypeForm({
  mode,
  initialRecord,
  recordId,
  records,
  isLoading = false,
  onSave,
  onCancel,
}: RafaksiTypeFormProps) {
  const resolvedRecord =
    initialRecord ??
    (mode === "edit" && recordId
      ? records?.find((r) => String(r.id) === String(recordId)) ?? null
      : null);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ name?: string }>({});
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
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Rafaksi Type name is required.";
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
          name: name.trim(),
          description: description.trim(),
          status,
        },
        resolvedRecord?.id ?? recordId
      );
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save Rafaksi Type. Please verify the inputs.");
      setIsSubmitting(false);
    }
  };

  if (mode === "edit" && isLoading && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <LoadingBuffer variant="panel" label="Loading Rafaksi Type data..." />
        </div>
      </div>
    );
  }

  if (mode === "edit" && !isLoading && recordId && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-alert--error">Rafaksi Type record was not found.</div>
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
            {mode === "edit" ? "Edit Rafaksi Type" : "Add Rafaksi Type"}
          </h3>
        </div>

        {submitError && <div className="master-form-alert--error">{submitError}</div>}

        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label htmlFor="rafaksiCode" className="master-form-label">
              Rafaksi Code
            </label>
            <input
              id="rafaksiCode"
              type="text"
              className="master-form-input"
              placeholder="e.g. RFK-01 (optional)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={45}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="rafaksiName" className="master-form-label">
              Rafaksi Type Name <span className="master-required-star">*</span>
            </label>
            <input
              id="rafaksiName"
              type="text"
              className={`master-form-input ${errors.name ? "has-error" : ""}`}
              placeholder="e.g. Rafaksi Berat, Rafaksi Harga"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              maxLength={45}
              required
              autoFocus
            />
            {errors.name && <span className="master-error-msg">{errors.name}</span>}
          </div>
        </div>

        <div className="master-form-group">
          <label htmlFor="rafaksiDesc" className="master-form-label">
            Description
          </label>
          <textarea
            id="rafaksiDesc"
            className="master-form-textarea"
            placeholder="Describe this deduction or adjustment reference..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={255}
          />
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

export default RafaksiTypeForm;
