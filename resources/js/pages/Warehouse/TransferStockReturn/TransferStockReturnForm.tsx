import React, { useEffect, useMemo, useState } from "react";
import {
  fetchMasterItems,
  fetchMasterLookupsApi,
  fetchTransferStockReturnAvailableSourcesApi,
  fetchTransferStockReturnDetailApi,
  saveTransferStockReturnApi,
} from "../../../data/masterApi";
import { Button } from "../../../components/ui/Button";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { LoadingBuffer } from "../../../components/ui/LoadingBuffer";
import { Icon } from "../../../components/ui/Icon";
import type {
  TransferStockReturnItem,
  TransferStockReturnRecord,
} from "./transfer-stock-return-types";

export interface TransferStockReturnFormProps {
  mode: "create" | "edit";
  recordCode?: string;
  initialRecord?: TransferStockReturnRecord | null;
  records?: TransferStockReturnRecord[];
  onBack: () => void;
  onSaved?: (saved?: any) => void | Promise<void>;
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

function getTodayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MONTH_INDEX_MAP: Record<string, string> = {
  jan: "01", january: "01",
  feb: "02", february: "02",
  mar: "03", march: "03",
  apr: "04", april: "04",
  may: "05",
  jun: "06", june: "06",
  jul: "07", july: "07",
  aug: "08", august: "08",
  sep: "09", sept: "09", september: "09",
  oct: "10", october: "10",
  nov: "11", november: "11",
  dec: "12", december: "12",
};

function normalizeToIsoDate(dateStr?: string | null): string {
  const clean = (dateStr || "").trim();
  if (!clean) return getTodayIso();

  const isoPrefix = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoPrefix) return `${isoPrefix[1]}-${isoPrefix[2]}-${isoPrefix[3]}`;

  const dmy = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }

  const named = clean.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (named) {
    const mon = MONTH_INDEX_MAP[named[2].toLowerCase()];
    if (mon) return `${named[3]}-${mon}-${named[1].padStart(2, "0")}`;
  }

  const parsed = new Date(clean);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  return getTodayIso();
}

function toIsoDate(dateStr: string): string {
  return normalizeToIsoDate(dateStr);
}

function createBlankItemRow(defaultDest = ""): TransferStockReturnItem {
  return {
    id: `new-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    itemCode: "",
    itemName: "",
    quantity: 1,
    unit: "PCE",
    sourceLocation: "Production Line",
    destinationLocation: defaultDest,
    reason: "Surplus production material return",
  };
}

export function TransferStockReturnForm({
  mode,
  recordCode,
  initialRecord,
  records = [],
  onBack,
  onSaved,
}: TransferStockReturnFormProps) {
  const matchedFromProps = useMemo(() => {
    if (initialRecord) return initialRecord;
    if (mode !== "edit" || !recordCode || !records.length) return null;
    const cleanTarget = recordCode.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    return (
      records.find(
        (r) =>
          String(r.id).toLowerCase() === recordCode.toLowerCase() ||
          r.mutationCode.toLowerCase() === recordCode.toLowerCase() ||
          r.mutationCode.replace(/[^A-Za-z0-9]/g, "").toLowerCase() === cleanTarget
      ) || null
    );
  }, [initialRecord, mode, recordCode, records]);

  const [existingRecord, setExistingRecord] = useState<TransferStockReturnRecord | null>(
    mode === "edit" ? matchedFromProps : null
  );
  const [loadingRecord, setLoadingRecord] = useState<boolean>(
    mode === "edit" && Boolean(recordCode) && !matchedFromProps
  );

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [jobNumbers, setJobNumbers] = useState<JobNumberOption[]>([]);
  const [destinationLocations, setDestinationLocations] = useState<DestinationOption[]>([]);
  const [masterItems, setMasterItems] = useState<MasterItemOption[]>([]);
  const [availableSources, setAvailableSources] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedSourceId, setSelectedSourceId] = useState<string>("");
  const [warehousesId, setWarehousesId] = useState<number | undefined>(
    matchedFromProps?.warehouses_id
  );
  const [mutationCode, setMutationCode] = useState(
    matchedFromProps?.mutationCode ||
      `MUT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
  );
  const [productionCode, setProductionCode] = useState(
    matchedFromProps?.productionCode && matchedFromProps.productionCode !== "-"
      ? matchedFromProps.productionCode
      : ""
  );
  const [jobNumberId, setJobNumberId] = useState<number | undefined>(
    matchedFromProps?.job_number_id
  );
  const [jobNumber, setJobNumber] = useState(
    matchedFromProps?.jobNumber && matchedFromProps.jobNumber !== "-"
      ? matchedFromProps.jobNumber
      : ""
  );
  const [transferDate, setTransferDate] = useState(
    normalizeToIsoDate(matchedFromProps?.transferDate)
  );
  const [transferNote, setTransferNote] = useState(matchedFromProps?.transferNote || "");
  const [items, setItems] = useState<TransferStockReturnItem[]>(
    matchedFromProps?.items?.length ? matchedFromProps.items : [createBlankItemRow()]
  );

  // Hydrate existing record when navigating directly to /edit/{code}
  useEffect(() => {
    if (mode !== "edit") {
      setExistingRecord(null);
      setLoadingRecord(false);
      return;
    }

    if (matchedFromProps) {
      setExistingRecord(matchedFromProps);
      setLoadingRecord(false);
      return;
    }

    if (!recordCode) {
      setLoadingRecord(false);
      return;
    }

    let cancelled = false;
    setLoadingRecord(true);
    fetchTransferStockReturnDetailApi(recordCode)
      .then((fetched) => {
        if (!cancelled) setExistingRecord(fetched);
      })
      .finally(() => {
        if (!cancelled) setLoadingRecord(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode, recordCode, matchedFromProps]);

  // Synchronize form inputs when existingRecord changes or switching modes
  useEffect(() => {
    setErrorMessage(null);
    if (mode === "edit" && existingRecord) {
      setSelectedSourceId(
        existingRecord.request_material_id ? String(existingRecord.request_material_id) : ""
      );
      setWarehousesId(existingRecord.warehouses_id);
      setMutationCode(existingRecord.mutationCode || "");
      setProductionCode(
        existingRecord.productionCode && existingRecord.productionCode !== "-"
          ? existingRecord.productionCode
          : ""
      );
      setJobNumberId(existingRecord.job_number_id);
      setJobNumber(
        existingRecord.jobNumber && existingRecord.jobNumber !== "-" ? existingRecord.jobNumber : ""
      );
      setTransferDate(normalizeToIsoDate(existingRecord.transferDate));
      setTransferNote(existingRecord.transferNote || "");
      setItems(
        existingRecord.items?.length ? existingRecord.items : [createBlankItemRow()]
      );
    } else if (mode === "create") {
      setSelectedSourceId("");
      setWarehousesId(undefined);
      setMutationCode(
        `MUT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`
      );
      setProductionCode("");
      setJobNumberId(undefined);
      setJobNumber("");
      setTransferDate(getTodayIso());
      setTransferNote("");
      setItems([createBlankItemRow()]);
    }
  }, [mode, existingRecord]);

  // Load real DB lookups, available RM sources, and master items
  useEffect(() => {
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

        if (mode === "create" && whList.length > 0) {
          setWarehousesId((prev) => prev ?? Number(whList[0].id));
        }

        const defaultDest = dlList[0]?.name || whList[0]?.name || "Main Warehouse";
        if (mItems.length > 0) {
          setItems((prev) =>
            prev.map((row) => {
              const matched =
                (row.items_id ? mItems.find((m) => m.id === row.items_id) : undefined) ||
                (row.itemCode ? mItems.find((m) => m.code === row.itemCode) : undefined) ||
                (mode === "create" ? mItems[0] : undefined);
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
  }, [mode]);

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
    items.forEach((it) => {
      if (it.destinationLocation) names.add(it.destinationLocation);
    });
    return Array.from(names);
  }, [destinationLocations, warehouses, items]);

  const rawStatus = String(existingRecord?.status || "");
  const isLocked =
    mode === "edit" &&
    Boolean(
      existingRecord &&
        (rawStatus === "Approved" ||
          rawStatus === "Approved 1" ||
          rawStatus === "Approved 2")
    );

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
    if (isLocked) return;
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

    const payload = {
      return_number: mutationCode.trim(),
      production_code: productionCode.trim() && productionCode.trim() !== "-" ? productionCode.trim() : null,
      request_material_id: selectedSourceId ? Number(selectedSourceId) : existingRecord?.request_material_id || null,
      warehouses_id: warehousesId,
      job_number_id: jobNumberId || null,
      job_number: jobNumber.trim() && jobNumber.trim() !== "-" ? jobNumber.trim() : null,
      return_date: toIsoDate(transferDate),
      note: transferNote.trim(),
      items: items.map((it) => ({
        items_id: it.items_id,
        quantity: Number(it.quantity),
        unit: it.unit,
        source_location: it.sourceLocation,
        destination_location: it.destinationLocation,
        remark: it.reason,
      })),
    };

    try {
      setSaving(true);
      const savedRes = await saveTransferStockReturnApi(
        payload,
        mode === "edit" ? existingRecord?.id : undefined
      );
      if (onSaved) {
        await onSaved(savedRes);
      } else {
        onBack();
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to save Stock Transfer Return to database.");
      setSaving(false);
    }
  };

  if (mode === "edit" && loadingRecord && !existingRecord) {
    return (
      <div className="tsr-form-page">
        <div className="tsr-form-card tsr-empty-panel">
          <strong className="tsr-loading-text">Loading Stock Transfer Return data...</strong>
        </div>
      </div>
    );
  }

  if (mode === "edit" && !loadingRecord && recordCode && !existingRecord) {
    return (
      <div className="tsr-form-page">
        <div className="tsr-form-card tsr-empty-panel">
          <div className="tsr-empty-badge-icon">
            <Icon name="alertTriangle" size={28} />
          </div>
          <h3 className="tsr-empty-heading">Stock Transfer Return Not Found</h3>
          <p className="tsr-empty-text">
            The requested Stock Transfer Return &ldquo;<strong>{recordCode}</strong>&rdquo; could not
            be located in the database.
          </p>
          <Button type="button" variant="ghost" onClick={onBack}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="tsr-form-page">
      <form onSubmit={handleSubmit} className="tsr-form-page">
        {errorMessage && (
          <div className="tsr-notice tsr-notice--error">
            <span>{errorMessage}</span>
            <button
              type="button"
              className="tsr-notice__close"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {isLocked && (
          <div className="tsr-notice tsr-notice--warning">
            <span>This Stock Transfer Return has been approved and is locked from editing.</span>
          </div>
        )}

        {/* Header Fields Card */}
        <div className="tsr-form-card">
          {loadingLookups && (
            <LoadingBuffer
              variant="inline"
              label="Loading warehouse, job number, and item options..."
            />
          )}
          <div className="tsr-form-card-header">
            <h3 className="tsr-form-card-title">
              {mode === "edit"
                ? `Edit Stock Transfer Return (${existingRecord?.mutationCode || recordCode})`
                : "Create Stock Transfer Return"}
            </h3>
          </div>

          <div className="tsr-form-grid-3">
            <div className="master-form-group">
              <label htmlFor="tsrMutationCode" className="master-form-label">
                Mutation Code <span className="master-required-star">*</span>
              </label>
              <input
                id="tsrMutationCode"
                type="text"
                className="master-form-input"
                value={mutationCode}
                onChange={(e) => setMutationCode(e.target.value)}
                placeholder="e.g. MUT-2026-11-001"
                disabled={isLocked}
                required
              />
            </div>

            <div className="master-form-group">
              <label className="master-form-label">
                Transfer Date <span className="master-required-star">*</span>
              </label>
              <CustomDatePicker
                required
                value={transferDate}
                onChange={(val: string) => setTransferDate(val)}
                placeholder="DD-MM-YYYY"
              />
            </div>

            <div className="master-form-group">
              <label className="master-form-label">
                Warehouse <span className="master-required-star">*</span>
              </label>
              <CustomSelect
                searchable
                required
                value={warehousesId ? String(warehousesId) : ""}
                onChange={(val: string) => setWarehousesId(val ? Number(val) : undefined)}
                placeholder={loadingLookups ? "Loading warehouses..." : "-- Select Warehouse --"}
                disabled={loadingLookups || isLocked}
                options={[
                  { value: "", label: "-- Select Warehouse --" },
                  ...warehouses.map((w) => ({
                    value: String(w.id),
                    label: w.code ? `${w.code} - ${w.name}` : w.name,
                  })),
                ]}
              />
            </div>
          </div>

          <div
            className={
              mode === "create" && availableSources.length > 0
                ? "tsr-form-grid-3"
                : "tsr-form-grid-2"
            }
          >
            {mode === "create" && availableSources.length > 0 && (
              <div className="master-form-group">
                <label className="master-form-label">Source Request Material</label>
                <CustomSelect
                  searchable
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
                searchable
                value={jobNumberId ? String(jobNumberId) : ""}
                onChange={(val: string) => {
                  const matched = jobNumbers.find((j) => String(j.id) === val);
                  setJobNumberId(matched ? Number(matched.id) : undefined);
                  setJobNumber(matched ? matched.name : "");
                }}
                placeholder={loadingLookups ? "Loading job numbers..." : "-- Select Job Number --"}
                disabled={loadingLookups || isLocked}
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
              <label htmlFor="tsrProductionCode" className="master-form-label">
                Production Code
              </label>
              <input
                id="tsrProductionCode"
                type="text"
                className="master-form-input"
                value={productionCode}
                onChange={(e) => setProductionCode(e.target.value)}
                placeholder="e.g. PRD-2026-088"
                disabled={isLocked}
              />
            </div>
          </div>

          <div className="master-form-group tsr-col-span-full">
            <label htmlFor="tsrTransferNote" className="master-form-label">
              Transfer Note / Remarks
            </label>
            <textarea
              id="tsrTransferNote"
              className="master-form-textarea"
              rows={2}
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              placeholder="Explain why materials are being returned to warehouse..."
              disabled={isLocked}
            />
          </div>
        </div>

        {/* Returned Items Panel */}
        <div className="tsr-items-panel">
          <div className="tsr-items-header">
            <h4 className="tsr-items-title">Return Items List ({items.length})</h4>
            {!isLocked && (
              <Button type="button" variant="outline" size="sm" onClick={handleAddItemRow}>
                Add Row
              </Button>
            )}
          </div>

          <div className="tsr-edit-table-scroll">
            <table className="tsr-edit-table">
              <thead>
                <tr>
                  <th className="tsr-th--center tsr-item-col-no">No</th>
                  <th className="tsr-item-col-select">
                    Item Material <span className="required-mark">*</span>
                  </th>
                  <th className="tsr-th--right tsr-item-col-qty">
                    Qty <span className="required-mark">*</span>
                  </th>
                  <th className="tsr-th--center tsr-item-col-unit">Unit</th>
                  <th className="tsr-item-col-loc">Destination Location</th>
                  <th className="tsr-item-col-reason">Return Reason</th>
                  <th className="tsr-th--center tsr-item-col-action">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={it.id}>
                    <td className="tsr-row-no">{idx + 1}</td>
                    <td>
                      <CustomSelect
                        searchable
                        required
                        value={it.items_id ? String(it.items_id) : ""}
                        onChange={(val: string) => handleItemChange(idx, "items_id", val)}
                        placeholder={loadingLookups ? "Loading items..." : "-- Select Item --"}
                        disabled={loadingLookups || isLocked}
                        options={itemSelectOptions}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        className="tsr-inline-input tsr-inline-qty"
                        value={it.quantity}
                        required
                        disabled={isLocked}
                        onChange={(e) =>
                          handleItemChange(idx, "quantity", Math.max(1, Number(e.target.value) || 1))
                        }
                      />
                    </td>
                    <td className="tsr-row-unit">{it.unit}</td>
                    <td>
                      <CustomSelect
                        searchable
                        value={it.destinationLocation}
                        onChange={(val: string) =>
                          handleItemChange(idx, "destinationLocation", val)
                        }
                        placeholder="-- Select Destination --"
                        disabled={isLocked}
                        options={destinationSelectOptions.map((name) => ({
                          value: name,
                          label: name,
                        }))}
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className="tsr-inline-input"
                        value={it.reason}
                        disabled={isLocked}
                        onChange={(e) => handleItemChange(idx, "reason", e.target.value)}
                        placeholder="Reason for return..."
                      />
                    </td>
                    <td className="master-cell-center">
                      <button
                        type="button"
                        className="btn-action-delete"
                        disabled={isLocked}
                        onClick={() => handleRemoveItemRow(idx)}
                        title="Delete item row"
                        aria-label="Delete item row"
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="tsr-form-footer">
          <Button type="button" variant="ghost" onClick={onBack} disabled={saving}>
            Cancel
          </Button>
          {!isLocked && (
            <Button type="submit" variant="primary" disabled={saving || loadingLookups}>
              {saving ? "Saving..." : "Save"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export default TransferStockReturnForm;
