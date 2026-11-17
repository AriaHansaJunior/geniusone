import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { LoadingBuffer } from "../../../../components/ui/LoadingBuffer";
import type { DepartmentRecord } from "../../../Exim/Master/Department/department-types";
import type { JobNumberRecord } from "./job-number-types";

export interface JobNumberFormData {
  jobNumber: string;
  jobName: string;
  department: string;
  departmentId: string;
  status: boolean;
}

export interface JobNumberFormProps {
  mode: "create" | "edit";
  initialRecord?: JobNumberRecord | null;
  recordId?: string;
  records?: JobNumberRecord[];
  isLoading?: boolean;
  departments: DepartmentRecord[];
  isDepartmentsLoading?: boolean;
  onSave: (data: JobNumberFormData, id?: string) => Promise<void> | void;
  onCancel: () => void;
}

export function JobNumberForm({
  mode,
  initialRecord,
  recordId,
  records,
  isLoading = false,
  departments,
  isDepartmentsLoading = false,
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
  const [departmentId, setDepartmentId] = useState("");
  const [status, setStatus] = useState(true);
  const [errors, setErrors] = useState<{ jobNumber?: string; jobName?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "edit" && resolvedRecord) {
      setJobNumber(resolvedRecord.jobNumber || "");
      setJobName(resolvedRecord.jobName || "");
      setDepartmentId(resolvedRecord.departmentId || "");
      setStatus(resolvedRecord.status ?? true);
    } else if (mode === "create") {
      setJobNumber("");
      setJobName("");
      setDepartmentId("");
      setStatus(true);
    }
    setErrors({});
    setSubmitError(null);
    setIsSubmitting(false);
  }, [mode, resolvedRecord]);

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
          departmentId,
          department: departments.find((department) => department.id === departmentId)?.sectionName || "",
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
          <LoadingBuffer variant="panel" label="Loading Job Number data..." />
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
              required
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
              required
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
              value={departmentId}
              onChange={setDepartmentId}
              placeholder={isDepartmentsLoading ? "Loading departments..." : "Select Department . . ."}
              options={[
                {
                  value: "",
                  label: isDepartmentsLoading
                    ? "Loading departments..."
                    : departments.length > 0 ? "Select Department . . ." : "No departments available",
                },
                ...departments.map((department) => ({
                  value: department.id,
                  label: department.sectionName,
                })),
              ]}
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
