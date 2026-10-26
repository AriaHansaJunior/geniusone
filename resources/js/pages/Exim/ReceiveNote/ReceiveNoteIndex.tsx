import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import {
  initialReceiveNoteRecords,
  suppliersList,
  docTypesList,
} from "./receive-note-data";
import type {
  ReceiveNoteRecord,
  ReceiveNoteSortField,
  SortDirection,
} from "./receive-note-types";

interface ReceiveNoteIndexProps {
  records?: ReceiveNoteRecord[];
  onAddNew: () => void;
  onViewDetail: (rnNumber: string) => void;
}

export function ReceiveNoteIndex({
  records = initialReceiveNoteRecords,
  onAddNew,
  onViewDetail,
}: ReceiveNoteIndexProps) {
  // Search & Filter State
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("2026-10-14");
  const [endDate, setEndDate] = useState("2026-10-14");
  const [selectedSupplier, setSelectedSupplier] = useState("All Suppliers");
  const [selectedDocType, setSelectedDocType] = useState("All Type of Documents");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<ReceiveNoteSortField>("rnNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Supplier filter
      if (
        selectedSupplier !== "All Suppliers" &&
        rec.supplier !== selectedSupplier
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

      // General Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          rec.rnNumber.toLowerCase().includes(q) ||
          rec.poNumber.toLowerCase().includes(q) ||
          rec.supplier.toLowerCase().includes(q) ||
          rec.facility.toLowerCase().includes(q) ||
          rec.bcCode.toLowerCase().includes(q) ||
          rec.ajuNumber.toLowerCase().includes(q) ||
          rec.noDaftar.toLowerCase().includes(q) ||
          rec.amountFormatted.toLowerCase().includes(q) ||
          (rec.description && rec.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [records, selectedSupplier, selectedDocType, search]);

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
        case "poNumber":
          aVal = a.poNumber.toLowerCase();
          bVal = b.poNumber.toLowerCase();
          break;
        case "date":
          aVal = a.date;
          bVal = b.date;
          break;
        case "supplier":
          aVal = a.supplier.toLowerCase();
          bVal = b.supplier.toLowerCase();
          break;
        case "facility":
          aVal = a.facility.toLowerCase();
          bVal = b.facility.toLowerCase();
          break;
        case "ajuNumber":
          aVal = a.ajuNumber;
          bVal = b.ajuNumber;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination calculations
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleSort = (field: ReceiveNoteSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: ReceiveNoteSortField) => {
    if (sortField !== field || sortDirection === "none") {
      return <span className="rn-sort-indicator text-muted">⇅</span>;
    }
    return (
      <span className="rn-sort-indicator text-primary font-bold">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Export to genuine Excel (.xlsx) file
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
          "Arrival Date",
          "PO Number",
          "Date",
          "Supplier",
          "Facility",
          "Code of BC",
          "Aju Number",
          "No. Daftar",
          "Amount",
          "Description",
          "Warehouse Transaction",
        ],
        ...sortedRecords.map((item, index) => [
          index + 1,
          item.rnNumber,
          item.arrivalDate,
          item.poNumber,
          item.date,
          item.supplier,
          item.facility,
          item.bcCode,
          item.ajuNumber,
          item.noDaftar,
          item.amount,
          item.description,
          item.warehouseTransaction,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 6 },  // No
        { wch: 26 }, // RN Number
        { wch: 14 }, // Arrival Date
        { wch: 16 }, // PO Number
        { wch: 12 }, // Date
        { wch: 32 }, // Supplier
        { wch: 14 }, // Facility
        { wch: 12 }, // BC Code
        { wch: 30 }, // Aju Number
        { wch: 14 }, // No Daftar
        { wch: 20 }, // Amount
        { wch: 16 }, // Description
        { wch: 22 }, // Warehouse Transaction
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Receive Notes");

      XLSX.writeFile(
        workbook,
        `Receive_Note_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      setExportNotice(
        `Successfully exported ${sortedRecords.length} Receive Note record(s) to Excel.`
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
    <div className="rn-page">
      {/* Top Header */}
      <div className="rn-page-header">
        <h1 className="rn-page-title">Receive Note</h1>
        <div className="rn-header-actions">
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
        <div className="rn-alert rn-alert--info">
          <Icon name="check" size={15} />
          <div className="rn-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="rn-alert-close"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rn-table-card">
        {/* Filter Area (Matching Screenshot 1) */}
        <div className="rn-filter-bar">
          {/* General Search */}
          <div className="rn-filter-item rn-filter-search">
            <label className="rn-filter-label">Search</label>
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
          <div className="rn-filter-item rn-filter-date-range">
            <label className="rn-filter-label">Range Date</label>
            <div className="rn-date-inputs">
              <input
                type="date"
                className="rn-date-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span className="rn-date-sep">-</span>
              <input
                type="date"
                className="rn-date-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Supplier Dropdown */}
          <div className="rn-filter-item rn-filter-supplier">
            <label className="rn-filter-label">Supplier</label>
            <select
              className="rn-filter-select"
              value={selectedSupplier}
              onChange={(e) => {
                setSelectedSupplier(e.target.value);
                setCurrentPage(1);
              }}
            >
              {suppliersList.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          {/* Type of Document Dropdown */}
          <div className="rn-filter-item rn-filter-doctype">
            <label className="rn-filter-label">Type of Document</label>
            <select
              className="rn-filter-select"
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
          <div className="rn-filter-settings">
            <button
              type="button"
              className="rn-btn-settings"
              title="Table Column Settings"
              aria-label="Table settings"
            >
              <Icon name="settings" size={16} />
              <Icon name="chevronDown" size={12} />
            </button>
          </div>
        </div>

        {/* 11-Column Table Container */}
        <div className="rn-table-wrapper">
          <table className="rn-table">
            <thead>
              <tr>
                <th className="rn-th-no">No</th>
                <th
                  className="rn-th-sortable"
                  onClick={() => handleSort("rnNumber")}
                >
                  <div className="rn-th-content">
                    <span>RN Number</span>
                    {renderSortIndicator("rnNumber")}
                  </div>
                </th>
                <th
                  className="rn-th-sortable"
                  onClick={() => handleSort("poNumber")}
                >
                  <div className="rn-th-content">
                    <span>PO Number</span>
                    {renderSortIndicator("poNumber")}
                  </div>
                </th>
                <th
                  className="rn-th-sortable"
                  onClick={() => handleSort("date")}
                >
                  <div className="rn-th-content">
                    <span>Date</span>
                    {renderSortIndicator("date")}
                  </div>
                </th>
                <th
                  className="rn-th-sortable"
                  onClick={() => handleSort("supplier")}
                >
                  <div className="rn-th-content">
                    <span>Supplier</span>
                    {renderSortIndicator("supplier")}
                  </div>
                </th>
                <th
                  className="rn-th-sortable"
                  onClick={() => handleSort("facility")}
                >
                  <div className="rn-th-content">
                    <span>Facility</span>
                    {renderSortIndicator("facility")}
                  </div>
                </th>
                <th
                  className="rn-th-sortable"
                  onClick={() => handleSort("ajuNumber")}
                >
                  <div className="rn-th-content">
                    <span>Aju Number/Registration Number</span>
                    {renderSortIndicator("ajuNumber")}
                  </div>
                </th>
                <th
                  className="rn-th-sortable text-right"
                  onClick={() => handleSort("amount")}
                >
                  <div className="rn-th-content justify-end">
                    <span>Amount</span>
                    {renderSortIndicator("amount")}
                  </div>
                </th>
                <th>Description</th>
                <th>Warehouse Transaction</th>
                <th className="rn-th-option text-center">Option</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="rn-table-empty">
                    No Receive Note records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rn, idx) => {
                  const sequentialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={rn.id}>
                      <td className="rn-td-no text-center">{sequentialNumber}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span className="font-semibold text-ink">{rn.rnNumber}</span>
                          <ApprovalStatusBadge status={rn.status || "WAITING_APPROVE_1"} showIcon={false} />
                        </div>
                        <div className="text-xs text-muted">
                          Arrival Date: {rn.arrivalDate}
                        </div>
                      </td>
                      <td className="font-medium text-ink">{rn.poNumber}</td>
                      <td>{rn.date}</td>
                      <td className="font-medium">{rn.supplier}</td>
                      <td>
                        <div className="rn-facility-cell">
                          <span className="rn-facility-title">{rn.facility}</span>
                          <span className="rn-badge-bc">{rn.bcCode}</span>
                        </div>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="rn-link-aju"
                          onClick={() => onViewDetail(rn.rnNumber)}
                          title="View document details"
                        >
                          {rn.ajuNumber}
                        </button>
                        <div className="text-xs text-muted">
                          No. Daftar: {rn.noDaftar}
                        </div>
                      </td>
                      <td className="text-right font-mono font-medium text-ink">
                        {rn.amountFormatted}
                      </td>
                      <td className="text-muted">{rn.description}</td>
                      <td className="text-muted">{rn.warehouseTransaction}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="rn-btn-row-action"
                          onClick={() => onViewDetail(rn.rnNumber)}
                          title="View Detail Receive Note"
                          aria-label={`View detail for ${rn.rnNumber}`}
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

export default ReceiveNoteIndex;
