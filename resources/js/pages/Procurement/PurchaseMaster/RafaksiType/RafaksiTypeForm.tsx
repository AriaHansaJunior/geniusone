import React, { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { RafaksiTypeRecord } from "./rafaksi-type-types";

export interface RafaksiTypeFormProps {
  isOpen: boolean;
  mode: "create" | "edit";
  record?: RafaksiTypeRecord | null;
  onSave: (data: { code: string; name: string; description: string; status: boolean }) => void;
  onCancel: () => void;
}

export function RafaksiTypeForm({
  isOpen,
  mode,
  record,
  onSave,
  onCancel,
}: RafaksiTypeFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && record) {
        setCode(record.code || "");
        setName(record.name || "");
        setDescription(record.description || "");
        setStatus(record.status ?? true);
      } else {
        setCode("");
        setName("");
        setDescription("");
        setStatus(true);
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, mode, record]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { name?: string } = {};
    if (!name.trim()) {
      newErrors.name = "Rafaksi Type name is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    onSave({
      code: code.trim().toUpperCase() || `RFK-${Date.now().toString().slice(-3)}`,
      name: name.trim(),
      description: description.trim(),
      status,
    });
  };

  return (
    <div className="master-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="master-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rafaksi-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="master-modal-header">
          <h3 id="rafaksi-modal-title" className="master-modal-title">
            {mode === "edit" ? "Edit Rafaksi Type" : "Add Rafaksi Type"}
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
              <label htmlFor="rafaksiCode" className="master-form-label">
                Rafaksi Code
              </label>
              <input
                id="rafaksiCode"
                type="text"
                className="master-form-input"
                placeholder="e.g. RFK-01 (optional or auto-generated)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                maxLength={15}
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="rafaksiName" className="master-form-label">
                Rafaksi Type Name <span className="required-asterisk">*</span>
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
                autoFocus
              />
              {errors.name && (
                <span className="master-form-error">{errors.name}</span>
              )}
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

export default RafaksiTypeForm;
