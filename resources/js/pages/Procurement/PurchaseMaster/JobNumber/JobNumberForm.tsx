import React, { useState, useEffect } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import type { JobNumberRecord } from "./job-number-types";

export interface JobNumberFormProps {
  isOpen: boolean;
  mode: "create" | "edit";
  record?: JobNumberRecord | null;
  onSave: (data: { jobNumber: string; jobName: string; department: string; status: boolean }) => void;
  onCancel: () => void;
}

export function JobNumberForm({
  isOpen,
  mode,
  record,
  onSave,
  onCancel,
}: JobNumberFormProps) {
  const [jobNumber, setJobNumber] = useState("");
  const [jobName, setJobName] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ jobNumber?: string; jobName?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && record) {
        setJobNumber(record.jobNumber || "");
        setJobName(record.jobName || "");
        setDepartment(record.department || "");
        setStatus(record.status ?? true);
      } else {
        setJobNumber("");
        setJobName("");
        setDepartment("");
        setStatus(true);
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen, mode, record]);

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: { jobNumber?: string; jobName?: string } = {};
    if (!jobNumber.trim()) {
      newErrors.jobNumber = "Job number is required.";
    }

    if (!jobName.trim()) {
      newErrors.jobName = "Job name or description is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    onSave({
      jobNumber: jobNumber.trim().toUpperCase(),
      jobName: jobName.trim().toUpperCase(),
      department: department.trim(),
      status,
    });
  };

  return (
    <div className="master-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <div
        className="master-modal-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-number-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="master-modal-header">
          <h3 id="job-number-modal-title" className="master-modal-title">
            {mode === "edit" ? "Edit Job Number" : "Add Job Number"}
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
              <label htmlFor="jobNumber" className="master-form-label">
                Job Number <span className="required-asterisk">*</span>
              </label>
              <input
                id="jobNumber"
                type="text"
                className={`master-form-input ${errors.jobNumber ? "has-error" : ""}`}
                placeholder="e.g. JOB-2026-001"
                value={jobNumber}
                onChange={(e) => {
                  setJobNumber(e.target.value.toUpperCase());
                  if (errors.jobNumber) setErrors((prev) => ({ ...prev, jobNumber: undefined }));
                }}
                maxLength={30}
                autoFocus
              />
              {errors.jobNumber && (
                <span className="master-form-error">{errors.jobNumber}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="jobName" className="master-form-label">
                Job Name / Description <span className="required-asterisk">*</span>
              </label>
              <input
                id="jobName"
                type="text"
                className={`master-form-input ${errors.jobName ? "has-error" : ""}`}
                placeholder="e.g. SMELTING LINE EXPANSION LOT A"
                value={jobName}
                onChange={(e) => {
                  setJobName(e.target.value);
                  if (errors.jobName) setErrors((prev) => ({ ...prev, jobName: undefined }));
                }}
              />
              {errors.jobName && (
                <span className="master-form-error">{errors.jobName}</span>
              )}
            </div>

            <div className="master-form-group">
              <label htmlFor="jobDepartment" className="master-form-label">
                Department Request
              </label>
              <select
                id="jobDepartment"
                className="master-form-select"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="">Select Department . . .</option>
                <option value="PRODUCTION">PRODUCTION</option>
                <option value="SMELTING">SMELTING</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="REVERB">REVERB</option>
                <option value="HSE">HSE</option>
                <option value="TEKNIK">TEKNIK</option>
                <option value="PPIC">PPIC</option>
                <option value="PROCUREMENT">PROCUREMENT</option>
              </select>
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

export default JobNumberForm;
