import React, { useState, useEffect, useMemo } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { fetchMasterLookupsApi, fetchMasterStyles } from "../../../../data/masterApi";
import type { ItemRecord } from "./item-types";

interface ItemFormProps {
  initialRecord?: ItemRecord | null;
  onBack: () => void;
  onSave?: (record: ItemRecord, isEdit: boolean) => void | Promise<any>;
}

interface LookupOption {
  id: number;
  code?: string;
  name: string;
  description?: string;
}

interface ItemLookupState {
  classifications: LookupOption[];
  categories: LookupOption[];
  facilities: LookupOption[];
  hsCodes: LookupOption[];
  customsReports: LookupOption[];
  itemTypes: LookupOption[];
  uoms: LookupOption[];
  brands: LookupOption[];
  styles: LookupOption[];
  colours: LookupOption[];
  origins: LookupOption[];
  groupScrapItems: LookupOption[];
  specifications: LookupOption[];
}

const EMPTY_LOOKUPS: ItemLookupState = {
  classifications: [],
  categories: [],
  facilities: [],
  hsCodes: [],
  customsReports: [],
  itemTypes: [],
  uoms: [],
  brands: [],
  styles: [],
  colours: [],
  origins: [],
  groupScrapItems: [],
  specifications: [],
};

const normStr = (v?: string | null) => (v ?? "").trim().toLowerCase();

function matchLookup<T extends { id: number; code?: string; name: string }>(
  list: T[],
  preferredId?: number | null,
  ...names: (string | undefined | null)[]
): T | undefined {
  if (!list.length) return undefined;
  if (preferredId) {
    const byId = list.find((r) => Number(r.id) === Number(preferredId));
    if (byId) return byId;
  }
  for (const raw of names) {
    const target = normStr(raw);
    if (!target || target === "-" || target === "—" || target === "none") continue;
    const exact = list.find(
      (r) => normStr(r.name) === target || (r.code && normStr(r.code) === target)
    );
    if (exact) return exact;
  }
  return undefined;
}

export function ItemForm({ initialRecord, onBack, onSave }: ItemFormProps) {
  const isEdit = !!initialRecord;

  // Master lookups from DB
  const [lookups, setLookups] = useState<ItemLookupState>(EMPTY_LOOKUPS);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [itemName, setItemName] = useState(initialRecord?.itemName || "");
  const [autoCode, setAutoCode] = useState(!isEdit);
  const [itemCode, setItemCode] = useState(initialRecord?.itemCode || "");
  const [kodeEksternal, setKodeEksternal] = useState(initialRecord?.kodeEksternal || "");
  const [traceByLot, setTraceByLot] = useState(
    initialRecord ? !!initialRecord.traceByLot : true
  );

  // FK IDs (real DB IDs) + display labels
  const [classificationsId, setClassificationsId] = useState<number | undefined>(
    initialRecord?.classifications_id
  );
  const [categoriesId, setCategoriesId] = useState<number | undefined>(
    initialRecord?.categories_id
  );
  const [facilitiesId, setFacilitiesId] = useState<number | undefined>(
    initialRecord?.facilities_id
  );
  const [hsCodeId, setHsCodeId] = useState<number | undefined>(
    initialRecord?.hs_code_id
  );
  const [customsReportsId, setCustomsReportsId] = useState<number | undefined>(
    initialRecord?.customs_reports_id
  );
  const [itemTypesId, setItemTypesId] = useState<number | undefined>(
    initialRecord?.item_types_id
  );

  // Units & conversion
  const [smallestUnitId, setSmallestUnitId] = useState<number | undefined>(
    initialRecord?.smallest_unit_id ?? initialRecord?.units_of_measurements_id
  );
  const [greatestUnitId, setGreatestUnitId] = useState<number | undefined>(
    initialRecord?.greatest_unit_id ?? initialRecord?.units_of_measurements_id
  );
  const [conversionRate, setConversionRate] = useState<number>(
    initialRecord?.unitConversion ?? 1
  );
  const [netto, setNetto] = useState<number>(initialRecord?.netto ?? 0);

  // Physical Attributes & Specs FK IDs
  const [brandsId, setBrandsId] = useState<number | undefined>(
    initialRecord?.brands_id
  );
  const [stylesId, setStylesId] = useState<number | undefined>(
    initialRecord?.styles_id
  );
  const [coloursId, setColoursId] = useState<number | undefined>(
    initialRecord?.colours_id
  );
  const [size, setSize] = useState(initialRecord?.size || "");
  const [dimension, setDimension] = useState(initialRecord?.dimension || "");
  const [originsId, setOriginsId] = useState<number | undefined>(
    initialRecord?.origins_id
  );
  const [groupScrapItemsId, setGroupScrapItemsId] = useState<number | undefined>(
    initialRecord?.group_scrap_items_id
  );
  const [specificationsId, setSpecificationsId] = useState<number | undefined>(
    initialRecord?.specifications_id
  );

  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  // Fetch all master lookups & styles from DB on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingLookups(true);

    Promise.all([fetchMasterLookupsApi(), fetchMasterStyles()])
      .then(([data, stylesData]) => {
        if (cancelled) return;
        const d = data || {};
        const next: ItemLookupState = {
          classifications: Array.isArray(d.classifications) ? d.classifications : [],
          categories: Array.isArray(d.categories) ? d.categories : [],
          facilities: Array.isArray(d.facilities) ? d.facilities : [],
          hsCodes: Array.isArray(d.hs_codes) ? d.hs_codes : [],
          customsReports: Array.isArray(d.customs_reports) ? d.customs_reports : [],
          itemTypes: Array.isArray(d.item_types) ? d.item_types : [],
          uoms: Array.isArray(d.units_of_measurements) ? d.units_of_measurements : [],
          brands: Array.isArray(d.brands) ? d.brands : [],
          styles: Array.isArray(stylesData)
            ? stylesData.map((s) => ({ id: Number(s.id), code: s.code, name: s.name }))
            : [],
          colours: Array.isArray(d.colours) ? d.colours : [],
          origins: Array.isArray(d.origins) ? d.origins : [],
          groupScrapItems: Array.isArray(d.group_scrap_items) ? d.group_scrap_items : [],
          specifications: Array.isArray(d.specifications) ? d.specifications : [],
        };
        setLookups(next);

        // Resolve required FKs (fallback to first seeded DB row on create)
        const clsMatch =
          matchLookup(next.classifications, initialRecord?.classifications_id, initialRecord?.classification) ??
          next.classifications[0];
        if (clsMatch) setClassificationsId(Number(clsMatch.id));

        const facMatch =
          matchLookup(next.facilities, initialRecord?.facilities_id, initialRecord?.facility) ??
          next.facilities[0];
        if (facMatch) setFacilitiesId(Number(facMatch.id));

        const smallUomMatch =
          matchLookup(
            next.uoms,
            initialRecord?.smallest_unit_id ?? initialRecord?.units_of_measurements_id,
            initialRecord?.smallestUnitCode,
            initialRecord?.smallestUnitName
          ) ??
          matchLookup(next.uoms, undefined, "PCE", "PIECE") ??
          next.uoms[0];
        if (smallUomMatch) setSmallestUnitId(Number(smallUomMatch.id));

        const greatUomMatch =
          matchLookup(
            next.uoms,
            initialRecord?.greatest_unit_id ?? initialRecord?.units_of_measurements_id,
            initialRecord?.greatestUnitCode,
            initialRecord?.greatestUnitName
          ) ?? smallUomMatch;
        if (greatUomMatch) setGreatestUnitId(Number(greatUomMatch.id));

        // Resolve optional FKs if initialRecord provides them
        const catMatch =
          matchLookup(next.categories, initialRecord?.categories_id, initialRecord?.category) ??
          (!isEdit ? next.categories[0] : undefined);
        if (catMatch) setCategoriesId(Number(catMatch.id));

        const hsMatch = matchLookup(next.hsCodes, initialRecord?.hs_code_id, initialRecord?.hsCode);
        if (hsMatch) setHsCodeId(Number(hsMatch.id));

        const crMatch = matchLookup(
          next.customsReports,
          initialRecord?.customs_reports_id,
          initialRecord?.customReport
        );
        if (crMatch) setCustomsReportsId(Number(crMatch.id));

        const itMatch = matchLookup(
          next.itemTypes,
          initialRecord?.item_types_id,
          initialRecord?.itemType
        );
        if (itMatch) setItemTypesId(Number(itMatch.id));

        const brMatch = matchLookup(next.brands, initialRecord?.brands_id, initialRecord?.brand);
        if (brMatch) setBrandsId(Number(brMatch.id));

        const stMatch = matchLookup(next.styles, initialRecord?.styles_id, initialRecord?.style);
        if (stMatch) setStylesId(Number(stMatch.id));

        const coMatch = matchLookup(next.colours, initialRecord?.colours_id, initialRecord?.colour);
        if (coMatch) setColoursId(Number(coMatch.id));

        const orMatch = matchLookup(next.origins, initialRecord?.origins_id, initialRecord?.origin);
        if (orMatch) setOriginsId(Number(orMatch.id));

        const gsMatch = matchLookup(
          next.groupScrapItems,
          initialRecord?.group_scrap_items_id,
          initialRecord?.groupScrap
        );
        if (gsMatch) setGroupScrapItemsId(Number(gsMatch.id));

        const spMatch = matchLookup(
          next.specifications,
          initialRecord?.specifications_id,
          initialRecord?.specification
        );
        if (spMatch) setSpecificationsId(Number(spMatch.id));
      })
      .catch((err) => {
        if (!cancelled) {
          setNotification({
            type: "warning",
            message: err?.message || "Failed to load master reference lookups from database.",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [initialRecord, isEdit]);

  // Pre-build CustomSelect options
  const classificationOptions = useMemo(
    () =>
      lookups.classifications.map((c) => ({
        value: String(c.id),
        label: c.code ? `${c.code} - ${c.name}` : c.name,
      })),
    [lookups.classifications]
  );

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.categories.map((c) => ({
        value: String(c.id),
        label: c.code ? `${c.code} - ${c.name}` : c.name,
      })),
    ],
    [lookups.categories]
  );

  const facilityOptions = useMemo(
    () =>
      lookups.facilities.map((f) => ({
        value: String(f.id),
        label: f.name,
      })),
    [lookups.facilities]
  );

  const hsCodeOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.hsCodes.map((h) => ({
        value: String(h.id),
        label: h.description ? `${h.name} - ${h.description}` : h.name,
      })),
    ],
    [lookups.hsCodes]
  );

  const customsReportOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.customsReports.map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [lookups.customsReports]
  );

  const itemTypeOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.itemTypes.map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [lookups.itemTypes]
  );

  const uomOptions = useMemo(
    () =>
      lookups.uoms.map((u) => ({
        value: String(u.id),
        label: u.code ? `${u.code} - ${u.name}` : u.name,
      })),
    [lookups.uoms]
  );

  const optionalUomOptions = useMemo(
    () => [{ value: "", label: "— Same as Usage Unit —" }, ...uomOptions],
    [uomOptions]
  );

  const brandOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.brands.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [lookups.brands]
  );

  const styleOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.styles.map((s) => ({
        value: String(s.id),
        label: s.code ? `${s.code} - ${s.name}` : s.name,
      })),
    ],
    [lookups.styles]
  );

  const colourOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.colours.map((c) => ({
        value: String(c.id),
        label: c.code ? `${c.code} - ${c.name}` : c.name,
      })),
    ],
    [lookups.colours]
  );

  const originOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.origins.map((o) => ({ value: String(o.id), label: o.name })),
    ],
    [lookups.origins]
  );

  const groupScrapOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.groupScrapItems.map((g) => ({
        value: String(g.id),
        label: g.code ? `${g.code} - ${g.name}` : g.name,
      })),
    ],
    [lookups.groupScrapItems]
  );

  const specificationOptions = useMemo(
    () => [
      { value: "", label: "— None / Not Set —" },
      ...lookups.specifications.map((s) => ({ value: String(s.id), label: s.name })),
    ],
    [lookups.specifications]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = itemName.trim();
    if (!trimmedName) {
      setError("Item Name is required.");
      setNotification({
        type: "warning",
        message: "Please enter a valid Item Name before proceeding.",
      });
      return;
    }

    if (loadingLookups) {
      setNotification({
        type: "warning",
        message: "Master reference data is still loading. Please wait a moment.",
      });
      return;
    }

    const effectiveClassId = classificationsId ?? lookups.classifications[0]?.id;
    const effectiveFacId = facilitiesId ?? lookups.facilities[0]?.id;
    const effectiveSmallUomId = smallestUnitId ?? lookups.uoms[0]?.id;
    const effectiveGreatUomId = greatestUnitId ?? effectiveSmallUomId;

    if (!effectiveClassId || !effectiveFacId || !effectiveSmallUomId) {
      setNotification({
        type: "warning",
        message:
          "Required master references (Classification, Facility, and Unit of Measurement) must be selected before saving.",
      });
      return;
    }

    let finalCode = itemCode.trim();
    if (autoCode || !finalCode) {
      finalCode =
        isEdit && initialRecord?.itemCode
          ? initialRecord.itemCode
          : `ITM-${Date.now().toString().slice(-6)}`;
    }

    setError(null);
    setNotification(null);

    const clsObj = lookups.classifications.find((c) => c.id === effectiveClassId);
    const catObj = lookups.categories.find((c) => c.id === categoriesId);
    const facObj = lookups.facilities.find((f) => f.id === effectiveFacId);
    const hsObj = lookups.hsCodes.find((h) => h.id === hsCodeId);
    const crObj = lookups.customsReports.find((c) => c.id === customsReportsId);
    const itObj = lookups.itemTypes.find((t) => t.id === itemTypesId);
    const smallUomObj = lookups.uoms.find((u) => u.id === effectiveSmallUomId);
    const greatUomObj = lookups.uoms.find((u) => u.id === effectiveGreatUomId);
    const brandObj = lookups.brands.find((b) => b.id === brandsId);
    const styleObj = lookups.styles.find((s) => s.id === stylesId);
    const colourObj = lookups.colours.find((c) => c.id === coloursId);
    const originObj = lookups.origins.find((o) => o.id === originsId);
    const scrapObj = lookups.groupScrapItems.find((g) => g.id === groupScrapItemsId);
    const specObj = lookups.specifications.find((s) => s.id === specificationsId);

    const facLabel = (facObj?.name || initialRecord?.facility || "FASILITAS").toUpperCase();
    const facilityDisplay: "FASILITAS" | "NON FASILITAS" = facLabel.includes("NON")
      ? "NON FASILITAS"
      : "FASILITAS";

    const updatedRecord: ItemRecord = {
      id: initialRecord ? initialRecord.id : `item-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      itemCode: finalCode,
      kodeEksternal: kodeEksternal.trim() || "-",
      itemName: trimmedName,
      classification: clsObj?.name || initialRecord?.classification || "-",
      category: catObj?.name || "-",
      hsCode: hsObj?.name || "-",
      smallestUnitCode: smallUomObj?.code || smallUomObj?.name || "PCE",
      smallestUnitName: smallUomObj?.name || "PIECE",
      greatestUnitCode: greatUomObj?.code || greatUomObj?.name || smallUomObj?.code || "PCE",
      greatestUnitName: greatUomObj?.name || smallUomObj?.name || "PIECE",
      facility: facilityDisplay,
      groupScrap: scrapObj?.name || "-",
      specification: specObj?.name || "-",
      origin: originObj?.name || "-",
      colour: colourObj?.name || "-",
      brand: brandObj?.name || "NO BRAND",
      style: styleObj?.name || "No Style",
      customReport: crObj?.name || "-",
      itemType: itObj?.name || "-",
      unitConversion: Number.isFinite(conversionRate) && conversionRate > 0 ? conversionRate : 1,
      netto: Number.isFinite(netto) && netto >= 0 ? netto : 0,
      size: size.trim() || "-",
      dimension: dimension.trim() || "-",
      // Real database foreign keys
      classifications_id: effectiveClassId,
      categories_id: categoriesId,
      facilities_id: effectiveFacId,
      hs_code_id: hsCodeId,
      customs_reports_id: customsReportsId,
      item_types_id: itemTypesId,
      units_of_measurements_id: effectiveSmallUomId,
      smallest_unit_id: effectiveSmallUomId,
      greatest_unit_id: effectiveGreatUomId,
      brands_id: brandsId,
      styles_id: stylesId,
      colours_id: coloursId,
      origins_id: originsId,
      group_scrap_items_id: groupScrapItemsId,
      specifications_id: specificationsId,
      traceByLot: traceByLot ? 1 : 0,
      status: initialRecord ? initialRecord.status : "Active",
      createdAt:
        initialRecord?.createdAt ||
        `${new Date().toISOString().slice(0, 10)} by USER`,
      createdBy: initialRecord?.createdBy || "USER",
      updatedAt: `${new Date().toISOString().slice(0, 10)} by USER`,
      updatedBy: "USER",
      stock: initialRecord?.stock || 0,
      stockUnit: smallUomObj?.code || smallUomObj?.name || "PCE",
    };

    if (onSave) {
      try {
        setSaving(true);
        await onSave(updatedRecord, isEdit);
      } catch (err: any) {
        setNotification({
          type: "warning",
          message: err?.message || "Failed to save Master Item to the database.",
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } finally {
        setSaving(false);
      }
    }
  };

  return (
    <div className="item-form-page">
      {/* Header */}
      <div className="item-form-header">
        <h1 className="item-form-title">
          {isEdit ? "Edit Item" : "Add Item"}
        </h1>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className={`department-alert department-alert--${notification.type}`}>
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
          <div className="department-alert__content">
            <strong>
              {notification.type === "warning" ? "Validation Notice" : "Notice"}
            </strong>
            <p>{notification.message}</p>
          </div>
          <button
            type="button"
            className="department-alert-close"
            onClick={() => setNotification(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="item-form-card">
        {/* Section 1: Identification & Basic Info */}
        <div>
          <h3 className="item-form-section-title">Item Identification</h3>
          <div className="item-form-grid">
            <div className="item-form-group item-form-group--full">
              <label htmlFor="itemName" className="item-form-label">
                Item Name <span className="required-mark">*</span>
              </label>
              <input
                id="itemName"
                type="text"
                className={`item-form-input ${error ? "has-error" : ""}`}
                placeholder="e.g. Nozzle Jet Spray Spiral SUS 316..."
                value={itemName}
                onChange={(e) => {
                  setItemName(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
              />
              {error && <span className="item-form-error-msg">{error}</span>}
            </div>

            <div className="item-form-group">
              <label className="item-form-label">Item Code</label>
              <input
                type="text"
                className="item-form-input"
                placeholder={autoCode ? "Auto Generated" : "Enter item code..."}
                value={autoCode ? "AUTO GENERATE" : itemCode}
                onChange={(e) => setItemCode(e.target.value)}
                disabled={autoCode}
                style={{
                  background: autoCode ? "#f8fafc" : "#ffffff",
                  fontFamily: "var(--font-mono, monospace)",
                }}
              />
              <label className="item-form-checkbox-label">
                <input
                  type="checkbox"
                  checked={autoCode}
                  onChange={(e) => setAutoCode(e.target.checked)}
                />
                <span>Auto Generate Item Code</span>
              </label>
            </div>

            <div className="item-form-group">
              <label htmlFor="kodeEksternal" className="item-form-label">
                External Code
              </label>
              <input
                id="kodeEksternal"
                type="text"
                className="item-form-input"
                placeholder="External reference code..."
                value={kodeEksternal}
                onChange={(e) => setKodeEksternal(e.target.value)}
              />
            </div>

            <div className="item-form-group">
              <label className="item-form-label">Inventory Tracking</label>
              <label className="item-form-checkbox-label" style={{ marginTop: "10px" }}>
                <input
                  type="checkbox"
                  checked={traceByLot}
                  onChange={(e) => setTraceByLot(e.target.checked)}
                />
                <span>Trace By Lot</span>
              </label>
            </div>
          </div>
        </div>

        {/* Section 2: Classification & Regulatory */}
        <div>
          <h3 className="item-form-section-title">Classification & Customs</h3>
          <div className="item-form-grid">
            <div className="item-form-group">
              <label htmlFor="classification" className="item-form-label">
                Classification <span className="required-mark">*</span>
              </label>
              <CustomSelect
                id="classification"
                value={classificationsId ? String(classificationsId) : ""}
                onChange={(val) => setClassificationsId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading classifications..." : "Select classification..."}
                disabled={loadingLookups}
                options={classificationOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="category" className="item-form-label">
                Category
              </label>
              <CustomSelect
                id="category"
                value={categoriesId ? String(categoriesId) : ""}
                onChange={(val) => setCategoriesId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading categories..." : "Select category..."}
                disabled={loadingLookups}
                options={categoryOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="facility" className="item-form-label">
                Facility <span className="required-mark">*</span>
              </label>
              <CustomSelect
                id="facility"
                value={facilitiesId ? String(facilitiesId) : ""}
                onChange={(val) => setFacilitiesId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading facilities..." : "Select facility..."}
                disabled={loadingLookups}
                options={facilityOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="hsCode" className="item-form-label">
                HS Code
              </label>
              <CustomSelect
                id="hsCode"
                value={hsCodeId ? String(hsCodeId) : ""}
                onChange={(val) => setHsCodeId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading HS codes..." : "Select HS code..."}
                disabled={loadingLookups}
                options={hsCodeOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="customReport" className="item-form-label">
                Customs Report
              </label>
              <CustomSelect
                id="customReport"
                value={customsReportsId ? String(customsReportsId) : ""}
                onChange={(val) => setCustomsReportsId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading customs reports..." : "Select customs report..."}
                disabled={loadingLookups}
                options={customsReportOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="jenisItem" className="item-form-label">
                Item Type
              </label>
              <CustomSelect
                id="jenisItem"
                value={itemTypesId ? String(itemTypesId) : ""}
                onChange={(val) => setItemTypesId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading item types..." : "Select item type..."}
                disabled={loadingLookups}
                options={itemTypeOptions}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Units of Measure & Conversions */}
        <div>
          <h3 className="item-form-section-title">Units & Measurement</h3>
          <div className="item-form-grid">
            <div className="item-form-group">
              <label htmlFor="smallestUnitCode" className="item-form-label">
                Usage Unit (Smallest Unit) <span className="required-mark">*</span>
              </label>
              <CustomSelect
                id="smallestUnitCode"
                value={smallestUnitId ? String(smallestUnitId) : ""}
                onChange={(val) => setSmallestUnitId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading units..." : "Select usage unit..."}
                disabled={loadingLookups}
                options={uomOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="greatestUnitCode" className="item-form-label">
                Purchase Unit (Greatest Unit)
              </label>
              <CustomSelect
                id="greatestUnitCode"
                value={greatestUnitId ? String(greatestUnitId) : ""}
                onChange={(val) => setGreatestUnitId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading units..." : "Select purchase unit..."}
                disabled={loadingLookups}
                options={optionalUomOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="conversionRate" className="item-form-label">
                Unit Conversion
              </label>
              <input
                id="conversionRate"
                type="number"
                min="0.0001"
                step="any"
                className="item-form-input"
                value={conversionRate}
                onChange={(e) => setConversionRate(Number(e.target.value))}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="netto" className="item-form-label">
                Netto (Kg)
              </label>
              <input
                id="netto"
                type="number"
                min="0"
                step="any"
                className="item-form-input"
                value={netto}
                onChange={(e) => setNetto(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Specifications & Physical Attributes */}
        <div>
          <h3 className="item-form-section-title">Physical Attributes & Specs</h3>
          <div className="item-form-grid">
            <div className="item-form-group">
              <label htmlFor="brand" className="item-form-label">
                Brand
              </label>
              <CustomSelect
                id="brand"
                value={brandsId ? String(brandsId) : ""}
                onChange={(val) => setBrandsId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading brands..." : "Select brand..."}
                disabled={loadingLookups}
                options={brandOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="style" className="item-form-label">
                Style
              </label>
              <CustomSelect
                id="style"
                value={stylesId ? String(stylesId) : ""}
                onChange={(val) => setStylesId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading styles..." : "Select style..."}
                disabled={loadingLookups}
                options={styleOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="colour" className="item-form-label">
                Colour
              </label>
              <CustomSelect
                id="colour"
                value={coloursId ? String(coloursId) : ""}
                onChange={(val) => setColoursId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading colours..." : "Select colour..."}
                disabled={loadingLookups}
                options={colourOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="size" className="item-form-label">
                Size
              </label>
              <input
                id="size"
                type="text"
                className="item-form-input"
                placeholder='e.g. ½", M12...'
                value={size}
                onChange={(e) => setSize(e.target.value)}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="dimension" className="item-form-label">
                Dimension
              </label>
              <input
                id="dimension"
                type="text"
                className="item-form-input"
                placeholder="e.g. 2mm x 4' x 8'..."
                value={dimension}
                onChange={(e) => setDimension(e.target.value)}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="origin" className="item-form-label">
                Origin
              </label>
              <CustomSelect
                id="origin"
                value={originsId ? String(originsId) : ""}
                onChange={(val) => setOriginsId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading origins..." : "Select origin..."}
                disabled={loadingLookups}
                options={originOptions}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="groupScrap" className="item-form-label">
                Group Scrap Item
              </label>
              <CustomSelect
                id="groupScrap"
                value={groupScrapItemsId ? String(groupScrapItemsId) : ""}
                onChange={(val) => setGroupScrapItemsId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading group scrap..." : "Select group scrap..."}
                disabled={loadingLookups}
                options={groupScrapOptions}
              />
            </div>

            <div className="item-form-group item-form-group--full">
              <label htmlFor="specification" className="item-form-label">
                Specification
              </label>
              <CustomSelect
                id="specification"
                value={specificationsId ? String(specificationsId) : ""}
                onChange={(val) => setSpecificationsId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading specifications..." : "Select specification..."}
                disabled={loadingLookups}
                options={specificationOptions}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="item-form-actions">
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" icon="check" disabled={saving || loadingLookups}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ItemForm;
