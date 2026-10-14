import React, { useMemo, useState } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
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
      className="rn-picker-backdrop"
      onClick={handleResetAndClose}
      role="presentation"
    >
      <div
        className="rn-picker-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rn-picker-title"
      >
        {/* Header */}
        <div className="rn-picker-header">
          <h2 id="rn-picker-title" className="rn-picker-title">
            Pick Purchase Order Item
          </h2>
          <button
            type="button"
            className="rn-picker-close-btn"
            onClick={handleResetAndClose}
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Search Toolbar */}
        <div className="rn-picker-toolbar">
          <div className="rn-picker-search">
            <SearchField
              value={search}
              onChange={(val) => setSearch(val)}
              placeholder="Search..."
            />
          </div>
        </div>

        {/* Table Container */}
        <div className="rn-picker-table-wrapper">
          <table className="rn-picker-table">
            <thead>
              <tr>
                <th className="rn-picker-th-check">
                  <input
                    type="checkbox"
                    className="rn-checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    disabled={filteredItems.length === 0}
                    aria-label="Select all items"
                  />
                </th>
                <th>Job Number</th>
                <th>PO Number</th>
                <th>PO Number Alias</th>
                <th>Remark</th>
                <th>Item Name</th>
                <th>Unit</th>
                <th className="text-right">PO Qty</th>
                <th className="text-right">RN Qty</th>
                <th className="text-right">Remain Qty</th>
                <th className="text-right">Unit Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="rn-picker-empty">
                    No data available in table
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isChecked = selectedIds.has(item.id);
                  return (
                    <tr
                      key={item.id}
                      className={isChecked ? "rn-picker-row--selected" : ""}
                      onClick={() => handleToggleRow(item.id)}
                    >
                      <td
                        className="rn-picker-td-check"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          className="rn-checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRow(item.id)}
                          aria-label={`Select ${item.itemName}`}
                        />
                      </td>
                      <td className="font-mono text-xs">{item.jobNumber}</td>
                      <td className="font-medium text-ink">{item.poNumber}</td>
                      <td className="text-secondary text-xs">{item.poNumberAlias}</td>
                      <td>{item.remark || "-"}</td>
                      <td className="font-medium">
                        {item.itemName}
                        <div className="text-xs text-muted font-mono">{item.itemCode}</div>
                      </td>
                      <td>{item.unit}</td>
                      <td className="text-right font-mono">
                        {item.poQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono">
                        {item.rnQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono text-primary font-medium">
                        {item.remainQty.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="text-right font-mono">
                        {item.unitPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Area */}
        <div className="rn-picker-footer">
          <div className="rn-picker-count">
            Showing {filteredItems.length === 0 ? 0 : 1} to {filteredItems.length} of{" "}
            {filteredItems.length} entries
          </div>
          <div className="rn-picker-actions">
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

export default PickPoItemModal;
