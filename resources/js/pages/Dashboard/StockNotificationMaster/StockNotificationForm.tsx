import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import type { StockNotificationRecord } from "./stock-notification-types";

interface StockNotificationFormProps {
  initialRecord?: StockNotificationRecord | null;
  onBack: () => void;
  onSave: (record: StockNotificationRecord, isEdit: boolean) => void;
}

const predefinedItems = [
  { code: "80.100.001.001", name: "Laptop ThinkPad T14 Gen 4 Core i7 16GB", category: "IT EQUIPMENT", unit: "PCE", stock: 1 },
  { code: "10.002.400.020", name: "Pulpen Gel Ballpoint 0.5 Black Standard", category: "GENERAL ATK", unit: "PCE", stock: 8 },
  { code: "60.154.300.101", name: 'Nozzle Jet Spray Spiral SUS 316 size ½" (Male thread)', category: "MESIN & SPARE PART", unit: "PCE", stock: 45 },
  { code: "30.200.010.003", name: "Flux Refining Powder Smelting Grade", category: "BAHAN PENOLONG", unit: "SAK", stock: 12 },
  { code: "10.002.400.012", name: "Kertas HVS A4 80gr PaperOne", category: "GENERAL ATK", unit: "RIM", stock: 35 },
  { code: "60.149.301.404", name: "Mur Baut M 10 x 40 + ring pir", category: "MESIN & SPARE PART", unit: "PCE", stock: 150 },
  { code: "50.112.100.001", name: "Tembaga Batangan Murni 99.9% Grade A", category: "FINISH GOOD", unit: "KGS", stock: 750 },
  { code: "40.301.002.005", name: "Solar Industri B35 Pertamina", category: "BAHAN PENOLONG", unit: "LTR", stock: 4800 },
];

export function StockNotificationForm({
  initialRecord,
  onBack,
  onSave,
}: StockNotificationFormProps) {
  const isEdit = !!initialRecord;

  const [itemCode, setItemCode] = useState(initialRecord?.itemCode || "");
  const [itemName, setItemName] = useState(initialRecord?.itemName || "");
  const [category, setCategory] = useState(initialRecord?.category || "");
  const [unit, setUnit] = useState(initialRecord?.unit || "");
  const [currentStock, setCurrentStock] = useState<number | "">(
    initialRecord ? initialRecord.currentStock : ""
  );
  const [bufferQuantity, setBufferQuantity] = useState<number | "">(
    initialRecord ? initialRecord.bufferQuantity : ""
  );
  const [notificationLevel, setNotificationLevel] = useState<"Critical" | "Warning" | "Standard">(
    initialRecord?.notificationLevel || "Warning"
  );
  const [status, setStatus] = useState<"Active" | "Inactive">(initialRecord?.status || "Active");
  const [notes, setNotes] = useState(initialRecord?.notes || "");
  const [error, setError] = useState<string | null>(null);

  const handleSelectItem = (code: string) => {
    if (!code) {
      setItemCode("");
      setItemName("");
      setCategory("");
      setUnit("");
      setCurrentStock("");
      return;
    }
    const found = predefinedItems.find((p) => p.code === code);
    if (found) {
      setItemCode(found.code);
      setItemName(found.name);
      setCategory(found.category);
      setUnit(found.unit);
      setCurrentStock(found.stock);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!itemCode.trim()) {
      setError("Item Code is required. Please select an item or enter code.");
      return;
    }

    if (!itemName.trim()) {
      setError("Item Name is required. Please enter item name.");
      return;
    }

    const numBuffer = Number(bufferQuantity);
    if (bufferQuantity === "" || isNaN(numBuffer) || numBuffer <= 0) {
      setError("Buffer threshold quantity is required and must be greater than 0.");
      return;
    }

    setError(null);

    const record: StockNotificationRecord = {
      id: initialRecord ? initialRecord.id : `notif-${Date.now()}`,
      no: initialRecord ? initialRecord.no : 1,
      itemCode: itemCode.trim(),
      itemName: itemName.trim(),
      category: category.trim(),
      unit: unit.trim() || "PCE",
      currentStock: currentStock === "" ? 0 : Number(currentStock),
      bufferQuantity: numBuffer,
      triggerCondition: "Stock <= Buffer",
      notificationLevel,
      status,
      notes: notes.trim(),
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
          {isEdit ? "Edit Stock Buffer Rule" : "Add Stock Buffer Rule"}
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

        <div style={{ maxWidth: "640px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Preset Item Selection */}
          <div className="master-form-group">
            <label className="master-form-label">
              Select Item Catalog <span className="required-mark">*</span>
            </label>
            <select
              className="master-form-select"
              value={itemCode}
              onChange={(e) => handleSelectItem(e.target.value)}
            >
              <option value="">-- Select Item from Catalog (Optional) --</option>
              {predefinedItems.map((p) => (
                <option key={p.code} value={p.code}>
                  [{p.code}] {p.name} (Current Stock: {p.stock} {p.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Item Code & Name Details (Read-only or customizable) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
            <div className="master-form-group">
              <label className="master-form-label">Item Code</label>
              <input
                type="text"
                className="master-form-input"
                placeholder="e.g. 80.100.001.001"
                value={itemCode}
                onChange={(e) => setItemCode(e.target.value)}
              />
            </div>
            <div className="master-form-group">
              <label className="master-form-label">Item Name</label>
              <input
                type="text"
                className="master-form-input"
                placeholder="Enter item name"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <div className="master-form-group">
              <label className="master-form-label">Category</label>
              <input
                type="text"
                className="master-form-input"
                placeholder="e.g. IT EQUIPMENT"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="master-form-group">
              <label className="master-form-label">Unit</label>
              <input
                type="text"
                className="master-form-input"
                placeholder="e.g. PCE"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
              />
            </div>
            <div className="master-form-group">
              <label className="master-form-label">Current Stock</label>
              <input
                type="number"
                className="master-form-input"
                placeholder="0"
                value={currentStock}
                onChange={(e) => {
                  const val = e.target.value;
                  setCurrentStock(val === "" ? "" : Number(val));
                }}
              />
            </div>
          </div>

          {/* Buffer Quantity & Trigger Setting */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div className="master-form-group">
              <label className="master-form-label">
                Buffer Threshold Quantity <span className="required-mark">*</span>
              </label>
              <input
                type="number"
                min="1"
                className="master-form-input"
                placeholder="e.g. 5"
                value={bufferQuantity}
                onChange={(e) => {
                  const val = e.target.value;
                  setBufferQuantity(val === "" ? "" : Math.max(1, Number(val)));
                }}
              />
              {bufferQuantity !== "" && Number(bufferQuantity) > 0 && (
                <span style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                  Reminder triggers when Current Stock &le; {bufferQuantity} {unit || "units"}
                </span>
              )}
            </div>

            <div className="master-form-group">
              <label className="master-form-label">Notification Severity Level</label>
              <select
                className="master-form-select"
                value={notificationLevel}
                onChange={(e) => setNotificationLevel(e.target.value as any)}
              >
                <option value="Critical">Critical (Immediate Restock)</option>
                <option value="Warning">Warning (Standard Threshold)</option>
                <option value="Standard">Standard (Informational)</option>
              </select>
            </div>
          </div>

          {/* Status & Notes */}
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

          <div className="master-form-group">
            <label className="master-form-label">Buffer Rule Notes / Remarks</label>
            <textarea
              className="master-form-input"
              rows={3}
              placeholder="e.g. Lead time 3 days from vendor; minimum 1 unit required at all times"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <Button type="button" variant="ghost" onClick={onBack}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default StockNotificationForm;
