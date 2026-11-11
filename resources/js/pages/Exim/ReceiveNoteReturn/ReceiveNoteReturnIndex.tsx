import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { TableColumnSettings, type TableColumnOption } from "../../../components/ui/TableColumnSettings";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { formatDisplayDate } from "../../../data/masterApi";
import {
  initialReceiveNoteReturnRecords,
  customerList,
  docTypesList,
} from "./receive-note-return-data";
import type {
  ReceiveNoteReturnRecord,
  ReceiveNoteReturnSortField,
  SortDirection,
} from "./receive-note-return-types";

const DEFAULT_RNR_COLUMNS: TableColumnOption[] = [
  { key: "rnNumber", label: "RN Number", visible: true, disabled: true },
  { key: "deliveryOrder", label: "Delivery Order", visible: true },
  { key: "customer", label: "Customer", visible: true },
  { key: "facility", label: "Facility", visible: true },
  { key: "ajuNumber", label: "Aju Number / Registration Number", visible: true },
  { key: "amount", label: "Amount", visible: true },
  { key: "description", label: "Description", visible: true },
  { key: "warehouseTx", label: "Warehouse Transaction", visible: true },
  { key: "approvalStatus", label: "Approval Status", visible: true },
  { key: "userCreated", label: "User Created", visible: true },
];

interface ReceiveNoteReturnIndexProps {
  records?: ReceiveNoteReturnRecord[];
  onAddNew: () => void;
  onViewDetail: (rnNumber: string) => void;
}

export function ReceiveNoteReturnIndex({
  records = initialReceiveNoteReturnRecords,
  onAddNew,
  onViewDetail,
}: ReceiveNoteReturnIndexProps) {
  // Filters State
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("2024-02-01");
  const [endDate, setEndDate] = useState("2026-10-14");
  const [selectedCustomer, setSelectedCustomer] = useState("Choose Customer");
  const [selectedDocType, setSelectedDocType] = useState("All Type of Documents");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<ReceiveNoteReturnSortField>("rnNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Column visibility configuration
  const [columns, setColumns] = useState<TableColumnOption[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("geniusone_rnr_table_columns");
        if (saved) {
          const parsed = JSON.parse(saved);
          return DEFAULT_RNR_COLUMNS.map((def) => {
            const match = parsed.find((p: any) => p.key === def.key);
            return match ? { ...def, visible: match.visible } : def;
          });
        }
      } catch (_) {}
    }
    return DEFAULT_RNR_COLUMNS;
  });
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  const isColVisible = (key: string) => {
    const col = columns.find((c) => c.key === key);
    return col ? col.visible : true;
  };

  const handleToggleColumn = (key: string) => {
    setColumns((prev) => {
      const next = prev.map((c) => (c.key === key && !c.disabled ? { ...c, visible: !c.visible } : c));
      try {
        localStorage.setItem("geniusone_rnr_table_columns", JSON.stringify(next));
      } catch (_) {}
      return next;
    });
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_RNR_COLUMNS);
    try {
      localStorage.removeItem("geniusone_rnr_table_columns");
    } catch (_) {}
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Customer filter
      if (
        selectedCustomer !== "Choose Customer" &&
        rec.customer !== selectedCustomer
      ) {
        return false;
      }

      // Document Type / BC Code filter
      if (
        selectedDocType !== "All Type of Documents" &&
        rec.bcCode !== selectedDocType &&
        !rec.facility.toLowerCase().includes(selectedDocType.toLowerCase())
      ) {
        return false;
      }

      // Search across RN, Customer, Delivery Order, Aju Number, Amount, User
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          rec.rnNumber.toLowerCase().includes(q) ||
          (rec.deliveryOrder && rec.deliveryOrder.toLowerCase().includes(q)) ||
          rec.customer.toLowerCase().includes(q) ||
          rec.facility.toLowerCase().includes(q) ||
          rec.bcCode.toLowerCase().includes(q) ||
          rec.ajuNumber.toLowerCase().includes(q) ||
          (rec.noDaftar && rec.noDaftar.toLowerCase().includes(q)) ||
          rec.amountFormatted.toLowerCase().includes(q) ||
          (rec.warehouseTransaction &&
            rec.warehouseTransaction.toLowerCase().includes(q)) ||
          rec.userCreated.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [records, selectedCustomer, selectedDocType, search]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;

    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "rnNumber":
          aVal = a.rnNumber.toLowerCase();
          bVal = b.rnNumber.toLowerCase();
          break;
        case "deliveryOrder":
          aVal = (a.deliveryOrder || "").toLowerCase();
          bVal = (b.deliveryOrder || "").toLowerCase();
          break;
        case "customer":
          aVal = a.customer.toLowerCase();
          bVal = b.customer.toLowerCase();
          break;
        case "facility":
          aVal = a.facility.toLowerCase();
          bVal = b.facility.toLowerCase();
          break;
        case "ajuNumber":
          aVal = a.ajuNumber.toLowerCase();
          bVal = b.ajuNumber.toLowerCase();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "approvalStatus":
          aVal = a.approvalStatus.toLowerCase();
          bVal = b.approvalStatus.toLowerCase();
          break;
        case "userCreated":
          aVal = a.userCreated.toLowerCase();
          bVal = b.userCreated.toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleSort = (field: ReceiveNoteReturnSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: ReceiveNoteReturnSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        style={{
          marginLeft: "6px",
          display: "inline-flex",
          alignItems: "center",
          color: isActive ? "var(--blue-600)" : "var(--muted-2)",
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

  // Export to Excel (.xlsx) using SheetJS
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    try {
      const rows = [
        [
          "No",
          "RN Number",
          "RN Date",
          "Delivery Order",
          "Customer",
          "Facility",
          "BC Code",
          "Aju Number/Registration Number",
          "No. Daftar",
          "Amount",
          "Description",
          "Warehouse Transaction",
          "Approval Status",
          "User Created",
          "Created Timestamp",
        ],
        ...sortedRecords.map((item, index) => [
          index + 1,
          item.rnNumber,
          item.rnDate,
          item.deliveryOrder || "null",
          item.customer,
          item.facility,
          item.bcCode,
          item.ajuNumber,
          item.noDaftar || "-",
          item.amount,
          item.description,
          item.warehouseTransaction || "-",
          item.approvalStatus,
          item.userCreated,
          item.createdAtTimestamp,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 26 },
        { wch: 14 },
        { wch: 16 },
        { wch: 30 },
        { wch: 14 },
        { wch: 12 },
        { wch: 32 },
        { wch: 14 },
        { wch: 20 },
        { wch: 16 },
        { wch: 26 },
        { wch: 18 },
        { wch: 16 },
        { wch: 20 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Receive Note Return");

      XLSX.writeFile(
        workbook,
        `Receive_Note_Return_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      setExportNotice(
        `Successfully exported ${sortedRecords.length} Receive Note Return record(s) to Excel.`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export records. Please try again.");
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  const startEntry = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  return (
    <div className="rnr-page">
      {/* Export Notice */}
      {exportNotice && (
        <div className="rnr-alert rnr-alert--info">
          <Icon name="check" size={15} />
          <div className="rnr-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="rnr-alert-close"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rnr-table-card">
        {/* Filter Area (Matching Screenshot 1) */}
        <div className="rnr-filter-bar">
          {/* General Search */}
          <div className="rnr-filter-item rnr-filter-search">
            <label className="rnr-filter-label">Search</label>
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search"
            />
          </div>

          {/* Range Date */}
          <div className="rnr-filter-item rnr-filter-date-range">
            <label className="rnr-filter-label">Range Date</label>
            <div className="rnr-date-inputs">
              <CustomDatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setCurrentPage(1);
                }}
              />
              <span className="rnr-date-sep">-</span>
              <CustomDatePicker
                value={endDate}
                align="left"
                onChange={(val) => {
                  setEndDate(val);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Customer Dropdown */}
          <div className="rnr-filter-item rnr-filter-customer">
            <label className="rnr-filter-label">Customer</label>
            <CustomSelect
              className="rnr-filter-select"
              value={selectedCustomer}
              onChange={(val) => {
                setSelectedCustomer(val);
                setCurrentPage(1);
              }}
              options={customerList}
            />
          </div>

          {/* Type of Document Dropdown */}
          <div className="rnr-filter-item rnr-filter-doctype">
            <label className="rnr-filter-label">Type of Document</label>
            <CustomSelect
              className="rnr-filter-select"
              value={selectedDocType}
              onChange={(val) => {
                setSelectedDocType(val);
                setCurrentPage(1);
              }}
              options={docTypesList}
            />
          </div>

          {/* Actions & Settings */}
          <div className="rnr-filter-settings" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button
              variant="excel"
              onClick={handleExportToExcel}
              title="Export records to Excel (.xlsx)"
            >
              Export To Excel
            </Button>
            <div style={{ position: "relative", zIndex: 60 }}>
              <button
                type="button"
                className={`rnr-btn-settings ${isColumnSettingsOpen ? "active" : ""}`}
                title="Table Column Settings"
                aria-label="Table settings"
                onClick={() => setIsColumnSettingsOpen((prev) => !prev)}
              >
                <Icon name="settings" size={16} />
                <Icon name="chevronDown" size={12} />
              </button>

              <TableColumnSettings
                isOpen={isColumnSettingsOpen}
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onResetDefault={handleResetColumns}
                onClose={() => setIsColumnSettingsOpen(false)}
              />
            </div>
          </div>
        </div>

        {/* 12-Column Table Container */}
        <div className="rnr-table-wrapper">
          <table className="rnr-table">
            <thead>
              <tr>
                <th className="rnr-th-no">No</th>
                {isColVisible("rnNumber") && (
                  <th
                    className="rnr-th-sortable rnr-th-rnNumber"
                    onClick={() => handleSort("rnNumber")}
                  >
                    <div className="rnr-th-content">
                      <span>RN Number</span>
                      {renderSortIndicator("rnNumber")}
                    </div>
                  </th>
                )}
                {isColVisible("deliveryOrder") && (
                  <th
                    className="rnr-th-sortable rnr-th-deliveryOrder"
                    onClick={() => handleSort("deliveryOrder")}
                  >
                    <div className="rnr-th-content">
                      <span>Delivery Order</span>
                      {renderSortIndicator("deliveryOrder")}
                    </div>
                  </th>
                )}
                {isColVisible("customer") && (
                  <th
                    className="rnr-th-sortable rnr-th-customer"
                    onClick={() => handleSort("customer")}
                  >
                    <div className="rnr-th-content">
                      <span>Customer</span>
                      {renderSortIndicator("customer")}
                    </div>
                  </th>
                )}
                {isColVisible("facility") && (
                  <th
                    className="rnr-th-sortable rnr-th-facility"
                    onClick={() => handleSort("facility")}
                  >
                    <div className="rnr-th-content">
                      <span>Facility</span>
                      {renderSortIndicator("facility")}
                    </div>
                  </th>
                )}
                {isColVisible("ajuNumber") && (
                  <th
                    className="rnr-th-sortable rnr-th-ajuNumber"
                    onClick={() => handleSort("ajuNumber")}
                  >
                    <div className="rnr-th-content">
                      <span>Aju Number/Registration Number</span>
                      {renderSortIndicator("ajuNumber")}
                    </div>
                  </th>
                )}
                {isColVisible("amount") && (
                  <th
                    className="rnr-th-sortable rnr-th-amount text-right"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="rnr-th-content justify-end">
                      <span>Amount</span>
                      {renderSortIndicator("amount")}
                    </div>
                  </th>
                )}
                {isColVisible("description") && <th className="rnr-th-description">Description</th>}
                {isColVisible("warehouseTx") && <th className="rnr-th-warehouseTx">Warehouse Transaction</th>}
                {isColVisible("approvalStatus") && (
                  <th
                    className="rnr-th-sortable rnr-th-approvalStatus"
                    onClick={() => handleSort("approvalStatus")}
                  >
                    <div className="rnr-th-content">
                      <span>Approval Status</span>
                      {renderSortIndicator("approvalStatus")}
                    </div>
                  </th>
                )}
                {isColVisible("userCreated") && (
                  <th
                    className="rnr-th-sortable rnr-th-userCreated"
                    onClick={() => handleSort("userCreated")}
                  >
                    <div className="rnr-th-content">
                      <span>User Created</span>
                      {renderSortIndicator("userCreated")}
                    </div>
                  </th>
                )}
                <th className="rnr-th-option text-center">Option</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={2 + columns.filter((c) => c.visible).length} className="rnr-table-empty">
                    No Receive Note (Sales Return) records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rnr, idx) => {
                  const sequentialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={rnr.id}
                      className="rnr-clickable-row"
                      onClick={() => onViewDetail(rnr.rnNumber)}
                      style={{ cursor: "pointer" }}
                      title={`Click row to view details of Receive Note Return ${rnr.rnNumber}`}
                    >
                      <td className="rnr-td-no text-center">{sequentialNumber}</td>
                      {isColVisible("rnNumber") && (
                        <td
                          className="rnr-td-rnNumber"
                          title={`Open Receive Note Return ${rnr.rnNumber}`}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="rnr-link-number"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetail(rnr.rnNumber);
                              }}
                              title={`Open Receive Note Return ${rnr.rnNumber}`}
                            >
                              {rnr.rnNumber}
                            </button>
                          </div>
                          <div className="text-xs text-muted">
                            RN Date: {formatDisplayDate(rnr.rnDate)}
                          </div>
                        </td>
                      )}
                      {isColVisible("deliveryOrder") && (
                        <td className="rnr-td-deliveryOrder">
                          <div className="text-ink">
                            {rnr.deliveryOrder && rnr.deliveryOrder !== "null" ? rnr.deliveryOrder : "-"}
                          </div>
                          <div className="text-xs text-muted">
                            Date: {formatDisplayDate(rnr.doDate)}
                          </div>
                        </td>
                      )}
                      {isColVisible("customer") && (
                        <td className="rnr-td-customer font-medium text-ink">{rnr.customer}</td>
                      )}
                      {isColVisible("facility") && (
                        <td className="rnr-td-facility">
                          <div className="rnr-facility-cell">
                            <span className="rnr-facility-title">{rnr.facility}</span>
                            <span className="rnr-badge-bc">{rnr.bcCode}</span>
                          </div>
                        </td>
                      )}
                      {isColVisible("ajuNumber") && (
                        <td className="rnr-td-ajuNumber">
                          <button
                            type="button"
                            className="rnr-link-aju"
                            onClick={() => onViewDetail(rnr.rnNumber)}
                            title="View return details"
                          >
                            {rnr.ajuNumber}
                          </button>
                          {rnr.noDaftar && (
                            <div className="text-xs text-muted">
                              No. Daftar: {rnr.noDaftar}
                            </div>
                          )}
                        </td>
                      )}
                      {isColVisible("amount") && (
                        <td className="rnr-td-amount text-right font-mono font-medium text-ink">
                          {rnr.amountFormatted}
                        </td>
                      )}
                      {isColVisible("description") && (
                        <td className="rnr-td-description text-muted">{rnr.description || "-"}</td>
                      )}
                      {isColVisible("warehouseTx") && (
                        <td className="rnr-td-warehouseTx">
                          {rnr.warehouseTransaction ? (
                            <>
                              <div className="font-medium text-ink text-xs">
                                {rnr.warehouseTransaction}
                              </div>
                              {rnr.warehouseReceiveDate && (
                                <div className="text-xs text-muted">
                                  Receive Date: {rnr.warehouseReceiveDate}
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                      )}
                      {isColVisible("approvalStatus") && (
                        <td className="rnr-td-approvalStatus">
                          <ApprovalStatusBadge status={rnr.approvalStatus} />
                        </td>
                      )}
                      {isColVisible("userCreated") && (
                        <td className="rnr-td-userCreated">
                          <div className="font-medium text-ink text-xs">
                            {rnr.userCreated}
                          </div>
                          <div className="text-xs text-muted">
                            {rnr.createdAtTimestamp}
                          </div>
                        </td>
                      )}
                      <td className="rnr-td-option text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="rnr-btn-row-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(rnr.rnNumber);
                          }}
                          title="View Detail Receive Note"
                          aria-label={`View detail for ${rnr.rnNumber}`}
                        >
                          <Icon name="list" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Bottom Pagination */}
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

export default ReceiveNoteReturnIndex;
