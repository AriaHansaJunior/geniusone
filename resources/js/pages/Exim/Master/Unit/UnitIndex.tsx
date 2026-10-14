import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { initialUnitRecords } from "./unit-data";
import type { UnitRecord } from "./unit-types";

interface UnitIndexProps {
  records?: UnitRecord[];
  onAddNew: () => void;
  onEdit?: (record: UnitRecord) => void;
  onDelete?: (id: string) => void;
}

type SortDirection = "none" | "asc" | "desc";

export function UnitIndex({
  records = initialUnitRecords,
  onAddNew,
  onEdit,
  onDelete,
}: UnitIndexProps) {
  const [localRecords, setLocalRecords] = useState<UnitRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [unitToDelete, setUnitToDelete] = useState<UnitRecord | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) =>
      rec.name.toLowerCase().includes(query)
    );
  }, [localRecords, search]);

  // Sort records by Unit Name
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal = a.name.toLowerCase();
      const bVal = b.name.toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Toggle sorting on Unit Name
  const handleToggleSort = () => {
    setSortDirection((prev) => {
      if (prev === "none") return "asc";
      if (prev === "asc") return "desc";
      return "none";
    });
  };

  const handleConfirmDelete = () => {
    if (!unitToDelete) return;
    const idToDelete = unitToDelete.id;
    setLocalRecords((prev) => prev.filter((u) => u.id !== idToDelete));
    if (onDelete) {
      onDelete(idToDelete);
    }
    setUnitToDelete(null);
  };

  return (
    <div className="unit-page">
      {/* Main Table Container Card */}
      <div className="panel unit-table-panel">
        {/* Table Toolbar: Search on left, Single Add Unit action on right */}
        <div className="unit-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search unit..."
          />

          <div className="button-row">
            <Button variant="primary" icon="plus" onClick={onAddNew}>
              Add Unit
            </Button>
          </div>
        </div>

        {/* Responsive Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="unit-data-table data-table">
              <thead>
                <tr>
                  <th style={{ width: "70px", textAlign: "center" }}>
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th"
                    onClick={handleToggleSort}
                  >
                    <span>Unit</span>
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "11px",
                        color:
                          sortDirection === "none"
                            ? "var(--muted)"
                            : "var(--blue-600)",
                        fontWeight: 800,
                      }}
                    >
                      {sortDirection === "asc"
                        ? "▲"
                        : sortDirection === "desc"
                        ? "▼"
                        : "⇅"}
                    </span>
                  </th>
                  <th style={{ width: "160px", textAlign: "center" }}>
                    <span>Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber =
                      (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {rowNumber}
                        </td>
                        <td className="unit-name-cell">
                          {item.name}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div className="unit-row-actions">
                            {onEdit && (
                              <button
                                type="button"
                                className="unit-action-btn unit-action-btn--edit"
                                title={`Edit ${item.name}`}
                                onClick={() => onEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="unit-action-btn unit-action-btn--delete"
                              title={`Delete ${item.name}`}
                              onClick={() => setUnitToDelete(item)}
                            >
                              <Icon name="trash" size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No units found</strong>
                        <span>Try adjusting your search query.</span>
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
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!unitToDelete}
        title="Confirm Delete Unit"
        message={`Are you sure you want to delete unit "${unitToDelete?.name}"?`}
        confirmLabel="Delete Unit"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={handleConfirmDelete}
        onCancel={() => setUnitToDelete(null)}
      />
    </div>
  );
}

export default UnitIndex;
