import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../../../../components/ui/Icon";
import type { ItemColumnConfig, ItemColumnKey } from "./item-types";

interface ColumnSettingsPanelProps {
  isOpen: boolean;
  columns: ItemColumnConfig[];
  onToggleColumn: (key: ItemColumnKey) => void;
  onResetDefault: () => void;
  onClose: () => void;
}

export function ColumnSettingsPanel({
  isOpen,
  columns,
  onToggleColumn,
  onResetDefault,
  onClose,
}: ColumnSettingsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const visibleCount = columns.filter((c) => c.visible).length;

  const filteredColumns = columns.filter((col) =>
    col.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div className="column-settings-panel" ref={panelRef}>
      {/* Panel Header */}
      <div className="column-settings-header">
        <div>
          <div className="column-settings-title-row">
            <h4 className="column-settings-title">Column Settings</h4>
            <span className="column-settings-counter">
              {visibleCount} of {columns.length} visible
            </span>
          </div>
          <p className="column-settings-desc">
            Choose which columns appear in the table. Changes apply immediately.
          </p>
        </div>
        <button
          type="button"
          className="column-settings-close-btn"
          onClick={onClose}
          aria-label="Close column settings"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      {/* Column Search Filter */}
      <div className="column-settings-search">
        <Icon name="search" size={14} />
        <input
          type="text"
          placeholder="Filter columns..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoFocus
        />
        {searchTerm && (
          <button
            type="button"
            className="clear-search-btn"
            onClick={() => setSearchTerm("")}
          >
            ×
          </button>
        )}
      </div>

      {/* Bounded Scrollable Column List */}
      <div className="column-settings-list">
        {filteredColumns.length > 0 ? (
          filteredColumns.map((col) => (
            <label key={col.key} className="column-settings-item">
              <input
                type="checkbox"
                checked={col.visible}
                onChange={() => onToggleColumn(col.key)}
              />
              <span className="column-settings-label">{col.label}</span>
            </label>
          ))
        ) : (
          <div className="column-settings-empty">
            No columns match "{searchTerm}"
          </div>
        )}
      </div>

      {/* Panel Footer */}
      <div className="column-settings-footer">
        <button
          type="button"
          className="column-settings-reset-btn"
          onClick={onResetDefault}
        >
          Reset to Default
        </button>
        <button
          type="button"
          className="column-settings-done-btn"
          onClick={onClose}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export default ColumnSettingsPanel;
