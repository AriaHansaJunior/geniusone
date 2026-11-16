import React, { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { fetchHsRateTypesApi } from "../../../../data/masterApi";
import type { HsRecord } from "./hs-types";

interface RateTypeOption {
  id: number;
  name: string;
}

interface HsFormProps {
  initialRecord?: HsRecord | null;
  onBack: () => void;
  onSave?: (record: HsRecord, isEdit: boolean) => Promise<void> | void;
}

export function HsForm({ initialRecord, onBack, onSave }: HsFormProps) {
  const isEdit = Boolean(initialRecord);

  const [name, setName] = useState(initialRecord?.name || "");
  const [description, setDescription] = useState(initialRecord?.description || "");
  const [typeRateBmId, setTypeRateBmId] = useState<string>(
    initialRecord?.typeRateBmId ? String(initialRecord.typeRateBmId) : ""
  );
  const [ratesBm, setRatesBm] = useState<string>(
    initialRecord?.ratesBm !== undefined ? String(initialRecord.ratesBm) : "0"
  );
  const [typeRateCukaiId, setTypeRateCukaiId] = useState<string>(
    initialRecord?.typeRateCukaiId ? String(initialRecord.typeRateCukaiId) : ""
  );
  const [ratesCukai, setRatesCukai] = useState<string>(
    initialRecord?.ratesCukai !== undefined ? String(initialRecord.ratesCukai) : "0"
  );

  const [bmOptions, setBmOptions] = useState<RateTypeOption[]>([]);
  const [cukaiOptions, setCukaiOptions] = useState<RateTypeOption[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setName(initialRecord?.name || "");
    setDescription(initialRecord?.description || "");
    setTypeRateBmId(initialRecord?.typeRateBmId ? String(initialRecord.typeRateBmId) : "");
    setRatesBm(initialRecord?.ratesBm !== undefined ? String(initialRecord.ratesBm) : "0");
    setTypeRateCukaiId(
      initialRecord?.typeRateCukaiId ? String(initialRecord.typeRateCukaiId) : ""
    );
    setRatesCukai(
      initialRecord?.ratesCukai !== undefined ? String(initialRecord.ratesCukai) : "0"
    );
    setError(null);
    setSubmitError(null);
    setSaving(false);
  }, [initialRecord]);

  useEffect(() => {
    let cancelled = false;
    setLoadingRates(true);

    fetchHsRateTypesApi()
      .then(({ bmTypes, cukaiTypes }) => {
        if (cancelled) return;
        setBmOptions(bmTypes);
        setCukaiOptions(cukaiTypes);

        setTypeRateBmId((prev) => {
          if (prev && bmTypes.some((t) => String(t.id) === prev)) return prev;
          if (initialRecord?.typeRateBm) {
            const matched = bmTypes.find(
              (t) => t.name.toLowerCase() === initialRecord.typeRateBm.toLowerCase()
            );
            if (matched) return String(matched.id);
          }
          return bmTypes[0] ? String(bmTypes[0].id) : "";
        });

        setTypeRateCukaiId((prev) => {
          if (prev && cukaiTypes.some((t) => String(t.id) === prev)) return prev;
          if (initialRecord?.typeRateCukai) {
            const matched = cukaiTypes.find(
              (t) => t.name.toLowerCase() === initialRecord.typeRateCukai.toLowerCase()
            );
            if (matched) return String(matched.id);
          }
          return cukaiTypes[0] ? String(cukaiTypes[0].id) : "";
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setSubmitError(
            err?.message || "Failed to load BM & Cukai rate types from database."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingRates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialRecord]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("HS Code is required.");
      setSubmitError("Please enter a valid HS Code before saving.");
      return;
    }
    if (trimmedName.length > 45) {
      setError("HS Code cannot exceed 45 characters.");
      setSubmitError("HS Code cannot exceed 45 characters.");
      return;
    }

    const parsedRatesBm = parseFloat(ratesBm);
    const parsedRatesCukai = parseFloat(ratesCukai);

    if (ratesBm.trim() !== "" && (Number.isNaN(parsedRatesBm) || parsedRatesBm < 0)) {
      setSubmitError("Rates BM must be a non-negative number.");
      return;
    }
    if (
      ratesCukai.trim() !== "" &&
      (Number.isNaN(parsedRatesCukai) || parsedRatesCukai < 0)
    ) {
      setSubmitError("Rates Cukai must be a non-negative number.");
      return;
    }

    setError(null);
    setSubmitError(null);

    const selectedBm = bmOptions.find((o) => String(o.id) === typeRateBmId);
    const selectedCukai = cukaiOptions.find((o) => String(o.id) === typeRateCukaiId);

    const payload: HsRecord = {
      id: initialRecord ? initialRecord.id : "",
      no: initialRecord ? initialRecord.no : 1,
      name: trimmedName,
      description: description.trim(),
      typeRateBmId: selectedBm?.id ?? initialRecord?.typeRateBmId,
      typeRateBm: selectedBm?.name || initialRecord?.typeRateBm || "-",
      ratesBm: Number.isNaN(parsedRatesBm) ? 0 : parsedRatesBm,
      typeRateCukaiId: selectedCukai?.id ?? initialRecord?.typeRateCukaiId,
      typeRateCukai: selectedCukai?.name || initialRecord?.typeRateCukai || "-",
      ratesCukai: Number.isNaN(parsedRatesCukai) ? 0 : parsedRatesCukai,
      ratesPpn: initialRecord?.ratesPpn ?? 0,
      ratesPph: initialRecord?.ratesPph ?? 0,
      ratesPpnbm: initialRecord?.ratesPpnbm ?? 0,
    };

    if (onSave) {
      try {
        setSaving(true);
        await onSave(payload, isEdit);
      } catch (err: any) {
        setSubmitError(err?.message || "Failed to save HS Code. Please verify your inputs.");
        setSaving(false);
      }
    }
  };

  return (
    <div className="master-form-page">
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit HS Code" : "Add HS Code"}
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
        <div className="hs-form-section">
          <h2 className="master-form-section-title">Basic Information</h2>
          <div className="master-form-grid-2">
            <div className="master-form-group">
              <label htmlFor="hsCodeName" className="master-form-label">
                HS Code <span className="required-mark">*</span>
              </label>
              <input
                id="hsCodeName"
                type="text"
                maxLength={45}
                className={`master-form-input font-mono ${error ? "is-invalid" : ""}`}
                placeholder="e.g. 8548.10.00"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus={!isEdit}
              />
              {error && <span className="master-form-error-text">{error}</span>}
            </div>

            <div className="master-form-group">
              <label htmlFor="hsDescription" className="master-form-label">
                Description
              </label>
              <input
                id="hsDescription"
                type="text"
                maxLength={255}
                className="master-form-input"
                placeholder="e.g. Lead waste and scrap"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="hs-form-section">
          <h2 className="master-form-section-title">Duty &amp; Excise Tariffs</h2>
          <div className="master-form-grid-2">
            <div className="master-form-group">
              <label htmlFor="typeRateBm" className="master-form-label">
                Type Rates BM
              </label>
              <CustomSelect
                id="typeRateBm"
                disabled={loadingRates}
                value={typeRateBmId}
                onChange={(val) => setTypeRateBmId(val)}
                options={
                  bmOptions.length > 0
                    ? bmOptions.map((opt) => ({ value: String(opt.id), label: opt.name }))
                    : [{ value: "", label: loadingRates ? "Loading rate types..." : "No rate types found" }]
                }
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="ratesBm" className="master-form-label">
                Rates BM
              </label>
              <div className="hs-input-with-suffix">
                <input
                  id="ratesBm"
                  type="number"
                  step="any"
                  min="0"
                  className="master-form-input hs-form-input"
                  placeholder="0"
                  value={ratesBm}
                  onChange={(e) => setRatesBm(e.target.value)}
                />
                <span className="hs-input-suffix">%</span>
              </div>
            </div>

            <div className="master-form-group">
              <label htmlFor="typeRateCukai" className="master-form-label">
                Type Rates Cukai
              </label>
              <CustomSelect
                id="typeRateCukai"
                disabled={loadingRates}
                value={typeRateCukaiId}
                onChange={(val) => setTypeRateCukaiId(val)}
                options={
                  cukaiOptions.length > 0
                    ? cukaiOptions.map((opt) => ({ value: String(opt.id), label: opt.name }))
                    : [{ value: "", label: loadingRates ? "Loading rate types..." : "No rate types found" }]
                }
              />
            </div>

            <div className="master-form-group">
              <label htmlFor="ratesCukai" className="master-form-label">
                Rates Cukai
              </label>
              <div className="hs-input-with-suffix">
                <input
                  id="ratesCukai"
                  type="number"
                  step="any"
                  min="0"
                  className="master-form-input hs-form-input"
                  placeholder="0"
                  value={ratesCukai}
                  onChange={(e) => setRatesCukai(e.target.value)}
                />
                <span className="hs-input-suffix">%</span>
              </div>
            </div>
          </div>
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

export default HsForm;
