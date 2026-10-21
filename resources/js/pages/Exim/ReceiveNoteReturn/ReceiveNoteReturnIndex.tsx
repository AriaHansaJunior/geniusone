import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
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
    if (sortField !== field || sortDirection === "none") {
      return <span className="rnr-sort-indicator text-muted">⇅</span>;
    }
    return (
      <span className="rnr-sort-indicator text-primary font-bold">
        {sortDirection === "asc" ? "▲" : "▼"}
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
      {/* Top Header */}
      <div className="rnr-page-header">
        <h1 className="rnr-page-title">Receive Note (Sales Return)</h1>
        <div className="rnr-header-actions">
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
        </div>
      </div>

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
              <input
                type="date"
                className="rnr-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="rnr-date-sep">-</span>
              <input
                type="date"
                className="rnr-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Customer Dropdown */}
          <div className="rnr-filter-item rnr-filter-customer">
            <label className="rnr-filter-label">Customer</label>
            <select
              className="rnr-filter-select"
              value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setCurrentPage(1);
              }}
            >
              {customerList.map((cust) => (
                <option key={cust} value={cust}>
                  {cust}
                </option>
              ))}
            </select>
          </div>

          {/* Type of Document Dropdown */}
          <div className="rnr-filter-item rnr-filter-doctype">
            <label className="rnr-filter-label">Type of Document</label>
            <select
              className="rnr-filter-select"
              value={selectedDocType}
              onChange={(e) => {
                setSelectedDocType(e.target.value);
                setCurrentPage(1);
              }}
            >
              {docTypesList.map((dt) => (
                <option key={dt} value={dt}>
                  {dt}
                </option>
              ))}
            </select>
          </div>

          {/* Settings / Gear button */}
          <div className="rnr-filter-settings">
            <button
              type="button"
              className="rnr-btn-settings"
              title="Table Column Settings"
              aria-label="Table settings"
            >
              <Icon name="settings" size={16} />
              <Icon name="chevronDown" size={12} />
            </button>
          </div>
        </div>

        {/* 12-Column Table Container */}
        <div className="rnr-table-wrapper">
          <table className="rnr-table">
            <thead>
              <tr>
                <th className="rnr-th-no">No</th>
                <th
                  className="rnr-th-sortable"
                  onClick={() => handleSort("rnNumber")}
                >
                  <div className="rnr-th-content">
                    <span>RN Number</span>
                    {renderSortIndicator("rnNumber")}
                  </div>
                </th>
                <th
                  className="rnr-th-sortable"
                  onClick={() => handleSort("deliveryOrder")}
                >
                  <div className="rnr-th-content">
                    <span>Delivery Order</span>
                    {renderSortIndicator("deliveryOrder")}
                  </div>
                </th>
                <th
                  className="rnr-th-sortable"
                  onClick={() => handleSort("customer")}
                >
                  <div className="rnr-th-content">
                    <span>Customer</span>
                    {renderSortIndicator("customer")}
                  </div>
                </th>
                <th
                  className="rnr-th-sortable"
                  onClick={() => handleSort("facility")}
                >
                  <div className="rnr-th-content">
                    <span>Facility</span>
                    {renderSortIndicator("facility")}
                  </div>
                </th>
                <th
                  className="rnr-th-sortable"
                  onClick={() => handleSort("ajuNumber")}
                >
                  <div className="rnr-th-content">
                    <span>Aju Number/Registration Number</span>
                    {renderSortIndicator("ajuNumber")}
                  </div>
                </th>
                <th
                  className="rnr-th-sortable text-right"
                  onClick={() => handleSort("amount")}
                >
                  <div className="rnr-th-content justify-end">
                    <span>Amount</span>
                    {renderSortIndicator("amount")}
                  </div>
                </th>
                <th>Description</th>
                <th>Warehouse Transaction</th>
                <th
                  className="rnr-th-sortable"
                  onClick={() => handleSort("approvalStatus")}
                >
                  <div className="rnr-th-content">
                    <span>Approval Status</span>
                    {renderSortIndicator("approvalStatus")}
                  </div>
                </th>
                <th
                  className="rnr-th-sortable"
                  onClick={() => handleSort("userCreated")}
                >
                  <div className="rnr-th-content">
                    <span>User Created</span>
                    {renderSortIndicator("userCreated")}
                  </div>
                </th>
                <th className="rnr-th-option text-center">Option</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={12} className="rnr-table-empty">
                    No Receive Note (Sales Return) records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rnr, idx) => {
                  const sequentialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={rnr.id}>
                      <td className="rnr-td-no text-center">{sequentialNumber}</td>
                      <td>
                        <div className="font-semibold text-ink">
                          {rnr.rnNumber}
                        </div>
                        <div className="text-xs text-muted">
                          RN Date: {rnr.rnDate}
                        </div>
                      </td>
                      <td>
                        <div className="text-ink">
                          {rnr.deliveryOrder || "null"}
                        </div>
                        <div className="text-xs text-muted">
                          Date : {rnr.doDate || "null"}
                        </div>
                      </td>
                      <td className="font-medium text-ink">{rnr.customer}</td>
                      <td>
                        <div className="rnr-facility-cell">
                          <span className="rnr-facility-title">{rnr.facility}</span>
                          <span className="rnr-badge-bc">{rnr.bcCode}</span>
                        </div>
                      </td>
                      <td>
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
                      <td className="text-right font-mono font-medium text-ink">
                        {rnr.amountFormatted}
                      </td>
                      <td className="text-muted">{rnr.description || "-"}</td>
                      <td>
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
                      <td>
                        <span className="rnr-status-badge">
                          <Icon name="check" size={13} />
                          <span>{rnr.approvalStatus}</span>
                        </span>
                      </td>
                      <td>
                        <div className="font-medium text-ink text-xs">
                          {rnr.userCreated}
                        </div>
                        <div className="text-xs text-muted">
                          {rnr.createdAtTimestamp}
                        </div>
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="rnr-btn-row-action"
                          onClick={() => onViewDetail(rnr.rnNumber)}
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
