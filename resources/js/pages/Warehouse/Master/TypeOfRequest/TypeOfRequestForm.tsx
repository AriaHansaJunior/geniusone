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
    <div className="panel" style={{ width: "100%", padding: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--line)",
          background: "var(--white)",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "18px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.2px",
          }}
        >
          {isEdit ? "Edit Type of Request" : "Add Type of Request"}
        </h1>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} style={{ padding: "24px 20px" }}>
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "4px",
              color: "#b91c1c",
              fontSize: "13px",
              fontWeight: 600,
              marginBottom: "16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Icon name="alertTriangle" size={15} />
            <span>{error}</span>
          </div>
        )}

        <div style={{ maxWidth: "600px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
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
              />
            </div>
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Department / Scope</label>
            <CustomSelect
              value={department}
              onChange={(val) => setDepartment(val)}
              options={departmentOptions.map((dept) => ({ value: dept, label: dept }))}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Description</label>
            <textarea
              className="master-form-input"
              rows={3}
              placeholder="Detailed description of when this request type applies..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
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

          {/* Form Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <Button type="button" variant="ghost" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default TypeOfRequestForm;
