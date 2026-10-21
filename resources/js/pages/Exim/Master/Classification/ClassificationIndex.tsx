import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { Pagination } from "../../../../components/ui/Pagination";
import { initialClassificationRecords } from "./classification-data";
import type {
  ClassificationRecord,
  ClassificationSortField,
  SortDirection,
} from "./classification-types";

interface ClassificationIndexProps {
  records?: ClassificationRecord[];
  onAddNew: () => void;
  onEdit?: (record: ClassificationRecord) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export function ClassificationIndex({
  records = initialClassificationRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: ClassificationIndexProps) {
  const [localRecords, setLocalRecords] = useState<ClassificationRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<ClassificationSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [classificationToDelete, setClassificationToDelete] =
    useState<ClassificationRecord | null>(null);
  const [classificationToEdit, setClassificationToEdit] =
    useState<ClassificationRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter across code, name, description, and reporting type
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchCode = rec.code.toLowerCase().includes(query);
      const matchName = rec.name.toLowerCase().includes(query);
      const matchDesc = (rec.description || "").toLowerCase().includes(query);
      const matchRep = (rec.reportingType || "").toLowerCase().includes(query);
      return matchCode || matchName || matchDesc || matchRep;
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

      if (sortField === "code") {
        aVal = a.code;
        bVal = b.code;
      } else if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "description") {
        aVal = (a.description || "").toLowerCase();
        bVal = (b.description || "").toLowerCase();
      } else if (sortField === "reportingType") {
        aVal = (a.reportingType || "").toLowerCase();
        bVal = (b.reportingType || "").toLowerCase();
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
  const handleToggleSort = (field: ClassificationSortField) => {
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
    if (!classificationToDelete) return;
    const idToDelete = classificationToDelete.id;
    setLocalRecords((prev) => prev.filter((c) => c.id !== idToDelete));
    if (onDelete) {
      onDelete(idToDelete);
    }
    setClassificationToDelete(null);
  };

  // Export to Excel-compatible CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const headers = [
        "No",
        "Classification Code",
        "Name",
        "Description",
        "Reporting Type",
        "Account",
        "Status",
      ];

      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.code || "").replace(/"/g, '""')}"`,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.description || "").replace(/"/g, '""')}"`,
          `"${(row.reportingType || "").replace(/"/g, '""')}"`,
          `"${(row.account || "").replace(/"/g, '""')}"`,
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
        `Master_Classification_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${sortedRecords.length} classification record(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Render sorting indicator icon
  const renderSortIndicator = (field: ClassificationSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`classification-sort-indicator ${isActive ? "active" : "inactive"}`}
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
    <div className="classification-page">
      {/* Page Heading Area: Master Classification title on left, Add New & Export on right */}
      <div className="classification-page-header">
        <h1 className="classification-page-title">Master Classification</h1>

        <div className="classification-header-actions">
          <Button variant="primary" onClick={onAddNew}>
            Add New
          </Button>

          <Button
            variant="excel"
            onClick={handleExportToExcel}
            title="Export filtered records to Excel-compatible CSV"
          >
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Export notification notice */}
      {exportNotice && (
        <div className="classification-alert classification-alert--info">
          <Icon name="check" size={15} />
          <div className="classification-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="classification-alert-close"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="classification-table-panel panel">
        {/* Table Toolbar: Search on Left */}
        <div className="classification-toolbar">
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
            <table className="classification-data-table data-table">
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}>
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "90px" }}
                    onClick={() => handleToggleSort("code")}
                  >
                    <span>Code</span>
                    {renderSortIndicator("code")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ minWidth: "220px" }}
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ minWidth: "220px" }}
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ minWidth: "240px" }}
                    onClick={() => handleToggleSort("reportingType")}
                  >
                    <span>Reporting Type</span>
                    {renderSortIndicator("reportingType")}
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

                        {/* 2. Code */}
                        <td className="classification-code-cell">
                          {item.code}
                        </td>

                        {/* 3. Name */}
                        <td className="classification-name-cell">
                          {item.name}
                        </td>

                        {/* 4. Description */}
                        <td className="classification-desc-cell">
                          {item.description || "-"}
                        </td>

                        {/* 5. Reporting Type */}
                        <td className="classification-reporting-cell">
                          {item.reportingType || "-"}
                        </td>

                        {/* 6. Status Checkbox Toggle */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="classification-status-toggle"
                            onClick={() => handleToggleStatus(item.id)}
                            title={`Click to toggle status (${
                              item.status ? "Active" : "Inactive"
                            })`}
                            aria-label={`Toggle status for ${item.name}`}
                          >
                            <span
                              className={`classification-status-checkbox ${
                                item.status ? "checked" : "unchecked"
                              }`}
                            >
                              {item.status && <Icon name="check" size={13} />}
                            </span>
                          </button>
                        </td>

                        {/* 7. Option Row Actions */}
                        <td style={{ textAlign: "center" }}>
                          <div className="classification-row-actions">
                            {onEdit && (
                              <button
                                type="button"
                                className="classification-action-btn classification-action-btn--edit"
                                title={`Edit ${item.name}`}
                                onClick={() => setClassificationToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="classification-action-btn classification-action-btn--delete"
                              title={`Delete ${item.name}`}
                              onClick={() => setClassificationToDelete(item)}
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
                    <td colSpan={7} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No classifications found</strong>
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
        isOpen={!!classificationToEdit}
        title="Edit Record"
        message={`Do you want to edit classification "${classificationToEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (classificationToEdit && onEdit) {
            onEdit(classificationToEdit);
          }
          setClassificationToEdit(null);
        }}
        onCancel={() => setClassificationToEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!classificationToDelete}
        entityType="classification"
        entityName={classificationToDelete?.name}
        entityCode={classificationToDelete?.code}
        onConfirm={handleConfirmDelete}
        onCancel={() => setClassificationToDelete(null)}
      />
    </div>
  );
}

export default ClassificationIndex;
