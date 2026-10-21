import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { Badge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { initialStockNotificationRecords } from "./stock-notification-data";
import type { StockNotificationRecord, StockNotificationSortField } from "./stock-notification-types";

interface StockNotificationIndexProps {
  records?: StockNotificationRecord[];
  onAddNew: () => void;
  onEdit?: (record: StockNotificationRecord) => void;
  onDelete?: (id: string) => void;
}

type SortDirection = "none" | "asc" | "desc";

export function StockNotificationIndex({
  records = initialStockNotificationRecords,
  onAddNew,
  onEdit,
  onDelete,
}: StockNotificationIndexProps) {
  const [localRecords, setLocalRecords] = useState<StockNotificationRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<StockNotificationSortField>("no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [recordToDelete, setRecordToDelete] = useState<StockNotificationRecord | null>(null);
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
        rec.itemCode.toLowerCase().includes(query) ||
        rec.itemName.toLowerCase().includes(query) ||
        rec.category.toLowerCase().includes(query) ||
        rec.unit.toLowerCase().includes(query) ||
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

  const handleToggleSort = (field: StockNotificationSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: StockNotificationSortField) => {
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

  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    const id = recordToDelete.id;
    setLocalRecords((prev) => prev.filter((r) => r.id !== id));
    if (onDelete) onDelete(id);
    setRecordToDelete(null);
  };

  const handleToggleStatus = (record: StockNotificationRecord) => {
    const nextStatus = record.status === "Active" ? "Inactive" : "Active";
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, status: nextStatus } : r))
    );
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = sortedRecords.map((r, idx) => ({
        No: idx + 1,
        "Item Code": r.itemCode,
        "Item Name": r.itemName,
        Category: r.category,
        Unit: r.unit,
        "Current Stock": r.currentStock,
        "Buffer Quantity": r.bufferQuantity,
        "Rule Status": r.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Notification");
      XLSX.writeFile(workbook, "Stock_Notification_Rules.xlsx");

      setExportNotice("Stock Notification rules exported successfully as Excel.");
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to generate Excel export.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  return (
    <div className="wh-page">
      {/* Page Header */}
      <div className="wh-page-header">
        <h1 className="wh-page-title">Stock Notification Master</h1>
        <div className="wh-header-actions">
          <Button variant="primary" onClick={onAddNew}>
            Add New
          </Button>
          <Button variant="excel" onClick={handleExportExcel}>
            Export To Excel
          </Button>
        </div>
      </div>

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

      {/* White Table Card */}
      <div className="wh-table-card">
        {/* Controls Bar */}
        <div className="wh-controls-bar">
          <div className="wh-search-box">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search item code, name, category..."
            />
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="wh-table-wrapper">
          <table className="wh-table">
            <thead>
              <tr>
                <th className="wh-th-no">No</th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("itemCode")}
                  style={{ width: "140px" }}
                >
                  <div className="wh-th-content">
                    <span>Item Code</span>
                    {renderSortIndicator("itemCode")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("itemName")}
                  style={{ minWidth: "180px" }}
                >
                  <div className="wh-th-content">
                    <span>Item Name</span>
                    {renderSortIndicator("itemName")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("category")}
                  style={{ width: "150px" }}
                >
                  <div className="wh-th-content">
                    <span>Category</span>
                    {renderSortIndicator("category")}
                  </div>
                </th>
                <th style={{ width: "70px", textAlign: "center" }}>Unit</th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("currentStock")}
                  style={{ width: "120px", textAlign: "right" }}
                >
                  <div className="wh-th-content justify-end" style={{ justifyContent: "flex-end" }}>
                    <span>Current Stock</span>
                    {renderSortIndicator("currentStock")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("bufferQuantity")}
                  style={{ width: "130px", textAlign: "right" }}
                >
                  <div className="wh-th-content justify-end" style={{ justifyContent: "flex-end" }}>
                    <span>Buffer Threshold</span>
                    {renderSortIndicator("bufferQuantity")}
                  </div>
                </th>
                <th style={{ width: "120px", textAlign: "center" }}>Alert Status</th>
                <th
                  className="wh-th-sortable text-center"
                  onClick={() => handleToggleSort("status")}
                  style={{ width: "90px" }}
                >
                  <div className="wh-th-content justify-center">
                    <span>Rule Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th className="wh-th-option text-center" style={{ width: "80px" }}>
                  Option
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="wh-table-empty">
                    No stock buffer rules found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, index) => {
                  const sequentialNo = (safeCurrentPage - 1) * pageSize + index + 1;
                  const isTriggered = item.currentStock <= item.bufferQuantity;
                  const isCritical = item.currentStock <= item.bufferQuantity * 0.5;

                  return (
                    <tr key={item.id}>
                      <td className="wh-td-no text-center">{sequentialNo}</td>
                      <td>
                        <span className="code-pill">{item.itemCode}</span>
                      </td>
                      <td>
                        <strong>{item.itemName}</strong>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ textAlign: "center", fontWeight: 600 }}>{item.unit}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        <span style={{ color: isTriggered ? "var(--red-600)" : "var(--ink)" }}>
                          {item.currentStock.toLocaleString("en-US")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--blue-600)" }}>
                        {item.bufferQuantity.toLocaleString("en-US")}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isTriggered ? (
                          <Badge tone={isCritical ? "red" : "orange"}>
                            {isCritical ? "Critical Low" : "Triggered"}
                          </Badge>
                        ) : (
                          <Badge tone="green">Safe Buffer</Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="wh-status-toggle"
                          onClick={() => handleToggleStatus(item)}
                          title={`Click to toggle status (${
                            item.status === "Active" ? "Active" : "Inactive"
                          })`}
                          aria-label={`Toggle status for ${item.itemName}`}
                        >
                          <span
                            className={`wh-status-checkbox ${
                              item.status === "Active"
                                ? "wh-status-checkbox--checked"
                                : "wh-status-checkbox--unchecked"
                            }`}
                          >
                            {item.status === "Active" && <Icon name="check" size={13} />}
                          </span>
                        </button>
                      </td>
                      <td className="text-center">
                        <div className="wh-row-actions">
                          {onEdit && (
                            <button
                              type="button"
                              className="wh-action-btn wh-action-btn--edit"
                              title={`Edit ${item.itemName}`}
                              onClick={() => onEdit(item)}
                            >
                              <Icon name="edit" size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="wh-action-btn wh-action-btn--delete"
                            title={`Delete ${item.itemName}`}
                            onClick={() => setRecordToDelete(item)}
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

      {/* Delete Confirmation Dialog */}
      {recordToDelete && (
        <ConfirmDialog
          isOpen={true}
          entityType="stock buffer rule"
          entityName={recordToDelete.itemName}
          entityCode={recordToDelete.itemCode}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRecordToDelete(null)}
        />
      )}
    </div>
  );
}

export default StockNotificationIndex;
