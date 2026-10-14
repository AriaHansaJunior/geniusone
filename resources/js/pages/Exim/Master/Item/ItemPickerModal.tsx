import React, { useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { itemCategories, itemClassifications } from "./item-data";
import type { ItemRecord } from "./item-types";

interface ItemPickerModalProps {
  isOpen: boolean;
  items: ItemRecord[];
  alreadySelectedCodes?: string[];
  onAddItems: (selectedItems: ItemRecord[]) => void;
  onClose: () => void;
}

export function ItemPickerModal({
  isOpen,
  items,
  alreadySelectedCodes = [],
  onAddItems,
  onClose,
}: ItemPickerModalProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [classification, setClassification] = useState("All Classifications");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Exclude already added items
      if (alreadySelectedCodes.includes(item.itemCode)) {
        return false;
      }

      if (category !== "All Categories" && item.category !== category) {
        return false;
      }

      if (
        classification !== "All Classifications" &&
        item.classification !== classification
      ) {
        return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q) ||
          (item.kodeEksternal && item.kodeEksternal.toLowerCase().includes(q)) ||
          item.classification.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [items, alreadySelectedCodes, category, classification, search]);

  // Pagination
  const totalRecords = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredItems.slice(startIdx, startIdx + pageSize);
  }, [filteredItems, safeCurrentPage, pageSize]);

  if (!isOpen) return null;

  // Toggle selection for a single row
  const handleToggleRow = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  // Select all filtered items
  const handleSelectAll = () => {
    const allCodes = new Set(filteredItems.map((item) => item.itemCode));
    setSelectedCodes(allCodes);
  };

  // Clear all selections
  const handleClearAll = () => {
    setSelectedCodes(new Set());
  };

  // Confirm adding selected items
  const handleConfirmAdd = () => {
    const chosenItems = items.filter((item) => selectedCodes.has(item.itemCode));
    onAddItems(chosenItems);
    setSelectedCodes(new Set());
    onClose();
  };

  return (
    <div className="item-picker-backdrop" onClick={onClose}>
      <div
        className="item-picker-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="item-picker-title"
      >
        {/* Modal Header */}
        <div className="item-picker-header">
          <div className="item-picker-title-area">
            <h3 id="item-picker-title">Pick Item</h3>
            <span className="item-picker-badge">
              {filteredItems.length} available
            </span>
          </div>
          <button
            type="button"
            className="item-picker-close-btn"
            onClick={onClose}
            aria-label="Close picker"
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
              placeholder="Search code, external code, name..."
            />

            <select
              className="item-picker-select"
              value={classification}
              onChange={(e) => {
                setClassification(e.target.value);
                setCurrentPage(1);
              }}
            >
              {itemClassifications.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            <select
              className="item-picker-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrentPage(1);
              }}
            >
              {itemCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
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

        {/* Items Table Container */}
        <div className="item-picker-table-wrapper">
          <table className="data-table item-picker-table">
            <thead>
              <tr>
                <th style={{ width: "40px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={
                      paginatedItems.length > 0 &&
                      paginatedItems.every((item) =>
                        selectedCodes.has(item.itemCode)
                      )
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedCodes((prev) => {
                          const next = new Set(prev);
                          paginatedItems.forEach((i) => next.add(i.itemCode));
                          return next;
                        });
                      } else {
                        setSelectedCodes((prev) => {
                          const next = new Set(prev);
                          paginatedItems.forEach((i) => next.delete(i.itemCode));
                          return next;
                        });
                      }
                    }}
                  />
                </th>
                <th style={{ width: "50px", textAlign: "center" }}>No</th>
                <th style={{ width: "135px" }}>Code</th>
                <th style={{ width: "120px" }}>External Code</th>
                <th style={{ minWidth: "220px" }}>Item Name</th>
                <th style={{ width: "75px" }}>Unit</th>
                <th style={{ width: "110px" }}>Category</th>
                <th style={{ width: "160px" }}>Classification</th>
                <th style={{ width: "100px" }}>Brand</th>
                <th style={{ width: "120px" }}>Fas / Non Fas</th>
                <th style={{ width: "140px", textAlign: "right" }}>Stock</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item, index) => {
                  const isChecked = selectedCodes.has(item.itemCode);
                  const rowNumber =
                    (safeCurrentPage - 1) * pageSize + index + 1;
                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? "row--selected" : ""}
                      onClick={() => handleToggleRow(item.itemCode)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{ textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.itemCode)}
                        />
                      </td>
                      <td style={{ textAlign: "center", color: "var(--muted)" }}>
                        {rowNumber}
                      </td>
                      <td>
                        <span className="code-pill">{item.itemCode}</span>
                      </td>
                      <td>{item.kodeEksternal || "-"}</td>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {item.itemName}
                      </td>
                      <td>{item.smallestUnitCode}</td>
                      <td>{item.category || "-"}</td>
                      <td>{item.classification}</td>
                      <td>{item.brand}</td>
                      <td>
                        <span
                          className={`badge ${
                            item.facility === "FASILITAS"
                              ? "badge--purple"
                              : "badge--gray"
                          }`}
                        >
                          {item.facility}
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--font-mono, monospace)",
                          fontWeight: 700,
                          color:
                            (item.stock || 0) > 0
                              ? "var(--green-700, #15803d)"
                              : "var(--muted)",
                        }}
                      >
                        {(item.stock || 0).toFixed(4)} {item.stockUnit || item.smallestUnitCode}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="empty-table-cell">
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No items found</strong>
                      <span>Try adjusting search filters.</span>
                    </div>
                  </td>
                </tr>
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
              {selectedCodes.size} item(s) selected
            </span>
            <Button
              variant="primary"
              icon="plus"
              disabled={selectedCodes.size === 0}
              onClick={handleConfirmAdd}
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
