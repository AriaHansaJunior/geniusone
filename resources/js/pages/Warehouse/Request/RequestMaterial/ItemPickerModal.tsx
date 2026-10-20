import React, { useState, useMemo } from "react";
import { Icon } from "../../../../components/ui/Icon";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { initialItemRecords } from "../../../Exim/Master/Item/item-data";
import type { ItemRecord } from "../../../Exim/Master/Item/item-types";

interface ItemPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItems: (items: ItemRecord[]) => void;
}

export function ItemPickerModal({ isOpen, onClose, onSelectItems }: ItemPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

  if (!isOpen) return null;

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const handleConfirm = () => {
    const selected = initialItemRecords.filter((i) => selectedIds.includes(i.id));
    onSelectItems(selected);
    setSelectedIds([]);
    onClose();
  };

  return (
    <div className="master-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="master-modal-content"
        style={{ width: "760px", maxWidth: "95vw" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="master-modal-header">
          <div>
            <h3 className="master-modal-title">Select Item Material</h3>
            <span style={{ fontSize: "11px", color: "var(--muted)" }}>
              Upload item base on Item Material catalog
            </span>
          </div>
          <button
            type="button"
            className="master-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="master-modal-body" style={{ padding: "16px 20px" }}>
          <div style={{ marginBottom: "12px" }}>
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by item code, name, or classification..."
            />
          </div>

          <div
            className="table-scroll"
            style={{ maxHeight: "360px", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}
          >
            <table className="data-table" style={{ fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ width: "40px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      aria-label="Select all"
                      checked={
                        filteredItems.length > 0 &&
                        selectedIds.length === filteredItems.length
                      }
                      onChange={handleSelectAll}
                      style={{ accentColor: "var(--blue-600)", cursor: "pointer" }}
                    />
                  </th>
                  <th style={{ minWidth: "130px" }}>Item Code</th>
                  <th style={{ minWidth: "220px" }}>Item Name</th>
                  <th style={{ minWidth: "140px" }}>Classification</th>
                  <th style={{ minWidth: "80px", textAlign: "center" }}>Unit</th>
                  <th style={{ minWidth: "90px", textAlign: "right" }}>Stock</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isChecked = selectedIds.includes(item.id);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => handleToggleSelect(item.id)}
                        style={{
                          cursor: "pointer",
                          background: isChecked ? "var(--blue-50)" : undefined,
                        }}
                      >
                        <td
                          style={{ textAlign: "center" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(item.id)}
                            style={{ accentColor: "var(--blue-600)", cursor: "pointer" }}
                          />
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
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          {(item.stock ?? 15).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: "30px 16px" }}>
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No matching materials found</strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", fontSize: "12px", color: "var(--muted)" }}>
            <span>{selectedIds.length} item(s) selected</span>
            <span>Total: {filteredItems.length} items</span>
          </div>
        </div>

        {/* Footer */}
        <div className="master-modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={selectedIds.length === 0}
            onClick={handleConfirm}
          >
            Add Selected Items ({selectedIds.length})
          </Button>
        </div>
      </div>
    </div>
  );
}
