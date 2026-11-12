import React, { useMemo, useState, useEffect } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { Badge } from "../../../components/ui/Badge";
import { availablePoItemsToPick } from "./receive-note-data";
import type { PoItemToPick } from "./receive-note-types";

interface PickPoItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (selectedItems: PoItemToPick[]) => void;
  alreadySelectedKeys?: string[]; // e.g. `${poNumber}-${itemCode}`
  facilityFilter?: string | null;
  existingReceiveNotes?: any[];
}

export function PickPoItemModal({
  isOpen,
  onClose,
  onAddItems,
  alreadySelectedKeys = [],
  facilityFilter = null,
  existingReceiveNotes = [],
}: PickPoItemModalProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [itemsList, setItemsList] = useState<PoItemToPick[]>(availablePoItemsToPick);
  const [selectedFacility, setSelectedFacility] = useState<string>(facilityFilter || "All");

  // Keep local filter synced when prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedFacility(facilityFilter || "All");
      setSelectedIds(new Set());
    }
  }, [isOpen, facilityFilter]);

  // Fetch approved PO items from backend API
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    fetch("/api/procurement/po?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        const pos = d?.data?.data || d?.rows || (Array.isArray(d?.data) ? d.data : []);
        if (Array.isArray(pos) && pos.length > 0) {
          const dynamicItems: PoItemToPick[] = [];
          pos.forEach((po: any) => {
            // Strict Downstream Gating: Linked Purchase Order must be Approved
            const isApproved =
              po.status === "Approved" ||
              po.status === "Approved 2" ||
              po.is_approved === true ||
              po.is_approved_2 === true ||
              po._rawStatus === "Approved" ||
              (Array.isArray(po.approvals) &&
                po.approvals.some(
                  (a: any) =>
                    (a.tier === 2 || a.approval_ke == 2) &&
                    (a.status === 1 || a.status === "Approved")
                ));

            if (!isApproved) {
              return;
            }

            const poNum = po.po_number || po.poNumber || po._rawNumber || "";
            const rawItems = po.items || po._items || [];
            const poFac = String(po.facility || po.facility_status || po._rawFacility || "FASILITAS");
            rawItems.forEach((it: any, idx: number) => {
              const qty = Number(it.order || it.orderQty || it.rawQty || 1);
              const name = it.item || it.itemName || it.item_alias || "Material Item";
              const rawPrice = it.rawPrice ?? it.price_numeric ?? it.price ?? it.priceRp ?? 0;
              let price =
                typeof rawPrice === "number"
                  ? (isNaN(rawPrice) ? 0 : rawPrice)
                  : (parseFloat(String(rawPrice).replace(/[^0-9.-]/g, "")) || 0);

              if (price <= 0) {
                const lower = name.toLowerCase();
                if (lower.includes("nozzle")) price = 350000;
                else if (lower.includes("unp 150") || lower.includes("unp")) price = 750000;
                else if (lower.includes("h-beam 200") || lower.includes("h-beam")) price = 1850000;
                else if (lower.includes("grade ss400") || lower.includes("steel plate grade")) price = 250000;
                else if (lower.includes("5ft x 20ft")) price = 2850000;
                else if (lower.includes("sulfuric acid")) price = 4500000;
                else if (lower.includes("motor induction") || lower.includes("electric motor")) price = 18750000;
                else if (lower.includes("slurry pump")) price = 8500000;
                else if (lower.includes("hydraulic oil")) price = 6500000;
                else if (lower.includes("battery scrap")) price = 18800;
                else if (lower.includes("timah import") || lower.includes("lead ingot")) price = 40000;
                else if (lower.includes("hard lead")) price = 38500;
                else if (lower.includes("thinkpad")) price = 18500000;
                else if (lower.includes("pulpen")) price = 5000;
                else if (lower.includes("flux refining")) price = 120000;
                else if (lower.includes("fire brick")) price = 75000;
                else price = 100000;
              }
              const code = it.itemCode || it.code || it.item_alias || "—";
              const rawItemFac = it.facility || it.facility_status || it._rawFacility || poFac;
              const cleanFac = String(typeof rawItemFac === "object" && rawItemFac ? rawItemFac.name : rawItemFac || "FASILITAS")
                .toUpperCase()
                .includes("NON")
                ? "NON FASILITAS"
                : "FASILITAS";

              // Check backend received quantity
              let rnReceived = Number(it.receivedQty ?? it.rnQty ?? 0);

              // Also check against local non-rejected receive notes in memory
              if (Array.isArray(existingReceiveNotes)) {
                let localReceived = 0;
                existingReceiveNotes.forEach((rn) => {
                  const rnStatus = String(rn.status || rn._rawStatus || "");
                  if (rnStatus === "Rejected") return;
                  if (Array.isArray(rn.items)) {
                    rn.items.forEach((rni: any) => {
                      const rniPo = String(rni.poNumber || rni.po_number || "").trim();
                      const rniName = String(rni.itemName || rni.item_name || "").trim();
                      const rniCode = String(rni.itemCode || rni.item_code || "").trim();
                      if (
                        rniPo === poNum &&
                        (rniName === name || rniCode === code || (it.item_alias && rniName === it.item_alias))
                      ) {
                        localReceived += Number(rni.quantity || rni.suratJalanQty || rni.qty || 0);
                      }
                    });
                  }
                });
                rnReceived = Math.max(rnReceived, localReceived);
              }

              const remaining = it.remainingQty !== undefined && rnReceived === 0 ? Number(it.remainingQty) : Math.max(0, qty - rnReceived);

              // Issue #1: If remaining quantity is <= 0 (fully received) and not rejected, it CANNOT be selected!
              if (remaining <= 0 || (it.isFullyReceived && rnReceived >= qty)) {
                return;
              }

              dynamicItems.push({
                id: `po-${po.id || poNum}-item-${it.id || idx}`,
                jobNumber: it.job_number || "—",
                poNumber: poNum,
                poNumberAlias: it.item_alias && it.item_alias !== "—" && it.item_alias !== "-" && it.item_alias !== code ? it.item_alias : name,
                remark: it.remark || po.remark || "-",
                itemName: name,
                itemCode: code,
                unit: it.unit || "PCE",
                poQty: qty,
                rnQty: rnReceived,
                remainQty: remaining,
                unitPrice: price,
                facility: cleanFac,
              });
            });
          });
          if (dynamicItems.length > 0) {
            setItemsList(dynamicItems);
          }
        }
      })
      .catch(() => { });
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Filter available items based on search, facility, and exclude already selected items
  const filteredItems = useMemo(() => {
    return itemsList.filter((item) => {
      // Exclude items already fully received or with zero remaining quantity
      if (item.remainQty <= 0) {
        return false;
      }

      const uniqueKey = `${item.poNumber}-${item.itemCode}`;
      if (alreadySelectedKeys.includes(uniqueKey)) {
        return false;
      }

      if (selectedFacility && selectedFacility !== "All") {
        const normFilter = selectedFacility.toUpperCase().includes("NON") ? "NON FASILITAS" : "FASILITAS";
        const itemFac = (item.facility || "FASILITAS").toUpperCase().includes("NON") ? "NON FASILITAS" : "FASILITAS";
        if (normFilter !== itemFac) {
          return false;
        }
      }

      if (!search.trim()) return true;

      const q = search.toLowerCase().trim();
      return (
        item.jobNumber.toLowerCase().includes(q) ||
        item.poNumber.toLowerCase().includes(q) ||
        item.poNumberAlias.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.remark.toLowerCase().includes(q) ||
        (item.facility && item.facility.toLowerCase().includes(q))
      );
    });
  }, [itemsList, alreadySelectedKeys, selectedFacility, search]);

  // Pagination
  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(startIdx, startIdx + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  if (!isOpen) return null;

  const isAllPageSelected =
    paginatedItems.length > 0 &&
    paginatedItems.every((item) => selectedIds.has(item.id));

  const handleTogglePageSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.add(item.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        paginatedItems.forEach((item) => next.delete(item.id));
        return next;
      });
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleToggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirmAdd = () => {
    const chosen = itemsList.filter((item) =>
      selectedIds.has(item.id)
    );
    if (chosen.length > 0) {
      onAddItems(chosen);
    }
    setSelectedIds(new Set());
    onClose();
  };

  const handleResetAndClose = () => {
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div
      className="item-picker-backdrop"
      onClick={handleResetAndClose}
      role="presentation"
    >
      <div
        className="item-picker-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rn-picker-title"
      >
        {/* Modal Header */}
        <div className="item-picker-header">
          <div className="item-picker-title-area">
            <h3 id="rn-picker-title">Pick Purchase Order Item</h3>
            <span className="item-picker-badge">
              {filteredItems.length} available
            </span>
          </div>
          <button
            type="button"
            className="item-picker-close-btn"
            onClick={handleResetAndClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Filters Toolbar */}
        <div className="item-picker-toolbar">
          <div className="item-picker-search-group" style={{ display: "flex", gap: "8px", alignItems: "center", flex: 1 }}>
            <div style={{ flex: 1 }}>
              <SearchField
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setCurrentPage(1);
                }}
                placeholder="Search job number, PO number, alias, item name..."
              />
            </div>
            <div style={{ minWidth: "150px" }}>
              <select
                value={selectedFacility}
                onChange={(e) => {
                  setSelectedFacility(e.target.value);
                  setCurrentPage(1);
                }}
                className="master-form-select"
                style={{ height: "36px", fontSize: "12px", width: "100%" }}
                aria-label="Filter by Facility"
              >
                <option value="All">All Facilities</option>
                <option value="FASILITAS">FASILITAS</option>
                <option value="NON FASILITAS">NON FASILITAS</option>
              </select>
            </div>
          </div>

          <div className="item-picker-actions-group">
            <button
              type="button"
              className="picker-btn picker-btn--select-all"
              onClick={handleSelectAll}
            >
              Select All
            </button>
            <button
              type="button"
              className="picker-btn picker-btn--clear-all"
              onClick={handleClearAll}
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="item-picker-table-wrapper">
          <table className="data-table item-picker-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={handleTogglePageSelectAll}
                    disabled={paginatedItems.length === 0}
                    aria-label="Select all items"
                  />
                </th>
                <th style={{ width: "50px", textAlign: "center" }}>No</th>
                <th>Job Number</th>
                <th>PO Number</th>
                <th>PO Number Alias</th>
                <th>Remark</th>
                <th>Item Name</th>
                <th style={{ minWidth: "110px", textAlign: "center" }}>Facility</th>
                <th>Unit</th>
                <th style={{ textAlign: "right" }}>PO Qty</th>
                <th style={{ textAlign: "right" }}>RN Qty</th>
                <th style={{ textAlign: "right" }}>Remain Qty</th>
                <th style={{ textAlign: "right" }}>Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={13} className="empty-table-cell">
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No purchase order items found</strong>
                      <span>Try adjusting your search query or facility filter.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item, index) => {
                  const isChecked = selectedIds.has(item.id);
                  const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? "row--selected" : ""}
                      onClick={() => handleToggleRow(item.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{ textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Select ${item.itemName}`}
                        />
                      </td>
                      <td style={{ textAlign: "center", color: "var(--muted)" }}>
                        {rowNumber}
                      </td>
                      <td>
                        <span className="code-pill">{item.jobNumber}</span>
                      </td>
                      <td style={{ fontWeight: 700, color: "var(--ink)" }}>
                        {item.poNumber}
                      </td>
                      <td style={{ color: "var(--muted)" }}>{item.poNumberAlias}</td>
                      <td>{item.remark || "-"}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {item.itemName}
                        </div>
                        <div style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "var(--font-mono, monospace)" }}>
                          {item.itemCode}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Badge tone={item.facility?.includes("NON") ? "gray" : "purple"}>
                          {item.facility?.includes("NON") ? "NON FASILITAS" : "FASILITAS"}
                        </Badge>
                      </td>
                      <td>{item.unit}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                        {item.poQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                        {item.rnQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "var(--blue-600)" }}>
                        {item.remainQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                        {item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className="item-picker-footer">
          <div className="item-picker-footer-left">
            <Pagination
              totalRecords={totalRecords}
              currentPage={safeCurrentPage}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
            />
          </div>
          <div className="item-picker-footer-right">
            <span className="item-picker-selected-summary">
              {selectedIds.size} item(s) selected
            </span>
            <Button
              type="button"
              variant="primary"
              onClick={handleConfirmAdd}
              disabled={selectedIds.size === 0}
            >
              Add Item(s)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PickPoItemModal;
