import React, { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { Icon } from "../../../components/ui/Icon";
import { StatusToggle } from "../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../components/ui/LoadingBuffer";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { MasterDeleteButton } from "../../../components/ui/MasterDeleteButton";
import { useMasterDelete } from "../../../hooks/useMasterDelete";
import { useNotification } from "../../../context/NotificationContext";
import type {
  ReferenceMasterConfig,
  ReferenceMasterRecord,
} from "./reference-master-types";

interface ReferenceMasterIndexProps {
  config: ReferenceMasterConfig;
  records: ReferenceMasterRecord[];
  isLoading?: boolean;
  onAddNew: () => void;
  onDelete?: (id: string) => Promise<void> | void;
}

type SortField = "code" | "name" | "status";
type SortDirection = "none" | "asc" | "desc";

export function ReferenceMasterIndex({
  config,
  records = [],
  isLoading = false,
  onAddNew,
  onDelete,
}: ReferenceMasterIndexProps) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const { deleteTarget, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useMasterDelete<ReferenceMasterRecord>((r) => r.id, onDelete);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const query = search.toLowerCase().trim();
    return records.filter((rec) => {
      const codeMatch = config.hasCode && (rec.code || "").toLowerCase().includes(query);
      const nameMatch = (rec.name || "").toLowerCase().includes(query);
      return Boolean(codeMatch || nameMatch);
    });
  }, [records, search, config.hasCode]);

  const sortedRecords = useMemo(() => {
    if (!sortField || sortDirection === "none") return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      if (sortField === "status") {
        const aVal = a.status ? 1 : 0;
        const bVal = b.status ? 1 : 0;
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aVal = String((sortField === "code" ? a.code : a.name) || "").toLowerCase();
      const bVal = String((sortField === "code" ? b.code : b.name) || "").toLowerCase();
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
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection("none");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`master-sort-indicator ${isActive ? "master-sort-indicator--active" : ""
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

  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      notifyWarning("Nothing to Export", `No ${config.title.toLowerCase()} records match the current filter.`);
      return;
    }

    try {
      const headers = ["No"];
      if (config.hasCode) headers.push(config.codeLabel || "Code");
      headers.push(config.nameLabel);
      if (config.hasStatus) headers.push("Status");

      const csvRows = [headers.join(",")];
      sortedRecords.forEach((row, idx) => {
        const vals: Array<string | number> = [idx + 1];
        if (config.hasCode) {
          vals.push(`"${(row.code || "").replace(/"/g, '""')}"`);
        }
        vals.push(`"${(row.name || "").replace(/"/g, '""')}"`);
        if (config.hasStatus) {
          vals.push(row.status ? "Active" : "Inactive");
        }
        csvRows.push(vals.join(","));
      });

      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${config.exportFilePrefix}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifySuccess("Export Completed", `Exported ${sortedRecords.length} ${config.title.toLowerCase()} record(s).`);
    } catch {
      notifyError("Export Failed", `Could not export ${config.title.toLowerCase()} records.`);
    }
  };

  const columnCount =
    2 + (config.hasCode ? 1 : 0) + (config.hasStatus ? 1 : 0) + (onDelete ? 1 : 0);

  return (
    <div className="master-page-shell">
      <div className="panel table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder={`Search ${config.title.toLowerCase()}...`}
          />

          <div className="master-toolbar-actions">
            <Button type="button" variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button
              type="button"
              variant="excel"
              onClick={handleExportToExcel}
              title={`Export ${config.title} records to CSV`}
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
                  {config.hasCode && (
                    <th
                      className="sortable-th master-sortable-th master-col-code"
                      onClick={() => handleToggleSort("code")}
                    >
                      <span>{config.codeLabel || "Code"}</span>
                      {renderSortIndicator("code")}
                    </th>
                  )}
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>{config.nameLabel}</span>
                    {renderSortIndicator("name")}
                  </th>
                  {config.hasStatus && (
                    <th
                      className="sortable-th master-sortable-th master-col-status"
                      onClick={() => handleToggleSort("status")}
                    >
                      <span>Status</span>
                      {renderSortIndicator("status")}
                    </th>
                  )}
                  {onDelete && <th className="master-col-actions text-center">Action</th>}
                </tr>
              </thead>
              <tbody>
                {isLoading && paginatedRecords.length === 0 ? (
                  <TableLoadingRow
                    colSpan={columnCount}
                    label={`Loading ${config.title}...`}
                    sublabel="Synchronizing reference records from database..."
                  />
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, idx) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr key={item.id}>
                        <td className="master-cell-no">{rowNumber}</td>
                        {config.hasCode && (
                          <td className="master-cell-code">{item.code || "-"}</td>
                        )}
                        <td className="master-cell-name">{item.name}</td>
                        {config.hasStatus && (
                          <td className="master-cell-center">
                            <StatusToggle
                              active={item.status !== false}
                              onToggle={() =>
                                notifyError(
                                  "Status Toggle Unavailable",
                                  `Cannot change status for ${config.singularLabel} "${item.name}": ${config.hasStatusColumn === false
                                    ? `table \`${config.dbTable}\` has no status column and `
                                    : `in table \`${config.dbTable}\`: `
                                  }backend endpoint ${config.expectedWriteEndpoint.replace(/^POST\s+/i, "PATCH ")}/{id}/toggle-status is not yet registered in routes/api.php.`
                                )
                              }
                              ariaLabel={`Toggle status for ${item.name}`}
                            />
                          </td>
                        )}
                        {onDelete && (
                          <td className="master-cell-center">
                            <MasterDeleteButton
                              label={item.name}
                              onClick={() => requestDelete(item)}
                            />
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={columnCount} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>{config.emptyTitle}</strong>
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
        isOpen={Boolean(deleteTarget)}
        entityType={config.singularLabel.toLowerCase()}
        entityName={deleteTarget?.name}
        entityCode={deleteTarget?.code}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default ReferenceMasterIndex;
