import React, { useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { itemCategories, itemClassifications } from "./item-data";
import type { ItemRecord } from "./item-types";

interface ItemFormProps {
  initialRecord?: ItemRecord | null;
  onBack: () => void;
  onSave?: (record: ItemRecord, isEdit: boolean) => void;
}

export function ItemForm({ initialRecord, onBack, onSave }: ItemFormProps) {
  const isEdit = !!initialRecord;

  // Form states
  const [itemName, setItemName] = useState(initialRecord?.itemName || "");
  const [autoCode, setAutoCode] = useState(!isEdit);
  const [itemCode, setItemCode] = useState(initialRecord?.itemCode || "");
  const [kodeEksternal, setKodeEksternal] = useState(initialRecord?.kodeEksternal || "");
  const [traceByLot, setTraceByLot] = useState(
    initialRecord ? !!initialRecord.traceByLot : true
  );

  const [category, setCategory] = useState(
    initialRecord?.category && initialRecord.category !== "-"
      ? initialRecord.category
      : "Umum"
  );
  const [classification, setClassification] = useState(
    initialRecord?.classification || "MESIN & SPARE PART"
  );
  const [facility, setFacility] = useState<"FASILITAS" | "NON FASILITAS">(
    initialRecord?.facility || "FASILITAS"
  );
  const [origin, setOrigin] = useState(initialRecord?.origin || "-");
  const [jenisItem, setJenisItem] = useState("Raw Material");

  // Units & conversion
  const [smallestUnitCode, setSmallestUnitCode] = useState(
    initialRecord?.smallestUnitCode || "PCE"
  );
  const [smallestUnitName, setSmallestUnitName] = useState(
    initialRecord?.smallestUnitName || "PIECE"
  );
  const [greatestUnitCode, setGreatestUnitCode] = useState(
    initialRecord?.greatestUnitCode || "PCE"
  );
  const [greatestUnitName, setGreatestUnitName] = useState(
    initialRecord?.greatestUnitName || "PIECE"
  );
  const [conversionRate, setConversionRate] = useState<number>(1);
  const [netto, setNetto] = useState<number>(0);

  // Attributes
  const [hsCode, setHsCode] = useState(initialRecord?.hsCode || "");
  const [colour, setColour] = useState(initialRecord?.colour || "-");
  const [brand, setBrand] = useState(initialRecord?.brand || "NO BRAND");
  const [style, setStyle] = useState(initialRecord?.style || "No Style");
  const [size, setSize] = useState("-");
  const [dimension, setDimension] = useState("-");
  const [customReport, setCustomReport] = useState(
    initialRecord?.customReport || "Sesuai Klasifikasi Barang"
  );
  const [groupScrap, setGroupScrap] = useState(initialRecord?.groupScrap || "-");
  const [specification, setSpecification] = useState(
    initialRecord?.specification || "-"
  );

  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "info" | "warning" | "success";
    message: string;
  } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
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

    let finalCode = itemCode.trim();
    if (autoCode || !finalCode) {
      finalCode = isEdit && initialRecord?.itemCode
        ? initialRecord.itemCode
        : `ITM-${Date.now().toString().slice(-6)}`;
    }

    setError(null);
    setNotification(null);

    const updatedRecord: ItemRecord = {
      id: initialRecord ? initialRecord.id : `item-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      itemCode: finalCode,
      kodeEksternal: kodeEksternal.trim() || "-",
      itemName: trimmedName,
      classification,
      category,
      hsCode: hsCode.trim() || "-",
      smallestUnitCode,
      smallestUnitName,
      greatestUnitCode,
      greatestUnitName,
      facility,
      groupScrap: groupScrap.trim() || "-",
      specification: specification.trim() || "-",
      origin: origin.trim() || "-",
      colour: colour.trim() || "-",
      brand: brand.trim() || "NO BRAND",
      style: style.trim() || "No Style",
      customReport,
      traceByLot: traceByLot ? 1 : 0,
      status: initialRecord ? initialRecord.status : "Active",
      createdAt:
        initialRecord?.createdAt ||
        `${new Date().toISOString().slice(0, 10)} by USER`,
      createdBy: initialRecord?.createdBy || "USER",
      updatedAt: `${new Date().toISOString().slice(0, 10)} by USER`,
      updatedBy: "USER",
      stock: initialRecord?.stock || 0,
      stockUnit: smallestUnitCode,
    };

    if (onSave) {
      onSave(updatedRecord, isEdit);
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
                Classification
              </label>
              <select
                id="classification"
                className="item-form-select"
                value={classification}
                onChange={(e) => setClassification(e.target.value)}
              >
                {itemClassifications
                  .filter((c) => c !== "All Classifications")
                  .map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
              </select>
            </div>

            <div className="item-form-group">
              <label htmlFor="category" className="item-form-label">
                Category
              </label>
              <select
                id="category"
                className="item-form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {itemCategories
                  .filter((c) => c !== "All Categories")
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>

            <div className="item-form-group">
              <label htmlFor="facility" className="item-form-label">
                Facility
              </label>
              <select
                id="facility"
                className="item-form-select"
                value={facility}
                onChange={(e) =>
                  setFacility(e.target.value as "FASILITAS" | "NON FASILITAS")
                }
              >
                <option value="FASILITAS">FASILITAS</option>
                <option value="NON FASILITAS">NON FASILITAS</option>
              </select>
            </div>

            <div className="item-form-group">
              <label htmlFor="hsCode" className="item-form-label">
                HS Code
              </label>
              <input
                id="hsCode"
                type="text"
                className="item-form-input"
                placeholder="e.g. 7219.34.00"
                value={hsCode}
                onChange={(e) => setHsCode(e.target.value)}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="customReport" className="item-form-label">
                Customs Report
              </label>
              <select
                id="customReport"
                className="item-form-select"
                value={customReport}
                onChange={(e) => setCustomReport(e.target.value)}
              >
                <option value="Sesuai Klasifikasi Barang">
                  Sesuai Klasifikasi Barang
                </option>
                <option value="Mutasi Bahan Baku dan Penolong">
                  Mutasi Bahan Baku dan Penolong
                </option>
                <option value="Mutasi Barang Jadi">Mutasi Barang Jadi</option>
                <option value="Mutasi Barang Modal">Mutasi Barang Modal</option>
              </select>
            </div>

            <div className="item-form-group">
              <label htmlFor="jenisItem" className="item-form-label">
                Item Type
              </label>
              <select
                id="jenisItem"
                className="item-form-select"
                value={jenisItem}
                onChange={(e) => setJenisItem(e.target.value)}
              >
                <option value="Raw Material">Raw Material</option>
                <option value="Finish Good">Finish Good</option>
                <option value="Scrap">Scrap</option>
                <option value="Spare Part">Spare Part</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Units of Measure & Conversions */}
        <div>
          <h3 className="item-form-section-title">Units & Measurement</h3>
          <div className="item-form-grid">
            <div className="item-form-group">
              <label htmlFor="smallestUnitCode" className="item-form-label">
                Usage Unit (Smallest Unit)
              </label>
              <select
                id="smallestUnitCode"
                className="item-form-select"
                value={smallestUnitCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setSmallestUnitCode(val);
                  if (val === "PCE") setSmallestUnitName("PIECE");
                  else if (val === "KGM") setSmallestUnitName("KILOGRAM");
                  else if (val === "LTR") setSmallestUnitName("LITER");
                  else if (val === "MTR") setSmallestUnitName("METER");
                  else if (val === "SET") setSmallestUnitName("SET");
                  else if (val === "ST") setSmallestUnitName("SHEET");
                }}
              >
                <option value="PCE">PCE - PIECE</option>
                <option value="KGM">KGM - KILOGRAM</option>
                <option value="LTR">LTR - LITER</option>
                <option value="MTR">MTR - METER</option>
                <option value="SET">SET - SET</option>
                <option value="ST">ST - SHEET</option>
              </select>
            </div>

            <div className="item-form-group">
              <label htmlFor="greatestUnitCode" className="item-form-label">
                Purchase Unit (Greatest Unit)
              </label>
              <select
                id="greatestUnitCode"
                className="item-form-select"
                value={greatestUnitCode}
                onChange={(e) => {
                  const val = e.target.value;
                  setGreatestUnitCode(val);
                  if (val === "PCE") setGreatestUnitName("PIECE");
                  else if (val === "KGM") setGreatestUnitName("KILOGRAM");
                  else if (val === "LTR") setGreatestUnitName("LITER");
                  else if (val === "MTR") setGreatestUnitName("METER");
                  else if (val === "SET") setGreatestUnitName("SET");
                  else if (val === "ST") setGreatestUnitName("SHEET");
                }}
              >
                <option value="PCE">PCE - PIECE</option>
                <option value="KGM">KGM - KILOGRAM</option>
                <option value="LTR">LTR - LITER</option>
                <option value="MTR">MTR - METER</option>
                <option value="SET">SET - SET</option>
                <option value="ST">ST - SHEET</option>
              </select>
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
              <input
                id="brand"
                type="text"
                className="item-form-input"
                placeholder="e.g. NO BRAND, SANDVIK..."
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="style" className="item-form-label">
                Style
              </label>
              <input
                id="style"
                type="text"
                className="item-form-input"
                placeholder="e.g. No Style..."
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="colour" className="item-form-label">
                Colour
              </label>
              <input
                id="colour"
                type="text"
                className="item-form-input"
                placeholder="e.g. Silver, Black..."
                value={colour}
                onChange={(e) => setColour(e.target.value)}
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
              <input
                id="origin"
                type="text"
                className="item-form-input"
                placeholder="e.g. Lokal, Impor, Japan..."
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>

            <div className="item-form-group">
              <label htmlFor="groupScrap" className="item-form-label">
                Group Scrap Item
              </label>
              <input
                id="groupScrap"
                type="text"
                className="item-form-input"
                placeholder="e.g. Scrap Logam..."
                value={groupScrap}
                onChange={(e) => setGroupScrap(e.target.value)}
              />
            </div>

            <div className="item-form-group item-form-group--full">
              <label htmlFor="specification" className="item-form-label">
                Specification
              </label>
              <textarea
                id="specification"
                className="item-form-textarea"
                placeholder="Detailed material or physical specifications..."
                value={specification}
                onChange={(e) => setSpecification(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="item-form-actions">
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

export default ItemForm;
