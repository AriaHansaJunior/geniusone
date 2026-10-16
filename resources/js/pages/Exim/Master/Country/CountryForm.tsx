import React, { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { CountryRecord } from "./country-types";

export interface CountryFormProps {
  isOpen: boolean;
  mode: "create" | "edit";
  record?: CountryRecord | null;
  onSave: (data: { code: string; name: string; status: boolean }) => void;
  onCancel: () => void;
}

export function CountryForm({
  isOpen,
  mode,
  record,
  onSave,
  onCancel,
}: CountryFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ code?: string; name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && record) {
        setCode(record.code || "");
        setName(record.name || "");
        setStatus(record.status ?? true);
      } else {
        setCode("");
        setName("");
        setStatus(true);
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, mode, record]);

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    onSave({
      code: code.trim().toUpperCase(),
      name: name.trim().toUpperCase(),
      status,
    });
  };

  return (
    <div className="master-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="master-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="country-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="master-modal-header">
          <h3 id="country-modal-title" className="master-modal-title">
            {mode === "edit" ? "Edit Country" : "Add Country"}
          </h3>
          <button
            type="button"
            className="master-modal-close"
            onClick={onCancel}
            aria-label="Close dialog"
            title="Close dialog"
          >
            <Icon name="close" size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="master-modal-body">
            <div className="master-form-group">
              <label htmlFor="countryCode" className="master-form-label">
                Country Code <span className="required-asterisk">*</span>
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
                autoFocus
              />
              {errors.code && <span className="master-form-error">{errors.code}</span>}
            </div>

            <div className="master-form-group">
              <label htmlFor="countryName" className="master-form-label">
                Country Name <span className="required-asterisk">*</span>
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
              />
              {errors.name && <span className="master-form-error">{errors.name}</span>}
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
          </div>

          <div className="master-modal-footer">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="success"
              icon="check"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CountryForm;
