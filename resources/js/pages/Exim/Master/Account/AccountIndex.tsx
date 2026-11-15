import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import {
  type AccountRecord,
  type AccountSortField,
  type SortDirection,
} from "./account-types";

interface AccountIndexProps {
  records?: AccountRecord[];
  onAddNew?: () => void;
  onEdit?: (record: AccountRecord) => void;
  onDelete?: (id: string) => Promise<boolean | void> | void;
  onToggleStatus?: (id: string) => Promise<void> | void;
}

export function AccountIndex({
  records = [],
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: AccountIndexProps) {
  const [localRecords, setLocalRecords] = useState<AccountRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<AccountSortField>("accountCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const [accountToDelete, setAccountToDelete] = useState<AccountRecord | null>(null);
  const [accountToConfirmEdit, setAccountToConfirmEdit] = useState<AccountRecord | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const q = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.accountCode.toLowerCase().includes(q) ||
        rec.accountName.toLowerCase().includes(q) ||
        rec.category.toLowerCase().includes(q)
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
        sortField === "accountCode"
          ? a.accountCode.toLowerCase()
          : sortField === "accountName"
          ? a.accountName.toLowerCase()
          : a.category.toLowerCase();
      const bVal =
        sortField === "accountCode"
          ? b.accountCode.toLowerCase()
          : sortField === "accountName"
          ? b.accountName.toLowerCase()
          : b.category.toLowerCase();

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

  const handleToggleSort = (field: AccountSortField) => {
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
    if (!accountToDelete) return;
    const target = accountToDelete;
    setAccountToDelete(null);
    try {
      if (onDelete) {
        await onDelete(target.id);
      }
      setLocalRecords((prev) => prev.filter((a) => a.id !== target.id));
    } catch (err: any) {
      setBanner({
        type: "error",
        message: err?.message || `Failed to delete ${target.accountCode}.`,
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
        "Account Code",
        "Account Name",
        "Category",
        "Status",
        "Created At",
        "Created By",
      ];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.accountCode || "").replace(/"/g, '""')}"`,
          `"${(row.accountName || "").replace(/"/g, '""')}"`,
          `"${(row.category || "").replace(/"/g, '""')}"`,
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
        `Master_Account_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setBanner({
        type: "success",
        message: `Exported ${sortedRecords.length} account record(s) to CSV.`,
      });
      setTimeout(() => setBanner(null), 4000);
    } catch {
      setBanner({ type: "error", message: "Failed to export data. Please try again." });
      setTimeout(() => setBanner(null), 4000);
    }
  };

  const renderSortIndicator = (field: AccountSortField) => {
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
    <div className="account-page">
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
            placeholder="Search account code, name, category..."
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
                    onClick={() => handleToggleSort("accountCode")}
                  >
                    <span>Account Code</span>
                    {renderSortIndicator("accountCode")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={() => handleToggleSort("accountName")}
                  >
                    <span>Account Name</span>
                    {renderSortIndicator("accountName")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-category"
                    onClick={() => handleToggleSort("category")}
                  >
                    <span>Category</span>
                    {renderSortIndicator("category")}
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
                        <td className="master-cell-code">{item.accountCode}</td>
                        <td className="master-cell-name">{item.accountName}</td>
                        <td className="master-cell-muted">{item.category || "—"}</td>
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
                              onClick={() => setAccountToConfirmEdit(item)}
                              title={`Edit ${item.accountCode}`}
                              aria-label={`Edit ${item.accountCode}`}
                            >
                              <Icon name="edit" size={13} />
                            </button>
                            <button
                              type="button"
                              className="btn-action-delete"
                              onClick={() => setAccountToDelete(item)}
                              title={`Delete ${item.accountCode}`}
                              aria-label={`Delete ${item.accountCode}`}
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
                        <strong>No accounts found</strong>
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
        isOpen={Boolean(accountToConfirmEdit)}
        onCancel={() => setAccountToConfirmEdit(null)}
        onConfirm={() => {
          const target = accountToConfirmEdit;
          setAccountToConfirmEdit(null);
          if (target) onEdit?.(target);
        }}
        title="Edit Account"
        message={`Open edit page for "${accountToConfirmEdit?.accountCode} - ${accountToConfirmEdit?.accountName}"?`}
        confirmLabel="Yes, Edit"
        cancelLabel="Cancel"
      />

      <ConfirmDialog
        isOpen={Boolean(accountToDelete)}
        onCancel={() => setAccountToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Account"
        message={`Are you sure you want to delete "${accountToDelete?.accountCode} - ${accountToDelete?.accountName}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}

export default AccountIndex;
