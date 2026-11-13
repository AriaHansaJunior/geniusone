import React, { useMemo, useState, useEffect } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { fetchDetail } from "../../../data/api";
import type { BPBItemRow } from "./WarehouseCreate";

export type BpbSourceType = "RN" | "PO";

interface PickBpbSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSourceType?: BpbSourceType;
  defaultSourceNumber?: string;
  existingRns: any[];
  approvedPos: any[];
  existingBpbs: any[];
  warehouses: any[];
  onAddItems: (params: {
    sourceType: BpbSourceType;
    sourceNumber: string;
    sourceRecord: any;
    items: BPBItemRow[];
  }) => void;
}

interface SelectableBpbItem {
  key: string;
  po_has_items_id?: number;
  po_has_rn_id?: number;
  poNumber: string;
  prNumber: string;
  name: string;
  code: string;
  jobNumber: string;
  deliveryNote: string;
  orderedQty: number;
  receiveQty: number;
  unit: string;
  purpose: string;
}

const getSafeStr = (val: any): string => {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object" && val.props?.children !== undefined) {
    return typeof val.props.children === "string" || typeof val.props.children === "number"
      ? String(val.props.children)
      : "";
  }
  return "";
};

export const isPoKawasanBerikat = (po: any): boolean => {
  const poFac = String(po?.facility || po?.facility_status || po?._rawFacility || "FASILITAS");
  const isFacility = !poFac.toUpperCase().includes("NON");
  if (isFacility) return true;
  const rawKb = po?.is_kawasan_berikat ?? po?.isKawasanBerikat;
  if (rawKb !== undefined && rawKb !== null) return Boolean(rawKb);
  const rawItems = po?.items || po?._items || [];
  return Array.isArray(rawItems) && rawItems.some((it: any) => Boolean(it.ditangguhkan_kawasan_berikat));
};

export function PickBpbSourceModal({
  isOpen,
  onClose,
  defaultSourceType = "RN",
  defaultSourceNumber = "",
  existingRns,
  approvedPos,
  existingBpbs,
  warehouses,
  onAddItems,
}: PickBpbSourceModalProps) {
  const [sourceType, setSourceType] = useState<BpbSourceType>(defaultSourceType);
  const [selectedDocNumber, setSelectedDocNumber] = useState<string>(defaultSourceNumber);
  const [loadedDocDetail, setLoadedDocDetail] = useState<any | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      setSourceType(defaultSourceType);
      setSelectedDocNumber(defaultSourceNumber);
      setLoadedDocDetail(null);
      setSearch("");
      setSelectedKeys(new Set());
    }
  }, [isOpen, defaultSourceType, defaultSourceNumber]);

  const isRnApprovedFn = (r: any): boolean => {
    const st = String(r.status || r._rawStatus || "").toLowerCase().trim();
    if (st === "approved" || st === "approved 2") return true;
    if (Array.isArray(r.approvals)) {
      const tier2 = r.approvals.find((a: any) => String(a.tier || a.approval_ke) === "2");
      if (tier2 && (String(tier2.status).toLowerCase() === "approved" || Number(tier2.status) === 1)) {
        return true;
      }
    }
    return false;
  };

  const findExistingBpbForRnFn = (rnNum: string) => {
    const targetClean = rnNum.trim().toLowerCase();
    if (!targetClean) return null;
    return existingBpbs.find((b) => {
      const bStatus = String(b._rawStatus || b.statusApprove || b.status || "").toLowerCase();
      if (bStatus === "rejected") return false;
      const bRn = (getSafeStr(b.rnNumber) || getSafeStr(b._rawRn) || getSafeStr(b.rn_number)).trim().toLowerCase();
      return bRn === targetClean;
    });
  };

  const rnDocumentOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ value: string; label: string; record: any }> = [];
    existingRns.forEach((r) => {
      const num = getSafeStr(r.rn_number) || getSafeStr(r._rawRn) || getSafeStr(r.rnNumber);
      if (!num || seen.has(num)) return;
      if (!isRnApprovedFn(r)) return;
      if (findExistingBpbForRnFn(num)) return;
      if (r.is_received_in_bpb && r.bpb_number && r.bpb_status !== "Rejected") return;
      seen.add(num);
      const sup = r.supplier?.name || r.supplierName || (typeof r.supplier === "string" ? r.supplier : "");
      const count = r.items?.length || r.purchase_order_receive_notes?.length || 0;
      list.push({
        value: num,
        label: `${num}${sup ? ` — ${sup}` : ""}${count > 0 ? ` (${count} item${count > 1 ? "s" : ""})` : ""}`,
        record: r,
      });
    });
    return list;
  }, [existingRns, existingBpbs]);

  const poDocumentOptions = useMemo(() => {
    const seen = new Set<string>();
    const list: Array<{ value: string; label: string; record: any }> = [];
    approvedPos.forEach((p) => {
      if (isPoKawasanBerikat(p)) return;
      const num = getSafeStr(p._rawNumber) || getSafeStr(p._rawPo) || getSafeStr(p.poNumber) || getSafeStr(p.po_number);
      if (!num || seen.has(num)) return;
      seen.add(num);
      const sup = String(p._rawSupplier || p.supplier || "").replace(/^\[[^\]]+\]\s*/, "").trim();
      const rawItems = p._items || p.items || [];
      const count = Array.isArray(rawItems) ? rawItems.length : 0;
      list.push({
        value: num,
        label: `${num}${sup ? ` — ${sup}` : ""}${count > 0 ? ` (${count} item${count > 1 ? "s" : ""})` : ""}`,
        record: p,
      });
    });
    return list;
  }, [approvedPos]);

  const currentDocOptions = sourceType === "RN" ? rnDocumentOptions : poDocumentOptions;

  const selectedDocRecord = useMemo(() => {
    if (!selectedDocNumber) return null;
    if (loadedDocDetail) return loadedDocDetail;
    const found = currentDocOptions.find((o) => o.value === selectedDocNumber);
    return found?.record ?? null;
  }, [selectedDocNumber, loadedDocDetail, currentDocOptions]);

  // Fetch full detail when document selected (ensures embedded line items are fresh)
  useEffect(() => {
    if (!isOpen || !selectedDocNumber) {
      setLoadedDocDetail(null);
      return;
    }
    let mounted = true;
    setIsLoadingDetail(true);
    fetchDetail(sourceType === "PO" ? "po" : "rn", selectedDocNumber)
      .then((detail) => {
        if (mounted && detail) {
          setLoadedDocDetail(detail);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingDetail(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, sourceType, selectedDocNumber]);

  const selectableItems: SelectableBpbItem[] = useMemo(() => {
    if (!selectedDocNumber || !selectedDocRecord) return [];

    if (sourceType === "RN") {
      const rnItems =
        Array.isArray(selectedDocRecord.items) && selectedDocRecord.items.length > 0
          ? selectedDocRecord.items
          : Array.isArray(selectedDocRecord.purchase_order_receive_notes)
            ? selectedDocRecord.purchase_order_receive_notes
            : [];
      return rnItems.map((it: any, idx: number) => {
        const poItem = it.purchase_order_item || it.purchaseOrderItem;
        const poDoc = poItem?.purchase_order || poItem?.purchaseOrder;
        const prItem = poItem?.purchase_request_item || poItem?.purchaseRequestItem;
        const prDoc = prItem?.purchase_request || prItem?.purchaseRequest;
        const itemMaster = poItem?.item || prItem?.item;
        const qty = Number(it.net_quantity ?? it.gross_quantity ?? it.quantity ?? it.receiveQty ?? it.suratJalanQty ?? 1) || 1;
        return {
          key: `rn-${selectedDocNumber}-${it.id ?? idx}`,
          po_has_items_id: poItem?.id,
          po_has_rn_id: typeof it.id === "number" ? it.id : undefined,
          poNumber: it.po_number || it.poNumber || poDoc?.po_number || "—",
          prNumber: prDoc?.pr_number || "—",
          name: it.item_name || it.itemName || it.item || itemMaster?.name || "Material Item",
          code: it.item_code || it.itemCode || it.code || itemMaster?.code || "—",
          jobNumber: it.job_number || it.jobNumber || "—",
          deliveryNote: it.dn_number || it.deliveryNote || it.sj_number || selectedDocRecord.sj_number || "—",
          orderedQty: qty,
          receiveQty: qty,
          unit: it.unit || itemMaster?.unit?.code || itemMaster?.unitOfMeasurement?.name || "PCE",
          purpose: it.note || it.remark || selectedDocRecord.note || "Warehouse Inbound Receipt",
        };
      });
    }

    // PO source mode (Non-Kawasan Berikat Direct PO)
    const poItems =
      Array.isArray(selectedDocRecord._items) && selectedDocRecord._items.length > 0
        ? selectedDocRecord._items
        : Array.isArray(selectedDocRecord.items)
          ? selectedDocRecord.items
          : [];
    const prHeader = selectedDocRecord._rawPr || selectedDocRecord.prNumber || "—";
    return poItems.map((it: any, idx: number) => {
      const rawQtyStr = String(it.orderQty ?? it.rawQty ?? it.order ?? it.quantity ?? "1").replace(/[^0-9.]/g, "");
      const qtyNum = parseFloat(rawQtyStr) || 1;
      const unitMatch = String(it.quantity || "").match(/[A-Za-z]+$/);
      const unitStr = it.unit || (unitMatch ? unitMatch[0] : "PCE");
      return {
        key: `po-${selectedDocNumber}-${it.po_has_items_id ?? it.id ?? idx}`,
        po_has_items_id: it.po_has_items_id || (typeof it.id === "number" ? it.id : undefined),
        poNumber: selectedDocNumber,
        prNumber: it.prNumber || prHeader,
        name: it.item || it.itemName || it.item_alias || "Material Item",
        code: it.itemCode || it.item_code || it.itemAlias || "—",
        jobNumber: it.jobNumber || "—",
        deliveryNote: `SJ-${new Date().getFullYear()}-001`,
        orderedQty: qtyNum,
        receiveQty: qtyNum,
        unit: unitStr,
        purpose: it.remark || selectedDocRecord._rawRemark || "Direct PO Warehouse Receipt",
      };
    });
  }, [sourceType, selectedDocNumber, selectedDocRecord]);

  // Auto-select all items when a document's items finish loading
  useEffect(() => {
    if (selectableItems.length > 0) {
      setSelectedKeys(new Set(selectableItems.map((it) => it.key)));
    } else {
      setSelectedKeys(new Set());
    }
  }, [selectedDocNumber, sourceType, selectableItems.length]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return selectableItems;
    return selectableItems.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.code.toLowerCase().includes(q) ||
        it.poNumber.toLowerCase().includes(q) ||
        it.jobNumber.toLowerCase().includes(q)
    );
  }, [selectableItems, search]);

  if (!isOpen) return null;

  const isAllSelected =
    filteredItems.length > 0 && filteredItems.every((it) => selectedKeys.has(it.key));

  const handleToggleItem = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleToggleAll = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredItems.map((it) => it.key)));
    }
  };

  const handleConfirm = () => {
    if (!selectedDocNumber || !selectedDocRecord) return;
    const defaultWh = warehouses[0]?.name || "Gudang Sparepart";
    const chosen = selectableItems
      .filter((it) => selectedKeys.has(it.key))
      .map((it, idx): BPBItemRow => ({
        id: `bpb-item-${Date.now()}-${idx}`,
        po_has_items_id: it.po_has_items_id,
        po_has_rn_id: it.po_has_rn_id,
        poNumber: it.poNumber,
        prNumber: it.prNumber,
        name: it.name,
        code: it.code,
        jobNumber: it.jobNumber,
        deliveryNote: it.deliveryNote,
        orderedQty: it.orderedQty,
        receiveQty: it.receiveQty,
        unit: it.unit,
        location: defaultWh,
        purpose: it.purpose,
      }));

    if (chosen.length === 0) return;

    onAddItems({
      sourceType,
      sourceNumber: selectedDocNumber,
      sourceRecord: selectedDocRecord,
      items: chosen,
    });
    onClose();
  };

  return (
    <div className="item-picker-backdrop" onClick={onClose}>
      <div
        className="item-picker-dialog"
        style={{ maxWidth: "960px", width: "92vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="item-picker-header">
          <div>
            <h2 className="item-picker-title">Add Item to BPB</h2>
            <p className="item-picker-subtitle">
              Choose whether to receive from a Receive Note (Kawasan Berikat) or Purchase Order (Non-Kawasan Berikat), then select the document number.
            </p>
          </div>
          <button
            type="button"
            className="item-picker-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Step 1 & Step 2 Selection Panel */}
        <div
          style={{
            padding: "14px 20px",
            background: "var(--surface-muted, #f8fafc)",
            borderBottom: "1px solid var(--border, #e2e8f0)",
            display: "grid",
            gridTemplateColumns: "1fr 1.5fr",
            gap: "16px",
            alignItems: "start",
          }}
        >
          <div>
            <label className="master-form-label" style={{ marginBottom: "6px", display: "block" }}>
              1. Source Type <span className="required-asterisk">*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <button
                type="button"
                onClick={() => {
                  setSourceType("RN");
                  setSelectedDocNumber("");
                  setLoadedDocDetail(null);
                  setSelectedKeys(new Set());
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: "var(--radius-sm, 8px)",
                  border: sourceType === "RN" ? "2px solid var(--blue-600, #2563eb)" : "1px solid var(--border, #cbd5e1)",
                  background: sourceType === "RN" ? "#eff6ff" : "#ffffff",
                  color: sourceType === "RN" ? "#1d4ed8" : "#334155",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div>Receive Note (RN)</div>
                <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.85, marginTop: "2px" }}>
                  Kawasan Berikat ({rnDocumentOptions.length})
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSourceType("PO");
                  setSelectedDocNumber("");
                  setLoadedDocDetail(null);
                  setSelectedKeys(new Set());
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: "var(--radius-sm, 8px)",
                  border: sourceType === "PO" ? "2px solid var(--blue-600, #2563eb)" : "1px solid var(--border, #cbd5e1)",
                  background: sourceType === "PO" ? "#eff6ff" : "#ffffff",
                  color: sourceType === "PO" ? "#1d4ed8" : "#334155",
                  fontWeight: 700,
                  fontSize: "12.5px",
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div>Purchase Order (PO)</div>
                <div style={{ fontSize: "10.5px", fontWeight: 500, opacity: 0.85, marginTop: "2px" }}>
                  Non-Kawasan Berikat ({poDocumentOptions.length})
                </div>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="bpbPickerDocNumber" className="master-form-label" style={{ marginBottom: "6px", display: "block" }}>
              2. {sourceType === "RN" ? "RN Number" : "PO Number"} <span className="required-asterisk">*</span>
            </label>
            <CustomSelect
              id="bpbPickerDocNumber"
              value={selectedDocNumber}
              onChange={(val) => {
                setSelectedDocNumber(val);
                setLoadedDocDetail(null);
              }}
              placeholder={sourceType === "RN" ? "Select Approved RN Number..." : "Select Approved Non-Berikat PO Number..."}
              options={[
                {
                  value: "",
                  label: sourceType === "RN" ? "Select Approved RN Number..." : "Select Approved Non-Berikat PO Number...",
                },
                ...currentDocOptions.map((o) => ({ value: o.value, label: o.label })),
              ]}
            />
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="item-picker-toolbar">
          <div style={{ flex: 1 }}>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Filter items by name, code, job number..."
            />
          </div>
          <div className="item-picker-actions-group">
            <button
              type="button"
              className="picker-btn picker-btn--select-all"
              onClick={() => setSelectedKeys(new Set(filteredItems.map((it) => it.key)))}
              disabled={filteredItems.length === 0}
            >
              Select All
            </button>
            <button
              type="button"
              className="picker-btn picker-btn--clear-all"
              onClick={() => setSelectedKeys(new Set())}
              disabled={selectedKeys.size === 0}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Step 3 Items Table */}
        <div className="item-picker-table-wrapper" style={{ maxHeight: "340px", overflowY: "auto" }}>
          <table className="data-table item-picker-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleAll}
                    disabled={filteredItems.length === 0}
                    aria-label="Select all items"
                  />
                </th>
                <th style={{ width: "50px", textAlign: "center" }}>No</th>
                <th>Item Name & Code</th>
                <th>PO Number</th>
                <th>Job Number</th>
                <th>Unit</th>
                <th style={{ textAlign: "right" }}>Available Qty</th>
              </tr>
            </thead>
            <tbody>
              {!selectedDocNumber ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "var(--muted)" }}>
                    Select a {sourceType === "RN" ? "Receive Note (RN)" : "Purchase Order (PO)"} number above to view its items.
                  </td>
                </tr>
              ) : isLoadingDetail && selectableItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "var(--muted)" }}>
                    Loading items for {selectedDocNumber}...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: "36px 16px", color: "var(--muted)" }}>
                    No items found for {selectedDocNumber}.
                  </td>
                </tr>
              ) : (
                filteredItems.map((it, idx) => {
                  const checked = selectedKeys.has(it.key);
                  return (
                    <tr
                      key={it.key}
                      onClick={() => handleToggleItem(it.key)}
                      style={{ cursor: "pointer" }}
                    >
                      <td style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleToggleItem(it.key)}
                          aria-label={`Select ${it.name}`}
                        />
                      </td>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 700 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{it.name}</div>
                        <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "monospace" }}>
                          {it.code}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{it.poNumber}</td>
                      <td>{it.jobNumber}</td>
                      <td>{it.unit}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {it.orderedQty.toLocaleString("en-US", { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="item-picker-footer">
          <div style={{ fontSize: "12.5px", color: "var(--muted)", fontWeight: 600 }}>
            {selectedKeys.size} item{selectedKeys.size === 1 ? "" : "s"} selected
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirm}
              disabled={!selectedDocNumber || selectedKeys.size === 0}
            >
              Add Selected Items ({selectedKeys.size})
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

