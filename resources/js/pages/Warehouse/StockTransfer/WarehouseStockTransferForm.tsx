import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { Icon } from "../../../components/ui/Icon";
import { LoadingBuffer } from "../../../components/ui/LoadingBuffer";
import { useNotification } from "../../../context/NotificationContext";
import { apiGet } from "../../../data/api";
import {
  createWarehouseStockTransferApi,
  fetchMasterLookupsApi,
  fetchStockItemsReportApi,
} from "../../../data/masterApi";

interface WarehouseStockTransferFormProps {
  onCancel: () => void;
  onSaved: (transferNumber?: string) => void;
}

interface TransferDraftRow {
  rowKey: string;
  items_id: number | "";
  quantity: string;
  unit: string;
  lot_number: string;
  remark: string;
}

interface WarehouseOption {
  id: number;
  code?: string;
  name: string;
}

interface CoordinateOption {
  id: number;
  name: string;
}

function createEmptyRow(): TransferDraftRow {
  return {
    rowKey: `wst-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    items_id: "",
    quantity: "",
    unit: "PCE",
    lot_number: "",
    remark: "",
  };
}

export function WarehouseStockTransferForm({
  onCancel,
  onSaved,
}: WarehouseStockTransferFormProps) {
  const { notifySuccess, notifyError } = useNotification();
  const today = new Date().toISOString().slice(0, 10);

  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [srcCoords, setSrcCoords] = useState<CoordinateOption[]>([]);
  const [dstCoords, setDstCoords] = useState<CoordinateOption[]>([]);
  const [stockItems, setStockItems] = useState<any[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);
  const [loadingSourceItems, setLoadingSourceItems] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sourceWarehouseId, setSourceWarehouseId] = useState<string>("");
  const [destinationWarehouseId, setDestinationWarehouseId] = useState<string>("");
  const [sourceCoordinateId, setSourceCoordinateId] = useState<string>("");
  const [sourceCoordinateName, setSourceCoordinateName] = useState<string>("");
  const [destinationCoordinateId, setDestinationCoordinateId] = useState<string>("");
  const [destinationCoordinateName, setDestinationCoordinateName] = useState<string>("");
  const [transferDate, setTransferDate] = useState(today);
  const [referenceCode, setReferenceCode] = useState("");
  const [autoPost, setAutoPost] = useState<"true" | "false">("true");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<TransferDraftRow[]>([createEmptyRow()]);
  const [idempotencyKey] = useState(
    () => `wst-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );

  useEffect(() => {
    let active = true;
    setLoadingLookups(true);
    fetchMasterLookupsApi()
      .catch(() => null)
      .then((lookups) => {
        if (!active) return;
        const whList = Array.isArray(lookups?.warehouses) ? lookups.warehouses : [];
        const activeWarehouses = whList.filter(
          (w: any) => w.status === undefined || w.status === null || Number(w.status) === 1
        );
        setWarehouses(
          activeWarehouses.map((w: any) => ({
            id: Number(w.id),
            code: w.code ? String(w.code) : undefined,
            name: String(w.name),
          }))
        );
      })
      .finally(() => {
        if (active) setLoadingLookups(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!sourceWarehouseId) {
      setSrcCoords([]);
      setSourceCoordinateId("");
      setSourceCoordinateName("");
      setStockItems([]);
      return;
    }
    let active = true;
    setLoadingSourceItems(true);

    Promise.all([
      apiGet<{ data?: any[] }>(
        `/api/warehouse/master/warehouses/${sourceWarehouseId}/coordinates`
      ).catch(() => ({ data: [] })),
      fetchStockItemsReportApi({
        warehouseId: sourceWarehouseId,
        stock: "Available",
        per_page: 500,
      }).catch(() => []),
    ])
      .then(([coordRes, stockRows]) => {
        if (!active) return;
        const list = Array.isArray(coordRes?.data) ? coordRes.data : [];
        setSrcCoords(
          list
            .filter((c: any) => c.status === undefined || c.status === null || Number(c.status) === 1)
            .map((c: any) => ({ id: Number(c.id), name: String(c.name) }))
        );
        setStockItems(Array.isArray(stockRows) ? stockRows : []);
      })
      .finally(() => {
        if (active) setLoadingSourceItems(false);
      });

    return () => {
      active = false;
    };
  }, [sourceWarehouseId]);

  useEffect(() => {
    if (!destinationWarehouseId) {
      setDstCoords([]);
      setDestinationCoordinateId("");
      setDestinationCoordinateName("");
      return;
    }
    let active = true;
    apiGet<{ data?: any[] }>(
      `/api/warehouse/master/warehouses/${destinationWarehouseId}/coordinates`
    )
      .catch(() => ({ data: [] }))
      .then((res) => {
        if (!active) return;
        const list = Array.isArray(res?.data) ? res.data : [];
        setDstCoords(
          list
            .filter((c: any) => c.status === undefined || c.status === null || Number(c.status) === 1)
            .map((c: any) => ({ id: Number(c.id), name: String(c.name) }))
        );
      });
    return () => {
      active = false;
    };
  }, [destinationWarehouseId]);

  // Available items + balances strictly inside selected Source Warehouse
  const sourceItemStockMap = useMemo(() => {
    const map = new Map<
      number,
      { items_id: number; code: string; name: string; unit: string; available: number }
    >();
    const whId = Number(sourceWarehouseId);
    if (!whId) return map;

    stockItems.forEach((it: any) => {
      const itemId = Number(it.itemId ?? it.items_id ?? it.item_id ?? 0);
      if (!itemId) return;

      let qty = 0;
      if (Array.isArray(it.warehouses)) {
        const whMatch = it.warehouses.find(
          (b: any) => Number(b.warehouseId ?? b.warehouse_id ?? b.warehouses_id ?? b.id) === whId
        );
        qty = whMatch
          ? Number(whMatch.availableQuantity ?? whMatch.available_quantity ?? whMatch.quantity ?? 0)
          : 0;
      } else {
        const rowWhId = Number(it.warehouseId ?? it.warehouse_id ?? it.warehouses_id ?? 0);
        if (rowWhId !== whId) return;
        qty = Number(it.availableQty ?? it.available_quantity ?? it.quantity ?? 0);
      }

      if (qty > 0) {
        const existing = map.get(itemId);
        if (existing) {
          existing.available += qty;
        } else {
          map.set(itemId, {
            items_id: itemId,
            code: String(it.materialCode ?? it.itemCode ?? it.item_code ?? it.code ?? ""),
            name: String(it.materialItem ?? it.itemName ?? it.item_name ?? it.name ?? ""),
            unit: String(it.unit ?? it.unitCode ?? "PCE"),
            available: qty,
          });
        }
      }
    });
    return map;
  }, [stockItems, sourceWarehouseId]);

  const sourceItemOptions = useMemo(() => {
    return Array.from(sourceItemStockMap.values()).map((it) => ({
      value: String(it.items_id),
      label: `${it.code} — ${it.name} (Avail: ${it.available} ${it.unit})`,
    }));
  }, [sourceItemStockMap]);

  const handleUpdateRow = (rowKey: string, patch: Partial<TransferDraftRow>) => {
    setRows((prev) => prev.map((r) => (r.rowKey === rowKey ? { ...r, ...patch } : r)));
  };

  const handleSelectItem = (rowKey: string, itemIdStr: string) => {
    const info = sourceItemStockMap.get(Number(itemIdStr));
    handleUpdateRow(rowKey, {
      items_id: itemIdStr ? Number(itemIdStr) : "",
      unit: info?.unit || "PCE",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!sourceWarehouseId || !destinationWarehouseId) {
      setErrorMsg("Both Source Warehouse and Destination Warehouse are required.");
      return;
    }
    if (sourceWarehouseId === destinationWarehouseId) {
      setErrorMsg("Destination warehouse must be different from source warehouse.");
      return;
    }
    if (!transferDate) {
      setErrorMsg("Transfer Date is required.");
      return;
    }
    if (rows.length === 0) {
      setErrorMsg("Please add at least one item row.");
      return;
    }

    const aggregated = new Map<number, number>();
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.items_id) {
        setErrorMsg(`Row ${i + 1}: Please select a valid item from the source warehouse.`);
        return;
      }
      const qty = Number(r.quantity);
      if (isNaN(qty) || qty <= 0) {
        setErrorMsg(`Row ${i + 1}: Quantity must be greater than zero.`);
        return;
      }
      const nextSum = (aggregated.get(Number(r.items_id)) || 0) + qty;
      aggregated.set(Number(r.items_id), nextSum);
      const stockInfo = sourceItemStockMap.get(Number(r.items_id));
      if (!stockInfo || nextSum > stockInfo.available + 1e-6) {
        setErrorMsg(
          `Row ${i + 1}: Requested quantity (${nextSum}) exceeds available stock (${stockInfo?.available ?? 0}) in source warehouse.`
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const res = await createWarehouseStockTransferApi({
        source_warehouse_id: Number(sourceWarehouseId),
        destination_warehouse_id: Number(destinationWarehouseId),
        source_coordinate_id:
          sourceCoordinateId && sourceCoordinateId !== "__custom__"
            ? Number(sourceCoordinateId)
            : null,
        source_coordinate_name:
          sourceCoordinateId === "__custom__" || srcCoords.length === 0
            ? sourceCoordinateName.trim() || null
            : null,
        destination_coordinate_id:
          destinationCoordinateId && destinationCoordinateId !== "__custom__"
            ? Number(destinationCoordinateId)
            : null,
        destination_coordinate_name:
          destinationCoordinateId === "__custom__" || dstCoords.length === 0
            ? destinationCoordinateName.trim() || null
            : null,
        transfer_date: transferDate,
        reference_code: referenceCode.trim() || undefined,
        idempotency_key: idempotencyKey,
        note: note.trim() || undefined,
        auto_post: autoPost === "true",
        items: rows.map((r) => ({
          items_id: Number(r.items_id),
          quantity: Number(r.quantity),
          unit: r.unit || "PCE",
          lot_number: r.lot_number.trim() || undefined,
          remark: r.remark.trim() || undefined,
        })),
      });

      notifySuccess(
        "Stock Transfer Created",
        res.message || `Transfer ${res.data.transferNumber} saved.`
      );
      window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
      onSaved(res.data.transferNumber);
    } catch (err: any) {
      const msg = err?.message || "Failed to execute warehouse stock transfer.";
      setErrorMsg(msg);
      notifyError("Stock Transfer Failed", msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="wst-form-page">
      <form onSubmit={handleSubmit} className="wst-card">
        {loadingLookups && (
          <LoadingBuffer variant="inline" label="Loading warehouses and stock balances..." />
        )}

        <div>
          <span className="eyebrow">WAREHOUSE INVENTORY MOVEMENT</span>
          <h2 className="table-panel__title">Transfer Stock Between Warehouses</h2>
        </div>

        {errorMsg && <div className="wst-banner wst-banner--error">{errorMsg}</div>}

        <div className="wst-form-grid">
          <div className="master-form-group">
            <label htmlFor="wstSourceWh" className="master-form-label">
              Source Warehouse <span className="required-asterisk">*</span>
            </label>
            <CustomSelect
              id="wstSourceWh"
              searchable
              required
              value={sourceWarehouseId}
              onChange={(val) => {
                setSourceWarehouseId(val);
                if (val && val === destinationWarehouseId) {
                  setDestinationWarehouseId("");
                  setDestinationCoordinateId("");
                  setDestinationCoordinateName("");
                }
                setSourceCoordinateId("");
                setSourceCoordinateName("");
                setRows([createEmptyRow()]);
              }}
              placeholder="-- Select Source Warehouse --"
              options={[
                { value: "", label: "-- Select Source Warehouse --" },
                ...warehouses.map((w) => ({
                  value: String(w.id),
                  label: w.code ? `${w.code} — ${w.name}` : w.name,
                })),
              ]}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="wstDestWh" className="master-form-label">
              Destination Warehouse <span className="required-asterisk">*</span>
            </label>
            <CustomSelect
              id="wstDestWh"
              searchable
              required
              value={destinationWarehouseId}
              onChange={(val) => {
                setDestinationWarehouseId(val);
                setDestinationCoordinateId("");
                setDestinationCoordinateName("");
              }}
              placeholder="-- Select Destination Warehouse --"
              options={[
                { value: "", label: "-- Select Destination Warehouse --" },
                ...warehouses
                  .filter((w) => String(w.id) !== sourceWarehouseId)
                  .map((w) => ({
                    value: String(w.id),
                    label: w.code ? `${w.code} — ${w.name}` : w.name,
                  })),
              ]}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="wstDate" className="master-form-label">
              Transfer Date <span className="required-asterisk">*</span>
            </label>
            <CustomDatePicker
              id="wstDate"
              required
              value={transferDate}
              onChange={(val) => setTransferDate(val)}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="wstSrcCoord" className="master-form-label">
              Source Coordinate (Optional)
            </label>
            {!sourceWarehouseId ? (
              <CustomSelect
                id="wstSrcCoord"
                disabled
                value=""
                onChange={() => {}}
                placeholder="-- Select Source Warehouse first --"
                options={[]}
              />
            ) : srcCoords.length > 0 && sourceCoordinateId !== "__custom__" ? (
              <CustomSelect
                id="wstSrcCoord"
                searchable
                value={sourceCoordinateId}
                onChange={(val) => {
                  setSourceCoordinateId(val);
                  if (val !== "__custom__") setSourceCoordinateName("");
                }}
                options={[
                  { value: "", label: "-- Any Coordinate --" },
                  ...srcCoords.map((c) => ({ value: String(c.id), label: c.name })),
                  { value: "__custom__", label: "+ Enter Custom Coordinate..." },
                ]}
              />
            ) : (
              <div className="wst-row-actions">
                <input
                  id="wstSrcCoord"
                  type="text"
                  className="master-form-input"
                  value={sourceCoordinateName}
                  onChange={(e) => setSourceCoordinateName(e.target.value)}
                  placeholder="Enter coordinate / rack (optional)"
                />
                {srcCoords.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSourceCoordinateId("");
                      setSourceCoordinateName("");
                    }}
                  >
                    List
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="master-form-group">
            <label htmlFor="wstDstCoord" className="master-form-label">
              Destination Coordinate (Optional)
            </label>
            {!destinationWarehouseId ? (
              <CustomSelect
                id="wstDstCoord"
                disabled
                value=""
                onChange={() => {}}
                placeholder="-- Select Destination Warehouse first --"
                options={[]}
              />
            ) : dstCoords.length > 0 && destinationCoordinateId !== "__custom__" ? (
              <CustomSelect
                id="wstDstCoord"
                searchable
                value={destinationCoordinateId}
                onChange={(val) => {
                  setDestinationCoordinateId(val);
                  if (val !== "__custom__") setDestinationCoordinateName("");
                }}
                options={[
                  { value: "", label: "-- Default Coordinate --" },
                  ...dstCoords.map((c) => ({ value: String(c.id), label: c.name })),
                  { value: "__custom__", label: "+ Enter Custom Coordinate..." },
                ]}
              />
            ) : (
              <div className="wst-row-actions">
                <input
                  id="wstDstCoord"
                  type="text"
                  className="master-form-input"
                  value={destinationCoordinateName}
                  onChange={(e) => setDestinationCoordinateName(e.target.value)}
                  placeholder="Enter coordinate / rack (optional)"
                />
                {dstCoords.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDestinationCoordinateId("");
                      setDestinationCoordinateName("");
                    }}
                  >
                    List
                  </Button>
                )}
              </div>
            )}
          </div>

          <div className="master-form-group">
            <label htmlFor="wstExecutionMode" className="master-form-label">
              Execution Mode
            </label>
            <CustomSelect
              id="wstExecutionMode"
              value={autoPost}
              onChange={(val) => setAutoPost(val === "false" ? "false" : "true")}
              options={[
                { value: "true", label: "Post Immediately (Move Stock Now)" },
                { value: "false", label: "Save as Draft (Post Later)" },
              ]}
            />
          </div>

          <div className="master-form-group">
            <label htmlFor="wstRefCode" className="master-form-label">
              Reference Code
            </label>
            <input
              id="wstRefCode"
              type="text"
              className="master-form-input"
              value={referenceCode}
              onChange={(e) => setReferenceCode(e.target.value)}
              placeholder="Optional reference number"
            />
          </div>

          <div className="master-form-group wst-form-span-full">
            <label htmlFor="wstNote" className="master-form-label">
              Transfer Note
            </label>
            <input
              id="wstNote"
              type="text"
              className="master-form-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for relocating stock to destination warehouse..."
            />
          </div>
        </div>

        <div className="wst-table-card">
          <div className="wst-items-header">
            <h3 className="wst-items-title">Transfer Items ({rows.length})</h3>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!sourceWarehouseId}
              onClick={() => setRows((prev) => [...prev, createEmptyRow()])}
            >
              Add Row
            </Button>
          </div>

          <div className="table-frame">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="wst-col-no">No</th>
                    <th>Item (Available in Source Warehouse)</th>
                    <th className="wst-col-num">Available</th>
                    <th className="wst-col-num">Transfer Qty</th>
                    <th>Unit</th>
                    <th>Lot Number</th>
                    <th>Remark</th>
                    <th className="wst-col-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const info = row.items_id ? sourceItemStockMap.get(Number(row.items_id)) : undefined;
                    return (
                      <tr key={row.rowKey}>
                        <td className="wst-col-no">{idx + 1}</td>
                        <td>
                          <CustomSelect
                            searchable
                            required
                            disabled={!sourceWarehouseId || loadingSourceItems || sourceItemOptions.length === 0}
                            value={row.items_id ? String(row.items_id) : ""}
                            onChange={(val) => handleSelectItem(row.rowKey, val)}
                            placeholder={
                              !sourceWarehouseId
                                ? "-- Select Source Warehouse first --"
                                : loadingSourceItems
                                  ? "-- Loading source stock... --"
                                  : sourceItemOptions.length === 0
                                    ? "-- No available stock in source --"
                                    : "-- Select Item --"
                            }
                            options={sourceItemOptions}
                          />
                        </td>
                        <td className="wst-col-num">
                          {info ? info.available.toFixed(2) : "0.00"}
                        </td>
                        <td className="wst-col-num">
                          <input
                            type="number"
                            min="0.0001"
                            step="any"
                            className="master-form-input wst-qty-input"
                            value={row.quantity}
                            onChange={(e) =>
                              handleUpdateRow(row.rowKey, { quantity: e.target.value })
                            }
                            placeholder="0"
                            required
                          />
                        </td>
                        <td>{row.unit}</td>
                        <td>
                          <input
                            type="text"
                            className="master-form-input"
                            value={row.lot_number}
                            onChange={(e) =>
                              handleUpdateRow(row.rowKey, { lot_number: e.target.value })
                            }
                            placeholder="Optional lot"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="master-form-input"
                            value={row.remark}
                            onChange={(e) =>
                              handleUpdateRow(row.rowKey, { remark: e.target.value })
                            }
                            placeholder="Remark"
                          />
                        </td>
                        <td className="wst-col-action">
                          <button
                            type="button"
                            className="tx-row-delete-btn"
                            title="Remove row"
                            disabled={rows.length === 1}
                            onClick={() =>
                              setRows((prev) =>
                                prev.length > 1 ? prev.filter((x) => x.rowKey !== row.rowKey) : prev
                              )
                            }
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="wst-form-actions">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </div>
  );
}
