import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { initialUnitRecords } from "./unit-data";
import type { UnitRecord } from "./unit-types";

interface UnitIndexProps {
  records?: UnitRecord[];
  onAddNew: () => void;
  onEdit?: (record: UnitRecord) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

type SortDirection = "none" | "asc" | "desc";

export function UnitIndex({
  records = initialUnitRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: UnitIndexProps) {
  const [localRecords, setLocalRecords] = useState<UnitRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [unitToDelete, setUnitToDelete] = useState<UnitRecord | null>(null);
  const [unitToEdit, setUnitToEdit] = useState<UnitRecord | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) =>
      rec.name.toLowerCase().includes(query)
    );
  }, [localRecords, search]);

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

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

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
    setUnitToDelete(null);
    if (onDelete) {
      onDelete(idToDelete);
    }
  };

  return (
    <div className="master-page-shell unit-page">
      <div className="panel table-panel unit-table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search unit..."
          />

          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="unit-data-table data-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={handleToggleSort}
                  >
                    <span>Unit</span>
                    <span
                      className={`master-sort-indicator ${
                        sortDirection !== "none" ? "master-sort-indicator--active" : ""
                      }`}
                    >
                      {sortDirection === "asc" ? (
                        <Icon name="arrowUp" size={12} />
                      ) : sortDirection === "desc" ? (
                        <Icon name="arrowDown" size={12} />
                      ) : (
                        <Icon name="arrowUpDown" size={12} />
                      )}
                    </span>
                  </th>
                  <th className="master-col-status">
                    <span>Status</span>
                  </th>
                  <th className="master-col-actions">
                    <span>Option</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-name unit-name-cell">{item.name}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status ?? true}
                            onToggle={() => onToggleStatus?.(item.id)}
                            ariaLabel={`Toggle status for ${item.name}`}
                          />
                        </td>
                        <td className="master-cell-center">
                          <div className="master-actions-group">
                            {onEdit && (
                              <button
                                type="button"
                                className="btn-action-edit"
                                title={`Edit ${item.name}`}
                                aria-label={`Edit ${item.name}`}
                                onClick={() => setUnitToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                className="btn-action-delete"
                                title={`Delete ${item.name}`}
                                aria-label={`Delete ${item.name}`}
                                onClick={() => setUnitToDelete(item)}
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No units found</strong>
                        <span className="master-empty-subtitle">
                          Try adjusting your search query.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

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
      </div>

      <ConfirmDialog
        isOpen={!!unitToEdit}
        title="Edit Record"
        message={`Do you want to edit unit "${unitToEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (unitToEdit && onEdit) {
            onEdit(unitToEdit);
          }
          setUnitToEdit(null);
        }}
        onCancel={() => setUnitToEdit(null)}
      />

      <ConfirmDialog
        isOpen={!!unitToDelete}
        entityType="unit"
        entityName={unitToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setUnitToDelete(null)}
      />
    </div>
  );
}

export default UnitIndex;
