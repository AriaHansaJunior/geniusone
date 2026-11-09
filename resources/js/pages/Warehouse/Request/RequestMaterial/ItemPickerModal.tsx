import React, { useState, useMemo } from "react";
import { Icon } from "../../../../components/ui/Icon";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { initialItemRecords } from "../../../Exim/Master/Item/item-data";
import type { ItemRecord } from "../../../Exim/Master/Item/item-types";

interface ItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (items: ItemRecord[]) => void;
}

export function ItemPickerModal({ isOpen, onClose, onSelectItems }: ItemPickerModalProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!search.trim()) return initialItemRecords;
    const query = search.toLowerCase().trim();
    return initialItemRecords.filter(
      (item) =>
        item.itemCode.toLowerCase().includes(query) ||
        item.itemName.toLowerCase().includes(query) ||
        item.classification.toLowerCase().includes(query)
    );
  }, [search]);

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

  const handleToggleSelect = (id: string) => {
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

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredItems.map((i) => i.id)));
  };

  const handleClearAll = () => {
    setSelectedIds(new Set());
  };

  const handleConfirm = () => {
    const selected = initialItemRecords.filter((i) => selectedIds.has(i.id));
    onSelectItems(selected);
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <div className="item-picker-backdrop" onClick={onClose} role="presentation">
      <div
        className="item-picker-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wh-item-picker-title"
      >
        {/* Header */}
        <div className="item-picker-header">
          <div className="item-picker-title-area">
            <h3 id="wh-item-picker-title">Select Item Material</h3>
            <span className="item-picker-badge">
              {filteredItems.length} available
            </span>
          </div>
          <button
            type="button"
            className="item-picker-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="item-picker-toolbar">
          <div className="item-picker-search-group">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search by item code, name, or classification..."
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
                    aria-label="Select all"
                    checked={isAllPageSelected}
                    onChange={handleTogglePageSelectAll}
                    disabled={paginatedItems.length === 0}
                  />
                </th>
                <th style={{ width: "50px", textAlign: "center" }}>No</th>
                <th style={{ minWidth: "130px" }}>Item Code</th>
                <th style={{ minWidth: "220px" }}>Item Name</th>
                <th style={{ minWidth: "140px" }}>Classification</th>
                <th style={{ minWidth: "80px", textAlign: "center" }}>Unit</th>
                <th style={{ minWidth: "90px", textAlign: "right" }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const isChecked = selectedIds.has(item.id);
                  const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? "row--selected" : ""}
                      onClick={() => handleToggleSelect(item.id)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{ textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(item.id)}
                        />
                      </td>
                      <td style={{ textAlign: "center", color: "var(--muted)" }}>
                        {rowNumber}
                      </td>
                      <td>
                        <span className="code-pill">{item.itemCode}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {item.itemName}
                      </td>
                      <td>{item.classification}</td>
                      <td style={{ textAlign: "center" }}>
                        {item.smallestUnitCode || "PCE"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 700 }}>
                        {(item.stock ?? 15).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="empty-table-cell">
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No matching materials found</strong>
                      <span>Try adjusting search filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
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
              disabled={selectedIds.size === 0}
              onClick={handleConfirm}
            >
              Add Item(s)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
export default ItemPickerModal;
