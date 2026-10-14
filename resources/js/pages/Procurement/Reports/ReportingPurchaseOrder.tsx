import { useState, useMemo, useCallback } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Badge } from "../../../components/ui/Badge";
import {
  initialPoReportRecords,
  poReportSuppliersList,
} from "./po-report-data";
import type {
  PoReportRecord,
  PoReceivingStatus,
} from "./po-report-types";

interface ReportingPurchaseOrderProps {
  onDetail?: (poNumber: string) => void;
}

type SortField =
  | "poNumber"
  | "purchaseDateRaw"
  | "supplier"
  | "discount"
  | "vat"
  | "subtotal"
  | "poStatus"
  | "receivingStatus"
  | "facilityType"
  | "createdBy";

type SortDirection = "asc" | "desc" | null;

/**
 * Format ISO YYYY-MM-DD into DD-MM-YYYY for display in input
 */
function toDisplayDate(isoDate: string): string {
  if (!isoDate || !isoDate.includes("-")) return isoDate;
  const parts = isoDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDate;
}

/**
 * Parse DD-MM-YYYY into ISO YYYY-MM-DD for date comparison
 */
function fromDisplayDate(displayDate: string): string {
  if (!displayDate || !displayDate.includes("-")) return displayDate;
  const parts = displayDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return displayDate;
}

export function ReportingPurchaseOrder({
  onDetail,
}: ReportingPurchaseOrderProps) {
  // ---------------------------------------------------------------------------
  // Filter States
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("01-07-2026");
  const [endDate, setEndDate] = useState("31-10-2026");
  const [supplierFilter, setSupplierFilter] = useState("Choose Supplier");
  const [receivingFilter, setReceivingFilter] = useState<
    PoReceivingStatus | "Show All"
  >("Show All");

  // ---------------------------------------------------------------------------
  // Sorting State
  // ---------------------------------------------------------------------------
  const [sortField, setSortField] = useState<SortField | null>("purchaseDateRaw");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // ---------------------------------------------------------------------------
  // Pagination State
  // ---------------------------------------------------------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // ---------------------------------------------------------------------------
  // Row Expansion State for Nested PO Details
  // ---------------------------------------------------------------------------
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({
    // Expand first two rows initially to match reference interactive showcase
    "po-rep-1": true,
    "po-rep-2": true,
  });

  const toggleRowDetail = useCallback((id: string) => {
    setExpandedRowIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []);

  // ---------------------------------------------------------------------------
  // Sorting Handler
  // ---------------------------------------------------------------------------
  const handleToggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        if (sortDirection === "asc") {
          setSortDirection("desc");
        } else if (sortDirection === "desc") {
          setSortField(null);
          setSortDirection(null);
        } else {
          setSortDirection("asc");
        }
      } else {
        setSortField(field);
        setSortDirection("asc");
      }
      setCurrentPage(1);
    },
    [sortField, sortDirection]
  );

  // ---------------------------------------------------------------------------
  // Filter & Sort Pipeline
  // ---------------------------------------------------------------------------
  const filteredAndSortedRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    const isoStart = fromDisplayDate(startDate);
    const isoEnd = fromDisplayDate(endDate);

    const filtered = initialPoReportRecords.filter((record) => {
      // Search matching across PO number, supplier, description, facility, creator, and line items
      if (q) {
        const matchesPo = record.poNumber.toLowerCase().includes(q);
        const matchesSupplier = record.supplier.toLowerCase().includes(q);
        const matchesDesc = record.description.toLowerCase().includes(q);
        const matchesFacility = record.facilityType.toLowerCase().includes(q);
        const matchesCreator = record.createdBy.toLowerCase().includes(q);
        const matchesItems = record.items?.some(
          (item) =>
            item.itemCode.toLowerCase().includes(q) ||
            item.itemName.toLowerCase().includes(q) ||
            item.prNumber.toLowerCase().includes(q)
        );

        if (
          !matchesPo &&
          !matchesSupplier &&
          !matchesDesc &&
          !matchesFacility &&
          !matchesCreator &&
          !matchesItems
        ) {
          return false;
        }
      }

      // Date Range Filter (applied on purchaseDateRaw)
      if (isoStart && record.purchaseDateRaw < isoStart) return false;
      if (isoEnd && record.purchaseDateRaw > isoEnd) return false;

      // Supplier Filter
      if (
        supplierFilter !== "Choose Supplier" &&
        record.supplier !== supplierFilter
      ) {
        return false;
      }

      // Receiving Status Filter
      if (
        receivingFilter !== "Show All" &&
        record.receivingStatus !== receivingFilter
      ) {
        return false;
      }

      return true;
    });

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let valA: string | number = a[sortField] ?? "";
        let valB: string | number = b[sortField] ?? "";

        if (typeof valA === "string") {
          valA = valA.toLowerCase();
          valB = (valB as string).toLowerCase();
        }

        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [
    search,
    startDate,
    endDate,
    supplierFilter,
    receivingFilter,
    sortField,
    sortDirection,
  ]);

  // ---------------------------------------------------------------------------
  // Pagination Calculations
  // ---------------------------------------------------------------------------
  const totalEntries = filteredAndSortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedRecords = useMemo(() => {
    return filteredAndSortedRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedRecords, startIndex, pageSize]);

  const startEntryNumber = totalEntries === 0 ? 0 : startIndex + 1;
  const endEntryNumber = Math.min(startIndex + pageSize, totalEntries);

  // ---------------------------------------------------------------------------
  // Excel Export Handler (CSV with UTF-8 BOM for Microsoft Excel Compatibility)
  // ---------------------------------------------------------------------------
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExportToExcel = () => {
    if (filteredAndSortedRecords.length === 0) {
      alert("No records to export with the current filter selection.");
      return;
    }

    const headers = [
      "No",
      "Purchase Order Number",
      "Purchase Date",
      "Supplier",
      "Discount",
      "Value Added Tax",
      "Subtotal",
      "Description",
      "Purchase Order Status",
      "Receiving Status",
      "Facility Type",
      "Created By",
      "Created At",
      "Item Code",
      "Item Name",
      "Source PR",
      "Unit",
      "Qty",
      "Unit Price",
      "Item Discount",
      "Item Subtotal",
      "Qty BPB",
      "Qty Outstanding",
      "Item Remark",
    ];

    const rows: string[][] = [];

    filteredAndSortedRecords.forEach((rec, idx) => {
      const baseRow = [
        String(idx + 1),
        `"${rec.poNumber.replace(/"/g, '""')}"`,
        `"${rec.purchaseDate}"`,
        `"${rec.supplier.replace(/"/g, '""')}"`,
        rec.discount.toFixed(2),
        rec.vat.toFixed(2),
        rec.subtotal.toFixed(2),
        `"${rec.description.replace(/"/g, '""')}"`,
        `"${rec.poStatus}"`,
        `"${rec.receivingStatus}"`,
        `"${rec.facilityType}"`,
        `"${rec.createdBy}"`,
        `"${rec.createdAt}"`,
      ];

      if (rec.items && rec.items.length > 0) {
        rec.items.forEach((item) => {
          rows.push([
            ...baseRow,
            `"${item.itemCode}"`,
            `"${item.itemName.replace(/"/g, '""')}"`,
            `"${item.prNumber}"`,
            `"${item.unit}"`,
            item.qty.toFixed(2),
            item.unitPrice.toFixed(2),
            item.discount.toFixed(2),
            item.subtotal.toFixed(2),
            (item.qtyBpb ?? 0).toFixed(2),
            (item.qtyOutstanding ?? 0).toFixed(2),
            `"${(item.remark ?? "").replace(/"/g, '""')}"`,
          ]);
        });
      } else {
        rows.push([
          ...baseRow,
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
          '""',
        ]);
      }
    });

    const csvContent =
      "\uFEFF" +
      headers.join(",") +
      "\n" +
      rows.map((r) => r.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    link.href = url;
    link.setAttribute("download", `Reporting_Purchase_Order_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(
      `Exported ${filteredAndSortedRecords.length} PO records to Excel-compatible CSV.`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Helper for generating page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) pages.push("...");
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  }, [totalPages, safeCurrentPage]);

  return (
    <div className="po-report-page">
      {/* ------------------------------------------------------------------- */}
      {/* Single-Row Compact Filter Section                                   */}
      {/* ------------------------------------------------------------------- */}
      <section className="po-report-filters" aria-label="Purchase Order Report Filters">
        <div className="po-report-filters-row">
          {/* Search */}
          <div className="po-filter-group">
            <label className="po-filter-label" htmlFor="po-search-input">
              Search
            </label>
            <div className="po-search-box">
              <Icon name="search" size={15} />
              <input
                id="po-search-input"
                className="po-search-input"
                type="text"
                placeholder="Search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  className="po-search-clear"
                  onClick={() => {
                    setSearch("");
                    setCurrentPage(1);
                  }}
                  title="Clear search"
                >
                  <Icon name="close" size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Date Range */}
          <div className="po-filter-group">
            <label className="po-filter-label">Date Range</label>
            <div className="po-date-range">
              <input
                type="text"
                className="po-date-input"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="DD-MM-YYYY"
              />
              <span className="po-date-separator">-</span>
              <input
                type="text"
                className="po-date-input"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="DD-MM-YYYY"
              />
            </div>
          </div>

          {/* Supplier Dropdown */}
          <div className="po-filter-group">
            <label className="po-filter-label" htmlFor="po-supplier-select">
              Supplier
            </label>
            <select
              id="po-supplier-select"
              className="po-select-input"
              value={supplierFilter}
              onChange={(e) => {
                setSupplierFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {poReportSuppliersList.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>

          {/* Receiving Status Dropdown */}
          <div className="po-filter-group">
            <label className="po-filter-label" htmlFor="po-receiving-select">
              Receiving Status
            </label>
            <select
              id="po-receiving-select"
              className="po-select-input"
              value={receivingFilter}
              onChange={(e) => {
                setReceivingFilter(
                  e.target.value as PoReceivingStatus | "Show All"
                );
                setCurrentPage(1);
              }}
            >
              <option value="Show All">Show All</option>
              <option value="Complete">Complete</option>
              <option value="Outstanding">Outstanding</option>
            </select>
          </div>

          {/* Export To Excel Action Button */}
          <button
            type="button"
            className="btn-export-excel"
            onClick={handleExportToExcel}
            title="Export filtered records to Excel compatible CSV"
          >
            <Icon name="file" size={14} />
            <span>Export To Excel</span>
          </button>
        </div>

        {exportNotice && (
          <div
            style={{
              marginTop: "8px",
              fontSize: "11px",
              color: "#16a34a",
              fontWeight: 600,
            }}
          >
            ✓ {exportNotice}
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* Main Reporting Purchase Order Table with Horizontal Scroll           */}
      {/* ------------------------------------------------------------------- */}
      <section className="po-report-table-card">
        <div className="po-report-table-scroll">
          <table className="po-report-table">
            <thead>
              <tr>
                {/* 1. Number */}
                <th className="th--center" style={{ width: "42px" }}>
                  No
                </th>

                {/* 2. Purchase Order Number */}
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("poNumber")}
                  style={{ width: "165px" }}
                >
                  <span className="po-sort-header">
                    Purchase Order Number
                    <span
                      className={`po-sort-icon ${
                        sortField === "poNumber" ? "po-sort-icon--active" : ""
                      }`}
                    >
                      {sortField === "poNumber"
                        ? sortDirection === "asc"
                          ? "▲"
                          : "▼"
                        : "⇅"}
                    </span>
                  </span>
                </th>

                {/* 3. Purchase Date */}
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("purchaseDateRaw")}
                  style={{ width: "105px" }}
                >
                  <span className="po-sort-header">
                    Purchase Date
                    {sortField === "purchaseDateRaw" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 4. Supplier */}
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("supplier")}
                  style={{ width: "220px" }}
                >
                  <span className="po-sort-header">
                    Supplier
                    {sortField === "supplier" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 5. Discount */}
                <th
                  className="th--right th--sortable"
                  onClick={() => handleToggleSort("discount")}
                  style={{ width: "95px" }}
                >
                  <span className="po-sort-header">
                    Discount
                    {sortField === "discount" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 6. Value Added Tax */}
                <th
                  className="th--right th--sortable"
                  onClick={() => handleToggleSort("vat")}
                  style={{ width: "115px" }}
                >
                  <span className="po-sort-header">
                    Value Added Tax
                    {sortField === "vat" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 7. Subtotal */}
                <th
                  className="th--right th--sortable"
                  onClick={() => handleToggleSort("subtotal")}
                  style={{ width: "135px" }}
                >
                  <span className="po-sort-header">
                    Subtotal
                    {sortField === "subtotal" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 8. Description */}
                <th style={{ width: "240px" }}>Description</th>

                {/* 9. Purchase Order Status */}
                <th
                  className="th--center th--sortable"
                  onClick={() => handleToggleSort("poStatus")}
                  style={{ width: "125px" }}
                >
                  <span className="po-sort-header">
                    PO Status
                    {sortField === "poStatus" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 10. Receiving Status */}
                <th
                  className="th--center th--sortable"
                  onClick={() => handleToggleSort("receivingStatus")}
                  style={{ width: "135px" }}
                >
                  <span className="po-sort-header">
                    Receiving Status
                    {sortField === "receivingStatus" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 11. Facility Type */}
                <th
                  className="th--center th--sortable"
                  onClick={() => handleToggleSort("facilityType")}
                  style={{ width: "125px" }}
                >
                  <span className="po-sort-header">
                    Facility Type
                    {sortField === "facilityType" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 12. Created Date / creator information */}
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("createdBy")}
                  style={{ width: "145px" }}
                >
                  <span className="po-sort-header">
                    Created By
                    {sortField === "createdBy" && (
                      <span className="po-sort-icon po-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* 13. Purchase Order Details Action */}
                <th className="th--center" style={{ width: "130px" }}>
                  Purchase Order Details
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={13}
                    style={{ textAlign: "center", padding: "36px" }}
                  >
                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                      No purchase order records match your filter criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => {
                  const sequentialNo = startIndex + index + 1;
                  const isExpanded = !!expandedRowIds[record.id];

                  return (
                    <tr key={record.id} style={{ display: "contents" }}>
                      {/* Main Record Row */}
                      <tr className={isExpanded ? "po-row--expanded" : ""}>
                        {/* 1. Sequential Number */}
                        <td className="td--center">{sequentialNo}</td>

                        {/* 2. Purchase Order Number (Link) */}
                        <td>
                          <span
                            className="po-link"
                            onClick={() =>
                              onDetail ? onDetail(record.poNumber) : undefined
                            }
                            title="View Purchase Order"
                          >
                            {record.poNumber}
                          </span>
                        </td>

                        {/* 3. Purchase Date */}
                        <td>{record.purchaseDate}</td>

                        {/* 4. Supplier */}
                        <td>{record.supplier}</td>

                        {/* 5. Discount */}
                        <td className="td--right">
                          {record.discount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* 6. Value Added Tax */}
                        <td className="td--right">
                          {record.vat.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* 7. Subtotal */}
                        <td className="td--right" style={{ fontWeight: 600 }}>
                          {record.subtotal.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>

                        {/* 8. Description */}
                        <td>{record.description}</td>

                        {/* 9. Purchase Order Status Badge */}
                        <td className="td--center">
                          <Badge tone={record.poStatus === "Approved" ? "green" : "cyan"}>
                            {record.poStatus}
                          </Badge>
                        </td>

                        {/* 10. Receiving Status Badge */}
                        <td className="td--center">
                          <Badge tone={record.receivingStatus === "Complete" ? "green" : "orange"}>
                            {record.receivingStatus}
                          </Badge>
                        </td>

                        {/* 11. Facility Type Badge */}
                        <td className="td--center">
                          <Badge tone={record.facilityType === "FASILITAS" ? "purple" : "gray"}>
                            {record.facilityType}
                          </Badge>
                        </td>

                        {/* 12. Created By / Timestamp */}
                        <td>
                          <div className="po-creator-cell">
                            <strong>{record.createdBy}</strong>
                            <span>{record.createdAt}</span>
                          </div>
                        </td>

                        {/* 13. Purchase Order Details (Show / Close Detail Toggle) */}
                        <td className="td--center">
                          <button
                            type="button"
                            className={`btn-po-detail-toggle ${
                              isExpanded
                                ? "btn-po-detail-toggle--close"
                                : "btn-po-detail-toggle--show"
                            }`}
                            onClick={() => toggleRowDetail(record.id)}
                            title={
                              isExpanded
                                ? "Close Purchase Order Details"
                                : "Show Purchase Order Details"
                            }
                          >
                            {isExpanded ? "Close Detail" : "Show Detail"}
                          </button>
                        </td>
                      </tr>

                      {/* Nested PO Line Items Detail Table when Expanded */}
                      {isExpanded && (
                        <tr className="po-nested-row">
                          <td colSpan={13}>
                            <div className="nested-po-items-wrapper">
                              {record.items && record.items.length > 0 ? (
                                <div className="nested-po-items-card">
                                  <table className="nested-po-items-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: "135px" }}>Item Code</th>
                                      <th style={{ width: "230px" }}>Item Name</th>
                                      <th style={{ width: "165px" }}>Source PR</th>
                                      <th className="th--center" style={{ width: "70px" }}>Unit</th>
                                      <th className="th--right" style={{ width: "95px" }}>Qty</th>
                                      <th className="th--right" style={{ width: "115px" }}>Unit Price</th>
                                      <th className="th--right" style={{ width: "95px" }}>Discount</th>
                                      <th className="th--right" style={{ width: "125px" }}>Subtotal</th>
                                      <th className="th--right" style={{ width: "95px" }}>Qty BPB</th>
                                      <th className="th--right" style={{ width: "110px" }}>Qty Outstanding</th>
                                      <th style={{ width: "200px" }}>Remark</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {record.items.map((item) => (
                                      <tr key={item.id}>
                                        <td>{item.itemCode}</td>
                                        <td>{item.itemName}</td>
                                        <td>
                                          <span className="po-link">{item.prNumber}</span>
                                        </td>
                                        <td className="td--center">{item.unit}</td>
                                        <td className="td--right">
                                          {item.qty.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="td--right">
                                          {item.unitPrice.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="td--right">
                                          {item.discount.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="td--right" style={{ fontWeight: 600 }}>
                                          {item.subtotal.toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="td--right">
                                          {(item.qtyBpb ?? 0).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td className="td--right">
                                          {(item.qtyOutstanding ?? 0).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                        </td>
                                        <td>{item.remark || "-"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                                <div className="nested-po-items-empty">
                                  No line items recorded for this purchase order.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* Table Footer: Sequential Entry Summary & Bottom-Right Pagination    */}
        {/* ------------------------------------------------------------------- */}
        <div className="po-report-footer">
          <div className="po-report-footer__info">
            Showing {startEntryNumber} to {endEntryNumber} of{" "}
            {totalEntries.toLocaleString()} entries
          </div>

          <div className="po-report-footer__controls">
            <div className="po-report-pages">
              {/* Previous Page Button */}
              <button
                type="button"
                className="po-page-btn"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                &lt;
              </button>

              {/* Numbered Page Buttons with Ellipsis */}
              {pageNumbers.map((p, pIndex) =>
                p === "..." ? (
                  <span
                    key={`ellipsis-${pIndex}`}
                    className="po-page-ellipsis"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={`page-${p}`}
                    type="button"
                    className={`po-page-btn ${
                      p === safeCurrentPage ? "po-page-btn--active" : ""
                    }`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                )
              )}

              {/* Next Page Button */}
              <button
                type="button"
                className="po-page-btn"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                &gt;
              </button>
            </div>

            {/* Rows / Page Size Selector */}
            <div className="po-page-size-selector">
              <span>Rows</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default ReportingPurchaseOrder;
