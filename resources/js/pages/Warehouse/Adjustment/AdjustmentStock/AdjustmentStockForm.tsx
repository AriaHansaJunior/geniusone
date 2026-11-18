import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { CustomDatePicker } from "../../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { Icon } from "../../../../components/ui/Icon";
import { LoadingBuffer } from "../../../../components/ui/LoadingBuffer";
import {
  createStockAdjustmentApi,
  fetchMasterItems,
  fetchMasterLookupsApi,
  fetchStockItemsReportApi,
} from "../../../../data/masterApi";
import type { StockAdjustmentDirection } from "./adjustment-stock-types";

interface AdjustmentStockFormProps {
  onBack: () => void;
  onSaved: (adjustmentNumber?: string) => void;
}

interface FormLine {
  id: string;
  items_id?: number;
  itemCode: string;
  itemName: string;
  unit: string;
  warehouses_id?: number;
  adjustment_type: StockAdjustmentDirection;
  quantity: number;
  coordinate_name: string;
  lot_number: string;
  remark: string;
}

function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AdjustmentStockForm({ onBack, onSaved }: AdjustmentStockFormProps) {
  const [warehouses, setWarehouses] = useState<{ id: number; code?: string; name: string }[]>([]);
  const [masterItems, setMasterItems] = useState<{ id: number; code: string; name: string; unit: string }[]>([]);
  const [warehouseStockMap, setWarehouseStockMap] = useState<Record<number, Record<number, number>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [adjustmentDate, setAdjustmentDate] = useState(getTodayIso());
  const [defaultWarehouseId, setDefaultWarehouseId] = useState<number | undefined>();
  const [referenceCode, setReferenceCode] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<FormLine[]>([
    {
      id: `adj-row-${Date.now()}`,
      itemCode: "",
      itemName: "",
      unit: "PCE",
      adjustment_type: "IN",
      quantity: 1,
      coordinate_name: "",
      lot_number: "",
      remark: "",
    },
  ]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      fetchMasterLookupsApi(),
      fetchMasterItems().catch(() => []),
      fetchStockItemsReportApi().catch(() => []),
    ])
      .then(([lookups, itemsData, stockData]) => {
        if (cancelled) return;
        const whList = Array.isArray(lookups?.warehouses)
          ? lookups.warehouses.map((w: any) => ({
              id: Number(w.id),
              code: w.code || "",
              name: String(w.name),
            }))
          : [];
        setWarehouses(whList);
        if (whList.length > 0) {
          setDefaultWarehouseId((prev) => prev ?? whList[0].id);
        }

        const mItems = Array.isArray(itemsData)
          ? itemsData.map((m) => ({
              id: Number(m.id),
              code: m.itemCode || "",
              name: m.itemName || "",
              unit: m.smallestUnitCode || m.smallestUnitName || "PCE",
            }))
          : [];
        setMasterItems(mItems);

        const stockMap: Record<number, Record<number, number>> = {};
        if (Array.isArray(stockData)) {
          stockData.forEach((row) => {
            const whId = Number(row.warehouseId || 0);
            const itemId = Number(row.itemId || 0);
            if (!whId || !itemId) return;
            if (!stockMap[whId]) stockMap[whId] = {};
            stockMap[whId][itemId] = Number(row.quantity ?? 0);
          });
        }
        setWarehouseStockMap(stockMap);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const itemOptions = useMemo(
    () => [
      { value: "", label: "-- Select Master Item --" },
      ...masterItems.map((m) => ({
        value: String(m.id),
        label: m.code ? `${m.code} - ${m.name}` : m.name,
      })),
    ],
    [masterItems]
  );

  const warehouseOptions = useMemo(
    () => [
      { value: "", label: "-- Select Warehouse --" },
      ...warehouses.map((w) => ({
        value: String(w.id),
        label: w.code ? `${w.code} - ${w.name}` : w.name,
      })),
    ],
    [warehouses]
  );

  const getCurrentStock = (itemId?: number, whId?: number): number => {
    const effectiveWh = whId ?? defaultWarehouseId;
    if (!itemId || !effectiveWh) return 0;
    return Number(warehouseStockMap[effectiveWh]?.[itemId] ?? 0);
  };

  const getProjectedStock = (line: FormLine): number => {
    const curr = getCurrentStock(line.items_id, line.warehouses_id);
    const qty = Number(line.quantity) || 0;
    if (line.adjustment_type === "SET") return qty;
    if (line.adjustment_type === "OUT") return curr - qty;
    return curr + qty;
  };

  const handleAddRow = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `adj-row-${Date.now()}-${prev.length}`,
        warehouses_id: defaultWarehouseId,
        itemCode: "",
        itemName: "",
        unit: "PCE",
        adjustment_type: "IN",
        quantity: 1,
        coordinate_name: "",
        lot_number: "",
        remark: "",
      },
    ]);
  };

  const handleRemoveRow = (idx: number) => {
    if (lines.length <= 1) {
      setErrorMessage("At least one item line is required.");
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (idx: number, field: keyof FormLine, value: any) => {
    setLines((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        if (field === "items_id") {
          const picked = masterItems.find((m) => String(m.id) === String(value));
          return {
            ...row,
            items_id: picked?.id,
            itemCode: picked?.code || "",
            itemName: picked?.name || "",
            unit: picked?.unit || "PCE",
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!defaultWarehouseId) {
      setErrorMessage("Default Warehouse is required.");
      return;
    }
    if (!adjustmentDate) {
      setErrorMessage("Adjustment Date is required.");
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.items_id) {
        setErrorMessage(`Row ${i + 1}: Please select an Item Material.`);
        return;
      }
      if (line.adjustment_type === "SET" ? Number(line.quantity) < 0 : Number(line.quantity) <= 0) {
        setErrorMessage(`Row ${i + 1}: Quantity is invalid for ${line.adjustment_type}.`);
        return;
      }
      if (getProjectedStock(line) < 0) {
        setErrorMessage(
          `Row ${i + 1}: Resulting stock for ${line.itemCode} cannot become negative.`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const created = await createStockAdjustmentApi({
        warehouses_id: defaultWarehouseId,
        adjustment_date: adjustmentDate,
        reference_code: referenceCode.trim() || null,
        note: note.trim() || null,
        items: lines.map((line) => ({
          items_id: line.items_id,
          warehouses_id: line.warehouses_id ?? defaultWarehouseId,
          adjustment_type: line.adjustment_type,
          quantity: Number(line.quantity),
          coordinate_name: line.coordinate_name.trim() || null,
          lot_number: line.lot_number.trim() || null,
          remark: line.remark.trim() || null,
        })),
      });
      window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
      onSaved(created?.adjustmentNumber);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save Stock Adjustment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="adj-form-page">
      {errorMessage && (
        <div className="adj-notice adj-notice--error">
          <span>{errorMessage}</span>
          <button
            type="button"
            className="adj-notice__close"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      <div className="adj-card">
        {loading && (
          <LoadingBuffer
            variant="inline"
            label="Loading warehouse and item balances..."
          />
        )}
        <div className="adj-card-header">
          <h3 className="adj-card-title">Create Stock Adjustment</h3>
        </div>

        <div className="adj-form-grid-3">
          <div className="master-form-group">
            <label className="master-form-label">
              Adjustment Date <span className="master-required-star">*</span>
            </label>
            <CustomDatePicker
              required
              value={adjustmentDate}
              onChange={(val) => setAdjustmentDate(val)}
            />
          </div>

          <div className="master-form-group">
            <label className="master-form-label">
              Default Warehouse <span className="master-required-star">*</span>
            </label>
            <CustomSelect
              searchable
              required
              value={defaultWarehouseId ? String(defaultWarehouseId) : ""}
              onChange={(val) => setDefaultWarehouseId(val ? Number(val) : undefined)}
              options={warehouseOptions}
              placeholder="-- Select Warehouse --"
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="adjRefCode" className="master-form-label">
              Reference Code
            </label>
            <input
              id="adjRefCode"
              type="text"
              className="master-form-input"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="e.g. INIT-2026-01"
            />
          </div>
        </div>

        <div className="master-form-group">
          <label htmlFor="adjNote" className="master-form-label">
            Adjustment Note
          </label>
          <textarea
            id="adjNote"
            className="master-form-textarea"
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason or batch note for this stock adjustment..."
          />
        </div>
      </div>

      <div className="adj-table-panel">
        <div className="adj-table-panel__header">
          <h4 className="adj-table-panel__title">Adjustment Items ({lines.length})</h4>
          <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
            Add Row
          </Button>
        </div>

        <div className="adj-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="adj-th--center adj-col-no">No</th>
                <th>
                  Item Material <span className="required-asterisk">*</span>
                </th>
                <th>
                  Warehouse <span className="required-asterisk">*</span>
                </th>
                <th>
                  Type <span className="required-asterisk">*</span>
                </th>
                <th className="adj-th--right">Current</th>
                <th className="adj-th--right">
                  Qty <span className="required-asterisk">*</span>
                </th>
                <th className="adj-th--right">After</th>
                <th>Lot No</th>
                <th>Coordinate</th>
                <th>Remark</th>
                <th className="adj-th--center adj-col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => {
                const curr = getCurrentStock(line.items_id, line.warehouses_id);
                const projected = getProjectedStock(line);
                return (
                  <tr key={line.id}>
                    <td className="adj-td--center">{idx + 1}</td>
                    <td>
                      <CustomSelect
                        searchable
                        value={line.items_id ? String(line.items_id) : ""}
                        onChange={(val) => handleLineChange(idx, "items_id", val)}
                        options={itemOptions}
                        placeholder="-- Select Item --"
                      />
                    </td>
                    <td>
                      <CustomSelect
                        searchable
                        value={
                          line.warehouses_id
                            ? String(line.warehouses_id)
                            : defaultWarehouseId
                              ? String(defaultWarehouseId)
                              : ""
                        }
                        onChange={(val) =>
                          handleLineChange(idx, "warehouses_id", val ? Number(val) : undefined)
                        }
                        options={warehouseOptions}
                      />
                    </td>
                    <td>
                      <CustomSelect
                        value={line.adjustment_type}
                        onChange={(val) =>
                          handleLineChange(idx, "adjustment_type", val as StockAdjustmentDirection)
                        }
                        options={[
                          { value: "IN", label: "IN (+)" },
                          { value: "OUT", label: "OUT (-)" },
                          { value: "SET", label: "SET (Exact)" },
                        ]}
                      />
                    </td>
                    <td className="adj-td--right">
                      {curr.toFixed(2)} {line.unit}
                    </td>
                    <td>
                      <input
                        type="number"
                        min={line.adjustment_type === "SET" ? "0" : "0.01"}
                        step="any"
                        className="adj-inline-input adj-inline-input--num"
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(idx, "quantity", Number(e.target.value) || 0)
                        }
                        required
                      />
                    </td>
                    <td className="adj-td--right">
                      <strong className={projected < 0 ? "adj-qty-out" : "adj-qty-in"}>
                        {projected.toFixed(2)}
                      </strong>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="adj-inline-input"
                        value={line.lot_number}
                        onChange={(e) => handleLineChange(idx, "lot_number", e.target.value)}
                        placeholder="Lot no"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="adj-inline-input"
                        value={line.coordinate_name}
                        onChange={(e) => handleLineChange(idx, "coordinate_name", e.target.value)}
                        placeholder="Rack / Bin"
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="adj-inline-input"
                        value={line.remark}
                        onChange={(e) => handleLineChange(idx, "remark", e.target.value)}
                        placeholder="Remark"
                      />
                    </td>
                    <td className="adj-td--center">
                      <button
                        type="button"
                        className="btn-action-delete"
                        onClick={() => handleRemoveRow(idx)}
                        title="Remove line"
                        aria-label="Remove line"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adj-form-footer">
        <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={saving || loading}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}

export default AdjustmentStockForm;
