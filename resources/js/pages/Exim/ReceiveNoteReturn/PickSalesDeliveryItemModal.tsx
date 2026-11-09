import React, { useMemo, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { availableSalesReturnItemsToPick } from "./receive-note-return-data";
import type { SalesReturnItemToPick } from "./receive-note-return-types";

interface PickSalesDeliveryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (selectedItems: SalesReturnItemToPick[]) => void;
  alreadySelectedKeys?: string[]; // e.g. `${doNumber}-${itemCode}`
}

export function PickSalesDeliveryItemModal({
  isOpen,
  onClose,
  onAddItems,
  alreadySelectedKeys = [],
}: PickSalesDeliveryItemModalProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter items based on search and exclude already selected keys
  const filteredItems = useMemo(() => {
    return availableSalesReturnItemsToPick.filter((item) => {
      const uniqueKey = `${item.doNumber}-${item.itemCode}`;
      if (alreadySelectedKeys.includes(uniqueKey)) {
        return false;
      }

      if (!search.trim()) return true;

      const q = search.toLowerCase().trim();
      return (
        item.doNumber.toLowerCase().includes(q) ||
        item.sjNumber.toLowerCase().includes(q) ||
        item.itemName.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.packageType.toLowerCase().includes(q)
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
    const chosen = availableSalesReturnItemsToPick.filter((item) =>
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
        aria-labelledby="rnr-picker-title"
      >
        {/* Modal Header */}
        <div className="item-picker-header">
          <div className="item-picker-title-area">
            <h3 id="rnr-picker-title">Pick Sales Return Item</h3>
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
              placeholder="Search DO, SJ, item name, code..."
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
                <th>DO Number</th>
                <th>SJ Number</th>
                <th>Item Name</th>
                <th>Unit</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Delivery Qty</th>
                <th style={{ textAlign: "right" }}>Available Return Qty</th>
                <th>Package Type</th>
                <th style={{ textAlign: "right" }}>Package Qty</th>
              </tr>
            </thead>
            <tbody>
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="empty-table-cell">
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No sales delivery items found</strong>
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
                        <span className="code-pill">{item.doNumber}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>{item.sjNumber}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{item.itemName}</div>
                        <div style={{ fontSize: "10.5px", color: "var(--muted)", fontFamily: "var(--font-mono, monospace)" }}>
                          {item.itemCode}
                        </div>
                      </td>
                      <td>{item.unit}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                        {item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                        {item.deliveryQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)", fontWeight: 700, color: "var(--blue-600)" }}>
                        {item.availableReturnQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td>{item.packageType}</td>
                      <td style={{ textAlign: "right", fontFamily: "var(--font-mono, monospace)" }}>
                        {item.packageQty}
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

export default PickSalesDeliveryItemModal;
