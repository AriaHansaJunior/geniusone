import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { TypeOfRequestRecord } from "./type-of-request-types";

interface TypeOfRequestFormProps {
  initialRecord?: TypeOfRequestRecord | null;
  onBack: () => void;
  onSave: (record: TypeOfRequestRecord, isEdit: boolean) => void;
}

const departmentOptions = [
  "ALL",
  "PRODUKSI",
  "MAINTENANCE",
  "EXIM",
  "PPIC",
  "LOGISTIK",
  "QUALITY CONTROL",
];

export function TypeOfRequestForm({
  initialRecord,
  onBack,
  onSave,
}: TypeOfRequestFormProps) {
  const isEdit = !!initialRecord;

  const [code, setCode] = useState(initialRecord?.code || "");
  const [name, setName] = useState(initialRecord?.name || "");
  const [department, setDepartment] = useState(initialRecord?.department || "PRODUKSI");
  const [description, setDescription] = useState(initialRecord?.description || "");
  const [requiresJobNumber, setRequiresJobNumber] = useState(initialRecord ? initialRecord.requiresJobNumber : true);
  const [requiresApproval2, setRequiresApproval2] = useState(initialRecord ? initialRecord.requiresApproval2 : true);
  const [status, setStatus] = useState<"Active" | "Inactive">(initialRecord?.status || "Active");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setError("Request Type Code is required.");
      return;
    }
    if (!trimmedName) {
      setError("Request Type Name is required.");
      return;
    }

    setError(null);

    const record: TypeOfRequestRecord = {
      id: initialRecord ? initialRecord.id : `trq-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      code: trimmedCode.toUpperCase(),
      name: trimmedName,
      department,
      description: description.trim(),
      requiresJobNumber,
      requiresApproval2,
      status,
      createdAt: initialRecord?.createdAt || new Date().toISOString().replace("T", " ").substring(0, 19),
      createdBy: initialRecord?.createdBy || "ADMINISTRATOR",
      updatedAt: new Date().toISOString().replace("T", " ").substring(0, 19),
      updatedBy: "ADMINISTRATOR",
    };

    onSave(record, isEdit);
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

        <div className="master-form-grid-3">
          <div className="master-form-group">
            <label className="master-form-label">
              Type Code <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="master-form-input"
              placeholder="e.g. REQ-TYP-08"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          <div className="master-form-group master-form-col-span-2">
            <label className="master-form-label">
              Type Name <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="master-form-input"
              placeholder="e.g. Quality Inspection Batch"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="master-form-grid-4">
          <div className="master-form-group">
            <label className="master-form-label">Department / Scope</label>
            <CustomSelect
              searchable
              value={department}
              onChange={(val) => setDepartment(val)}
              options={departmentOptions.map((dept) => ({ value: dept, label: dept }))}
            />
          </div>

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
            <label className="master-form-label">Requires 2nd Level Approval</label>
            <CustomSelect
              value={requiresApproval2 ? "true" : "false"}
              onChange={(val) => setRequiresApproval2(val === "true")}
              options={[
                { value: "true", label: "Yes (Dept Head + Warehouse Manager)" },
                { value: "false", label: "No (Single Approval)" },
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
          <Button type="button" variant="ghost" onClick={onBack}>
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

export default TypeOfRequestForm;
