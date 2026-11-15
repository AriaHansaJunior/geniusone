import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { JobNumberRecord } from "./job-number-types";

export interface JobNumberFormData {
  jobNumber: string;
  jobName: string;
  department: string;
  status: boolean;
}

export interface JobNumberFormProps {
  mode: "create" | "edit";
  initialRecord?: JobNumberRecord | null;
  recordId?: string;
  records?: JobNumberRecord[];
  isLoading?: boolean;
  onSave: (data: JobNumberFormData, id?: string) => Promise<void> | void;
  onCancel: () => void;
}

const DEFAULT_DEPARTMENTS = [
  "PRODUCTION",
  "SMELTING",
  "MAINTENANCE",
  "REVERB",
  "HSE",
  "TEKNIK",
  "PPIC",
  "PROCUREMENT",
];

export function JobNumberForm({
  mode,
  initialRecord,
  recordId,
  records,
  isLoading = false,
  onSave,
  onCancel,
}: JobNumberFormProps) {
  const resolvedRecord =
    initialRecord ??
    (mode === "edit" && recordId
      ? records?.find((r) => String(r.id) === String(recordId)) ?? null
      : null);

  const [jobNumber, setJobNumber] = useState("");
  const [jobName, setJobName] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ jobNumber?: string; jobName?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && resolvedRecord) {
      setJobNumber(resolvedRecord.jobNumber || "");
      setJobName(resolvedRecord.jobName || "");
      const deptVal = resolvedRecord.department && resolvedRecord.department !== "-" ? resolvedRecord.department : "";
      setDepartment(deptVal);
      setStatus(resolvedRecord.status ?? true);
    } else if (mode === "create") {
      setJobNumber("");
      setJobName("");
      setDepartment("");
      setStatus(true);
    }
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [mode, resolvedRecord]);

  const departmentOptions = useMemo(() => {
    const list = [...DEFAULT_DEPARTMENTS];
    if (department && !list.includes(department)) {
      list.unshift(department);
    }
    return [
      { value: "", label: "Select Department . . ." },
      ...list.map((d) => ({ value: d, label: d })),
    ];
  }, [department]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onSave(
        {
          jobNumber: jobNumber.trim().toUpperCase(),
          jobName: jobName.trim().toUpperCase(),
          department: department.trim(),
          status,
        },
        resolvedRecord?.id ?? recordId
      );
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to save Job Number. Please verify the inputs.");
      setIsSubmitting(false);
    }
  };

  if (mode === "edit" && isLoading && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-loading">Loading Job Number data...</div>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !isLoading && recordId && !resolvedRecord) {
    return (
      <div className="master-form-page">
        <div className="master-form-card">
          <div className="master-form-alert--error">Job Number record was not found.</div>
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
            {mode === "edit" ? "Edit Job Number" : "Add Job Number"}
          </h3>
        </div>

        {submitError && <div className="master-form-alert--error">{submitError}</div>}

        <div className="master-form-grid-3">
          <div className="master-form-group">
            <label htmlFor="jobNumber" className="master-form-label">
              Job Number <span className="master-required-star">*</span>
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
            {errors.jobNumber && <span className="master-error-msg">{errors.jobNumber}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="jobName" className="master-form-label">
              Job Name / Description <span className="master-required-star">*</span>
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
              maxLength={45}
            />
            {errors.jobName && <span className="master-error-msg">{errors.jobName}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="jobDepartment" className="master-form-label">
              Department Request
            </label>
            <CustomSelect
              id="jobDepartment"
              searchable
              value={department}
              onChange={(val) => setDepartment(val)}
              placeholder="Select Department . . ."
              options={departmentOptions}
            />
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

export default JobNumberForm;
