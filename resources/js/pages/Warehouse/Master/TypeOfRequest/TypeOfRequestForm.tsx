import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { useAuthPermission } from "../../../../context/AuthPermissionContext";
import type { DepartmentRecord } from "../../../Exim/Master/Department/department-types";
import type { TypeOfRequestRecord } from "./type-of-request-types";

interface TypeOfRequestFormProps {
  initialRecord?: TypeOfRequestRecord | null;
  departments: DepartmentRecord[];
  isDepartmentsLoading?: boolean;
  onBack: () => void;
  onSave: (record: TypeOfRequestRecord, isEdit: boolean) => Promise<void> | void;
}

export function TypeOfRequestForm({
  initialRecord,
  departments,
  isDepartmentsLoading = false,
  onBack,
  onSave,
}: TypeOfRequestFormProps) {
  const { currentUser } = useAuthPermission();
  const isEdit = !!initialRecord;

  const [name, setName] = useState(initialRecord?.name || "");
  const [departmentId, setDepartmentId] = useState(initialRecord?.departmentId || "");
  const [description, setDescription] = useState(initialRecord?.description || "");
  const [requiresJobNumber, setRequiresJobNumber] = useState(initialRecord ? initialRecord.requiresJobNumber : true);
  const [status, setStatus] = useState<"Active" | "Inactive">(initialRecord?.status || "Active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Request Type Name is required.");
      return;
    }
    const selectedDepartment = departments.find((department) => department.id === departmentId);
    if (!selectedDepartment) {
      setError("Please select a valid Department.");
      return;
    }

    setError(null);
    const actorName = currentUser?.name || "System User";

    const record: TypeOfRequestRecord = {
      id: initialRecord ? initialRecord.id : `trq-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      name: trimmedName,
      departmentId: selectedDepartment.id,
      department: selectedDepartment.sectionName,
      description: description.trim(),
      requiresJobNumber,
      status,
      createdAt: initialRecord?.createdAt || new Date().toISOString().replace("T", " ").substring(0, 19),
      createdBy: initialRecord?.createdBy || actorName,
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      updatedBy: actorName,
    };

    setIsSubmitting(true);
    try {
      await onSave(record, isEdit);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="master-form-page">
      {/* Header */}
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Type of Request" : "Add Type of Request"}
        </h1>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="master-form-card">
        {error && (
          <div className="master-form-error-banner">
            <Icon name="alertTriangle" size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label className="master-form-label">
              Type Name <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="master-form-input"
              placeholder="e.g. Quality Inspection Batch"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="master-form-group">
            <label className="master-form-label">
              Department <span className="required-mark">*</span>
            </label>
            <CustomSelect
              searchable
              required
              value={departmentId}
              onChange={setDepartmentId}
              options={[
                {
                  value: "",
                  label: isDepartmentsLoading
                    ? "Loading departments..."
                    : departments.length > 0 ? "-- Select Department --" : "No departments available",
                },
                ...departments.map((department) => ({
                  value: department.id,
                  label: department.sectionName,
                })),
              ]}
            />
          </div>
        </div>

        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label className="master-form-label">Requires Job Number</label>
            <CustomSelect
              value={requiresJobNumber ? "true" : "false"}
              onChange={(val) => setRequiresJobNumber(val === "true")}
              options={[
                { value: "true", label: "Yes (Mandatory Job Number)" },
                { value: "false", label: "No (General Stock)" },
              ]}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Status</label>
            <CustomSelect
              value={status}
              onChange={(val) => setStatus(val as any)}
              options={[
                { value: "Active", label: "Active" },
                { value: "Inactive", label: "Inactive" },
              ]}
            />
          </div>
        </div>

        <div className="master-form-group">
          <label className="master-form-label">Description</label>
          <textarea
            className="master-form-textarea"
            rows={3}
            placeholder="Detailed description of when this request type applies..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Form Actions */}
        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
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

export default TypeOfRequestForm;
