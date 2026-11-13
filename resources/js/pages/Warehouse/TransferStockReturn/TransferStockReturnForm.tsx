import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { Icon } from "../../../components/ui/Icon";
import type {
  TransferStockReturnRecord,
  TransferStockReturnItem,
} from "./transfer-stock-return-types";

interface TransferStockReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: TransferStockReturnRecord) => void;
  existingRecord?: TransferStockReturnRecord | null;
}

const sampleItemsList = [
  { code: "30.200.010.003", name: "Flux Refining Powder Smelting Grade", unit: "SAK" },
  { code: "60.154.300.101", name: "Nozzle Jet Spray Spiral SUS 316 size ½\"", unit: "PIECE" },
  { code: "80.200.001.408", name: "Besi UNP 200 x 75 x 7 mm x 382 cm", unit: "PIECE" },
  { code: "80.200.001.406", name: "Besi H-Beam 200 x 200 x 334 cm", unit: "PIECE" },
  { code: "10.002.400.020", name: "Hydraulic Oil Tellus S2 MX 68 (Drum 209L)", unit: "DRUM" },
  { code: "50.100.002.015", name: "Cable NYY 4 x 16 mm Supreme", unit: "METER" },
];

const destinationLocationsList = [
  "Warehouse Raw Material (Gudang Bahan Baku)",
  "Warehouse Sparepart (Gudang Sparepart)",
  "Warehouse Metal & Steel (Gudang Besi)",
  "Chemical & Lubricant Warehouse",
  "Warehouse Quarantine Area",
  "Finished Goods Warehouse (Gudang Barang Jadi)",
];

const jobNumbersList = [
  "JOB-2026-0045",
  "JOB-2026-0048",
  "JOB-2026-0052",
  "JOB-2026-0038",
  "JOB-2026-0035",
  "JOB-2026-0060",
];

export function TransferStockReturnForm({
  isOpen,
  onClose,
  onSave,
  existingRecord,
}: TransferStockReturnFormProps) {
  const [mutationCode, setMutationCode] = useState(
    existingRecord?.mutationCode || `MUT-2026-11-${String(Math.floor(Math.random() * 900) + 100)}`
  );
  const [productionCode, setProductionCode] = useState(existingRecord?.productionCode || "PRD-2026-098");
  const [jobNumber, setJobNumber] = useState(existingRecord?.jobNumber || jobNumbersList[0]);
  const [transferDate, setTransferDate] = useState(
    existingRecord?.transferDate || "12-11-2026"
  );
  const [transferNote, setTransferNote] = useState(existingRecord?.transferNote || "");

  const [items, setItems] = useState<TransferStockReturnItem[]>(
    existingRecord?.items || [
      {
        id: "new-item-1",
        itemCode: sampleItemsList[0].code,
        itemName: sampleItemsList[0].name,
        quantity: 1,
        unit: sampleItemsList[0].unit,
        sourceLocation: "Production Line 1",
        destinationLocation: destinationLocationsList[0],
        reason: "Surplus production material after batch completion",
      },
    ]
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddItemRow = () => {
    const nextItem = sampleItemsList[items.length % sampleItemsList.length];
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        itemCode: nextItem.code,
        itemName: nextItem.name,
        quantity: 1,
        unit: nextItem.unit,
        sourceLocation: "Production Area",
        destinationLocation: destinationLocationsList[0],
        reason: "Return excess stock",
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (items.length <= 1) {
      setErrorMessage("At least one item must be included in the return.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof TransferStockReturnItem, val: any) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (field === "itemCode") {
          const match = sampleItemsList.find((s) => s.code === val);
          return {
            ...it,
            itemCode: val,
            itemName: match ? match.name : it.itemName,
            unit: match ? match.unit : it.unit,
          };
        }
        return { ...it, [field]: val };
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mutationCode.trim()) {
      setErrorMessage("Mutation Code is required.");
      return;
    }
    if (!transferDate) {
      setErrorMessage("Transfer Date is required.");
      return;
    }
    if (items.length === 0) {
      setErrorMessage("Please add at least one item to return.");
      return;
    }

    const newRecord: TransferStockReturnRecord = {
      id: existingRecord?.id || `tsr-${Date.now()}`,
      mutationCode: mutationCode.trim(),
      productionCode: productionCode.trim() || "-",
      jobNumber: jobNumber.trim() || "-",
      transferDate,
      transferNote: transferNote.trim(),
      totalItems: items.length,
      status: existingRecord?.status || "Waiting Approve 1",
      userCreated: existingRecord?.userCreated || "Administrator GeniusOne",
      userLastUpdated: "12-11-2026 15:00",
      items,
    };

    onSave(newRecord);
    onClose();
  };

  return (
    <div
      className="master-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tsr-form-title"
    >
      <div
        className="master-modal-content"
        style={{
          width: "min(920px, 95vw)",
          maxWidth: "100%",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="master-modal-header" style={{ padding: "14px 20px" }}>
          <h3 id="tsr-form-title" className="master-modal-title">
            {existingRecord ? "Edit Stock Transfer Return" : "Create Stock Transfer Return"}
          </h3>
          <button
            type="button"
            className="master-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <div className="master-modal-body" style={{ padding: "18px 20px", overflowY: "auto", flex: 1 }}>
            {errorMessage && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  borderRadius: "4px",
                  color: "#991b1b",
                  fontSize: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginBottom: "12px",
                }}
              >
                <Icon name="alertTriangle" size={14} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Fields Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                gap: "14px",
                marginBottom: "18px",
              }}
            >
              <div className="master-form-group">
                <label className="master-form-label">
                  Mutation Code <span style={{ color: "var(--red-600)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="master-form-input font-mono font-bold"
                  value={mutationCode}
                  onChange={(e) => setMutationCode(e.target.value)}
                  placeholder="e.g. MUT-2026-11-001"
                  required
                />
              </div>

              <div className="master-form-group">
                <label className="master-form-label">
                  Transfer Date <span style={{ color: "var(--red-600)" }}>*</span>
                </label>
                <CustomDatePicker
                  value={transferDate}
                  onChange={(val: string) => setTransferDate(val)}
                  placeholder="DD-MM-YYYY"
                />
              </div>

              <div className="master-form-group">
                <label className="master-form-label">Job Number</label>
                <CustomSelect
                  value={jobNumber}
                  onChange={(val: string) => setJobNumber(val)}
                  options={jobNumbersList}
                />
              </div>

              <div className="master-form-group">
                <label className="master-form-label">Production Code</label>
                <input
                  type="text"
                  className="master-form-input"
                  value={productionCode}
                  onChange={(e) => setProductionCode(e.target.value)}
                  placeholder="e.g. PRD-2026-088"
                />
              </div>

              <div className="master-form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="master-form-label">Transfer Note / Remarks</label>
                <textarea
                  className="master-form-input"
                  rows={2}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Explain why materials are being returned to warehouse..."
                  style={{ resize: "vertical" }}
                />
              </div>
            </div>

            {/* Dynamic Items Table */}
            <div style={{ marginTop: "10px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "8px",
                  flexWrap: "wrap",
                  gap: "8px",
                }}
              >
                <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "var(--ink)" }}>
                  Return Items List ({items.length})
                </h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItemRow}
                >
                  Add Row
                </Button>
              </div>

              <div
                className="table-scroll"
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  overflowX: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <table style={{ width: "100%", minWidth: "780px", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                      <th style={{ width: "35px", padding: "8px 10px", textAlign: "center", fontSize: "10.5px", fontWeight: 800 }}>
                        No
                      </th>
                      <th style={{ minWidth: "220px", padding: "8px 10px", textAlign: "left", fontSize: "10.5px", fontWeight: 800 }}>
                        Item Material
                      </th>
                      <th style={{ width: "90px", padding: "8px 10px", textAlign: "right", fontSize: "10.5px", fontWeight: 800 }}>
                        Qty
                      </th>
                      <th style={{ width: "75px", padding: "8px 10px", textAlign: "center", fontSize: "10.5px", fontWeight: 800 }}>
                        Unit
                      </th>
                      <th style={{ minWidth: "180px", padding: "8px 10px", textAlign: "left", fontSize: "10.5px", fontWeight: 800 }}>
                        Destination Location
                      </th>
                      <th style={{ minWidth: "150px", padding: "8px 10px", textAlign: "left", fontSize: "10.5px", fontWeight: 800 }}>
                        Return Reason
                      </th>
                      <th style={{ width: "45px", padding: "8px 10px", textAlign: "center", fontSize: "10.5px", fontWeight: 800 }}>
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr
                        key={it.id}
                        style={{
                          borderBottom: idx === items.length - 1 ? "none" : "1px solid var(--line)",
                          background: "#ffffff",
                        }}
                      >
                        <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--slate-500)" }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <CustomSelect
                            value={it.itemCode}
                            onChange={(val: string) => handleItemChange(idx, "itemCode", val)}
                            options={sampleItemsList.map((s) => ({
                              value: s.code,
                              label: `${s.code} - ${s.name}`,
                            }))}
                          />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="number"
                            min="1"
                            step="any"
                            className="master-form-input font-bold"
                            style={{ textAlign: "right" }}
                            value={it.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value) || 1))
                            }
                          />
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 600 }}>
                          {it.unit}
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <CustomSelect
                            value={it.destinationLocation}
                            onChange={(val: string) => handleItemChange(idx, "destinationLocation", val)}
                            options={destinationLocationsList}
                          />
                        </td>
                        <td style={{ padding: "8px 10px" }}>
                          <input
                            type="text"
                            className="master-form-input"
                            value={it.reason}
                            onChange={(e) => handleItemChange(idx, "reason", e.target.value)}
                            placeholder="Reason for return..."
                          />
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            style={{
                              border: "none",
                              background: "transparent",
                              color: "var(--red-600)",
                              cursor: "pointer",
                              padding: "4px",
                              borderRadius: "4px",
                            }}
                            title="Delete item row"
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="master-modal-footer" style={{ padding: "12px 20px" }}>
            <Button type="button" variant="secondary" onClick={onClose}>
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
