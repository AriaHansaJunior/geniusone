import React, { useMemo, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { availablePoItemsToPick } from "./receive-note-data";
import type { PoItemToPick } from "./receive-note-types";

interface PickPoItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (selectedItems: PoItemToPick[]) => void;
  alreadySelectedKeys?: string[]; // e.g. `${poNumber}-${itemCode}`
}

export function PickPoItemModal({
  isOpen,
  onClose,
  onAddItems,
  alreadySelectedKeys = [],
}: PickPoItemModalProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter available items based on search and exclude already selected items
  const filteredItems = useMemo(() => {
    return availablePoItemsToPick.filter((item) => {
      const uniqueKey = `${item.poNumber}-${item.itemCode}`;
      if (alreadySelectedKeys.includes(uniqueKey)) {
        return false;
      }

      if (!search.trim()) return true;

      const q = search.toLowerCase().trim();
      return (
        item.jobNumber.toLowerCase().includes(q) ||
        item.poNumber.toLowerCase().includes(q) ||
        item.poNumberAlias.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.remark.toLowerCase().includes(q)
      );
    });
  }, [alreadySelectedKeys, search]);

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
    const chosen = availablePoItemsToPick.filter((item) =>
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
          <div className="item-picker-search-group">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search job number, PO number, alias, item name..."
            />
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
                  <td colSpan={12} className="empty-table-cell">
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No purchase order items found</strong>
                      <span>Try adjusting your search query.</span>
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
