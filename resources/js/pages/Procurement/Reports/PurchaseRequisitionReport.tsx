import { useState, useMemo, useCallback } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Badge } from "../../../components/ui/Badge";
import { Pagination } from "../../../components/ui/Pagination";
import {
  initialPrReportRecords,
  departmentsList,
  sectionsList,
} from "./pr-report-data";
import type {
  PrReportRecord,
  PrReportStatus,
  PrApprovalStatus,
} from "./pr-report-types";

interface PurchaseRequisitionReportProps {
  onDetail?: (prNumber: string) => void;
}

type SortField =
  | "prNumber"
  | "prDateRaw"
  | "dateRequiredRaw"
  | "facilityType"
  | "itemCode"
  | "itemName"
  | "qtyRequest"
  | "qtyPurchase"
  | "qtyRemain"
  | "status"
  | "approvalDate2"
  | "approvalStatus";

type SortDirection = "asc" | "desc" | null;

/**
 * Format a YYYY-MM-DD string into DD-MM-YYYY for display in the filters.
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
 * Parse a DD-MM-YYYY string into YYYY-MM-DD for comparison.
 */
function fromDisplayDate(displayDate: string): string {
  if (!displayDate || !displayDate.includes("-")) return displayDate;
  const parts = displayDate.split("-");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return displayDate;
}

export function PurchaseRequisitionReport({
  onDetail,
}: PurchaseRequisitionReportProps) {
  // ---------------------------------------------------------------------------
  // Filter States
  // ---------------------------------------------------------------------------
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("14-07-2026");
  const [endDate, setEndDate] = useState("14-10-2026");
  const [statusFilter, setStatusFilter] = useState<PrReportStatus | "All">("All");
  const [deptFilter, setDeptFilter] = useState("All Departemen");
  const [sectionFilter, setSectionFilter] = useState("All Section");
  const [approvalFilter, setApprovalFilter] = useState<PrApprovalStatus | "All">(
    "All"
  );

  // ---------------------------------------------------------------------------
  // Sorting State
  // ---------------------------------------------------------------------------
  const [sortField, setSortField] = useState<SortField | null>("prDateRaw");
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
    // Expand first two rows initially to match the reference screenshot demo
    "pr-rep-1": true,
    "pr-rep-2": true,
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

    const filtered = initialPrReportRecords.filter((record) => {
      // Search matching across PR number, items, type, supplier, and code
      if (q) {
        const matchesPr = record.prNumber.toLowerCase().includes(q);
        const matchesCode = record.itemCode.toLowerCase().includes(q);
        const matchesName = record.itemName.toLowerCase().includes(q);
        const matchesUnit = record.unitCode.toLowerCase().includes(q);
        const matchesType = record.facilityType.toLowerCase().includes(q);
        const matchesDept = record.deptRequest.toLowerCase().includes(q);
        const matchesSection = record.section.toLowerCase().includes(q);
        const matchesPo = record.poDetails?.some(
          (p) =>
            p.poCode.toLowerCase().includes(q) ||
            p.supplierName.toLowerCase().includes(q)
        );

        if (
          !matchesPr &&
          !matchesCode &&
          !matchesName &&
          !matchesUnit &&
          !matchesType &&
          !matchesDept &&
          !matchesSection &&
          !matchesPo
        ) {
          return false;
        }
      }

      // Date Range Filter (PR Date)
      if (isoStart && record.prDateRaw < isoStart) return false;
      if (isoEnd && record.prDateRaw > isoEnd) return false;

      // Status Filter
      if (statusFilter !== "All" && record.status !== statusFilter) {
        return false;
      }

      // Department Filter
      if (
        deptFilter !== "All Departemen" &&
        record.deptRequest !== deptFilter
      ) {
        return false;
      }

      // Section Filter
      if (sectionFilter !== "All Section" && record.section !== sectionFilter) {
        return false;
      }

      // Approval Status Filter
      if (
        approvalFilter !== "All" &&
        record.approvalStatus !== approvalFilter
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
    statusFilter,
    deptFilter,
    sectionFilter,
    approvalFilter,
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
      "PR Number",
      "PR Date",
      "Date Required",
      "Type",
      "Item Code",
      "Item Name",
      "Unit Code",
      "Qty Request",
      "Qty Purchase",
      "Qty Remain",
      "Status",
      "Approval Date 1",
      "Approval Date 2",
      "Status Approval",
      "Last Updated By",
      "Last Updated At",
      "Dept Request",
      "Section",
      "Related PO Code",
      "PO Supplier",
      "Qty PO",
      "Qty BPB",
      "Qty Outstanding",
    ];

    const rows: string[][] = [];

    filteredAndSortedRecords.forEach((rec, idx) => {
      const baseRow = [
        String(idx + 1),
        `"${rec.prNumber.replace(/"/g, '""')}"`,
        `"${rec.prDate}"`,
        `"${rec.dateRequired}"`,
        `"${rec.facilityType}"`,
        `"${rec.itemCode}"`,
        `"${rec.itemName.replace(/"/g, '""')}"`,
        `"${rec.unitCode}"`,
        rec.qtyRequest.toFixed(4),
        rec.qtyPurchase.toFixed(4),
        rec.qtyRemain.toFixed(4),
        `"${rec.status}"`,
        `"${rec.approvalDate1}"`,
        `"${rec.approvalDate2}"`,
        `"${rec.approvalStatus}"`,
        `"${rec.lastUpdatedBy}"`,
        `"${rec.lastUpdatedAt}"`,
        `"${rec.deptRequest}"`,
        `"${rec.section}"`,
      ];

      if (rec.poDetails && rec.poDetails.length > 0) {
        rec.poDetails.forEach((po) => {
          rows.push([
            ...baseRow,
            `"${po.poCode}"`,
            `"${po.supplierName.replace(/"/g, '""')}"`,
            po.qtyPo.toFixed(2),
            po.qtyBpb.toFixed(2),
            po.qtyOutstanding.toFixed(2),
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
    link.setAttribute("download", `Report_Purchase_Requisition_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportNotice(
      `Exported ${filteredAndSortedRecords.length} records to Excel-compatible CSV.`
    );
    setTimeout(() => setExportNotice(null), 4000);
  };

  // Helper for generating page buttons with ellipsis
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
    <div className="pr-report-page">
      {/* ------------------------------------------------------------------- */}
      {/* Two-Row Compact Filter Section Matching Reference                    */}
      {/* ------------------------------------------------------------------- */}
      <section className="pr-report-filters" aria-label="Report Filters">
        {/* Row 1: Search, Date Range, Status, Dept. Request, Section */}
        <div className="pr-report-filters-row">
          {/* Search */}
          <div className="pr-filter-group">
            <label className="pr-filter-label" htmlFor="pr-search-input">
              Search
            </label>
            <div className="pr-search-box">
              <Icon name="search" size={15} />
              <input
                id="pr-search-input"
                className="pr-search-input"
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
                  className="pr-search-clear"
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
          <div className="pr-filter-group">
            <label className="pr-filter-label">Date</label>
            <div className="pr-date-range">
              <input
                type="text"
                className="pr-date-input"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="DD-MM-YYYY"
              />
              <span className="pr-date-separator">-</span>
              <input
                type="text"
                className="pr-date-input"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="DD-MM-YYYY"
              />
            </div>
          </div>

          {/* Status Radio Group */}
          <div className="pr-filter-group">
            <label className="pr-filter-label">Status</label>
            <div className="pr-radio-group--two-tier">
              <div className="pr-radio-row">
                <label className="pr-radio-item">
                  <input
                    type="radio"
                    name="status-filter"
                    value="All"
                    checked={statusFilter === "All"}
                    onChange={() => {
                      setStatusFilter("All");
                      setCurrentPage(1);
                    }}
                  />
                  <span>All</span>
                </label>
                <label className="pr-radio-item">
                  <input
                    type="radio"
                    name="status-filter"
                    value="Completed"
                    checked={statusFilter === "Completed"}
                    onChange={() => {
                      setStatusFilter("Completed");
                      setCurrentPage(1);
                    }}
                  />
                  <span>Completed</span>
                </label>
              </div>
              <div className="pr-radio-row">
                <label className="pr-radio-item">
                  <input
                    type="radio"
                    name="status-filter"
                    value="Outstanding"
                    checked={statusFilter === "Outstanding"}
                    onChange={() => {
                      setStatusFilter("Outstanding");
                      setCurrentPage(1);
                    }}
                  />
                  <span>Outstanding</span>
                </label>
              </div>
            </div>
          </div>

          {/* Dept. Request Dropdown */}
          <div className="pr-filter-group">
            <label className="pr-filter-label" htmlFor="pr-dept-select">
              Dept. Request
            </label>
            <select
              id="pr-dept-select"
              className="pr-select-input"
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {departmentsList.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Section Dropdown */}
          <div className="pr-filter-group">
            <label className="pr-filter-label" htmlFor="pr-section-select">
              Section
            </label>
            <select
              id="pr-section-select"
              className="pr-select-input"
              value={sectionFilter}
              onChange={(e) => {
                setSectionFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {sectionsList.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Approval Status_PR & Export To Excel Action */}
        <div className="pr-report-filters-row pr-report-filters-row--second">
          <div className="pr-filter-group pr-filter-group--inline">
            <span className="pr-filter-label">Approval Status_PR</span>
            <div className="pr-radio-group">
              <label className="pr-radio-item">
                <input
                  type="radio"
                  name="approval-status-filter"
                  value="All"
                  checked={approvalFilter === "All"}
                  onChange={() => {
                    setApprovalFilter("All");
                    setCurrentPage(1);
                  }}
                />
                <span>All</span>
              </label>
              <label className="pr-radio-item">
                <input
                  type="radio"
                  name="approval-status-filter"
                  value="Ready"
                  checked={approvalFilter === "Ready"}
                  onChange={() => {
                    setApprovalFilter("Ready");
                    setCurrentPage(1);
                  }}
                />
                <span>Ready</span>
              </label>
              <label className="pr-radio-item">
                <input
                  type="radio"
                  name="approval-status-filter"
                  value="Approve 1"
                  checked={approvalFilter === "Approve 1"}
                  onChange={() => {
                    setApprovalFilter("Approve 1");
                    setCurrentPage(1);
                  }}
                />
                <span>Approve 1</span>
              </label>
              <label className="pr-radio-item">
                <input
                  type="radio"
                  name="approval-status-filter"
                  value="Approve 2"
                  checked={approvalFilter === "Approve 2"}
                  onChange={() => {
                    setApprovalFilter("Approve 2");
                    setCurrentPage(1);
                  }}
                />
                <span>Approve 2</span>
              </label>
              <label className="pr-radio-item">
                <input
                  type="radio"
                  name="approval-status-filter"
                  value="Closed"
                  checked={approvalFilter === "Closed"}
                  onChange={() => {
                    setApprovalFilter("Closed");
                    setCurrentPage(1);
                  }}
                />
                <span>Closed</span>
              </label>
            </div>
          </div>

          {/* Export to Excel Action */}
          <button
            type="button"
            className="btn-export-excel"
            onClick={handleExportToExcel}
            title="Export current filtered records to Excel compatible CSV"
          >
            <span>Export To Excel</span>
          </button>

          {exportNotice && (
            <span
              style={{
                fontSize: "11px",
                color: "#16a34a",
                fontWeight: 600,
                marginLeft: "8px",
              }}
            >
              ✓ {exportNotice}
            </span>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------------- */}
      {/* Main Report Table with Two-Tier Grouped Headers & Details Expansion  */}
      {/* ------------------------------------------------------------------- */}
      <section className="pr-report-table-card">
        <div className="pr-report-table-scroll">
          <table className="pr-report-table">
            <thead>
              {/* Header Tier 1: Grouped Headings */}
              <tr>
                <th rowSpan={2} className="th--center" style={{ width: "42px" }}>
                  No
                </th>
                <th colSpan={3} className="th--center">
                  Purchase Requisition
                </th>
                <th
                  rowSpan={2}
                  className="th--sortable"
                  onClick={() => handleToggleSort("facilityType")}
                  style={{ width: "120px" }}
                >
                  <span className="pr-sort-header">
                    Type
                    {sortField === "facilityType" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
                <th colSpan={2} className="th--center">
                  Item
                </th>
                <th rowSpan={2} className="th--center" style={{ width: "70px" }}>
                  Unit Code
                </th>
                <th colSpan={3} className="th--center">
                  Quantity
                </th>
                <th
                  rowSpan={2}
                  className="th--center th--sortable"
                  onClick={() => handleToggleSort("status")}
                  style={{ width: "95px" }}
                >
                  <span className="pr-sort-header">
                    Status
                    {sortField === "status" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
                <th colSpan={3} className="th--center">
                  Approval
                </th>
                <th rowSpan={2} style={{ width: "135px" }}>
                  Last Updated
                </th>
                <th
                  rowSpan={2}
                  className="th--center"
                  style={{ width: "130px" }}
                >
                  Purchase Requisition Details
                </th>
              </tr>

              {/* Header Tier 2: Sub-Columns */}
              <tr>
                {/* Under Purchase Requisition */}
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("prNumber")}
                  style={{ width: "175px" }}
                >
                  <span className="pr-sort-header">
                    Number
                    <span
                      className={`pr-sort-icon ${
                        sortField === "prNumber" ? "pr-sort-icon--active" : ""
                      }`}
                    >
                      {sortField === "prNumber"
                        ? sortDirection === "asc"
                          ? "▲"
                          : "▼"
                        : "⇅"}
                    </span>
                  </span>
                </th>
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("prDateRaw")}
                  style={{ width: "95px" }}
                >
                  <span className="pr-sort-header">
                    Date
                    {sortField === "prDateRaw" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("dateRequiredRaw")}
                  style={{ width: "105px" }}
                >
                  <span className="pr-sort-header">
                    Date Required
                    {sortField === "dateRequiredRaw" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* Under Item */}
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("itemCode")}
                  style={{ width: "125px" }}
                >
                  <span className="pr-sort-header">
                    Code
                    {sortField === "itemCode" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("itemName")}
                  style={{ width: "230px" }}
                >
                  <span className="pr-sort-header">
                    Name
                    {sortField === "itemName" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* Under Quantity */}
                <th
                  className="th--right th--sortable"
                  onClick={() => handleToggleSort("qtyRequest")}
                  style={{ width: "80px" }}
                >
                  <span className="pr-sort-header">
                    Request
                    {sortField === "qtyRequest" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
                <th
                  className="th--right th--sortable"
                  onClick={() => handleToggleSort("qtyPurchase")}
                  style={{ width: "80px" }}
                >
                  <span className="pr-sort-header">
                    Purchase
                    {sortField === "qtyPurchase" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
                <th
                  className="th--right th--sortable"
                  onClick={() => handleToggleSort("qtyRemain")}
                  style={{ width: "80px" }}
                >
                  <span className="pr-sort-header">
                    Remain
                    {sortField === "qtyRemain" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>

                {/* Under Approval */}
                <th style={{ width: "95px" }}>Approval Date 1</th>
                <th
                  className="th--sortable"
                  onClick={() => handleToggleSort("approvalDate2")}
                  style={{ width: "105px" }}
                >
                  <span className="pr-sort-header">
                    Approval Date 2
                    <span
                      className={`pr-sort-icon ${
                        sortField === "approvalDate2"
                          ? "pr-sort-icon--active"
                          : ""
                      }`}
                    >
                      {sortField === "approvalDate2"
                        ? sortDirection === "asc"
                          ? "▲"
                          : "▼"
                        : "⇅"}
                    </span>
                  </span>
                </th>
                <th
                  className="th--center th--sortable"
                  onClick={() => handleToggleSort("approvalStatus")}
                  style={{ width: "115px" }}
                >
                  <span className="pr-sort-header">
                    Status Approval
                    {sortField === "approvalStatus" && (
                      <span className="pr-sort-icon pr-sort-icon--active">
                        {sortDirection === "asc" ? "▲" : "▼"}
                      </span>
                    )}
                  </span>
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={17} style={{ textAlign: "center", padding: "36px" }}>
                    <div style={{ color: "#64748b", fontSize: "13px" }}>
                      No purchase requisition records match your filter criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record, index) => {
                  const sequentialNo = startIndex + index + 1;
                  const isExpanded = !!expandedRowIds[record.id];

                  return (
                    <tr key={record.id} style={{ display: "contents" }}>
                      {/* Main Data Row */}
                      <tr className={isExpanded ? "pr-row--expanded" : ""}>
                        {/* No: Sequential number */}
                        <td className="td--center">{sequentialNo}</td>

                        {/* Purchase Requisition: Number */}
                        <td>
                          <span
                            className="pr-link"
                            onClick={() =>
                              onDetail
                                ? onDetail(record.prNumber)
                                : undefined
                            }
                            title="View Purchase Requisition"
                          >
                            {record.prNumber}
                          </span>
                        </td>

                        {/* Purchase Requisition: Date */}
                        <td>{record.prDate}</td>

                        {/* Purchase Requisition: Date Required */}
                        <td>{record.dateRequired}</td>

                        {/* Type */}
                        <td className="td--center">
                          <Badge tone={record.facilityType === "FASILITAS" ? "purple" : "gray"}>
                            {record.facilityType}
                          </Badge>
                        </td>

                        {/* Item: Code */}
                        <td>{record.itemCode}</td>

                        {/* Item: Name */}
                        <td>{record.itemName}</td>

                        {/* Unit Code */}
                        <td className="td--center">{record.unitCode}</td>

                        {/* Quantity: Request (formatted 4 decimals) */}
                        <td className="td--right">
                          {record.qtyRequest.toFixed(4)}
                        </td>

                        {/* Quantity: Purchase (formatted 4 decimals) */}
                        <td className="td--right">
                          {record.qtyPurchase.toFixed(4)}
                        </td>

                        {/* Quantity: Remain (formatted 4 decimals) */}
                        <td className="td--right">
                          {record.qtyRemain.toFixed(4)}
                        </td>

                        {/* Status Badge */}
                        <td className="td--center">
                          <Badge tone={record.status === "Completed" ? "green" : "orange"}>
                            {record.status}
                          </Badge>
                        </td>

                        {/* Approval Date 1 */}
                        <td className="td--center">{record.approvalDate1}</td>

                        {/* Approval Date 2 */}
                        <td className="td--center">{record.approvalDate2}</td>

                        {/* Status Approval Badge */}
                        <td className="td--center">
                          <Badge tone="blue">
                            ✓ {record.approvalStatus}
                          </Badge>
                        </td>

                        {/* Last Updated: Name + Timestamp */}
                        <td>
                          <div className="pr-updater">
                            <strong>{record.lastUpdatedBy}</strong>
                            <span>{record.lastUpdatedAt}</span>
                          </div>
                        </td>

                        {/* Action: Toggle Show/Close Detail */}
                        <td className="td--center">
                          <button
                            type="button"
                            className={`btn-detail-toggle ${
                              isExpanded
                                ? "btn-detail-toggle--close"
                                : "btn-detail-toggle--show"
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

                      {/* Nested PO Detail Table when Expanded */}
                      {isExpanded && (
                        <tr className="pr-nested-row">
                          <td colSpan={17}>
                            <div className="nested-po-wrapper">
                              {record.poDetails && record.poDetails.length > 0 ? (
                                <div className="nested-po-card">
                                  <table className="nested-po-table">
                                    <thead>
                                      <tr>
                                        <th style={{ width: "160px" }}>Kode PO</th>
                                        <th style={{ width: "110px" }}>
                                          Tanggal PO
                                        </th>
                                        <th style={{ width: "220px" }}>
                                          Nama Supplier
                                        </th>
                                        <th style={{ width: "170px" }}>
                                          Kategori PO
                                        </th>
                                        <th style={{ width: "120px" }}>
                                          Created By
                                        </th>
                                        <th style={{ width: "120px" }}>
                                          Updated By
                                        </th>
                                        <th
                                          className="th--right"
                                          style={{ width: "95px" }}
                                        >
                                          Qty PO
                                        </th>
                                        <th
                                          className="th--right"
                                          style={{ width: "95px" }}
                                        >
                                          Qty BPB
                                        </th>
                                        <th
                                          className="th--right"
                                          style={{ width: "115px" }}
                                        >
                                          Qty Outstanding
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {record.poDetails.map((po, pIdx) => (
                                        <tr key={`${record.id}-po-${pIdx}`}>
                                          <td>{po.poCode}</td>
                                          <td>{po.poDate}</td>
                                          <td>{po.supplierName}</td>
                                          <td>{po.poCategory}</td>
                                          <td>{po.createdBy}</td>
                                          <td>{po.updatedBy}</td>
                                          <td className="td--right">
                                            {po.qtyPo.toFixed(2)}
                                          </td>
                                          <td className="td--right">
                                            {po.qtyBpb.toFixed(2)}
                                          </td>
                                          <td className="td--right">
                                            {po.qtyOutstanding.toFixed(2)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="nested-po-empty">
                                  No related Purchase Order records found for this
                                  item.
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

        {/* Table Footer: Standardized Shared Pagination */}
        <Pagination
          totalRecords={totalEntries}
          currentPage={safeCurrentPage}
          pageSize={pageSize}
          showPageSize={true}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
        />
      </section>
    </div>
  );
}

export default PurchaseRequisitionReport;
