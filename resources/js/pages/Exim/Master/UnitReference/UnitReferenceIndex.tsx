import React, { useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { useNotification } from "../../../../context/NotificationContext";
import { initialUnitReferenceRecords } from "./unit-reference-data";
import type {
  UnitReferenceRecord,
  UnitReferenceSortField,
  SortDirection,
} from "./unit-reference-types";

interface UnitReferenceIndexProps {
  records?: UnitReferenceRecord[];
  onAddNew?: () => void;
  onEdit?: (record: UnitReferenceRecord) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onToggleStatus?: (id: string) => Promise<void> | void;
}

export function UnitReferenceIndex({
  records = initialUnitReferenceRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: UnitReferenceIndexProps) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<UnitReferenceSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [recordToEdit, setRecordToEdit] = useState<UnitReferenceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<UnitReferenceRecord | null>(null);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const query = search.toLowerCase().trim();
    return records.filter(
      (item) =>
        (item.code || "").toLowerCase().includes(query) ||
        (item.name || "").toLowerCase().includes(query) ||
        (item.description || "").toLowerCase().includes(query)
    );
  }, [records, search]);

  const sortedRecords = useMemo(() => {
    if (!sortField || sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      if (sortField === "status") {
        const aVal = a.status ? 1 : 0;
        const bVal = b.status ? 1 : 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aVal = String(a[sortField] || "").toLowerCase();
      const bVal = String(b[sortField] || "").toLowerCase();
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

  const handleSort = (field: UnitReferenceSortField) => {
    if (sortField === field) {
      if (sortDirection === "none") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortDirection("none");
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: UnitReferenceSortField) => {
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

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const target = recordToDelete;
    setRecordToDelete(null);
    if (onDelete) {
      await onDelete(target.id);
    }
  };

  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      notifyWarning("Nothing to Export", "No unit reference records match your filter.");
      return;
    }

    try {
      const headers = ["No", "Code", "Unit Name", "Description", "Status"];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, idx) => {
        const vals = [
          idx + 1,
          `"${(row.code || "").replace(/"/g, '""')}"`,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.description || "").replace(/"/g, '""')}"`,
          row.status ? "Active" : "Inactive",
        ];
        csvRows.push(vals.join(","));
      });

      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Master_Unit_Reference_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifySuccess("Export Completed", `Exported ${sortedRecords.length} unit reference record(s).`);
    } catch {
      notifyError("Export Failed", "Could not export unit reference records.");
    }
  };

  return (
    <div className="master-page-shell unit-reference-page">
      <div className="panel table-panel unit-reference-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search code, unit name, or description..."
          />

          <div className="master-toolbar-actions">
            {onAddNew && (
              <Button type="button" variant="primary" onClick={onAddNew}>
                Add New
              </Button>
            )}
            <Button
              type="button"
              variant="excel"
              onClick={handleExportToExcel}
              title="Export filtered unit references to CSV"
            >
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table unit-reference-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-code"
                    onClick={() => handleSort("code")}
                  >
                    <span>Code</span>
                    {renderSortIndicator("code")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-code-wide"
                    onClick={() => handleSort("name")}
                  >
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-description"
                    onClick={() => handleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-status"
                    onClick={() => handleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
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
                        <td className="master-cell-code">{item.code || "—"}</td>
                        <td className="master-cell-name">{item.name}</td>
                        <td className="master-cell-muted">{item.description || "—"}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status ?? true}
                            onToggle={() => onToggleStatus?.(item.id)}
                            ariaLabel={`Toggle status for ${item.name || item.code}`}
                          />
                        </td>
                        <td className="master-cell-center">
                          <div className="master-actions-group">
                            {onEdit && (
                              <button
                                type="button"
                                className="btn-action-edit"
                                title={`Edit ${item.name || item.code}`}
                                aria-label={`Edit ${item.name || item.code}`}
                                onClick={() => setRecordToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                className="btn-action-delete"
                                title={`Delete ${item.name || item.code}`}
                                aria-label={`Delete ${item.name || item.code}`}
                                onClick={() => setRecordToDelete(item)}
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
                    <td colSpan={6} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No unit references found</strong>
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
        isOpen={!!recordToEdit}
        title="Edit Record"
        message={`Do you want to edit unit reference "${recordToEdit?.name || recordToEdit?.code}"?`}
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
        entityType="unit reference"
        entityName={recordToDelete?.name || recordToDelete?.code}
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}

export default UnitReferenceIndex;
