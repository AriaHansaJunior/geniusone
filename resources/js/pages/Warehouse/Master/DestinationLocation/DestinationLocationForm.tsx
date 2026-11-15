import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import type { DestinationLocationRecord } from "./destination-location-types";

interface DestinationLocationFormProps {
  initialRecord?: DestinationLocationRecord | null;
  onBack: () => void;
  onSave: (record: DestinationLocationRecord, isEdit: boolean) => void;
}

const locationTypeOptions = [
  "Production Area",
  "Warehouse",
  "Workshop",
  "Laboratory",
  "Office",
  "Shipping Area",
];

export function DestinationLocationForm({
  initialRecord,
  onBack,
  onSave,
}: DestinationLocationFormProps) {
  const isEdit = !!initialRecord;

  const [code, setCode] = useState(initialRecord?.code || "");
  const [name, setName] = useState(initialRecord?.name || "");
  const [locationType, setLocationType] = useState<any>(initialRecord?.locationType || "Production Area");
  const [pic, setPic] = useState(initialRecord?.pic || "");
  const [description, setDescription] = useState(initialRecord?.description || "");
  const [status, setStatus] = useState<"Active" | "Inactive">(initialRecord?.status || "Active");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setError("Location Code is required.");
      return;
    }
    if (!trimmedName) {
      setError("Destination Name is required.");
      return;
    }

    setError(null);

    const record: DestinationLocationRecord = {
      id: initialRecord ? initialRecord.id : `dest-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      code: trimmedCode.toUpperCase(),
      name: trimmedName,
      locationType,
      pic: pic.trim() || "DAMAR",
      description: description.trim(),
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
          {isEdit ? "Edit Destination Location" : "Add Destination Location"}
        </h1>
      </div>

      {/* Form Card */}
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
              Location Code <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="master-form-input"
              placeholder="e.g. LOC-PRD-03"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
            />
          </div>
          <div className="master-form-group master-form-col-span-2">
            <label className="master-form-label">
              Destination Name <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="master-form-input"
              placeholder="e.g. Smelter 2 Furnace Charging Deck"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="master-form-grid-3">
          <div className="master-form-group">
            <label className="master-form-label">Location Classification</label>
            <CustomSelect
              value={locationType}
              onChange={(val) => setLocationType(val as any)}
              options={locationTypeOptions.map((type) => ({ value: type, label: type }))}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Supervisor / PIC</label>
            <input
              type="text"
              className="master-form-input"
              placeholder="e.g. EKO PRASETYO"
              value={pic}
              onChange={(e) => setPic(e.target.value)}
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
          <label className="master-form-label">Description &amp; Facility Notes</label>
          <textarea
            className="master-form-textarea"
            rows={3}
            placeholder="Description of facility, physical area, or specific machinery served..."
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

export default DestinationLocationForm;
