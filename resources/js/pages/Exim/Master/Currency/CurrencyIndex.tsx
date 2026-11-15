import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import {
  type CurrencyRecord,
  type CurrencySortField,
  type SortDirection,
  type SyncStatus,
} from "./currency-types";

interface CurrencyIndexProps {
  records?: CurrencyRecord[];
  onAddNew?: () => void;
  onEdit?: (record: CurrencyRecord) => void;
  onDelete?: (id: string) => Promise<boolean | void> | void;
}

export function CurrencyIndex({
  records = [],
  onAddNew,
  onEdit,
  onDelete,
}: CurrencyIndexProps) {
  const [localRecords, setLocalRecords] = useState<CurrencyRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<CurrencySortField>("currencyCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [currencyToDelete, setCurrencyToDelete] = useState<CurrencyRecord | null>(null);
  const [currencyToConfirmEdit, setCurrencyToConfirmEdit] = useState<CurrencyRecord | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const q = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.currencyCode.toLowerCase().includes(q) ||
        rec.currencyName.toLowerCase().includes(q) ||
        rec.syncStatus.toLowerCase().includes(q)
      );
    });
  }, [localRecords, search]);

  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal =
        sortField === "currencyCode"
          ? a.currencyCode
          : sortField === "currencyName"
          ? a.currencyName.toLowerCase()
          : sortField === "syncStatus"
          ? a.syncStatus
          : a.lastSynced;
      const bVal =
        sortField === "currencyCode"
          ? b.currencyCode
          : sortField === "currencyName"
          ? b.currencyName.toLowerCase()
          : sortField === "syncStatus"
          ? b.syncStatus
          : b.lastSynced;

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

  const handleToggleSort = (field: CurrencySortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : prev === "desc" ? "none" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const handleConfirmDelete = async () => {
    if (!currencyToDelete) return;
    const target = currencyToDelete;
    setCurrencyToDelete(null);
    try {
      if (onDelete) {
        await onDelete(target.id);
      }
      setLocalRecords((prev) => prev.filter((c) => c.id !== target.id));
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || `Failed to delete ${target.currencyCode}.`,
      });
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
        "Currency Code",
        "Currency Name",
        "Symbol",
        "Sync Status",
        "Last Synced",
        "Created At",
      ];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.currencyCode || "").replace(/"/g, '""')}"`,
          `"${(row.currencyName || "").replace(/"/g, '""')}"`,
          `"${(row.symbol || "").replace(/"/g, '""')}"`,
          `"${row.syncStatus || ""}"`,
          `"${row.lastSynced || ""}"`,
          `"${row.createdAt || ""}"`,
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
        `Master_Currency_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBanner({
        type: "success",
        message: `Exported ${sortedRecords.length} currency record(s) to CSV.`,
      });
      setTimeout(() => setBanner(null), 4000);
    } catch {
      setBanner({ type: "error", message: "Failed to export data. Please try again." });
      setTimeout(() => setBanner(null), 4000);
    }
  };

  const renderSortIndicator = (field: CurrencySortField) => {
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

  const renderSyncBadge = (status: SyncStatus) => {
    switch (status) {
      case "Synced":
        return <span className="sync-status-badge sync-status-badge--synced">Synced</span>;
      case "Pending":
        return <span className="sync-status-badge sync-status-badge--pending">Pending</span>;
      case "Failed":
        return <span className="sync-status-badge sync-status-badge--failed">Failed</span>;
      case "Not Synced":
      default:
        return <span className="sync-status-badge sync-status-badge--not-synced">Not Synced</span>;
    }
  };

  return (
    <div className="currency-page">
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
            placeholder="Search currency code, name, status..."
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
                    onClick={() => handleToggleSort("currencyCode")}
                  >
                    <span>Currency Code</span>
                    {renderSortIndicator("currencyCode")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={() => handleToggleSort("currencyName")}
                  >
                    <span>Currency Name</span>
                    {renderSortIndicator("currencyName")}
                  </th>
                  <th className="master-col-symbol">
                    <span>Symbol</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-sync"
                    onClick={() => handleToggleSort("syncStatus")}
                  >
                    <span>Sync Status</span>
                    {renderSortIndicator("syncStatus")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-date"
                    onClick={() => handleToggleSort("lastSynced")}
                  >
                    <span>Last Synced</span>
                    {renderSortIndicator("lastSynced")}
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
                        <td className="master-cell-code">{item.currencyCode}</td>
                        <td className="master-cell-name">{item.currencyName}</td>
                        <td className="master-cell-symbol">{item.symbol || "—"}</td>
                        <td className="master-cell-center">{renderSyncBadge(item.syncStatus)}</td>
                        <td className="master-cell-timestamp">{item.lastSynced || "—"}</td>
                        <td className="master-cell-center">
                          <div className="master-actions-group">
                            <button
                              type="button"
                              className="btn-action-edit"
                              onClick={() => setCurrencyToConfirmEdit(item)}
                              title={`Edit ${item.currencyName}`}
                              aria-label={`Edit ${item.currencyName}`}
                            >
                              <Icon name="edit" size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-delete"
                              onClick={() => setCurrencyToDelete(item)}
                              title={`Delete ${item.currencyName}`}
                              aria-label={`Delete ${item.currencyName}`}
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
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No currencies found</strong>
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
        isOpen={Boolean(currencyToConfirmEdit)}
        onCancel={() => setCurrencyToConfirmEdit(null)}
        onConfirm={() => {
          const target = currencyToConfirmEdit;
          setCurrencyToConfirmEdit(null);
          if (target) onEdit?.(target);
        }}
        title="Edit Currency"
        message={`Open edit page for "${currencyToConfirmEdit?.currencyCode} - ${currencyToConfirmEdit?.currencyName}"?`}
        confirmLabel="Yes, Edit"
        cancelLabel="Cancel"
      />

      <ConfirmDialog
        isOpen={Boolean(currencyToDelete)}
        onCancel={() => setCurrencyToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Currency"
        message={`Are you sure you want to delete "${currencyToDelete?.currencyCode} - ${currencyToDelete?.currencyName}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default CurrencyIndex;
