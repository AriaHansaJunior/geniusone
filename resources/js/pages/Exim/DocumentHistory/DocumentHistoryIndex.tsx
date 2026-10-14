import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { initialDocumentHistoryRecords } from "./document-history-data";
import type {
  DocumentHistoryRecord,
  DocumentHistorySortField,
  SortDirection,
} from "./document-history-types";

interface DocumentHistoryIndexProps {
  records?: DocumentHistoryRecord[];
  onViewDetail: (invoiceNumber: string) => void;
}

export function DocumentHistoryIndex({
  records = initialDocumentHistoryRecords,
  onViewDetail,
}: DocumentHistoryIndexProps) {
  // Search & Filter State
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] =
    useState<DocumentHistorySortField>("invoiceNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [activeSendMenuId, setActiveSendMenuId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const sendMenuRef = useRef<HTMLDivElement>(null);

  // Close active dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        sendMenuRef.current &&
        !sendMenuRef.current.contains(event.target as Node)
      ) {
        setActiveSendMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filter records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          rec.invoiceNumber.toLowerCase().includes(q) ||
          rec.customerSupplier.toLowerCase().includes(q) ||
          rec.customsDocument.toLowerCase().includes(q) ||
          rec.amountFormatted.toLowerCase().includes(q) ||
          rec.lastUpdatedUser.toLowerCase().includes(q) ||
          rec.mutationType.toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Date range filter
      if (startDate && endDate && rec.invoiceDate) {
        // rec.invoiceDate is in DD-MM-YYYY format
        const parts = rec.invoiceDate.split("-");
        if (parts.length === 3) {
          const recDateIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
          if (recDateIso < startDate || recDateIso > endDate) {
            return false;
          }
        }
      }

      return true;
    });
  }, [records, search, startDate, endDate]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;

    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "invoiceNumber":
          aVal = a.invoiceNumber.toLowerCase();
          bVal = b.invoiceNumber.toLowerCase();
          break;
        case "invoiceDate":
          aVal = a.invoiceDate.split("-").reverse().join("-");
          bVal = b.invoiceDate.split("-").reverse().join("-");
          break;
        case "customerSupplier":
          aVal = a.customerSupplier.toLowerCase();
          bVal = b.customerSupplier.toLowerCase();
          break;
        case "customsDocument":
          aVal = a.customsDocument.toLowerCase();
          bVal = b.customsDocument.toLowerCase();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "lastUpdated":
          aVal = a.lastUpdatedTimestamp;
          bVal = b.lastUpdatedTimestamp;
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

  const handleSort = (field: DocumentHistorySortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: DocumentHistorySortField) => {
    if (sortField !== field || sortDirection === "none") {
      return <span className="dh-sort-indicator text-muted">⇅</span>;
    }
    return (
      <span className="dh-sort-indicator text-primary font-bold">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Blue send/action dropdown interaction
  const handleToggleSendMenu = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveSendMenuId((prev) => (prev === id ? null : id));
  };

  const handleSendMenuAction = (actionLabel: string, invoiceNum: string) => {
    setActiveSendMenuId(null);
    setNotice(
      `Selected "${actionLabel}" for invoice ${invoiceNum}. (Frontend demonstration mode)`
    );
    setTimeout(() => setNotice(null), 4000);
  };

  const startEntry = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  return (
    <div className="dh-page">
      {/* Top Header: Title only (no Add New button) */}
      <div className="dh-page-header">
        <h1 className="dh-page-title">Document History</h1>
      </div>

      {/* Notice Message */}
      {notice && (
        <div className="dh-alert dh-alert--info">
          <Icon name="info" size={15} />
          <div className="dh-alert__content">
            <p>{notice}</p>
          </div>
          <button
            type="button"
            className="dh-alert-close"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="dh-table-card">
        {/* Filter Area (Matching Screenshot 1) */}
        <div className="dh-filter-bar">
          {/* Search */}
          <div className="dh-filter-item dh-filter-search">
            <label className="dh-filter-label">Search</label>
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search"
            />
          </div>

          {/* Invoice Date Range */}
          <div className="dh-filter-item dh-filter-date-range">
            <label className="dh-filter-label">Invoice Date</label>
            <div className="dh-date-inputs">
              <input
                type="date"
                className="dh-date-input"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
              <span className="dh-date-sep">To</span>
              <input
                type="date"
                className="dh-date-input"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
        </div>

        {/* 8-Column Table Container */}
        <div className="dh-table-wrapper">
          <table className="dh-table">
            <thead>
              <tr>
                <th className="dh-th-no">No</th>
                <th
                  className="dh-th-sortable"
                  onClick={() => handleSort("invoiceNumber")}
                >
                  <div className="dh-th-content">
                    <span>Invoice Number</span>
                    {renderSortIndicator("invoiceNumber")}
                  </div>
                </th>
                <th
                  className="dh-th-sortable"
                  onClick={() => handleSort("invoiceDate")}
                >
                  <div className="dh-th-content">
                    <span>Invoice Date</span>
                    {renderSortIndicator("invoiceDate")}
                  </div>
                </th>
                <th
                  className="dh-th-sortable"
                  onClick={() => handleSort("customerSupplier")}
                >
                  <div className="dh-th-content">
                    <span>Customer / Supplier</span>
                    {renderSortIndicator("customerSupplier")}
                  </div>
                </th>
                <th
                  className="dh-th-sortable"
                  onClick={() => handleSort("customsDocument")}
                >
                  <div className="dh-th-content">
                    <span>Customs Document</span>
                    {renderSortIndicator("customsDocument")}
                  </div>
                </th>
                <th
                  className="dh-th-sortable text-right"
                  onClick={() => handleSort("amount")}
                >
                  <div className="dh-th-content justify-end">
                    <span>Amount</span>
                    {renderSortIndicator("amount")}
                  </div>
                </th>
                <th
                  className="dh-th-sortable"
                  onClick={() => handleSort("lastUpdated")}
                >
                  <div className="dh-th-content">
                    <span>Last Updated</span>
                    {renderSortIndicator("lastUpdated")}
                  </div>
                </th>
                <th className="dh-th-option text-center">Option</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dh-table-empty">
                    No Document History records found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((dh, idx) => {
                  const sequentialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  const isMenuOpen = activeSendMenuId === dh.id;

                  return (
                    <tr key={dh.id}>
                      <td className="dh-td-no text-center">{sequentialNumber}</td>
                      <td>
                        <div className="font-semibold text-ink">
                          {dh.invoiceNumber}
                        </div>
                        <span className="dh-badge-mutation">
                          {dh.mutationType}
                        </span>
                      </td>
                      <td>{dh.invoiceDate}</td>
                      <td className="font-medium text-ink">{dh.customerSupplier}</td>
                      <td className="font-mono text-xs">
                        {dh.customsDocument || "-"}
                      </td>
                      <td className="text-right font-mono font-medium text-ink">
                        {dh.amountFormatted}
                      </td>
                      <td>
                        <div className="font-medium text-ink text-xs">
                          {dh.lastUpdatedUser}
                        </div>
                        <div className="text-xs text-muted">
                          {dh.lastUpdatedTimestamp}
                        </div>
                      </td>
                      <td className="text-center">
                        <div className="dh-row-actions">
                          {/* Orange list-style action button */}
                          <button
                            type="button"
                            className="dh-btn-view-detail"
                            onClick={() => onViewDetail(dh.invoiceNumber)}
                            title="View Detail Document History"
                            aria-label={`View detail for ${dh.invoiceNumber}`}
                          >
                            <Icon name="list" size={15} />
                          </button>

                          {/* Blue paper-plane dropdown button */}
                          <div
                            className="dh-send-dropdown-wrapper"
                            ref={isMenuOpen ? sendMenuRef : null}
                          >
                            <button
                              type="button"
                              className="dh-btn-send-action"
                              onClick={(e) => handleToggleSendMenu(dh.id, e)}
                              title="Document Actions"
                              aria-haspopup="true"
                              aria-expanded={isMenuOpen}
                            >
                              <Icon name="navigation" size={13} />
                              <Icon name="chevronDown" size={11} />
                            </button>

                            {isMenuOpen && (
                              <div className="dh-send-menu" role="menu">
                                <button
                                  type="button"
                                  className="dh-send-menu-item"
                                  role="menuitem"
                                  onClick={() =>
                                    handleSendMenuAction(
                                      "Synchronize History",
                                      dh.invoiceNumber
                                    )
                                  }
                                >
                                  Synchronize History
                                </button>
                                <button
                                  type="button"
                                  className="dh-send-menu-item"
                                  role="menuitem"
                                  onClick={() =>
                                    handleSendMenuAction(
                                      "Export Customs Trace",
                                      dh.invoiceNumber
                                    )
                                  }
                                >
                                  Export Customs Trace
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Unified Standardized Pagination */}
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

export default DocumentHistoryIndex;
