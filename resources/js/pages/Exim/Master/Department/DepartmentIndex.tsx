import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { Pagination } from "../../../../components/ui/Pagination";
import { initialDepartmentRecords } from "./department-data";
import type {
  DepartmentRecord,
  DepartmentSortField,
  SortDirection,
} from "./department-types";

interface DepartmentIndexProps {
  records?: DepartmentRecord[];
  onAddNew: () => void;
  onEdit?: (record: DepartmentRecord) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export function DepartmentIndex({
  records = initialDepartmentRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: DepartmentIndexProps) {
  const [localRecords, setLocalRecords] = useState<DepartmentRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<DepartmentSortField>("sectionName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [departmentToDelete, setDepartmentToDelete] =
    useState<DepartmentRecord | null>(null);
  const [departmentToEdit, setDepartmentToEdit] =
    useState<DepartmentRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter across Section Name and Unit
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchName = rec.sectionName.toLowerCase().includes(query);
      const matchUnit = (rec.unit || "").toLowerCase().includes(query);
      return matchName || matchUnit;
    });
  }, [localRecords, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "sectionName") {
        aVal = a.sectionName.toLowerCase();
        bVal = b.sectionName.toLowerCase();
      } else if (sortField === "unit") {
        aVal = (a.unit || "").toLowerCase();
        bVal = (b.unit || "").toLowerCase();
      } else if (sortField === "status") {
        const aNum = a.status ? 1 : 0;
        const bNum = b.status ? 1 : 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Toggle sorting for columns
  const handleToggleSort = (field: DepartmentSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Toggle status for a record
  const handleToggleStatus = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: !rec.status } : rec))
    );
    if (onToggleStatus) {
      onToggleStatus(id);
    }
  };

  // Delete confirmed
  const handleConfirmDelete = () => {
    if (!departmentToDelete) return;
    const idToDelete = departmentToDelete.id;
    setLocalRecords((prev) => prev.filter((d) => d.id !== idToDelete));
    if (onDelete) {
      onDelete(idToDelete);
    }
    setDepartmentToDelete(null);
  };

  // Export to Excel-compatible CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const headers = ["No", "Section Name", "Unit", "Status"];

      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.sectionName || "").replace(/"/g, '""')}"`,
          `"${(row.unit || "").replace(/"/g, '""')}"`,
          row.status ? "Active" : "Inactive",
        ];
        csvRows.push(values.join(","));
      });

      // Prepend UTF-8 BOM so Excel opens special characters correctly
      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Master_Department_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${sortedRecords.length} department record(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Render sorting indicator icon
  const renderSortIndicator = (field: DepartmentSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`department-sort-indicator ${isActive ? "active" : "inactive"}`}
      >
        {isActive
          ? sortDirection === "asc"
            ? "▲"
            : "▼"
          : "⇅"}
      </span>
    );
  };

  const startEntry = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  // Generate pagination page list
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="department-page">
      {/* Page Heading Area: Master Department title on left, Add New & Export on right */}
      <div className="department-page-header">
        <h1 className="department-page-title">Master Department</h1>

        <div className="department-header-actions">
          <Button variant="primary" onClick={onAddNew}>
            Add New
          </Button>

          <Button
            variant="ghost"
            onClick={handleExportToExcel}
            title="Export filtered records to Excel-compatible CSV"
          >
            Export To Excel
          </Button>
        </div>
      </div>

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
      <div className="department-table-panel panel">
        {/* Table Toolbar: Search on Left */}
        <div className="department-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search..."
          />
        </div>

        {/* Responsive Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="department-data-table data-table">
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}>
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th"
                    style={{ minWidth: "240px" }}
                    onClick={() => handleToggleSort("sectionName")}
                  >
                    <span>Section Name</span>
                    {renderSortIndicator("sectionName")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ minWidth: "200px" }}
                    onClick={() => handleToggleSort("unit")}
                  >
                    <span>Unit</span>
                    {renderSortIndicator("unit")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "80px", textAlign: "center" }}
                    onClick={() => handleToggleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                  <th style={{ width: "140px", textAlign: "center" }}>
                    <span>Option</span>
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
                        {/* 1. Sequential No */}
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {rowNumber}
                        </td>

                        {/* 2. Section Name */}
                        <td className="department-section-name-cell">
                          {item.sectionName}
                        </td>

                        {/* 3. Unit */}
                        <td className="department-unit-cell">
                          {item.unit || "-"}
                        </td>

                        {/* 4. Status Checkbox Toggle */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="department-status-toggle"
                            onClick={() => handleToggleStatus(item.id)}
                            title={`Click to toggle status (${
                              item.status ? "Active" : "Inactive"
                            })`}
                            aria-label={`Toggle status for ${item.sectionName}`}
                          >
                            <span
                              className={`department-status-checkbox ${
                                item.status ? "checked" : "unchecked"
                              }`}
                            >
                              {item.status && <Icon name="check" size={13} />}
                            </span>
                          </button>
                        </td>

                        {/* 5. Option Row Actions */}
                        <td style={{ textAlign: "center" }}>
                          <div className="department-row-actions">
                            {onEdit && (
                              <button
                                type="button"
                                className="department-action-btn department-action-btn--edit"
                                title={`Edit ${item.sectionName}`}
                                onClick={() => setDepartmentToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="department-action-btn department-action-btn--delete"
                              title={`Delete ${item.sectionName}`}
                              onClick={() => setDepartmentToDelete(item)}
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No departments found</strong>
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
            showPageSize={true}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      {/* Edit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!departmentToEdit}
        title="Edit Record"
        message={`Do you want to edit department "${departmentToEdit?.sectionName}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (departmentToEdit && onEdit) {
            onEdit(departmentToEdit);
          }
          setDepartmentToEdit(null);
        }}
        onCancel={() => setDepartmentToEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!departmentToDelete}
        entityType="department"
        entityName={departmentToDelete?.sectionName}
        entityCode={departmentToDelete?.code}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDepartmentToDelete(null)}
      />
    </div>
  );
}

export default DepartmentIndex;
