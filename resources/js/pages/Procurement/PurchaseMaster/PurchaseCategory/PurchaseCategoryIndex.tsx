import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { type PurchaseCategoryRecord } from "./purchase-category-types";

interface PurchaseCategoryIndexProps {
  records?: PurchaseCategoryRecord[];
  onAddNew: () => void;
  onEdit?: (record: PurchaseCategoryRecord) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onToggleHide?: (id: string) => void;
}

type SortField = "categoryCode" | "categoryName";
type SortDirection = "asc" | "desc";

export function PurchaseCategoryIndex({
  records = [],
  onAddNew,
  onEdit,
  onDelete,
  onToggleHide,
}: PurchaseCategoryIndexProps) {
  const [localRecords, setLocalRecords] = useState<PurchaseCategoryRecord[]>(records);
  const [recordToEdit, setRecordToEdit] = useState<PurchaseCategoryRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<PurchaseCategoryRecord | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleToggleHide = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
    if (onToggleHide) {
      onToggleHide(id);
    }
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const target = recordToDelete;
    setRecordToDelete(null);
    if (onDelete) {
      await onDelete(target.id);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.categoryCode.toLowerCase().includes(query) ||
        rec.categoryName.toLowerCase().includes(query)
      );
    });
  }, [localRecords, search]);

  const sortedRecords = useMemo(() => {
    if (!sortField) return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal = (a[sortField] || "").toLowerCase();
      const bVal = (b[sortField] || "").toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortArrow = (field: SortField) => {
    const isActive = sortField === field;
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

  const hasActions = Boolean(onEdit || onDelete);

  return (
    <div className="master-page-shell purchase-category-page">
      <div className="panel table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search category code, name..."
          />

          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-code-wide"
                    onClick={() => handleToggleSort("categoryCode")}
                  >
                    <span>Category Code</span>
                    {renderSortArrow("categoryCode")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={() => handleToggleSort("categoryName")}
                  >
                    <span>Category Name</span>
                    {renderSortArrow("categoryName")}
                  </th>
                  <th className="master-col-status">
                    <span>Status</span>
                  </th>
                  {hasActions && (
                    <th className="master-col-actions">
                      <span>Option</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id} className={item.hidden ? "row--hidden" : ""}>
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-code">{item.categoryCode}</td>
                        <td className="master-cell-name">{item.categoryName}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            hidden={item.hidden}
                            onToggle={() => handleToggleHide(item.id)}
                            ariaLabel={`Toggle status for ${item.categoryName}`}
                          />
                        </td>
                        {hasActions && (
                          <td className="master-cell-center">
                            <div className="master-actions-group">
                              {onEdit && (
                                <button
                                  type="button"
                                  className="btn-action-edit"
                                  title={`Edit ${item.categoryName}`}
                                  aria-label={`Edit ${item.categoryName}`}
                                  onClick={() => setRecordToEdit(item)}
                                >
                                  <Icon name="edit" size={13} />
                                </button>
                              )}
                              {onDelete && (
                                <button
                                  type="button"
                                  className="btn-action-delete"
                                  title={`Delete ${item.categoryName}`}
                                  aria-label={`Delete ${item.categoryName}`}
                                  onClick={() => setRecordToDelete(item)}
                                >
                                  <Icon name="trash" size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={hasActions ? 5 : 4} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No purchase categories found</strong>
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
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={!!recordToEdit}
        title="Edit Purchase Category"
        message={`Do you want to edit purchase category "${recordToEdit?.categoryName}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (recordToEdit && onEdit) {
            onEdit(recordToEdit);
          }
          setRecordToEdit(null);
        }}
        onCancel={() => setRecordToEdit(null)}
      />

      <ConfirmDialog
        isOpen={!!recordToDelete}
        entityType="purchase category"
        entityName={recordToDelete?.categoryName}
        entityCode={recordToDelete?.categoryCode}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}

export default PurchaseCategoryIndex;
