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
import { TransferStockReturnForm } from "./TransferStockReturnForm";
import {
  fetchTransferStockReturnsApi,
  saveTransferStockReturnApi,
  deleteTransferStockReturnApi,
  approveTransferStockReturnApi,
  rejectTransferStockReturnApi,
} from "../../../data/masterApi";
import type {
  TransferStockReturnRecord,
  TransferStockReturnSortField,
} from "./transfer-stock-return-types";

interface TransferStockReturnIndexProps {
  records?: TransferStockReturnRecord[];
  onAddNew?: () => void;
  onOpenDetail?: (id: string) => void;
}

type SortDirection = "none" | "asc" | "desc";

export function TransferStockReturnIndex({
  records,
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

  // Detail & Form state
  const [selectedRecord, setSelectedRecord] = useState<TransferStockReturnRecord | null>(null);
  const [activeDetailCode, setActiveDetailCode] = useState<string | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TransferStockReturnRecord | null>(null);
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
          prev ? apiRows.find((r) => r.id === prev.id || r.mutationCode === prev.mutationCode) || null : null
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
      // Search
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

      // Date range filter
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
      <span
        style={{
          marginLeft: "6px",
          display: "inline-flex",
          alignItems: "center",
          color: isActive ? "var(--blue-600)" : "var(--slate-400)",
        }}
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
  const handleOpenDetailModal = (record: TransferStockReturnRecord) => {
    setSelectedRecord(record);
    const code = record.mutationCode || record.id;
    if (onOpenDetail) {
      onOpenDetail(code);
      return;
    }
    setActiveDetailCode(code);
  };

  // Open edit
  const handleOpenEdit = (record: TransferStockReturnRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRecord(record);
    setIsFormModalOpen(true);
  };

  // Open delete confirm
  const handleOpenDelete = (record: TransferStockReturnRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecordToDelete(record);
  };

  const toIsoDate = (dateStr: string): string => {
    const clean = (dateStr || "").trim();
    const dmy = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
    return clean || new Date().toISOString().slice(0, 10);
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

  // Save from form (Create or Edit)
  const handleSaveRecord = async (record: TransferStockReturnRecord) => {
    const payload = {
      return_number: record.mutationCode,
      production_code:
        record.productionCode && record.productionCode !== "-" ? record.productionCode : null,
      request_material_id: record.request_material_id || null,
      warehouses_id: record.warehouses_id,
      job_number_id: record.job_number_id || null,
      job_number: record.jobNumber && record.jobNumber !== "-" ? record.jobNumber : null,
      return_date: toIsoDate(record.transferDate),
      note: record.transferNote,
      items: record.items.map((it) => ({
        items_id: it.items_id,
        quantity: Number(it.quantity),
        unit: it.unit,
        source_location: it.sourceLocation,
        destination_location: it.destinationLocation,
        remark: it.reason,
      })),
    };

    const isEditing = Boolean(editingRecord?.id);
    await saveTransferStockReturnApi(payload, isEditing ? editingRecord?.id : undefined);
    await loadRecords();
    setEditingRecord(null);
    setNotification({
      type: "success",
      message: `Stock Transfer Return ${record.mutationCode} saved to database successfully.`,
    });
    setTimeout(() => setNotification(null), 4000);
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
        onUpdated={loadRecords}
      />
    );
  }

  return (
    <div className="wh-page">
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-sm, 6px)",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: notification.type === "success" ? "#ecfdf5" : "#fffbeb",
            border: `1px solid ${notification.type === "success" ? "#a7f3d0" : "#fde68a"}`,
            color: notification.type === "success" ? "#065f46" : "#92400e",
            fontSize: "12.5px",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={notification.type === "success" ? "checkCircle" : "alertTriangle"}
              size={16}
            />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontSize: "16px",
              color: "inherit",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div
        className="wh-table-card"
        style={{
          background: "#ffffff",
          border: "1px solid var(--line, #e2e8f0)",
          borderRadius: "var(--radius-md, 8px)",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.08)",
          overflow: "hidden",
        }}
      >
        {/* Top Action Bar (Clean without redundant page title) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "12px 20px",
            background: "linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.8) 100%)",
            borderBottom: "1px solid var(--line, #e2e8f0)",
            flexWrap: "wrap",
            gap: "10px",
          }}
        >
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setEditingRecord(null);
              setIsFormModalOpen(true);
            }}
          >
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

        {/* Filter Controls Bar matching SmartOne */}
        <div
          style={{
            padding: "12px 20px",
            background: "#fafafa",
            borderBottom: "1px solid var(--line, #e2e8f0)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          {/* Left: Search input */}
          <div style={{ minWidth: "240px", flex: "1 1 240px", maxWidth: "340px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--slate-700)",
                textTransform: "uppercase",
                marginBottom: "4px",
                letterSpacing: "0.3px",
              }}
            >
              Search
            </label>
            <SearchField
              value={search}
              onChange={(val: string) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search code, job, remark..."
            />
          </div>

          {/* Middle: Transfer Date Range (From & To) */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "10px",
              flexWrap: "wrap",
              flex: "2 1 340px",
            }}
          >
            <div style={{ minWidth: "155px", flex: "1 1 155px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--slate-700)",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  letterSpacing: "0.3px",
                }}
              >
                Transfer Date (From)
              </label>
              <CustomDatePicker
                value={startDate}
                onChange={(val: string) => {
                  setStartDate(val);
                  setCurrentPage(1);
                }}
                placeholder="01-11-2026"
              />
            </div>

            <div style={{ minWidth: "155px", flex: "1 1 155px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--slate-700)",
                  textTransform: "uppercase",
                  marginBottom: "4px",
                  letterSpacing: "0.3px",
                }}
              >
                To
              </label>
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
              <Button
                type="button"
                variant="ghost"
                onClick={handleResetFilters}
                style={{ height: "38px" }}
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* 10-Column Data Table matching SmartOne */}
        <div
          className="table-scroll"
          style={{
            overflowX: "auto",
            WebkitOverflowScrolling: "touch",
            width: "100%",
            background: "#ffffff",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "1100px",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line, #e2e8f0)" }}>
                {/* 1. Number */}
                <th
                  style={{
                    width: "48px",
                    padding: "11px 12px",
                    textAlign: "center",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Number
                </th>

                {/* 2. Mutation Code */}
                <th
                  onClick={() => handleToggleSort("mutationCode")}
                  style={{
                    width: "155px",
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span>Mutation Code</span>
                    {renderSortIndicator("mutationCode")}
                  </div>
                </th>

                {/* 3. Production Code */}
                <th
                  onClick={() => handleToggleSort("productionCode")}
                  style={{
                    width: "135px",
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span>Production Code</span>
                    {renderSortIndicator("productionCode")}
                  </div>
                </th>

                {/* 4. Job Number */}
                <th
                  onClick={() => handleToggleSort("jobNumber")}
                  style={{
                    width: "135px",
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span>Job Number</span>
                    {renderSortIndicator("jobNumber")}
                  </div>
                </th>

                {/* 5. Transfer Note */}
                <th
                  onClick={() => handleToggleSort("transferNote")}
                  style={{
                    minWidth: "220px",
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span>Transfer Note</span>
                    {renderSortIndicator("transferNote")}
                  </div>
                </th>

                {/* 6. Total Items */}
                <th
                  onClick={() => handleToggleSort("totalItems")}
                  style={{
                    width: "105px",
                    padding: "11px 14px",
                    textAlign: "right",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                    <span>Total Items</span>
                    {renderSortIndicator("totalItems")}
                  </div>
                </th>

                {/* 7. Approval Status */}
                <th
                  onClick={() => handleToggleSort("status")}
                  style={{
                    width: "145px",
                    padding: "11px 14px",
                    textAlign: "center",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span>Approval Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>

                {/* 8. User Created */}
                <th
                  onClick={() => handleToggleSort("userCreated")}
                  style={{
                    width: "165px",
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span>User Created</span>
                    {renderSortIndicator("userCreated")}
                  </div>
                </th>

                {/* 9. User Last Updated */}
                <th
                  onClick={() => handleToggleSort("userLastUpdated")}
                  style={{
                    width: "145px",
                    padding: "11px 14px",
                    textAlign: "left",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <span>User Last Updated</span>
                    {renderSortIndicator("userLastUpdated")}
                  </div>
                </th>

                {/* 10. Option */}
                <th
                  style={{
                    width: "110px",
                    padding: "11px 14px",
                    textAlign: "center",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    color: "var(--slate-600)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Option
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    style={{
                      padding: "48px 20px",
                      textAlign: "center",
                      color: "var(--slate-500)",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "42px",
                          height: "42px",
                          borderRadius: "50%",
                          background: "#f1f5f9",
                          color: "var(--slate-400)",
                          display: "grid",
                          placeItems: "center",
                        }}
                      >
                        <Icon name="box" size={20} />
                      </div>
                      <strong style={{ color: "var(--ink)" }}>
                        {loading ? "Loading Stock Transfer Returns..." : "No data available in table"}
                      </strong>
                      <span style={{ fontSize: "12px", color: "var(--slate-500)" }}>
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
                      onClick={() => handleOpenDetailModal(rec)}
                      style={{
                        cursor: "pointer",
                        borderBottom: "1px solid var(--line, #e2e8f0)",
                        transition: "background 0.12s ease",
                      }}
                      className="wh-table-row"
                    >
                      {/* 1. Sequential Number (Always sequential regardless of sorting) */}
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "center",
                          color: "var(--slate-500)",
                          fontWeight: 600,
                        }}
                      >
                        {sequentialNumber}
                      </td>

                      {/* 2. Mutation Code */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontFamily: "ui-monospace, monospace",
                            fontWeight: 700,
                            color: "var(--blue-700)",
                          }}
                        >
                          {rec.mutationCode}
                        </span>
                      </td>

                      {/* 3. Production Code */}
                      <td style={{ padding: "12px 14px", color: "var(--ink)", fontWeight: 500 }}>
                        {rec.productionCode}
                      </td>

                      {/* 4. Job Number */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--ink)",
                          }}
                        >
                          {rec.jobNumber}
                        </span>
                      </td>

                      {/* 5. Transfer Note */}
                      <td
                        style={{
                          padding: "12px 14px",
                          color: "var(--ink-soft)",
                          maxWidth: "320px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={rec.transferNote}
                      >
                        {rec.transferNote}
                      </td>

                      {/* 6. Total Items */}
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--ink)",
                        }}
                      >
                        {rec.totalItems} {rec.totalItems === 1 ? "Item" : "Items"}
                      </td>

                      {/* 7. Approval Status */}
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <Badge tone={getStatusBadgeTone(rec.status)}>{rec.status}</Badge>
                      </td>

                      {/* 8. User Created */}
                      <td style={{ padding: "12px 14px", color: "var(--ink)", fontWeight: 500 }}>
                        {rec.userCreated}
                      </td>

                      {/* 9. User Last Updated */}
                      <td style={{ padding: "12px 14px", color: "var(--slate-600)", fontSize: "11.5px" }}>
                        {rec.userLastUpdated}
                      </td>

                      {/* 10. Option (Action buttons) */}
                      <td
                        style={{ padding: "12px 14px", textAlign: "center" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => handleOpenDetailModal(rec)}
                            title="View details"
                            style={{
                              border: "1px solid var(--line)",
                              background: "#ffffff",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: 600,
                              color: "var(--blue-700)",
                            }}
                          >
                            Detail
                          </button>

                          {(rec.status === "Draft" ||
                            rec.status === "Waiting Approve 1" ||
                            rec.status === "Waiting Approve 2") && (
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={(e) => handleApproveRecord(rec, e)}
                              title={
                                rec.status === "Waiting Approve 2"
                                  ? "Approve Stage 2"
                                  : "Approve Stage 1"
                              }
                              style={{
                                border: "1px solid #bbf7d0",
                                background: "#f0fdf4",
                                borderRadius: "4px",
                                padding: "4px 6px",
                                cursor: actionBusy ? "not-allowed" : "pointer",
                                color: "#15803d",
                              }}
                            >
                              <Icon name="check" size={13} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(rec, e)}
                            title="Edit record"
                            style={{
                              border: "1px solid var(--line)",
                              background: "#ffffff",
                              borderRadius: "4px",
                              padding: "4px 6px",
                              cursor: "pointer",
                              color: "var(--slate-600)",
                            }}
                          >
                            <Icon name="edit" size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleOpenDelete(rec, e)}
                            title="Delete record"
                            style={{
                              border: "1px solid var(--line)",
                              background: "#ffffff",
                              borderRadius: "4px",
                              padding: "4px 6px",
                              cursor: "pointer",
                              color: "var(--red-600)",
                            }}
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

      {/* Form Modal (Create / Edit) */}
      <TransferStockReturnForm
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveRecord}
        existingRecord={editingRecord}
      />

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

