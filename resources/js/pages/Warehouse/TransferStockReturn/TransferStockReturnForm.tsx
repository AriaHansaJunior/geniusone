import React, { useState, useEffect, useMemo } from "react";
import {
  fetchMasterLookupsApi,
  fetchTransferStockReturnAvailableSourcesApi,
  fetchMasterItems,
} from "../../../data/masterApi";
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
  onSave: (record: TransferStockReturnRecord) => void | Promise<any>;
  existingRecord?: TransferStockReturnRecord | null;
}

interface WarehouseOption {
  id: number;
  code?: string;
  name: string;
}

interface JobNumberOption {
  id: number;
  code?: string;
  name: string;
}

interface DestinationOption {
  id: number;
  name: string;
}

interface MasterItemOption {
  id: number;
  code: string;
  name: string;
  unit: string;
}

function getTodayDmy(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${now.getFullYear()}`;
}

export function TransferStockReturnForm({
  isOpen,
  onClose,
  onSave,
  existingRecord,
}: TransferStockReturnFormProps) {
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [jobNumbers, setJobNumbers] = useState<JobNumberOption[]>([]);
  const [destinationLocations, setDestinationLocations] = useState<DestinationOption[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItemOption[]>([]);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [warehousesId, setWarehousesId] = useState<number | undefined>(
    existingRecord?.warehouses_id
  );
  const [mutationCode, setMutationCode] = useState(
    existingRecord?.mutationCode || `MUT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
  );
  const [productionCode, setProductionCode] = useState(existingRecord?.productionCode || "");
  const [jobNumberId, setJobNumberId] = useState<number | undefined>(
    existingRecord?.job_number_id
  );
  const [jobNumber, setJobNumber] = useState(existingRecord?.jobNumber || "");
  const [transferDate, setTransferDate] = useState(
    existingRecord?.transferDate || getTodayDmy()
  );
  const [transferNote, setTransferNote] = useState(existingRecord?.transferNote || "");

  const [items, setItems] = useState<TransferStockReturnItem[]>(
    existingRecord?.items || [
      {
        id: "new-item-1",
        itemCode: "",
        itemName: "",
        quantity: 1,
        unit: "PCE",
        sourceLocation: "Production Line",
        destinationLocation: "",
        reason: "Surplus production material return",
      },
    ]
  );

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync form fields whenever modal opens or existingRecord switches
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setSelectedSourceId(
      existingRecord?.request_material_id ? String(existingRecord.request_material_id) : ""
    );
    setWarehousesId(existingRecord?.warehouses_id);
    setMutationCode(
      existingRecord?.mutationCode ||
        `MUT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
    );
    setProductionCode(existingRecord?.productionCode && existingRecord.productionCode !== "-" ? existingRecord.productionCode : "");
    setJobNumberId(existingRecord?.job_number_id);
    setJobNumber(existingRecord?.jobNumber && existingRecord.jobNumber !== "-" ? existingRecord.jobNumber : "");
    setTransferDate(existingRecord?.transferDate || getTodayDmy());
    setTransferNote(existingRecord?.transferNote || "");
    setItems(
      existingRecord?.items?.length
        ? existingRecord.items
        : [
            {
              id: `new-item-${Date.now()}`,
              itemCode: "",
              itemName: "",
              quantity: 1,
              unit: "PCE",
              sourceLocation: "Production Line",
              destinationLocation: "",
              reason: "Return excess stock",
            },
          ]
    );
  }, [isOpen, existingRecord]);

  // Load real DB lookups, available RM sources, and master items
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoadingLookups(true);

    Promise.all([
      fetchMasterLookupsApi(),
      fetchTransferStockReturnAvailableSourcesApi().catch(() => []),
      fetchMasterItems().catch(() => []),
    ])
      .then(([lookupData, sourcesData, itemsData]) => {
        if (cancelled) return;
        const d = lookupData || {};
        const whList: WarehouseOption[] = Array.isArray(d.warehouses) ? d.warehouses : [];
        const jnList: JobNumberOption[] = Array.isArray(d.job_numbers) ? d.job_numbers : [];
        const dlList: DestinationOption[] = Array.isArray(d.destination_locations)
          ? d.destination_locations
          : [];
        const mItems: MasterItemOption[] = Array.isArray(itemsData)
          ? itemsData.map((m) => ({
              id: Number(m.id),
              code: m.itemCode || "",
              name: m.itemName || "",
              unit: m.smallestUnitCode || m.smallestUnitName || "PCE",
            }))
          : [];

        setWarehouses(whList);
        setJobNumbers(jnList);
        setDestinationLocations(dlList);
        setMasterItems(mItems);
        setAvailableSources(Array.isArray(sourcesData) ? sourcesData : []);

        // Default warehouse on create if none selected yet
        if (!existingRecord?.warehouses_id && whList.length > 0) {
          setWarehousesId((prev) => prev ?? Number(whList[0].id));
        }

        const defaultDest = dlList[0]?.name || whList[0]?.name || "Main Warehouse";
        if (mItems.length > 0) {
          setItems((prev) =>
            prev.map((row) => {
              const matched =
                (row.items_id ? mItems.find((m) => m.id === row.items_id) : undefined) ||
                (row.itemCode ? mItems.find((m) => m.code === row.itemCode) : undefined) ||
                (!existingRecord ? mItems[0] : undefined);
              return {
                ...row,
                items_id: row.items_id ?? (matched ? matched.id : undefined),
                itemCode: row.itemCode || (matched ? matched.code : ""),
                itemName: row.itemName || (matched ? matched.name : ""),
                unit: row.unit && row.unit !== "-" ? row.unit : matched?.unit || "PCE",
                destinationLocation: row.destinationLocation || defaultDest,
              };
            })
          );
        } else if (defaultDest) {
          setItems((prev) =>
            prev.map((row) => ({
              ...row,
              destinationLocation: row.destinationLocation || defaultDest,
            }))
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingLookups(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, existingRecord]);

  const itemSelectOptions = useMemo(
    () => [
      { value: "", label: "-- Select Master Item --" },
      ...masterItems.map((m) => ({
        value: String(m.id),
        label: m.code ? `${m.code} - ${m.name}` : m.name,
      })),
    ],
    [masterItems]
  );

  const destinationSelectOptions = useMemo(() => {
    const names = new Set<string>();
    destinationLocations.forEach((d) => {
      if (d.name) names.add(d.name);
    });
    warehouses.forEach((w) => {
      if (w.name) names.add(w.name);
    });
    return Array.from(names);
  }, [destinationLocations, warehouses]);

  if (!isOpen) return null;

  const handleSelectSourceRm = (sourceIdStr: string) => {
    setSelectedSourceId(sourceIdStr);
    if (!sourceIdStr) return;
    const src = availableSources.find((s) => String(s.id) === sourceIdStr);
    if (!src) return;

    if (src.warehouses_id) setWarehousesId(Number(src.warehouses_id));
    if (src.request_number || src.requestNumber) {
      setProductionCode(src.request_number || src.requestNumber);
    }
    if (src.job_number_id) setJobNumberId(Number(src.job_number_id));
    if (src.job_number || src.jobNumber) setJobNumber(src.job_number || src.jobNumber);

    if (Array.isArray(src.items) && src.items.length > 0) {
      const destFallback =
        src.warehouseName || destinationSelectOptions[0] || "Main Warehouse";
      const srcLocFallback = src.destinationLocation || "Production Area";
      setItems(
        src.items.map((it: any, idx: number) => ({
          id: `src-item-${Date.now()}-${idx}`,
          items_id: Number(it.items_id),
          itemCode: it.itemCode || it.code || "",
          itemName: it.itemName || it.name || "",
          quantity: Math.max(1, Number(it.remaining_qty ?? it.quantity ?? 1)),
          unit: it.unit || "PCE",
          sourceLocation: srcLocFallback,
          destinationLocation: destFallback,
          reason: `Return from ${src.request_number || src.requestNumber || "Request Material"}`,
        }))
      );
    }
  };

  const handleAddItemRow = () => {
    const firstItem = masterItems[0];
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${prev.length}`,
        items_id: firstItem?.id,
        itemCode: firstItem?.code || "",
        itemName: firstItem?.name || "",
        quantity: 1,
        unit: firstItem?.unit || "PCE",
        sourceLocation: "Production Area",
        destinationLocation: destinationSelectOptions[0] || "",
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
        if (field === "items_id") {
          const match = masterItems.find((m) => String(m.id) === String(val));
          return {
            ...it,
            items_id: match ? match.id : undefined,
            itemCode: match ? match.code : "",
            itemName: match ? match.name : "",
            unit: match ? match.unit : it.unit,
          };
        }
        return { ...it, [field]: val };
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!mutationCode.trim()) {
      setErrorMessage("Mutation Code is required.");
      return;
    }
    if (!transferDate) {
      setErrorMessage("Transfer Date is required.");
      return;
    }
    if (!warehousesId) {
      setErrorMessage("Target Warehouse is required.");
      return;
    }
    if (items.length === 0) {
      setErrorMessage("Please add at least one item to return.");
      return;
    }
    const invalidRow = items.find((it) => !it.items_id || Number(it.quantity) <= 0);
    if (invalidRow) {
      setErrorMessage("Each row must select a valid Master Item and have quantity greater than 0.");
      return;
    }

    const whObj = warehouses.find((w) => Number(w.id) === Number(warehousesId));
    const newRecord: TransferStockReturnRecord = {
      id: existingRecord?.id || `tsr-${Date.now()}`,
      warehouses_id: warehousesId,
      warehouseName: whObj?.name || existingRecord?.warehouseName || "",
      request_material_id: selectedSourceId ? Number(selectedSourceId) : existingRecord?.request_material_id,
      job_number_id: jobNumberId,
      mutationCode: mutationCode.trim(),
      productionCode: productionCode.trim() || "-",
      jobNumber: jobNumber.trim() || "-",
      transferDate,
      transferNote: transferNote.trim(),
      totalItems: items.length,
      status: existingRecord?.status || "Waiting Approve 1",
      userCreated: existingRecord?.userCreated || "Administrator GeniusOne",
      userLastUpdated: getTodayDmy(),
      items,
    };

    try {
      setSaving(true);
      await onSave(newRecord);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save Stock Transfer Return to database.");
    } finally {
      setSaving(false);
    }
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
                <label className="master-form-label">
                  Warehouse <span style={{ color: "var(--red-600)" }}>*</span>
                </label>
                <CustomSelect
                  value={warehousesId ? String(warehousesId) : ""}
                  onChange={(val: string) => setWarehousesId(val ? Number(val) : undefined)}
                  placeholder={loadingLookups ? "Loading warehouses..." : "-- Select Warehouse --"}
                  disabled={loadingLookups}
                  options={[
                    { value: "", label: "-- Select Warehouse --" },
                    ...warehouses.map((w) => ({
                      value: String(w.id),
                      label: w.code ? `${w.code} - ${w.name}` : w.name,
                    })),
                  ]}
                />
              </div>

              {!existingRecord && availableSources.length > 0 && (
                <div className="master-form-group">
                  <label className="master-form-label">Source Request Material</label>
                  <CustomSelect
                    value={selectedSourceId}
                    onChange={handleSelectSourceRm}
                    placeholder="-- Optional: Populate from Approved RM --"
                    options={[
                      { value: "", label: "-- Direct / Manual Entry --" },
                      ...availableSources.map((src) => ({
                        value: String(src.id),
                        label: `${src.request_number || src.requestNumber || `RM-${src.id}`}${src.warehouseName ? ` (${src.warehouseName})` : ""}`,
                      })),
                    ]}
                  />
                </div>
              )}

              <div className="master-form-group">
                <label className="master-form-label">Job Number</label>
                <CustomSelect
                  value={jobNumberId ? String(jobNumberId) : ""}
                  onChange={(val: string) => {
                    const matched = jobNumbers.find((j) => String(j.id) === val);
                    setJobNumberId(matched ? Number(matched.id) : undefined);
                    setJobNumber(matched ? matched.name : "");
                  }}
                  placeholder={loadingLookups ? "Loading job numbers..." : "-- Select Job Number --"}
                  disabled={loadingLookups}
                  options={[
                    { value: "", label: "-- None / Optional --" },
                    ...jobNumbers.map((j) => ({
                      value: String(j.id),
                      label: j.code && j.code !== j.name ? `${j.code} - ${j.name}` : j.name,
                    })),
                  ]}
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
                            value={it.items_id ? String(it.items_id) : ""}
                            onChange={(val: string) => handleItemChange(idx, "items_id", val)}
                            placeholder={loadingLookups ? "Loading items..." : "-- Select Item --"}
                            disabled={loadingLookups}
                            options={itemSelectOptions}
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
                            placeholder="-- Select Destination --"
                            options={destinationSelectOptions.map((name) => ({
                              value: name,
                              label: name,
                            }))}
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
            <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving || loadingLookups}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
