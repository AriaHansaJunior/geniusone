import React, { useMemo, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
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

  if (!isOpen) return null;

  const isAllSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => selectedIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((item) => item.id)));
    }
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
      className="rnr-picker-backdrop"
      onClick={handleResetAndClose}
      role="presentation"
    >
      <div
        className="rnr-picker-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rnr-picker-title"
      >
        {/* Header */}
        <div className="rnr-picker-header">
          <h2 id="rnr-picker-title" className="rnr-picker-title">
            Pick Sales Return Item
          </h2>
          <button
            type="button"
            className="rnr-picker-close-btn"
            onClick={handleResetAndClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="rnr-picker-toolbar">
          <div className="rnr-picker-search">
            <SearchField
              value={search}
              onChange={(val) => setSearch(val)}
              placeholder="Search DO, SJ, item name, code..."
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="rnr-picker-table-wrapper">
          <table className="rnr-picker-table">
            <thead>
              <tr>
                <th className="rnr-picker-th-check">
                  <input
                    type="checkbox"
                    className="rnr-checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    disabled={filteredItems.length === 0}
                    aria-label="Select all items"
                  />
                </th>
                <th>DO Number</th>
                <th>SJ Number</th>
                <th>Item Name</th>
                <th>Unit</th>
                <th className="text-right">Price</th>
                <th className="text-right">Delivery Qty</th>
                <th className="text-right">Available Return Qty</th>
                <th>Package Type</th>
                <th className="text-right">Package Qty</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="rnr-picker-empty">
                    No data available in table
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? "rnr-picker-row--selected" : ""}
                      onClick={() => handleToggleRow(item.id)}
                    >
                      <td
                        className="rnr-picker-td-check"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rnr-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Select ${item.itemName}`}
                        />
                      </td>
                      <td className="font-medium text-ink">{item.doNumber}</td>
                      <td className="text-secondary text-xs">{item.sjNumber}</td>
                      <td>
                        <div className="font-medium text-ink">{item.itemName}</div>
                        <div className="text-xs text-muted font-mono">{item.itemCode}</div>
                      </td>
                      <td>{item.unit}</td>
                      <td className="text-right font-mono">
                        {item.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono">
                        {item.deliveryQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono text-primary font-medium">
                        {item.availableReturnQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td>{item.packageType}</td>
                      <td className="text-right font-mono">{item.packageQty}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Area */}
        <div className="rnr-picker-footer">
          <div className="rnr-picker-count">
            Showing {filteredItems.length === 0 ? 0 : 1} to {filteredItems.length} of{" "}
            {filteredItems.length} entries
          </div>
          <div className="rnr-picker-actions">
            <Button
              type="button"
              variant="primary"
              icon="plus"
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
