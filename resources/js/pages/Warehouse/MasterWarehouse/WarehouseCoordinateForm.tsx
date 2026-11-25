import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import type {
  WarehouseCoordinateRecord,
  WarehouseMasterRecord,
} from "./warehouse-master-types";

interface WarehouseCoordinateFormProps {
  warehouse: WarehouseMasterRecord;
  onBack: () => void;
  onSave?: (newCoordinate: WarehouseCoordinateRecord) => Promise<void> | void;
}

export function WarehouseCoordinateForm({
  warehouse,
  onBack,
  onSave,
}: WarehouseCoordinateFormProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Coordinate Name is required.");
      return;
    }

    setError(null);

    const newCoordinate: WarehouseCoordinateRecord = {
      id: `coord-${Date.now()}`,
      warehouseId: warehouse.id,
      name: trimmed,
    };

    if (onSave) {
      setIsSubmitting(true);
      try {
        await onSave(newCoordinate);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="wh-page">
      {/* Page Title with dynamic warehouse name matching Screenshot 3 */}
      <div className="wh-page-header">
        <h1 className="wh-page-title">
          Add New Coordinate{" "}
          <span className="text-muted font-normal">- {warehouse.name}</span>
        </h1>
      </div>

      {/* Form Card (Compact, Narrow Left-Aligned matching Screenshot 3) */}
      <div className="wh-form-card">
        <form onSubmit={handleSubmit} noValidate>
          {/* Coordinate Name Field */}
          <div className="wh-form-group">
            <label htmlFor="wh-coord-name" className="wh-form-label">
              Coordinate Name <span className="wh-required">*</span>
            </label>
            <input
              id="wh-coord-name"
              type="text"
              className={`wh-form-input ${
                error ? "wh-form-input--error" : ""
              }`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Enter coordinate name"
              required
              autoFocus
            />
            {error && <span className="wh-form-error">{error}</span>}
          </div>

          {/* Form Actions */}
          <div className="wh-form-actions">
            <Button type="button" variant="ghost" onClick={onBack} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting} disabled={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WarehouseCoordinateForm;
