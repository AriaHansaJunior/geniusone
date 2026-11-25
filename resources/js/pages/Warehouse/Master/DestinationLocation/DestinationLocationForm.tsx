import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { useAuthPermission } from "../../../../context/AuthPermissionContext";
import type { DestinationLocationRecord } from "./destination-location-types";

interface DestinationLocationFormProps {
  initialRecord?: DestinationLocationRecord | null;
  onBack: () => void;
  onSave: (record: DestinationLocationRecord, isEdit: boolean) => Promise<void> | void;
}

export function DestinationLocationForm({
  initialRecord,
  onBack,
  onSave,
}: DestinationLocationFormProps) {
  const { currentUser } = useAuthPermission();
  const isEdit = !!initialRecord;

  const [name, setName] = useState(initialRecord?.name || "");
  const [description, setDescription] = useState(initialRecord?.description || "");
  const [status, setStatus] = useState<"Active" | "Inactive">(initialRecord?.status || "Active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Destination Name is required.");
      return;
    }

    setError(null);
    const actorName = currentUser?.name || "System User";

    const record: DestinationLocationRecord = {
      id: initialRecord ? initialRecord.id : `dest-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      code: initialRecord?.code || "",
      name: trimmedName,
      locationType: initialRecord?.locationType || "Production Area",
      pic: initialRecord?.pic || "",
      description: description.trim(),
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

        <div className="master-form-grid-2">
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
              required
              autoFocus
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

export default DestinationLocationForm;
