import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { rateTypeOptions } from "./hs-data";
import type { HsRecord } from "./hs-types";

interface HsFormProps {
  initialRecord?: HsRecord | null;
  onBack: () => void;
  onSave?: (record: HsRecord, isEdit: boolean) => void;
}

export function HsForm({
  initialRecord,
  onBack,
  onSave,
}: HsFormProps) {
  const isEdit = !!initialRecord;

  // Basic Information
  const [name, setName] = useState(initialRecord?.name || "");
  const [description, setDescription] = useState(
    initialRecord?.description || ""
  );

  // BM Tariff
  const [typeRateBm, setTypeRateBm] = useState(
    initialRecord?.typeRateBm || "ADVOLORUM"
  );
  const [ratesBm, setRatesBm] = useState<string>(
    initialRecord?.ratesBm !== undefined ? String(initialRecord.ratesBm) : "0"
  );

  // Customs Tariff (Cukai)
  const [typeRateCukai, setTypeRateCukai] = useState(
    initialRecord?.typeRateCukai || "ADVOLORUM"
  );
  const [ratesCukai, setRatesCukai] = useState<string>(
    initialRecord?.ratesCukai !== undefined
      ? String(initialRecord.ratesCukai)
      : "0"
  );

  // Other Tax Rates
  const [ratesPpn, setRatesPpn] = useState<string>(
    initialRecord?.ratesPpn !== undefined ? String(initialRecord.ratesPpn) : "11"
  );
  const [ratesPph, setRatesPph] = useState<string>(
    initialRecord?.ratesPph !== undefined ? String(initialRecord.ratesPph) : "2.5"
  );
  const [ratesPpnbm, setRatesPpnbm] = useState<string>(
    initialRecord?.ratesPpnbm !== undefined
      ? String(initialRecord.ratesPpnbm)
      : "0"
  );

  const [error, setError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedDesc = description.trim();

    if (!trimmedName) {
      setError("HS Code is required.");
      setNotification({
        type: "warning",
        message: "Please enter a valid HS Code before saving.",
      });
      return;
    }

    setError(null);
    setNotification(null);

    const parsedRatesBm = parseFloat(ratesBm) || 0;
    const parsedRatesCukai = parseFloat(ratesCukai) || 0;
    const parsedRatesPpn = parseFloat(ratesPpn) || 0;
    const parsedRatesPph = parseFloat(ratesPph) || 0;
    const parsedRatesPpnbm = parseFloat(ratesPpnbm) || 0;

    const updatedRecord: HsRecord = {
      id: initialRecord ? initialRecord.id : `hs-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      name: trimmedName,
      description: trimmedDesc,
      typeRateBm,
      ratesBm: parsedRatesBm,
      typeRateCukai,
      ratesCukai: parsedRatesCukai,
      ratesPpn: parsedRatesPpn,
      ratesPph: parsedRatesPph,
      ratesPpnbm: parsedRatesPpnbm,
    };

    if (onSave) {
      onSave(updatedRecord, isEdit);
    }
  };

  return (
    <div className="hs-form-page">
      {/* Page Header */}
      <div className="hs-form-header">
        <h1
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--ink)",
            letterSpacing: "-0.3px",
          }}
        >
          {isEdit ? "Edit HS" : "Add HS"}
        </h1>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`hs-alert hs-alert--${notification.type}`}>
          <Icon
            name={
              notification.type === "warning"
                ? "alertTriangle"
                : notification.type === "success"
                ? "check"
                : "alertTriangle"
            }
            size={16}
          />
          <div className="hs-alert__content">
            <strong>
              {notification.type === "warning"
                ? "Validation Notice"
                : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="hs-alert-close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      {/* Form Content Card */}
      <form onSubmit={handleSubmit} className="hs-form-card">
        {/* Section 1: Basic Information */}
        <div className="hs-form-section">
          <h2 className="hs-form-section-title">
            <Icon name="file" size={15} />
            <span>Basic Information</span>
          </h2>
          <div className="hs-form-grid hs-form-grid--2col">
            <div className="hs-form-group">
              <label htmlFor="hsCodeName" className="hs-form-label">
                HS Code <span className="required-mark">*</span>
              </label>
              <input
                id="hsCodeName"
                type="text"
                className={`hs-form-input ${error ? "has-error" : ""}`}
                placeholder="e.g. 8548.10.00, 7801.10.00..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus={!isEdit}
              />
              {error && <span className="hs-form-error-msg">{error}</span>}
            </div>

            <div className="hs-form-group">
              <label htmlFor="hsDescription" className="hs-form-label">
                Description
              </label>
              <input
                id="hsDescription"
                type="text"
                className="hs-form-input"
                placeholder="e.g. Lead waste and scrap, Ingot..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 2: BM Tariff */}
        <div className="hs-form-section">
          <h2 className="hs-form-section-title">
            <Icon name="layers" size={15} />
            <span>BM Tariff</span>
          </h2>
          <div className="hs-form-grid hs-form-grid--2col">
            <div className="hs-form-group">
              <label htmlFor="typeRateBm" className="hs-form-label">
                Type Rates BM
              </label>
              <select
                id="typeRateBm"
                className="hs-form-select"
                value={typeRateBm}
                onChange={(e) => setTypeRateBm(e.target.value)}
              >
                {rateTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="hs-form-group">
              <label htmlFor="ratesBm" className="hs-form-label">
                Rates BM
              </label>
              <div className="hs-input-with-suffix">
                <input
                  id="ratesBm"
                  type="number"
                  step="any"
                  min="0"
                  className="hs-form-input"
                  placeholder="0"
                  value={ratesBm}
                  onChange={(e) => setRatesBm(e.target.value)}
                />
                <span className="hs-input-suffix">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Customs Tariff */}
        <div className="hs-form-section">
          <h2 className="hs-form-section-title">
            <Icon name="archive" size={15} />
            <span>Customs Tariff</span>
          </h2>
          <div className="hs-form-grid hs-form-grid--2col">
            <div className="hs-form-group">
              <label htmlFor="typeRateCukai" className="hs-form-label">
                Type Rates Cukai
              </label>
              <select
                id="typeRateCukai"
                className="hs-form-select"
                value={typeRateCukai}
                onChange={(e) => setTypeRateCukai(e.target.value)}
              >
                {rateTypeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="hs-form-group">
              <label htmlFor="ratesCukai" className="hs-form-label">
                Rates Cukai
              </label>
              <div className="hs-input-with-suffix">
                <input
                  id="ratesCukai"
                  type="number"
                  step="any"
                  min="0"
                  className="hs-form-input"
                  placeholder="0"
                  value={ratesCukai}
                  onChange={(e) => setRatesCukai(e.target.value)}
                />
                <span className="hs-input-suffix">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Other Tax Rates */}
        <div className="hs-form-section">
          <h2 className="hs-form-section-title">
            <Icon name="grid" size={15} />
            <span>Other Tax Rates</span>
          </h2>
          <div className="hs-form-grid hs-form-grid--3col">
            <div className="hs-form-group">
              <label htmlFor="ratesPpn" className="hs-form-label">
                Rates PPN
              </label>
              <div className="hs-input-with-suffix">
                <input
                  id="ratesPpn"
                  type="number"
                  step="any"
                  min="0"
                  className="hs-form-input"
                  placeholder="11"
                  value={ratesPpn}
                  onChange={(e) => setRatesPpn(e.target.value)}
                />
                <span className="hs-input-suffix">%</span>
              </div>
            </div>

            <div className="hs-form-group">
              <label htmlFor="ratesPph" className="hs-form-label">
                Rates PPH
              </label>
              <div className="hs-input-with-suffix">
                <input
                  id="ratesPph"
                  type="number"
                  step="any"
                  min="0"
                  className="hs-form-input"
                  placeholder="2.5"
                  value={ratesPph}
                  onChange={(e) => setRatesPph(e.target.value)}
                />
                <span className="hs-input-suffix">%</span>
              </div>
            </div>

            <div className="hs-form-group">
              <label htmlFor="ratesPpnbm" className="hs-form-label">
                Rates PPNBM
              </label>
              <div className="hs-input-with-suffix">
                <input
                  id="ratesPpnbm"
                  type="number"
                  step="any"
                  min="0"
                  className="hs-form-input"
                  placeholder="0"
                  value={ratesPpnbm}
                  onChange={(e) => setRatesPpnbm(e.target.value)}
                />
                <span className="hs-input-suffix">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Form Action Buttons: Cancel and Save */}
        <div className="hs-form-actions">
          <Button type="button" variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export default HsForm;
