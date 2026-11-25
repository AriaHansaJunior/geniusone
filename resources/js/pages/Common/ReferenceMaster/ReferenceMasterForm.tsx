import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { useNotification } from "../../../context/NotificationContext";
import { saveReferenceMasterApi } from "../../../data/masterApi";
import type { ReferenceMasterConfig, ReferenceMasterRecord } from "./reference-master-types";

interface ReferenceMasterFormProps {
  config: ReferenceMasterConfig;
  onCancel: () => void;
  onSaved?: (record: ReferenceMasterRecord) => void;
}

export function ReferenceMasterForm({
  config,
  onCancel,
  onSaved,
}: ReferenceMasterFormProps) {
  const { notifySuccess, notifyError } = useNotification();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const nextErrors: { code?: string; name?: string } = {};
    if (config.hasCode && !code.trim()) {
      nextErrors.code = `${config.codeLabel || "Code"} is required.`;
    }
    if (!name.trim()) {
      nextErrors.name = `${config.nameLabel} is required.`;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstMsg = nextErrors.code || nextErrors.name || "Please fill in the required fields.";
      setSubmitError(firstMsg);
      notifyError("Validation Error", firstMsg);
      return;
    }

    setErrors({});
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const saved = await saveReferenceMasterApi(config.pageKey, {
        code: config.hasCode ? code.trim() : undefined,
        name: name.trim(),
        status: config.hasStatus && config.hasStatusColumn !== false ? status : undefined,
      });
      notifySuccess(`${config.singularLabel} Created`, `${config.singularLabel} "${saved.name}" saved successfully.`);
      if (onSaved) {
        onSaved(saved);
      } else {
        onCancel();
      }
    } catch (err: any) {
      const message = err?.message || `Failed to save ${config.singularLabel}.`;
      setSubmitError(message);
      notifyError(`Save ${config.singularLabel} Failed`, err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">{config.formTitle}</h1>
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
        <div className={config.hasCode ? "master-form-grid-2" : "master-form-grid-1"}>
          {config.hasCode && (
            <div className="master-form-group">
              <label htmlFor={`${config.pageKey}-code`} className="master-form-label">
                {config.codeLabel || "Code"} <span className="required-mark">*</span>
              </label>
              <input
                id={`${config.pageKey}-code`}
                type="text"
                maxLength={45}
                className={`master-form-input font-mono ${errors.code ? "is-invalid" : ""}`}
                placeholder={config.codePlaceholder || "Enter code"}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
                }}
                required
              />
              {errors.code && <span className="master-form-error-text">{errors.code}</span>}
            </div>
          )}

          <div className="master-form-group">
            <label htmlFor={`${config.pageKey}-name`} className="master-form-label">
              {config.nameLabel} <span className="required-mark">*</span>
            </label>
            <input
              id={`${config.pageKey}-name`}
              type="text"
              maxLength={45}
              className={`master-form-input ${errors.name ? "is-invalid" : ""}`}
              placeholder={config.namePlaceholder}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              required
              autoFocus={!config.hasCode}
            />
            {errors.name && <span className="master-form-error-text">{errors.name}</span>}
          </div>

          {config.hasStatus && config.hasStatusColumn !== false && (
            <div className="master-form-group">
              <span className="master-form-label">Status</span>
              <label className="master-form-switch-box">
                <span className="master-form-inline-check">
                  <input
                    type="checkbox"
                    checked={status}
                    onChange={(e) => setStatus(e.target.checked)}
                  />
                  <span>Active Record</span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ReferenceMasterForm;
