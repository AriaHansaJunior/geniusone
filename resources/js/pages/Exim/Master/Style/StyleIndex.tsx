import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { Pagination } from "../../../../components/ui/Pagination";
import { initialStyleRecords } from "./style-data";
import type {
  StyleRecord,
  StyleSortField,
  SortDirection,
} from "./style-types";

interface StyleIndexProps {
  records?: StyleRecord[];
  onAddNew: () => void;
  onImportExcel: () => void;
  onEdit?: (record: StyleRecord) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export function StyleIndex({
  records = initialStyleRecords,
  onAddNew,
  onImportExcel,
  onEdit,
  onDelete,
  onToggleStatus,
}: StyleIndexProps) {
  const [localRecords, setLocalRecords] = useState<StyleRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<StyleSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [styleToDelete, setStyleToDelete] = useState<StyleRecord | null>(null);
  const [styleToEdit, setStyleToEdit] = useState<StyleRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter across Style Code, Name, and Description
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchCode = rec.code.toLowerCase().includes(query);
      const matchName = rec.name.toLowerCase().includes(query);
      const matchDesc = (rec.description || "").toLowerCase().includes(query);
      return matchCode || matchName || matchDesc;
    });
  }, [localRecords, search]);

  // Column sorting logic
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "code") {
        aVal = a.code.toLowerCase();
        bVal = b.code.toLowerCase();
      } else if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "description") {
        aVal = (a.description || "").toLowerCase();
        bVal = (b.description || "").toLowerCase();
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

  // Tri-state column sorting toggle
  const handleToggleSort = (field: StyleSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: StyleSortField) => {
    if (sortField !== field || sortDirection === "none") {
      return <span className="style-sort-indicator inactive">⇅</span>;
    }
    return (
      <span className="style-sort-indicator active">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Row status toggle
  const handleToggleStatus = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: !item.status } : item
      )
    );
    if (onToggleStatus) {
      onToggleStatus(id);
    }
  };

  // Row delete confirmation
  const handleConfirmDelete = () => {
    if (!styleToDelete) return;
    const idToDelete = styleToDelete.id;
    setLocalRecords((prev) => prev.filter((item) => item.id !== idToDelete));
    if (onDelete) {
      onDelete(idToDelete);
    }
    setStyleToDelete(null);
  };

  // Export to Excel-compatible CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    try {
      const headers = ["No", "Code", "Name", "Description", "Status"];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.code || "").replace(/"/g, '""')}"`,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.description || "").replace(/"/g, '""')}"`,
          row.status ? "Active" : "Inactive",
        ];
        csvRows.push(values.join(","));
      });

      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Master_Specification_Model_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(
        `Exported ${sortedRecords.length} specification/model record(s) to Excel-compatible CSV.`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export records. Please try again.");
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  const startEntry =
    totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="style-page">
      {/* Page Heading Area: Master Specification/Model title and action buttons */}
      <div className="style-page-header">
        <h1 className="style-page-title">Master Specification/Model</h1>

        <div className="style-header-actions">
          <Button variant="primary" icon="plus" onClick={onAddNew}>
            Add New
          </Button>

          <Button
            variant="ghost"
            icon="upload"
            onClick={onImportExcel}
            title="Import Excel file for Specification/Model"
          >
            Import Excel
          </Button>

          <Button
            variant="ghost"
            icon="download"
            onClick={handleExportToExcel}
            title="Export filtered records to Excel-compatible CSV"
          >
            Export To Excel
          </Button>
        </div>
      </div>

      {/* Export notification notice */}
      {exportNotice && (
        <div className="style-alert style-alert--info">
          <Icon name="check" size={15} />
          <div className="style-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="style-alert-close"
            onClick={() => setExportNotice(null)}
            aria-label="Dismiss export notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="style-table-panel panel">
        {/* Table Toolbar: Search on Left */}
        <div className="style-toolbar">
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
            <table className="style-data-table data-table">
              <thead>
                <tr>
                  {/* 1. No */}
                  <th style={{ width: "60px", textAlign: "center" }}>
                    <span>No</span>
                  </th>

                  {/* 2. Code */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "120px" }}
                    onClick={() => handleToggleSort("code")}
                  >
                    <span>Code</span>
                    {renderSortIndicator("code")}
                  </th>

                  {/* 3. Name */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "240px" }}
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </th>

                  {/* 4. Description */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "260px" }}
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>

                  {/* 5. Status */}
                  <th
                    className="sortable-th"
                    style={{ width: "90px", textAlign: "center" }}
                    onClick={() => handleToggleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>

                  {/* 6. Option */}
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
                        {/* 1. No (Sequential) */}
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
                        <td className="style-code-cell">{item.code}</td>

                        {/* 3. Name */}
                        <td className="style-name-cell">{item.name}</td>

                        {/* 4. Description */}
                        <td className="style-desc-cell">
                          {item.description || "-"}
                        </td>

                        {/* 5. Status Checkbox Toggle */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="style-status-toggle"
                            onClick={() => handleToggleStatus(item.id)}
                            title={`Click to ${
                              item.status ? "deactivate" : "activate"
                            } ${item.name}`}
                            aria-label={`Status for ${item.name}: ${
                              item.status ? "Active" : "Inactive"
                            }`}
                          >
                            <span
                              className={`style-status-checkbox ${
                                item.status ? "checked" : "unchecked"
                              }`}
                            >
                              {item.status && <Icon name="check" size={13} />}
                            </span>
                          </button>
                        </td>

                        {/* 6. Option Column */}
                        <td style={{ textAlign: "center" }}>
                          <div className="style-row-actions">
                            {onEdit && (
                              <button
                                type="button"
                                className="style-action-btn style-action-btn--edit"
                                title={`Edit ${item.name}`}
                                onClick={() => setStyleToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="style-action-btn style-action-btn--delete"
                              title={`Delete ${item.name}`}
                              onClick={() => setStyleToDelete(item)}
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
                    <td colSpan={6} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No specifications/models found</strong>
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
        isOpen={!!styleToEdit}
        title="Edit Record?"
        message={`Do you want to edit specification/model "${styleToEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (styleToEdit && onEdit) {
            onEdit(styleToEdit);
          }
          setStyleToEdit(null);
        }}
        onCancel={() => setStyleToEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!styleToDelete}
        title="Delete Record?"
        message={`Are you sure you want to delete specification/model "${styleToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={handleConfirmDelete}
        onCancel={() => setStyleToDelete(null)}
      />
    </div>
  );
}

export default StyleIndex;
