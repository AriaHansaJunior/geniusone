import React, { useEffect, useMemo, useState } from "react";
import { downloadCsvFile } from "../../../../utils/csvExport";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { MasterDeleteButton } from "../../../../components/ui/MasterDeleteButton";
import { useMasterDelete } from "../../../../hooks/useMasterDelete";
import {
  type AccountRecord,
  type AccountSortField,
  type SortDirection,
} from "./account-types";

interface AccountIndexProps {
  records?: AccountRecord[];
  isLoading?: boolean;
  onAddNew?: () => void;
  onToggleStatus?: (id: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

export function AccountIndex({
  records = [],
  isLoading = false,
  onAddNew,
  onToggleStatus,
  onDelete,
}: AccountIndexProps) {
  const { deleteTarget, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useMasterDelete<AccountRecord>((r) => r.id, onDelete);
  const [localRecords, setLocalRecords] = useState<AccountRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<AccountSortField>("accountCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

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
      const rows = sortedRecords.map((row, index) => [
        index + 1,
        row.accountCode || "",
        row.accountName || "",
        row.category || "",
        row.status ? "Active" : "Inactive",
        row.createdAt || "",
        row.createdBy || "",
      ]);

      downloadCsvFile(
        `Master_Account_Export_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );

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
                  <th className="master-col-actions text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && paginatedRecords.length === 0 ? (
                  <TableLoadingRow colSpan={6} label="Loading Accounts..." />
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-code">{item.accountCode}</td>
                        <td className="master-cell-name">{item.accountName}</td>
                        <td className="master-cell-muted">{item.category || "—"}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status}
                            onToggle={() => handleToggleStatus(item.id)}
                            ariaLabel={`Toggle status for ${item.accountCode}`}
                          />
                        </td>
                        <td className="master-cell-center">
                          <MasterDeleteButton
                            label={item.accountName}
                            onClick={() => requestDelete(item)}
                          />
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
        isOpen={Boolean(deleteTarget)}
        entityType="account"
        entityName={deleteTarget?.accountName}
        entityCode={deleteTarget?.accountCode}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default AccountIndex;
