import React, { useState, useEffect } from "react";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { fetchMasterItems } from "../../../data/masterApi";
import type { StockNotificationRecord } from "./stock-notification-types";

interface StockNotificationFormProps {
  initialRecord?: StockNotificationRecord | null;
  onBack: () => void;
  onSave: (record: StockNotificationRecord, isEdit: boolean) => void;
}

export function StockNotificationForm({
  initialRecord,
  onBack,
  onSave,
}: StockNotificationFormProps) {
  const isEdit = !!initialRecord;
  const [predefinedItems, setPredefinedItems] = useState<
    Array<{ code: string; name: string; category: string; unit: string; stock: number }>
  >([]);

  useEffect(() => {
    let isMounted = true;
    fetchMasterItems().then((items) => {
      if (isMounted && Array.isArray(items)) {
        setPredefinedItems(
          items.map((it) => ({
            code: it.itemCode,
            name: it.itemName,
            category: it.category && it.category !== "-" ? it.category : (it.classification || ""),
            unit: it.smallestUnitCode || "",
            stock: Number(it.stock ?? 0),
          }))
        );
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

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
  const [triggerCondition, setTriggerCondition] = useState<"Stock <= Buffer" | "Stock < Buffer">(
    initialRecord?.triggerCondition || "Stock <= Buffer"
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
      triggerCondition,
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
    <div className="master-form-page">
      {/* Header */}
      <div className="master-form-header">
        <h1 className="master-form-page-title">
          {isEdit ? "Edit Stock Buffer Rule" : "Add Stock Buffer Rule"}
        </h1>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="master-form-card">
        {error && (
          <div className="master-form-error-banner">
            <Icon name="alertTriangle" size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Row 1: Preset Item Selection + Item Code + Item Name */}
        <div className="master-form-grid-3">
          <div className="master-form-group">
            <label className="master-form-label">
              Select Item Catalog <span className="required-mark">*</span>
            </label>
            <CustomSelect
              searchable
              value={itemCode}
              onChange={(val) => handleSelectItem(val)}
              placeholder="-- Select Item from Catalog (Optional) --"
              options={[
                { value: "", label: "-- Select Item from Catalog (Optional) --" },
                ...predefinedItems.map((p) => ({
                  value: p.code,
                  label: `[${p.code}] ${p.name} (Current Stock: ${p.stock} ${p.unit})`,
                })),
              ]}
            />
          </div>

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

        {/* Row 2: Category + Unit + Current Stock */}
        <div className="master-form-grid-3">
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

        {/* Row 3: Buffer Threshold + Trigger Condition + Severity Level + Status */}
        <div className="master-form-grid-4">
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
              <span className="master-form-helper-text">
                Alert triggers when Current Stock {triggerCondition === "Stock < Buffer" ? "<" : "≤"} {bufferQuantity} {unit || "units"}
              </span>
            )}
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Trigger Condition</label>
            <CustomSelect
              value={triggerCondition}
              onChange={(val) => setTriggerCondition(val as "Stock <= Buffer" | "Stock < Buffer")}
              options={[
                { value: "Stock <= Buffer", label: "Stock <= Buffer (At or Below)" },
                { value: "Stock < Buffer", label: "Stock < Buffer (Strictly Below)" },
              ]}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">Notification Severity Level</label>
            <CustomSelect
              value={notificationLevel}
              onChange={(val) => setNotificationLevel(val as any)}
              options={[
                { value: "Critical", label: "Critical (Immediate Restock)" },
                { value: "Warning", label: "Warning (Standard Threshold)" },
                { value: "Standard", label: "Standard (Informational)" },
              ]}
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

        {/* Live Low-Stock Buffer Notification Preview */}
        {bufferQuantity !== "" && Number(bufferQuantity) > 0 && (() => {
          const numericStock = currentStock === "" ? 0 : Number(currentStock);
          const numericBuffer = Number(bufferQuantity);
          const isLowStockTriggered =
            status === "Active" &&
            (triggerCondition === "Stock < Buffer"
              ? numericStock < numericBuffer
              : numericStock <= numericBuffer);
          const deficit = Math.max(0, numericBuffer - numericStock);
          const unitLabel = unit || "units";

          return (
            <div
              className={`stock-rule-preview ${
                isLowStockTriggered ? "stock-rule-preview--alert" : "stock-rule-preview--safe"
              }`}
            >
              <Icon
                name={isLowStockTriggered ? "alertTriangle" : "checkCircle"}
                size={16}
              />
              <div className="stock-rule-preview__content">
                <span className="stock-rule-preview__title">
                  {isLowStockTriggered
                    ? "Low Stock Alert Will Trigger Immediately"
                    : "Buffer Threshold Monitoring Active"}
                </span>
                <span className="stock-rule-preview__desc">
                  {isLowStockTriggered
                    ? `Current stock (${numericStock.toLocaleString("en-US")} ${unitLabel}) meets the buffer condition (${numericBuffer.toLocaleString("en-US")} ${unitLabel}; deficit: ${deficit.toLocaleString("en-US")} ${unitLabel}). This item will appear in Dashboard Stock Buffer Alerts.`
                    : `Current stock (${numericStock.toLocaleString("en-US")} ${unitLabel}) is safely above buffer (${numericBuffer.toLocaleString("en-US")} ${unitLabel}). Dashboard will notify you automatically if stock drops ${triggerCondition === "Stock < Buffer" ? "below" : "to or below"} ${numericBuffer.toLocaleString("en-US")} ${unitLabel}.`}
                </span>
              </div>
            </div>
          );
        })()}

        {/* Row 4: Full-width Notes */}
        <div className="master-form-group">
          <label className="master-form-label">Buffer Rule Notes / Remarks</label>
          <textarea
            className="master-form-textarea"
            rows={3}
            placeholder="e.g. Lead time 3 days from vendor; minimum 1 unit required at all times"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Form Actions */}
        <div className="master-form-actions">
          <Button type="button" variant="ghost" onClick={onBack}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </div>
  );
}

export default StockNotificationForm;
