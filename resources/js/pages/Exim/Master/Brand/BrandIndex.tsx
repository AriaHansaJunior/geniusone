import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { Pagination } from "../../../../components/ui/Pagination";
import { initialBrandRecords } from "./brand-data";
import type {
  BrandRecord,
  BrandSortField,
  SortDirection,
} from "./brand-types";

interface BrandIndexProps {
  records?: BrandRecord[];
  onAddNew: () => void;
  onEdit?: (record: BrandRecord) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export function BrandIndex({
  records = initialBrandRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: BrandIndexProps) {
  const [localRecords, setLocalRecords] = useState<BrandRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<BrandSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [brandToDelete, setBrandToDelete] = useState<BrandRecord | null>(null);
  const [brandToEdit, setBrandToEdit] = useState<BrandRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter across Code, Name, and Description
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
  const handleToggleSort = (field: BrandSortField) => {
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
    if (!brandToDelete) return;
    const idToDelete = brandToDelete.id;
    setLocalRecords((prev) => prev.filter((b) => b.id !== idToDelete));
    if (onDelete) {
      onDelete(idToDelete);
    }
    setBrandToDelete(null);
  };

  // Export to Excel-compatible CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const headers = ["No", "Brand Code", "Brand Name", "Description", "Status"];

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

      // Prepend UTF-8 BOM so Excel opens special characters correctly
      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Master_Brand_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${sortedRecords.length} brand record(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Render sorting indicator icon
  const renderSortIndicator = (field: BrandSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`brand-sort-indicator ${isActive ? "active" : "inactive"}`}
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
    <div className="brand-page">
      {/* Page Heading Area: Master Brand title on left, Add New & Export on right */}
      <div className="brand-page-header">
        <h1 className="brand-page-title">Master Brand</h1>

        <div className="brand-header-actions">
          <Button variant="primary" icon="plus" onClick={onAddNew}>
            Add New
          </Button>

          <Button
            variant="ghost"
            icon="download"
            onClick={handleExportToExcel}
            title="Export filtered records to Excel-compatible CSV"
          >
            Export to Excel
          </Button>
        </div>
      </div>

      {/* Export notification notice */}
      {exportNotice && (
        <div className="brand-alert brand-alert--info">
          <Icon name="check" size={15} />
          <div className="brand-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="brand-alert-close"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="brand-table-panel panel">
        {/* Table Toolbar: Search on Left */}
        <div className="brand-toolbar">
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
            <table className="brand-data-table data-table">
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}>
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "100px" }}
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
                    style={{ minWidth: "260px" }}
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
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
                        <td className="brand-code-cell">
                          {item.code}
                        </td>

                        {/* 3. Name */}
                        <td className="brand-name-cell">
                          {item.name}
                        </td>

                        {/* 4. Description */}
                        <td className="brand-desc-cell">
                          {item.description || "-"}
                        </td>

                        {/* 5. Status Checkbox Toggle */}
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="brand-status-toggle"
                            onClick={() => handleToggleStatus(item.id)}
                            title={`Click to toggle status (${
                              item.status ? "Active" : "Inactive"
                            })`}
                            aria-label={`Toggle status for ${item.name}`}
                          >
                            <span
                              className={`brand-status-checkbox ${
                                item.status ? "checked" : "unchecked"
                              }`}
                            >
                              {item.status && <Icon name="check" size={13} />}
                            </span>
                          </button>
                        </td>

                        {/* 6. Option Row Actions */}
                        <td style={{ textAlign: "center" }}>
                          <div className="brand-row-actions">
                            {onEdit && (
                              <button
                                type="button"
                                className="brand-action-btn brand-action-btn--edit"
                                title={`Edit ${item.name}`}
                                onClick={() => setBrandToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                                <span>Edit</span>
                              </button>
                            )}
                            <button
                              type="button"
                              className="brand-action-btn brand-action-btn--delete"
                              title={`Delete ${item.name}`}
                              onClick={() => setBrandToDelete(item)}
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
                        <strong>No brands found</strong>
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
        isOpen={!!brandToEdit}
        title="Edit Record?"
        message={`Do you want to edit brand "${brandToEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (brandToEdit && onEdit) {
            onEdit(brandToEdit);
          }
          setBrandToEdit(null);
        }}
        onCancel={() => setBrandToEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!brandToDelete}
        title="Delete Record?"
        message={`Are you sure you want to delete brand "${brandToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={handleConfirmDelete}
        onCancel={() => setBrandToDelete(null)}
      />
    </div>
  );
}

export default BrandIndex;
