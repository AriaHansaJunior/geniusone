import React, { useState, useMemo, useEffect } from "react";
import { loadXlsxModule } from "../../../../utils/xlsxExport";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Badge } from "../../../../components/ui/Badge";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { MasterDeleteButton } from "../../../../components/ui/MasterDeleteButton";
import { useMasterDelete } from "../../../../hooks/useMasterDelete";
import { toggleWarehouseTypeOfRequestStatusApi } from "../../../../data/masterApi";
import { useNotification } from "../../../../context/NotificationContext";
import { initialTypeOfRequestRecords } from "./type-of-request-data";
import type { TypeOfRequestRecord, TypeOfRequestSortField } from "./type-of-request-types";

interface TypeOfRequestIndexProps {
  records?: TypeOfRequestRecord[];
  isLoading?: boolean;
  onAddNew: () => void;
  onToggleStatus?: (id: string) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
}

type SortDirection = "none" | "asc" | "desc";

export function TypeOfRequestIndex({
  records = initialTypeOfRequestRecords,
  isLoading = false,
  onAddNew,
  onToggleStatus,
  onDelete,
}: TypeOfRequestIndexProps) {
  const { deleteTarget, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useMasterDelete<TypeOfRequestRecord>((r) => r.id, onDelete);
  const [localRecords, setLocalRecords] = useState<TypeOfRequestRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<TypeOfRequestSortField>("no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.name.toLowerCase().includes(query) ||
        rec.department.toLowerCase().includes(query) ||
        rec.description.toLowerCase().includes(query) ||
        rec.status.toLowerCase().includes(query)
      );
    });
  }, [localRecords, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleToggleSort = (field: TypeOfRequestSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: TypeOfRequestSortField) => {
    if (sortField !== field || sortDirection === "none") {
      return (
        <span className="wh-sort-icon opacity-40">
          <Icon name="arrowUpDown" size={13} />
        </span>
      );
    }
    return (
      <span className="wh-sort-icon text-primary font-bold">
        {sortDirection === "asc" ? (
          <Icon name="arrowUp" size={13} />
        ) : (
          <Icon name="arrowDown" size={13} />
        )}
      </span>
    );
  };

  const { notifySuccess, notifyError } = useNotification();

  const handleToggleStatus = async (record: TypeOfRequestRecord) => {
    if (onToggleStatus) {
      await onToggleStatus(record.id);
      return;
    }
    const previousStatus = record.status;
    const nextStatus = previousStatus === "Active" ? "Inactive" : "Active";
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, status: nextStatus } : r))
    );
    try {
      await toggleWarehouseTypeOfRequestStatusApi(record.id);
      notifySuccess("Status Updated", `${record.name} is now ${nextStatus}.`);
    } catch (err) {
      setLocalRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, status: previousStatus } : r))
      );
      notifyError("Status Update Failed", err);
    }
  };

  const handleExportExcel = async () => {
    try {
      const XLSX = await loadXlsxModule();
      const dataToExport = sortedRecords.map((r, idx) => ({
        No: idx + 1,
        "Request Type Name": r.name,
        Department: r.department,
        Description: r.description || "-",
        "Job Required": r.requiresJobNumber ? "Yes" : "No",
        Status: r.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Type of Request");
      XLSX.writeFile(workbook, "Type_of_Request.xlsx");

      setExportNotice("Type of Request exported successfully as Excel.");
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to generate Excel export.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  return (
    <div className="wh-page">
      {/* Export / Informational Notice */}
      {exportNotice && (
        <div className="wh-alert wh-alert--info" role="status">
          <Icon name="checkCircle" size={16} />
          <div className="wh-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="wh-alert-close"
            onClick={() => setExportNotice(null)}
            aria-label="Close alert"
          >
            &times;
          </button>
        </div>
      )}

      {/* White Content Card */}
      <div className="wh-table-card">
        {/* Top Controls Bar */}
        <div className="wh-controls-bar">
          <div className="wh-search-box">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search..."
            />
          </div>
          <div className="wh-header-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button variant="excel" onClick={handleExportExcel}>
              Export To Excel
            </Button>
          </div>
        </div>

        {/* Unified Responsive Table Wrapper */}
        <div className="wh-table-wrapper">
          <table className="wh-table">
            <thead>
              <tr>
                <th className="wh-th-no">No</th>
                <th
                  className="wh-th-sortable wh-col-req-name"
                  onClick={() => handleToggleSort("name")}
                >
                  <div className="wh-th-content">
                    <span>Request Type Name</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable wh-col-meta"
                  onClick={() => handleToggleSort("department")}
                >
                  <div className="wh-th-content">
                    <span>Department</span>
                    {renderSortIndicator("department")}
                  </div>
                </th>
                <th className="wh-col-desc">Description</th>
                <th className="wh-col-job-req">Job Required</th>
                <th
                  className="wh-th-sortable text-center wh-col-status"
                  onClick={() => handleToggleSort("status")}
                >
                  <div className="wh-th-content justify-center">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th className="master-col-actions text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && paginatedRecords.length === 0 ? (
                <TableLoadingRow colSpan={7} label="Loading Request Types..." />
              ) : paginatedRecords.length === 0 ? (
                <tr>
                    <td colSpan={7} className="wh-table-empty">
                      No request type records found matching filters.
                    </td>
                </tr>
              ) : (
                paginatedRecords.map((item, index) => {
                  const sequentialNo = (safeCurrentPage - 1) * pageSize + index + 1;

                  return (
                    <tr key={item.id}>
                      <td className="wh-td-no text-center">{sequentialNo}</td>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        <span className="wh-cell-sub">
                          {item.department || "-"}
                        </span>
                      </td>
                      <td className="wh-td-desc">{item.description}</td>
                      <td className="master-cell-center">
                        {item.requiresJobNumber ? (
                          <Badge tone="purple">Yes</Badge>
                        ) : (
                          <Badge tone="gray">No</Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <StatusToggle
                          active={item.status === "Active"}
                          onToggle={() => handleToggleStatus(item)}
                          ariaLabel={`Toggle status for ${item.name}`}
                        />
                      </td>
                      <td className="text-center">
                        <MasterDeleteButton
                          label={item.name}
                          onClick={() => requestDelete(item)}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        entityType="request type"
        entityName={deleteTarget?.name}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default TypeOfRequestIndex;
