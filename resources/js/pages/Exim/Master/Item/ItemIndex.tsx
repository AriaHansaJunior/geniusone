import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { Pagination } from "../../../../components/ui/Pagination";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { useAuthPermission } from "../../../../context/AuthPermissionContext";
import { ColumnSettingsPanel } from "./ColumnSettingsPanel";
import {
  initialItemRecords,
  defaultItemColumns,
  itemCategories,
  itemClassifications,
} from "./item-data";
import type {
  ItemRecord,
  ItemColumnConfig,
  ItemColumnKey,
} from "./item-types";

interface ItemIndexProps {
  records?: ItemRecord[];
  onAddNew: () => void;
  onGenerateQr: () => void;
  onEdit?: (record: ItemRecord) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

type SortDirection = "none" | "asc" | "desc";

// Helper for defensive string extraction
const safeStr = (val: any, fallback = "-"): string => {
  if (val === null || val === undefined || val === "") return fallback;
  if (typeof val === "object") return val.name || val.code || fallback;
  return String(val);
};

export function ItemIndex({
  records = initialItemRecords,
  onAddNew,
  onGenerateQr,
  onEdit,
  onDelete,
  onToggleStatus,
}: ItemIndexProps) {
  const { can, currentUser } = useAuthPermission();
  const canCreateMasterItem = can("master_item", "create");
  const canUpdateMasterItem = can("master_item", "update");
  const canDeleteMasterItem = can("master_item", "delete");

  const [localRecords, setLocalRecords] = useState<ItemRecord[]>(records);
  const [columns, setColumns] = useState<ItemColumnConfig[]>(defaultItemColumns);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Categories");
  const [classification, setClassification] = useState("All Classifications");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<string>("itemCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [itemToDelete, setItemToDelete] = useState<ItemRecord | null>(null);
  const [itemToEdit, setItemToEdit] = useState<ItemRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Column visibility handlers
  const handleToggleColumn = (key: ItemColumnKey) => {
    setColumns((prev) =>
      prev.map((col) => (col.key === key ? { ...col, visible: !col.visible } : col))
    );
  };

  const handleResetDefaultColumns = () => {
    setColumns(defaultItemColumns);
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return localRecords.filter((item) => {
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
        const matchCode = safeStr(item.itemCode, "").toLowerCase().includes(q);
        const matchName = safeStr(item.itemName, "").toLowerCase().includes(q);
        const matchExt = safeStr(item.kodeEksternal, "").toLowerCase().includes(q);
        const matchBrand = safeStr(item.brand, "").toLowerCase().includes(q);
        const matchHs = safeStr(item.hsCode, "").toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchExt && !matchBrand && !matchHs) {
          return false;
        }
      }
      return true;
    });
  }, [localRecords, category, classification, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal = String((a as any)[sortField] || "").toLowerCase();
      const bVal = String((b as any)[sortField] || "").toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Toggle sorting
  const handleToggleSort = (fieldKey: string) => {
    if (sortField === fieldKey) {
      if (sortDirection === "none") setSortDirection("asc");
      else if (sortDirection === "asc") setSortDirection("desc");
      else setSortDirection("none");
    } else {
      setSortField(fieldKey);
      setSortDirection("asc");
    }
  };

  // Row selection
  const handleToggleSelectAllCurrentPage = () => {
    const pageCodes = paginatedRecords.map((r) => r.itemCode);
    const allSelected = pageCodes.every((c) => selectedCodes.has(c));

    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageCodes.forEach((c) => next.delete(c));
      } else {
        pageCodes.forEach((c) => next.add(c));
      }
      return next;
    });
  };

  const handleToggleRowSelect = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Delete
  const handleConfirmDelete = () => {
    if (!itemToDelete) return;
    const idToDelete = itemToDelete.id;
    setLocalRecords((prev) => prev.filter((i) => i.id !== idToDelete));
    if (onDelete) onDelete(idToDelete);
    setItemToDelete(null);
  };

  // Export to Excel (CSV with UTF-8 BOM)
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const visibleCols = columns.filter((c) => c.visible && c.key !== "option");
      const headers = ["No", ...visibleCols.map((c) => c.label)];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values: any[] = [index + 1];
        visibleCols.forEach((col) => {
          let val = "";
          if (col.key === "smallestUnit") {
            val = `${row.smallestUnitCode} / ${row.smallestUnitName}`;
          } else if (col.key === "greatestUnit") {
            val = `${row.greatestUnitCode} / ${row.greatestUnitName}`;
          } else if (col.key === "traceByLot") {
            val = row.traceByLot ? "Yes" : "No";
          } else {
            val = String((row as any)[col.key] ?? "-");
          }
          values.push(`"${val.replace(/"/g, '""')}"`);
        });
        csvRows.push(values.join(","));
      });

      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Master_Item_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${sortedRecords.length} item(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Render sorting indicator
  const renderSortIndicator = (field: string) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`master-sort-indicator ${
          isActive ? "master-sort-indicator--active" : ""
        }`}
      >
        {isActive ? (
          sortDirection === "asc" ? (
            <Icon name="arrowUp" size={12} />
          ) : (
            <Icon name="arrowDown" size={12} />
          )
        ) : (
          <Icon name="arrowUpDown" size={12} />
        )}
      </span>
    );
  };

  // Check if all on current page are selected
  const isAllCurrentPageSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((r) => selectedCodes.has(r.itemCode));

  const startEntry = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  // Active visible columns map for quick check
  const visibleMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    columns.forEach((c) => {
      map[c.key] = c.visible;
    });
    return map;
  }, [columns]);

  return (
    <div className="item-page">
      {/* Export notification notice */}
      {exportNotice && (
        <div className="department-alert department-alert--info">
          <Icon name="check" size={15} />
          <div className="department-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="department-alert-close"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="item-table-panel panel">
        {/* Table Toolbar */}
        <div className="item-toolbar">
          <div className="item-toolbar-left">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search item code, name, ext..."
            />

            <CustomSelect
              className="item-select-filter"
              searchable
              value={category}
              onChange={(val) => {
                setCategory(val);
                setCurrentPage(1);
              }}
              options={itemCategories.map((cat) => ({
                value: cat,
                label: cat === "All Categories" ? "Category: All" : cat,
              }))}
            />

            <CustomSelect
              className="item-select-filter"
              searchable
              value={classification}
              onChange={(val) => {
                setClassification(val);
                setCurrentPage(1);
              }}
              options={itemClassifications.map((cls) => ({
                value: cls,
                label: cls === "All Classifications" ? "Classification: All" : cls,
              }))}
            />
          </div>

          <div className="item-toolbar-right master-toolbar-actions">
            {/* Positive Green Utility Button for Generate QR Code */}
            <button
              type="button"
              className="btn-qr-utility"
              onClick={onGenerateQr}
              title="Generate and print standardized customs QR labels"
            >
              <span>Generate QR Code</span>
            </button>

            {canCreateMasterItem ? (
              <Button variant="primary" onClick={onAddNew}>
                Add New
              </Button>
            ) : (
              <span
                className="master-view-only-pill"
                title={`Role '${currentUser?.role || "User"}' has View-Only access to Master Item`}
              >
                View Only ({currentUser?.role_label || currentUser?.role || "Role"})
              </span>
            )}

            <Button
              variant="excel"
              onClick={handleExportToExcel}
              title="Export filtered records to Excel-compatible CSV"
            >
              Export To Excel
            </Button>

            {/* Standard GeniusOne Table Column Settings Button */}
            <div className="master-relative">
              <button
                type="button"
                className={`item-column-btn ${isColumnSettingsOpen ? "active" : ""}`}
                onClick={() => setIsColumnSettingsOpen((prev) => !prev)}
                title="Table Column Settings"
                aria-label="Table column settings"
              >
                <Icon name="settings" size={16} />
                <Icon name="chevronDown" size={12} />
              </button>

              {/* Anchored Column Settings Popover */}
              <ColumnSettingsPanel
                isOpen={isColumnSettingsOpen}
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onResetDefault={handleResetDefaultColumns}
                onClose={() => setIsColumnSettingsOpen(false)}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Data Table Frame */}
        <div className="item-table-scroll">
          <table className="item-data-table data-table">
            <thead>
              <tr>
                {/* Row selection checkbox */}
                <th className="master-col-check">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleToggleSelectAllCurrentPage}
                    aria-label="Select all items on current page"
                  />
                </th>

                {/* No column */}
                <th className="master-col-no-sm">No</th>

                {visibleMap.itemCode && (
                  <th
                    className="sortable-th master-col-mw140"
                    onClick={() => handleToggleSort("itemCode")}
                  >
                    <span>Item Code</span>
                    {renderSortIndicator("itemCode")}
                  </th>
                )}

                {visibleMap.kodeEksternal && (
                  <th
                    className="sortable-th master-col-mw130"
                    onClick={() => handleToggleSort("kodeEksternal")}
                  >
                    <span>Kode Eksternal</span>
                    {renderSortIndicator("kodeEksternal")}
                  </th>
                )}

                {visibleMap.itemName && (
                  <th
                    className="sortable-th master-col-mw260"
                    onClick={() => handleToggleSort("itemName")}
                  >
                    <span>Item Name</span>
                    {renderSortIndicator("itemName")}
                  </th>
                )}

                {visibleMap.classification && (
                  <th
                    className="sortable-th master-col-mw180"
                    onClick={() => handleToggleSort("classification")}
                  >
                    <span>Classification</span>
                    {renderSortIndicator("classification")}
                  </th>
                )}

                {visibleMap.category && (
                  <th
                    className="sortable-th master-col-mw120"
                    onClick={() => handleToggleSort("category")}
                  >
                    <span>Category</span>
                    {renderSortIndicator("category")}
                  </th>
                )}

                {visibleMap.hsCode && (
                  <th
                    className="sortable-th master-col-mw120"
                    onClick={() => handleToggleSort("hsCode")}
                  >
                    <span>HS Code</span>
                    {renderSortIndicator("hsCode")}
                  </th>
                )}

                {visibleMap.smallestUnit && (
                  <th className="master-col-mw110">Smallest Unit</th>
                )}

                {visibleMap.greatestUnit && (
                  <th className="master-col-mw110">Greatest Unit</th>
                )}

                {visibleMap.facility && (
                  <th
                    className="sortable-th master-col-mw130"
                    onClick={() => handleToggleSort("facility")}
                  >
                    <span>Facility</span>
                    {renderSortIndicator("facility")}
                  </th>
                )}

                {visibleMap.groupScrap && (
                  <th className="master-col-mw120">Group Scrap</th>
                )}

                {visibleMap.specification && (
                  <th className="master-col-mw140">Specification</th>
                )}

                {visibleMap.origin && (
                  <th className="master-col-mw100">Origin</th>
                )}

                {visibleMap.colour && (
                  <th className="master-col-mw100">Colour</th>
                )}

                {visibleMap.brand && (
                  <th
                    className="sortable-th master-col-mw120"
                    onClick={() => handleToggleSort("brand")}
                  >
                    <span>Brand</span>
                    {renderSortIndicator("brand")}
                  </th>
                )}

                {visibleMap.style && (
                  <th className="master-col-mw110">Style</th>
                )}

                {visibleMap.customReport && (
                  <th className="master-col-mw140">Custom Report</th>
                )}

                {visibleMap.traceByLot && (
                  <th
                    className="sortable-th master-col-lot"
                    onClick={() => handleToggleSort("traceByLot")}
                  >
                    <span>Trace By Lot</span>
                    {renderSortIndicator("traceByLot")}
                  </th>
                )}

                {visibleMap.status && (
                  <th
                    className="sortable-th master-col-status-mw"
                    onClick={() => handleToggleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                )}

                {visibleMap.createdAt && (
                  <th
                    className="sortable-th master-col-mw160"
                    onClick={() => handleToggleSort("createdAt")}
                  >
                    <span>Created at</span>
                    {renderSortIndicator("createdAt")}
                  </th>
                )}

                {visibleMap.updatedAt && (
                  <th
                    className="sortable-th master-col-mw160"
                    onClick={() => handleToggleSort("updatedAt")}
                  >
                    <span>Updated at</span>
                    {renderSortIndicator("updatedAt")}
                  </th>
                )}

                {visibleMap.option && (
                  <th className="master-col-option-md">Option</th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, index) => {
                  const isChecked = selectedCodes.has(item.itemCode);
                  const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;

                  return (
                    <tr key={item.id} className={isChecked ? "selected" : ""}>
                      {/* Row Checkbox */}
                      <td className="master-cell-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleRowSelect(item.itemCode)}
                          aria-label={`Select ${item.itemCode}`}
                        />
                      </td>

                      {/* No */}
                      <td className="master-cell-no">
                        {rowNumber}
                      </td>

                      {visibleMap.itemCode && (
                        <td>
                          <span className="code-pill">{item.itemCode}</span>
                        </td>
                      )}

                      {visibleMap.kodeEksternal && (
                        <td>{item.kodeEksternal || "-"}</td>
                      )}

                      {visibleMap.itemName && (
                        <td className="master-cell-item-name">
                          {item.itemName}
                        </td>
                      )}

                      {visibleMap.classification && (
                        <td>{safeStr(item.classification)}</td>
                      )}

                      {visibleMap.category && (
                        <td>{safeStr(item.category)}</td>
                      )}

                      {visibleMap.hsCode && (
                        <td className="master-cell-mono">
                          {safeStr(item.hsCode)}
                        </td>
                      )}

                      {visibleMap.smallestUnit && (
                        <td>
                          <div className="item-unit-multiline">
                            <strong>{safeStr(item.smallestUnitCode, "PCE")}</strong>
                            <span>{safeStr(item.smallestUnitName, "Pieces")}</span>
                          </div>
                        </td>
                      )}

                      {visibleMap.greatestUnit && (
                        <td>
                          <div className="item-unit-multiline">
                            <strong>{safeStr(item.greatestUnitCode, "PCE")}</strong>
                            <span>{safeStr(item.greatestUnitName, "Pieces")}</span>
                          </div>
                        </td>
                      )}

                      {visibleMap.facility && (
                        <td>
                          <span className="item-facility-badge">
                            {safeStr(item.facility, "FASILITAS")}
                          </span>
                        </td>
                      )}

                      {visibleMap.groupScrap && (
                        <td>{safeStr(item.groupScrap)}</td>
                      )}

                      {visibleMap.specification && (
                        <td className="master-cell-spec-wrap">
                          {safeStr(item.specification)}
                        </td>
                      )}

                      {visibleMap.origin && <td>{safeStr(item.origin)}</td>}

                      {visibleMap.colour && <td>{safeStr(item.colour)}</td>}

                      {visibleMap.brand && <td>{safeStr(item.brand)}</td>}

                      {visibleMap.style && <td>{safeStr(item.style)}</td>}

                      {visibleMap.customReport && (
                        <td>{safeStr(item.customReport)}</td>
                      )}

                      {visibleMap.traceByLot && (
                        <td className="master-cell-center">
                          {item.traceByLot ? "Yes" : "No"}
                        </td>
                      )}

                      {visibleMap.status && (
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status === "Active"}
                            onToggle={() => onToggleStatus?.(item.id)}
                            ariaLabel={`Toggle status for ${item.itemName}`}
                          />
                        </td>
                      )}

                      {visibleMap.createdAt && (
                        <td className="master-cell-audit">
                          {item.createdAt}
                        </td>
                      )}

                      {visibleMap.updatedAt && (
                        <td className="master-cell-audit">
                          {item.updatedAt}
                        </td>
                      )}

                      {visibleMap.option && (
                        <td className="master-cell-center">
                          <div className="item-row-actions">
                            {onEdit && canUpdateMasterItem && (
                              <button
                                type="button"
                                className="item-action-btn item-action-btn--edit"
                                title={`Edit ${item.itemName}`}
                                onClick={() => setItemToEdit(item)}
                              >
                                <Icon name="edit" size={12} />
                              </button>
                            )}
                            {canDeleteMasterItem && (
                              <button
                                type="button"
                                className="item-action-btn item-action-btn--delete"
                                title={`Delete ${item.itemName}`}
                                onClick={() => setItemToDelete(item)}
                              >
                                <Icon name="trash" size={12} />
                              </button>
                            )}
                            {!canUpdateMasterItem && !canDeleteMasterItem && (
                              <span className="master-cell-audit">—</span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={
                      columns.filter((c) => c.visible).length + 2
                    }
                    className="empty-table-cell"
                  >
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No items found</strong>
                      <span>Try adjusting your search query or filters.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Bottom Pagination */}
        <Pagination
          totalRecords={totalRecords}
          currentPage={safeCurrentPage}
          pageSize={pageSize}
          showPageSize={true}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Edit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!itemToEdit}
        title="Edit Record"
        message={`Do you want to edit item "${itemToEdit?.itemName}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (itemToEdit && onEdit) {
            onEdit(itemToEdit);
          }
          setItemToEdit(null);
        }}
        onCancel={() => setItemToEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!itemToDelete}
        entityType="item"
        entityName={itemToDelete?.itemName}
        entityCode={itemToDelete?.itemCode}
        onConfirm={handleConfirmDelete}
        onCancel={() => setItemToDelete(null)}
      />
    </div>
  );
}

export default ItemIndex;
