import React, { useState, useMemo, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { Badge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { TransferStockReturnDetail } from "./TransferStockReturnDetail";
import {
  fetchTransferStockReturnsApi,
  deleteTransferStockReturnApi,
  approveTransferStockReturnApi,
} from "../../../data/masterApi";
import type {
  TransferStockReturnRecord,
  TransferStockReturnSortField,
} from "./transfer-stock-return-types";

interface TransferStockReturnIndexProps {
  records?: TransferStockReturnRecord[];
  onAddNew?: () => void;
  onEdit?: (record: TransferStockReturnRecord) => void;
  onOpenDetail?: (id: string) => void;
}

type SortDirection = "none" | "asc" | "desc";

export function TransferStockReturnIndex({
  records,
  onAddNew,
  onEdit,
  onOpenDetail,
}: TransferStockReturnIndexProps) {
  const [localRecords, setLocalRecords] = useState<TransferStockReturnRecord[]>(records || []);
  const [loading, setLoading] = useState(!records);
  const [actionBusy, setActionBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<TransferStockReturnSortField>("mutationCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Detail & Delete state
  const [selectedRecord, setSelectedRecord] = useState<TransferStockReturnRecord | null>(null);
  const [activeDetailCode, setActiveDetailCode] = useState<string | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TransferStockReturnRecord | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "info" | "warning";
    message: string;
  } | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const apiRows = await fetchTransferStockReturnsApi();
      if (Array.isArray(apiRows)) {
        setLocalRecords(apiRows);
        setSelectedRecord((prev) =>
          prev
            ? apiRows.find((r) => r.id === prev.id || r.mutationCode === prev.mutationCode) || null
            : null
        );
      }
    } catch (err: any) {
      setNotification({
        type: "warning",
        message: err?.message || "Failed to load Transfer Stock Return records from database.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (records) {
      setLocalRecords(records);
      return;
    }
    loadRecords();
  }, [records, loadRecords]);

  // Helper date parsing (DD-MM-YYYY)
  const parseDate = (dStr: string) => {
    if (!dStr) return 0;
    const parts = dStr.split("-");
    if (parts.length === 3) {
      // DD-MM-YYYY -> YYYY-MM-DD timestamp
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime();
    }
    return new Date(dStr).getTime();
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return localRecords.filter((rec) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesMutation = rec.mutationCode.toLowerCase().includes(q);
        const matchesProd = (rec.productionCode || "").toLowerCase().includes(q);
        const matchesJob = (rec.jobNumber || "").toLowerCase().includes(q);
        const matchesNote = (rec.transferNote || "").toLowerCase().includes(q);
        const matchesUser = (rec.userCreated || "").toLowerCase().includes(q);
        const matchesStatus = (rec.status || "").toLowerCase().includes(q);
        if (
          !matchesMutation &&
          !matchesProd &&
          !matchesJob &&
          !matchesNote &&
          !matchesUser &&
          !matchesStatus
        ) {
          return false;
        }
      }

      if (startDate) {
        const startTs = parseDate(startDate);
        const recTs = parseDate(rec.transferDate);
        if (recTs < startTs) return false;
      }
      if (endDate) {
        const endTs = parseDate(endDate);
        const recTs = parseDate(rec.transferDate);
        if (recTs > endTs) return false;
      }

      return true;
    });
  }, [localRecords, search, startDate, endDate]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      if (sortField === "no") return 0;
      let valA: any = a[sortField as keyof TransferStockReturnRecord];
      let valB: any = b[sortField as keyof TransferStockReturnRecord];

      if (sortField === "totalItems") {
        return sortDirection === "asc" ? valA - valB : valB - valA;
      }

      valA = String(valA || "").toLowerCase();
      valB = String(valB || "").toLowerCase();

      if (valA < valB) return sortDirection === "asc" ? -1 : 1;
      if (valA > valB) return sortDirection === "asc" ? 1 : -1;
      return 0;
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

  const handleToggleSort = (field: TransferStockReturnSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: TransferStockReturnSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span className={`tsr-sort-icon ${isActive ? "tsr-sort-icon--active" : ""}`}>
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

  const getStatusBadgeTone = (status: TransferStockReturnRecord["status"]) => {
    switch (status) {
      case "Approved":
        return "green";
      case "Waiting Approve 1":
        return "orange";
      case "Waiting Approve 2":
        return "purple";
      case "Draft":
        return "gray";
      case "Rejected":
        return "red";
      default:
        return "gray";
    }
  };

  // Open full detail page
  const handleOpenDetailPage = (record: TransferStockReturnRecord) => {
    setSelectedRecord(record);
    const code = record.mutationCode || record.id;
    if (onOpenDetail) {
      onOpenDetail(code);
      return;
    }
    setActiveDetailCode(code);
  };

  // Navigate to dedicated edit page
  const handleOpenEdit = (record: TransferStockReturnRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(record);
  };

  // Open delete confirm
  const handleOpenDelete = (record: TransferStockReturnRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordToDelete(record);
  };

  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    const target = recordToDelete;
    setActionBusy(true);
    try {
      await deleteTransferStockReturnApi(target.id);
      await loadRecords();
      setNotification({
        type: "success",
        message: `Stock Transfer Return ${target.mutationCode} deleted successfully.`,
      });
    } catch (err: any) {
      setNotification({
        type: "warning",
        message: err?.message || `Failed to delete ${target.mutationCode}.`,
      });
    } finally {
      setRecordToDelete(null);
      setActionBusy(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleApproveRecord = async (rec: TransferStockReturnRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const tier = rec.status === "Waiting Approve 2" ? 2 : 1;
    setActionBusy(true);
    try {
      const res = await approveTransferStockReturnApi(
        rec.id,
        tier,
        `Approved Stage ${tier} via Stock Transfer Return`
      );
      await loadRecords();
      setNotification({
        type: "success",
        message: res?.message || `${rec.mutationCode} approved for Stage ${tier}.`,
      });
    } catch (err: any) {
      setNotification({
        type: "warning",
        message: err?.message || `Failed to approve ${rec.mutationCode}.`,
      });
    } finally {
      setActionBusy(false);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // Reset filters
  const handleResetFilters = () => {
    setSearch("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    if (sortedRecords.length === 0) {
      setNotification({
        type: "warning",
        message: "No records available to export.",
      });
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    try {
      const exportData = sortedRecords.map((r, idx) => ({
        No: idx + 1,
        "Mutation Code": r.mutationCode,
        "Production Code": r.productionCode || "-",
        "Job Number": r.jobNumber || "-",
        "Transfer Date": r.transferDate,
        "Transfer Note": r.transferNote || "-",
        "Total Items": r.totalItems,
        "Approval Status": r.status,
        "User Created": r.userCreated,
        "User Last Updated": r.userLastUpdated,
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      ws["!cols"] = [
        { wch: 6 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 14 },
        { wch: 35 },
        { wch: 12 },
        { wch: 20 },
        { wch: 25 },
        { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Transfer Return");
      XLSX.writeFile(wb, `Stock_Transfer_Return_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setNotification({
        type: "success",
        message: "Stock Transfer Return exported successfully as Excel file.",
      });
      setTimeout(() => setNotification(null), 3500);
    } catch {
      setNotification({
        type: "warning",
        message: "Failed to export Excel file.",
      });
      setTimeout(() => setNotification(null), 3500);
    }
  };

  if (activeDetailCode) {
    return (
      <TransferStockReturnDetail
        code={activeDetailCode}
        record={selectedRecord}
        records={localRecords}
        onBack={() => setActiveDetailCode(null)}
        onEdit={onEdit}
        onUpdated={loadRecords}
      />
    );
  }

  return (
    <div className="wh-page tsr-page">
      {/* Toast Notification */}
      {notification && (
        <div className={`tsr-notice tsr-notice--${notification.type}`}>
          <div className="tsr-detail-action-left">
            <Icon
              name={notification.type === "success" ? "checkCircle" : "alertTriangle"}
              size={16}
            />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            className="tsr-notice__close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="wh-table-card">
        {/* Top Action Bar (strictly text-only buttons) */}
        <div className="tsr-table-toolbar tsr-table-toolbar--end">
          <div className="tsr-toolbar-actions">
            <Button type="button" variant="primary" onClick={() => onAddNew?.()}>
              Add New
            </Button>

            <Button
              type="button"
              variant="excel"
              onClick={handleExportExcel}
              title="Export Stock Transfer Return to Excel (.xlsx)"
            >
              Export To Excel
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="tsr-index-filter-bar">
          <div className="tsr-filter-search-wrap">
            <label className="tsr-filter-label">Search</label>
            <SearchField
              value={search}
              onChange={(val: string) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search code, job, remark..."
            />
          </div>

          <div className="tsr-filter-dates-group">
            <div className="tsr-filter-date-item">
              <label className="tsr-filter-label">Transfer Date (From)</label>
              <CustomDatePicker
                value={startDate}
                onChange={(val: string) => {
                  setStartDate(val);
                  setCurrentPage(1);
                }}
                placeholder="01-11-2026"
              />
            </div>

            <div className="tsr-filter-date-item">
              <label className="tsr-filter-label">To</label>
              <CustomDatePicker
                value={endDate}
                onChange={(val: string) => {
                  setEndDate(val);
                  setCurrentPage(1);
                }}
                placeholder="12-11-2026"
              />
            </div>

            {(search || startDate || endDate) && (
              <Button type="button" variant="ghost" onClick={handleResetFilters}>
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* 10-Column Data Table */}
        <div className="table-scroll tsr-index-table-scroll">
          <table className="tsr-index-table">
            <thead>
              <tr>
                {/* 1. Number */}
                <th className="tsr-th-col-no tsr-th--center">Number</th>

                {/* 2. Mutation Code */}
                <th
                  className="tsr-th-col-mutation tsr-th--sortable"
                  onClick={() => handleToggleSort("mutationCode")}
                >
                  <div className="tsr-th-content">
                    <span>Mutation Code</span>
                    {renderSortIndicator("mutationCode")}
                  </div>
                </th>

                {/* 3. Production Code */}
                <th
                  className="tsr-th-col-prod tsr-th--sortable"
                  onClick={() => handleToggleSort("productionCode")}
                >
                  <div className="tsr-th-content">
                    <span>Production Code</span>
                    {renderSortIndicator("productionCode")}
                  </div>
                </th>

                {/* 4. Job Number */}
                <th
                  className="tsr-th-col-job tsr-th--sortable"
                  onClick={() => handleToggleSort("jobNumber")}
                >
                  <div className="tsr-th-content">
                    <span>Job Number</span>
                    {renderSortIndicator("jobNumber")}
                  </div>
                </th>

                {/* 5. Transfer Note */}
                <th
                  className="tsr-th-col-note tsr-th--sortable"
                  onClick={() => handleToggleSort("transferNote")}
                >
                  <div className="tsr-th-content">
                    <span>Transfer Note</span>
                    {renderSortIndicator("transferNote")}
                  </div>
                </th>

                {/* 6. Total Items */}
                <th
                  className="tsr-th-col-total tsr-th--right tsr-th--sortable"
                  onClick={() => handleToggleSort("totalItems")}
                >
                  <div className="tsr-th-content tsr-th-content--right">
                    <span>Total Items</span>
                    {renderSortIndicator("totalItems")}
                  </div>
                </th>

                {/* 7. Approval Status */}
                <th
                  className="tsr-th-col-status tsr-th--center tsr-th--sortable"
                  onClick={() => handleToggleSort("status")}
                >
                  <div className="tsr-th-content tsr-th-content--center">
                    <span>Approval Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>

                {/* 8. User Created */}
                <th
                  className="tsr-th-col-user tsr-th--sortable"
                  onClick={() => handleToggleSort("userCreated")}
                >
                  <div className="tsr-th-content">
                    <span>User Created</span>
                    {renderSortIndicator("userCreated")}
                  </div>
                </th>

                {/* 9. User Last Updated */}
                <th
                  className="tsr-th-col-updated tsr-th--sortable"
                  onClick={() => handleToggleSort("userLastUpdated")}
                >
                  <div className="tsr-th-content">
                    <span>User Last Updated</span>
                    {renderSortIndicator("userLastUpdated")}
                  </div>
                </th>

                {/* 10. Option */}
                <th className="tsr-th-col-options tsr-th--center">Option</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <div className="tsr-empty-box">
                      <div className="tsr-empty-circle">
                        <Icon name="box" size={20} />
                      </div>
                      <strong className="tsr-empty-title">
                        {loading ? "Loading Stock Transfer Returns..." : "No data available in table"}
                      </strong>
                      <span className="tsr-empty-subtitle">
                        Click &ldquo;Add New&rdquo; above to record a new stock transfer return.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => {
                  const sequentialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={rec.id}
                      onClick={() => handleOpenDetailPage(rec)}
                      className="wh-table-row tsr-index-row"
                    >
                      {/* 1. Sequential Number (Always sequential regardless of sorting) */}
                      <td className="tsr-td-no">{sequentialNumber}</td>

                      {/* 2. Mutation Code */}
                      <td>
                        <button
                          type="button"
                          className="tsr-mutation-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetailPage(rec);
                          }}
                        >
                          {rec.mutationCode}
                        </button>
                      </td>

                      {/* 3. Production Code */}
                      <td className="tsr-primary-text">{rec.productionCode}</td>

                      {/* 4. Job Number */}
                      <td className="tsr-primary-text">{rec.jobNumber}</td>

                      {/* 5. Transfer Note */}
                      <td className="tsr-note-cell" title={rec.transferNote}>
                        {rec.transferNote}
                      </td>

                      {/* 6. Total Items */}
                      <td className="tsr-td--right tsr-primary-text">
                        {rec.totalItems} {rec.totalItems === 1 ? "Item" : "Items"}
                      </td>

                      {/* 7. Approval Status */}
                      <td className="tsr-td--center">
                        <Badge tone={getStatusBadgeTone(rec.status)}>{rec.status}</Badge>
                      </td>

                      {/* 8. User Created */}
                      <td className="tsr-primary-text">{rec.userCreated}</td>

                      {/* 9. User Last Updated */}
                      <td className="tsr-muted-text">{rec.userLastUpdated}</td>

                      {/* 10. Option (Strictly icon-only or text-only actions) */}
                      <td className="tsr-td--center" onClick={(e) => e.stopPropagation()}>
                        <div className="tsr-actions-cell">
                          <button
                            type="button"
                            className="btn-action-detail"
                            onClick={() => handleOpenDetailPage(rec)}
                            title="View details"
                          >
                            Detail
                          </button>

                          {(rec.status === "Draft" ||
                            rec.status === "Waiting Approve 1" ||
                            rec.status === "Waiting Approve 2") && (
                            <button
                              type="button"
                              className="btn-action-approve"
                              disabled={actionBusy}
                              onClick={(e) => handleApproveRecord(rec, e)}
                              aria-label="Approve Stock Transfer Return"
                              title={
                                rec.status === "Waiting Approve 2"
                                  ? "Approve Stage 2"
                                  : "Approve Stage 1"
                              }
                            >
                              <Icon name="check" size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-action-edit"
                            onClick={(e) => handleOpenEdit(rec, e)}
                            aria-label="Edit Stock Transfer Return"
                            title="Edit record"
                          >
                            <Icon name="edit" size={13} />
                          </button>

                          <button
                            type="button"
                            className="btn-action-delete"
                            onClick={(e) => handleOpenDelete(rec, e)}
                            aria-label="Delete Stock Transfer Return"
                            title="Delete record"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Area: Entry Count Summary and Pagination Controls */}
        <Pagination
          totalRecords={totalRecords}
          currentPage={safeCurrentPage}
          pageSize={pageSize}
          showPageSize={true}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize: number) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        onCancel={() => setRecordToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Stock Transfer Return"
        message={`Are you sure you want to delete ${recordToDelete?.mutationCode}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
