import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
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
          {isEdit ? "Edit Destination Location" : "Add Destination Location"}
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
            <div className="master-form-group">
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="master-form-group">
              <label className="master-form-label">Location Classification</label>
              <select
                className="master-form-select"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as any)}
              >
                {locationTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
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
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Description &amp; Facility Notes</label>
            <textarea
              className="master-form-input"
              rows={3}
              placeholder="Description of facility, physical area, or specific machinery served..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Status</label>
            <select
              className="master-form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <Button type="button" variant="ghost" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon="check">
              Save
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default DestinationLocationForm;
