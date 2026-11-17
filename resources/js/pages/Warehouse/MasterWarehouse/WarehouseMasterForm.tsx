import React, { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { LoadingBuffer } from "../../../components/ui/LoadingBuffer";
import type {
  WarehouseMasterRecord,
  WarehouseTypeOption,
} from "./warehouse-master-types";

interface WarehouseMasterFormProps {
  initialRecord?: WarehouseMasterRecord | null;
  warehouseTypes: WarehouseTypeOption[];
  isWarehouseTypesLoading?: boolean;
  onBack: () => void;
  onSave?: (record: WarehouseMasterRecord, isEdit: boolean) => Promise<void> | void;
}

export function WarehouseMasterForm({
  initialRecord,
  warehouseTypes,
  isWarehouseTypesLoading = false,
  onBack,
  onSave,
}: WarehouseMasterFormProps) {
  const isEdit = Boolean(initialRecord);

  const [name, setName] = useState(initialRecord?.name || "");
  const [warehouseTypeId, setWarehouseTypeId] = useState(
    initialRecord?.warehouseTypeId || ""
  );
  const [description, setDescription] = useState(initialRecord?.description || "");
  const [status, setStatus] = useState(initialRecord?.status ?? true);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState<{
    name?: string;
    type?: string;
  }>({});

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialRecord?.name || "");
    setWarehouseTypeId(initialRecord?.warehouseTypeId || "");
    setDescription(initialRecord?.description || "");
    setStatus(initialRecord?.status ?? true);
    setErrors({});
    setSubmitError(null);
    setSaving(false);
  }, [initialRecord]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const newErrors: { name?: string; type?: string } = {};

    if (!name.trim()) {
      newErrors.name = "Warehouse Name is required.";
    }

    const selectedType = warehouseTypes.find(
      (warehouseType) => warehouseType.id === warehouseTypeId
    );
    if (!selectedType) {
      newErrors.type = "Please choose a Warehouse Type.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitError("Please fill in all required fields before saving.");
      return;
    }
    if (!selectedType) return;

    setErrors({});
    setSubmitError(null);

    const payload: WarehouseMasterRecord = {
      id: initialRecord ? initialRecord.id : "",
      no: initialRecord ? initialRecord.no : 1,
      code: initialRecord?.code,
      name: name.trim(),
      type: selectedType.name,
      warehouseTypeId: selectedType.id,
      description: description.trim(),
      status,
      coordinates: initialRecord?.coordinates || [],
    };

    if (onSave) {
      try {
        setSaving(true);
        await onSave(payload, isEdit);
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to save Warehouse to database.");
        setSaving(false);
      }
    }
  };

  return (
    <div className="master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Warehouse" : "Add Warehouse"}
        </h1>
      </div>

      {submitError && (
        <div className="master-form-alert--error" role="alert">
          <div className="master-form-alert-row">
            <Icon name="alertTriangle" size={16} />
            <span>{submitError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="master-form-card" noValidate>
        {isWarehouseTypesLoading && (
          <LoadingBuffer variant="inline" label="Loading warehouse types..." />
        )}
        <div className="master-form-grid-2">
          <div className="master-form-group">
            <label htmlFor="wh-name" className="master-form-label">
              Name <span className="required-mark">*</span>
            </label>
            <input
              id="wh-name"
              type="text"
              maxLength={45}
              className={`master-form-input ${errors.name ? "is-invalid" : ""}`}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              placeholder="Enter warehouse name"
              required
              autoFocus
            />
            {errors.name && <span className="master-form-error-text">{errors.name}</span>}
          </div>

          <div className="master-form-group">
            <label htmlFor="wh-type" className="master-form-label">
              Warehouse Type <span className="required-mark">*</span>
            </label>
            <CustomSelect
              id="wh-type"
              searchable
              required
              invalid={Boolean(errors.type)}
              value={warehouseTypeId}
              onChange={(val) => {
                setWarehouseTypeId(val);
                if (errors.type) {
                  setErrors((prev) => ({ ...prev, type: undefined }));
                }
              }}
              disabled={isWarehouseTypesLoading || warehouseTypes.length === 0}
              placeholder={
                isWarehouseTypesLoading
                  ? "Loading Warehouse Types..."
                  : "Choose Warehouse Type"
              }
              options={warehouseTypes.map((warehouseType) => ({
                value: warehouseType.id,
                label: warehouseType.name,
              }))}
            />
            {errors.type && <span className="master-form-error-text">{errors.type}</span>}
            {!isWarehouseTypesLoading && warehouseTypes.length === 0 && (
              <span className="master-form-error-text">No warehouse types are available.</span>
            )}
          </div>

          <div className="master-form-group master-form-col-span-2">
            <label htmlFor="wh-desc" className="master-form-label">
              Description
            </label>
            <textarea
              id="wh-desc"
              className="master-form-input"
              rows={3}
              maxLength={255}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter warehouse description (optional)"
            />
          </div>

          {isEdit && (
            <div className="master-form-group">
              <span className="master-form-label">Status</span>
              <label className="master-form-switch-box">
                <span className="master-form-inline-check">
                  <input
                    type="checkbox"
                    checked={status}
                    onChange={(e) => setStatus(e.target.checked)}
                  />
                  <span>Active Warehouse</span>
                </span>
              </label>
            </div>
          )}
        </div>

        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default WarehouseMasterForm;
