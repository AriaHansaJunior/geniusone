import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import type {
  WarehouseMasterRecord,
  WarehouseTypeOption,
} from "./warehouse-master-types";

interface WarehouseMasterFormProps {
  warehouseTypes: WarehouseTypeOption[];
  isWarehouseTypesLoading?: boolean;
  onBack: () => void;
  onSave?: (newRecord: WarehouseMasterRecord) => void;
}

export function WarehouseMasterForm({
  warehouseTypes,
  isWarehouseTypesLoading = false,
  onBack,
  onSave,
}: WarehouseMasterFormProps) {
  const [name, setName] = useState("");
  const [warehouseTypeId, setWarehouseTypeId] = useState("");
  const [description, setDescription] = useState("");

  const [errors, setErrors] = useState<{
    name?: string;
    type?: string;
  }>({});

  const [notification, setNotification] = useState<{
    type: "warning" | "success" | "info";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: { name?: string; type?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Warehouse Name is required.";
    }

    const selectedType = warehouseTypes.find((warehouseType) => warehouseType.id === warehouseTypeId);
    if (!selectedType) {
      newErrors.type = "Please choose a Warehouse Type.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setNotification({
        type: "warning",
        message: "Please fill in all required fields before saving.",
      });
      return;
    }
    if (!selectedType) return;

    setErrors({});
    setNotification(null);

    const newRecord: WarehouseMasterRecord = {
      id: `wh-${Date.now()}`,
      no: 1,
      name: name.trim(),
      type: selectedType.name,
      warehouseTypeId: selectedType.id,
      description: description.trim(),
      status: true,
      coordinates: [],
    };

    if (onSave) {
      onSave(newRecord);
    }
  };

  return (
    <div className="wh-page">
      {/* Page Title matching Screenshot 4 */}
      <div className="wh-page-header">
        <h1 className="wh-page-title">Add New Warehouse</h1>
      </div>

      {/* Alert Notification */}
      {notification && (
        <div
          className={`wh-alert wh-alert--${notification.type}`}
          role="alert"
        >
          <Icon
            name={
              notification.type === "success"
                ? "checkCircle"
                : "alertTriangle"
            }
            size={16}
          />
          <div className="wh-alert__content">
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="wh-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Close alert"
          >
            &times;
          </button>
        </div>
      )}

      {/* Full-Width Balanced Form Card */}
      <div className="wh-form-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="master-form-grid-2">
            {/* Name Field */}
            <div className="wh-form-group">
              <label htmlFor="wh-name" className="wh-form-label">
                Name <span className="wh-required">*</span>
              </label>
              <input
                id="wh-name"
                type="text"
                className={`wh-form-input ${
                  errors.name ? "wh-form-input--error" : ""
                }`}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) {
                    setErrors((prev) => ({ ...prev, name: undefined }));
                  }
                }}
                placeholder="Enter warehouse name"
                autoFocus
              />
              {errors.name && (
                <span className="wh-form-error">{errors.name}</span>
              )}
            </div>

            {/* Warehouse Type Field */}
            <div className="wh-form-group">
              <label htmlFor="wh-type" className="wh-form-label">
                Warehouse Type <span className="wh-required">*</span>
              </label>
              <CustomSelect
                id="wh-type"
                searchable
                value={warehouseTypeId}
                onChange={(val) => {
                  setWarehouseTypeId(val);
                  if (errors.type) {
                    setErrors((prev) => ({ ...prev, type: undefined }));
                  }
                }}
                disabled={isWarehouseTypesLoading || warehouseTypes.length === 0}
                placeholder={isWarehouseTypesLoading ? "Loading Warehouse Types..." : "Choose Warehouse Type"}
                options={warehouseTypes.map((warehouseType) => ({
                  value: warehouseType.id,
                  label: warehouseType.name,
                }))}
              />
              {errors.type && (
                <span className="wh-form-error">{errors.type}</span>
              )}
              {!isWarehouseTypesLoading && warehouseTypes.length === 0 && (
                <span className="wh-form-error">No warehouse types are available.</span>
              )}
            </div>
          </div>

          {/* Description Field */}
          <div className="wh-form-group">
            <label htmlFor="wh-desc" className="wh-form-label">
              Description
            </label>
            <textarea
              id="wh-desc"
              className="wh-form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter warehouse description (optional)"
            />
          </div>

          {/* Form Actions */}
          <div className="wh-form-actions">
            <Button type="button" variant="ghost" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WarehouseMasterForm;
