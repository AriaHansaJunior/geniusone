import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { Badge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { StatusToggle } from "../../../components/ui/StatusToggle";
import { toggleStockNotificationStatusApi } from "../../../data/masterApi";
import { useNotification } from "../../../context/NotificationContext";
import type { StockNotificationRecord, StockNotificationSortField } from "./stock-notification-types";

interface StockNotificationIndexProps {
  records?: StockNotificationRecord[];
  onAddNew: () => void;
  onToggleStatus?: (id: string) => Promise<void> | void;
}

type SortDirection = "none" | "asc" | "desc";

export function StockNotificationIndex({
  records = [],
  onAddNew,
  onToggleStatus,
}: StockNotificationIndexProps) {
  const { notifySuccess, notifyError } = useNotification();
  const [localRecords, setLocalRecords] = useState<StockNotificationRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<StockNotificationSortField>("no");
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

  const handleToggleStatus = async (record: StockNotificationRecord) => {
    if (onToggleStatus) {
      await onToggleStatus(record.id);
      return;
    }
    const previousStatus = record.status;
    const nextStatus = previousStatus === "Active" ? "Inactive" : "Active";
    const updateRow = (patch: Partial<StockNotificationRecord>) => {
      setLocalRecords((prev) =>
        prev.map((r) => (r.id === record.id ? { ...r, ...patch } : r))
      );
    };

    updateRow({ status: nextStatus });
    try {
      const updated = await toggleStockNotificationStatusApi(record.id);
      if (updated) {
        updateRow({ ...updated, no: record.no });
        notifySuccess("Status Updated", `${record.itemName} rule is now ${updated.status}.`);
        return;
      }
      throw new Error("Failed to toggle stock notification status.");
    } catch (err) {
      updateRow({ status: previousStatus });
      notifyError("Status Update Failed", err);
    }
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
          <div className="wh-header-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button variant="excel" onClick={handleExportExcel}>
              Export To Excel
            </Button>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="wh-table-wrapper">
          <table className="wh-table">
            <thead>
              <tr>
                <th className="wh-th-no">No</th>
                <th
                  className="wh-th-sortable wh-col-item-code"
                  onClick={() => handleToggleSort("itemCode")}
                >
                  <div className="wh-th-content">
                    <span>Item Code</span>
                    {renderSortIndicator("itemCode")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable wh-col-item-name"
                  onClick={() => handleToggleSort("itemName")}
                >
                  <div className="wh-th-content">
                    <span>Item Name</span>
                    {renderSortIndicator("itemName")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable wh-col-meta"
                  onClick={() => handleToggleSort("category")}
                >
                  <div className="wh-th-content">
                    <span>Category</span>
                    {renderSortIndicator("category")}
                  </div>
                </th>
                <th className="wh-col-unit">Unit</th>
                <th
                  className="wh-th-sortable wh-col-stock"
                  onClick={() => handleToggleSort("currentStock")}
                >
                  <div className="wh-th-content wh-th-content--end">
                    <span>Current Stock</span>
                    {renderSortIndicator("currentStock")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable wh-col-buffer"
                  onClick={() => handleToggleSort("bufferQuantity")}
                >
                  <div className="wh-th-content wh-th-content--end">
                    <span>Buffer Threshold</span>
                    {renderSortIndicator("bufferQuantity")}
                  </div>
                </th>
                <th className="wh-col-alert">Alert Status</th>
                <th
                  className="wh-th-sortable text-center wh-col-rule-status"
                  onClick={() => handleToggleSort("status")}
                >
                  <div className="wh-th-content justify-center">
                    <span>Rule Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="wh-table-empty">
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
                        <span className="wh-cell-sub">
                          {item.category}
                        </span>
                      </td>
                      <td className="wh-cell-unit">{item.unit}</td>
                      <td className={isTriggered ? "wh-cell-stock--triggered" : "wh-cell-stock"}>
                        {item.currentStock.toLocaleString("en-US")}
                      </td>
                      <td className="wh-cell-buffer">
                        {item.bufferQuantity.toLocaleString("en-US")}
                      </td>
                      <td className="master-cell-center">
                        {isTriggered ? (
                          <Badge tone={isCritical ? "red" : "orange"}>
                            {isCritical ? "Critical Low" : "Triggered"}
                          </Badge>
                        ) : (
                          <Badge tone="green">Safe Buffer</Badge>
                        )}
                      </td>
                      <td className="text-center">
                        <StatusToggle
                          active={item.status === "Active"}
                          onToggle={() => handleToggleStatus(item)}
                          ariaLabel={`Toggle status for ${item.itemName}`}
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
    </div>
  );
}

export default StockNotificationIndex;
