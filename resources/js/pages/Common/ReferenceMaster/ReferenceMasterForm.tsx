import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { useNotification } from "../../../context/NotificationContext";
import type { ReferenceMasterConfig } from "./reference-master-types";

interface ReferenceMasterFormProps {
  config: ReferenceMasterConfig;
  onCancel: () => void;
}

export function ReferenceMasterForm({
  config,
  onCancel,
}: ReferenceMasterFormProps) {
  const { notifyError } = useNotification();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
    const dependencyMessage = `Cannot persist ${config.singularLabel} "${name.trim()}" to table \`${config.dbTable}\`: backend endpoint ${config.expectedWriteEndpoint} is not yet registered in routes/api.php. Read operations currently use ${config.readEndpoint}.`;
    setSubmitError(dependencyMessage);
    notifyError(`${config.singularLabel} Write Endpoint Unavailable`, dependencyMessage);
  };

  return (
    <div className="master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">{config.formTitle}</h1>
      </div>

      <div className="master-banner master-banner--info" role="status">
        <span>
          Connected to live table <code>{config.dbTable}</code> via{" "}
          <code>{config.readEndpoint}</code>. Write persistence requires backend endpoint{" "}
          <code>{config.expectedWriteEndpoint}</code> in <code>routes/api.php</code>.
        </span>
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
              autoFocus={!config.hasCode}
            />
            {errors.name && <span className="master-form-error-text">{errors.name}</span>}
          </div>

          {config.hasStatus && (
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
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ReferenceMasterForm;
