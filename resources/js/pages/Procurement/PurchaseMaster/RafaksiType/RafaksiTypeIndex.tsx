import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import {
  type RafaksiTypeRecord,
  type RafaksiTypeSortField,
  type SortDirection,
} from "./rafaksi-type-types";

interface RafaksiTypeIndexProps {
  records?: RafaksiTypeRecord[];
  onAddNew?: () => void;
  onEdit?: (record: RafaksiTypeRecord) => void;
  onDelete?: (id: string) => Promise<boolean | void> | void;
  onToggleStatus?: (id: string) => Promise<void> | void;
}

export function RafaksiTypeIndex({
  records = [],
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: RafaksiTypeIndexProps) {
  const [localRecords, setLocalRecords] = useState<RafaksiTypeRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<RafaksiTypeSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [rafaksiToDelete, setRafaksiToDelete] = useState<RafaksiTypeRecord | null>(null);
  const [rafaksiToConfirmEdit, setRafaksiToConfirmEdit] = useState<RafaksiTypeRecord | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const q = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.code.toLowerCase().includes(q) ||
        rec.name.toLowerCase().includes(q) ||
        rec.description.toLowerCase().includes(q)
      );
    });
  }, [localRecords, search]);

  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      if (sortField === "status") {
        const aNum = a.status ? 1 : 0;
        const bNum = b.status ? 1 : 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aVal =
        sortField === "code"
          ? a.code.toLowerCase()
          : sortField === "name"
          ? a.name.toLowerCase()
          : a.description.toLowerCase();
      const bVal =
        sortField === "code"
          ? b.code.toLowerCase()
          : sortField === "name"
          ? b.name.toLowerCase()
          : b.description.toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIndex, startIndex + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleToggleSort = (field: RafaksiTypeSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : prev === "desc" ? "none" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleToggleStatus = async (id: string) => {
    try {
      if (onToggleStatus) {
        await onToggleStatus(id);
      } else {
        setLocalRecords((prev) =>
          prev.map((rec) => (rec.id === id ? { ...rec, status: !rec.status } : rec))
        );
      }
    } catch (err: any) {
      setBanner({ type: "error", message: err?.message || "Failed to toggle status." });
    }
  };

  const handleConfirmDelete = async () => {
    if (!rafaksiToDelete) return;
    const target = rafaksiToDelete;
    setRafaksiToDelete(null);
    try {
      if (onDelete) {
        await onDelete(target.id);
      }
      setLocalRecords((prev) => prev.filter((r) => r.id !== target.id));
    } catch (err: any) {
      setBanner({ type: "error", message: err?.message || `Failed to delete ${target.name}.` });
    }
  };

  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setBanner({ type: "error", message: "No records available to export." });
      setTimeout(() => setBanner(null), 3000);
      return;
    }

    try {
      const headers = [
        "No",
        "Rafaksi Code",
        "Type Rafaksi Name",
        "Description",
        "Status",
        "Created At",
        "Created By",
      ];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.code || "").replace(/"/g, '""')}"`,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.description || "").replace(/"/g, '""')}"`,
          row.status ? "Active" : "Inactive",
          `"${row.createdAt || ""}"`,
          `"${row.createdBy || ""}"`,
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
        `Master_Rafaksi_Type_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBanner({
        type: "success",
        message: `Exported ${sortedRecords.length} rafaksi type record(s) to CSV.`,
      });
      setTimeout(() => setBanner(null), 4000);
    } catch {
      setBanner({ type: "error", message: "Failed to export data. Please try again." });
      setTimeout(() => setBanner(null), 4000);
    }
  };

  const renderSortIndicator = (field: RafaksiTypeSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`master-sort-indicator ${isActive ? "master-sort-indicator--active" : ""}`}
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

  return (
    <div className="rafaksi-type-page">
      {banner && (
        <div className={`master-banner master-banner--${banner.type}`}>
          <span>{banner.message}</span>
          <button
            type="button"
            className="master-banner-close"
            onClick={() => setBanner(null)}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="panel table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search rafaksi code, type name, description..."
          />
          <div className="master-toolbar-actions">
            <Button type="button" variant="primary" onClick={() => onAddNew?.()}>
              Add New
            </Button>
            <Button
              type="button"
              variant="excel"
              onClick={handleExportToExcel}
              title="Export to Excel CSV"
            >
              Export to Excel
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
                    className="sortable-th master-sortable-th master-col-code"
                    onClick={() => handleToggleSort("code")}
                  >
                    <span>Rafaksi Code</span>
                    {renderSortIndicator("code")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-name"
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Type Rafaksi Name</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-status"
                    onClick={() => handleToggleSort("status")}
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
                          <button
                            type="button"
                            className={`master-status-pill ${
                              item.status
                                ? "master-status-pill--active"
                                : "master-status-pill--inactive"
                            }`}
                            onClick={() => handleToggleStatus(item.id)}
                            title="Click to toggle status"
                          >
                            {item.status ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td className="master-cell-center">
                          <div className="master-actions-group">
                            <button
                              type="button"
                              className="btn-action-edit"
                              onClick={() => setRafaksiToConfirmEdit(item)}
                              title={`Edit ${item.name}`}
                              aria-label={`Edit ${item.name}`}
                            >
                              <Icon name="edit" size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-delete"
                              onClick={() => setRafaksiToDelete(item)}
                              title={`Delete ${item.name}`}
                              aria-label={`Delete ${item.name}`}
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
                    <td colSpan={6} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No rafaksi types found</strong>
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
        isOpen={Boolean(rafaksiToConfirmEdit)}
        onCancel={() => setRafaksiToConfirmEdit(null)}
        onConfirm={() => {
          const target = rafaksiToConfirmEdit;
          setRafaksiToConfirmEdit(null);
          if (target) onEdit?.(target);
        }}
        title="Edit Rafaksi Type"
        message={`Open edit page for "${rafaksiToConfirmEdit?.name}"?`}
        confirmLabel="Yes, Edit"
        cancelLabel="Cancel"
      />

      <ConfirmDialog
        isOpen={Boolean(rafaksiToDelete)}
        onCancel={() => setRafaksiToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Rafaksi Type"
        message={`Are you sure you want to delete "${rafaksiToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default RafaksiTypeIndex;
