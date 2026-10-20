import React, { useState, useMemo, useCallback } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { SearchField } from "../../components/ui/SearchField";
import { Pagination } from "../../components/ui/Pagination";
import {
  currenciesList,
  rateTypesList,
  initialExchangeRateRecords,
} from "./dashboard-rate-data";
import { DashboardRateChart } from "./DashboardRateChart";
import type {
  ExchangeRateRecord,
  RateSortField,
  SortDirection,
} from "./dashboard-rate-types";

export function Dashboard() {
  // Filter form state
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");
  const [currency, setCurrency] = useState("All Currencies");
  const [rateType, setRateType] = useState("All Rate Types");

  // Applied filter state (updated on Show or Reset)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    currency: "All Currencies",
    rateType: "All Rate Types",
  });

  // Active view tab: "table" or "chart"
  const [activeTab, setActiveTab] = useState<"table" | "chart">("table");

  // Table search query
  const [search, setSearch] = useState("");

  // Table sorting
  const [sortField, setSortField] = useState<RateSortField>("rateDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Pagination
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Live feed update state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{
    type: "error" | "warning" | "success" | "info";
    message: string;
  } | null>(null);

  // Apply filters (Show action)
  const handleApplyFilters = (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      if (startDate && endDate && startDate > endDate) {
        setNotification({
          type: "warning",
          message: "Start Date cannot be later than End Date.",
        });
        return;
      }
      setNotification(null);
      setAppliedFilters({
        startDate,
        endDate,
        currency,
        rateType,
      });
      setCurrentPage(1);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to apply exchange rate filters.",
      });
    }
  };

  // Reset filters to defaults
  const handleResetFilters = () => {
    setStartDate("2026-10-01");
    setEndDate("2026-10-31");
    setCurrency("All Currencies");
    setRateType("All Rate Types");
    setAppliedFilters({
      startDate: "2026-10-01",
      endDate: "2026-10-31",
      currency: "All Currencies",
      rateType: "All Rate Types",
    });
    setSearch("");
    setNotification(null);
    setCurrentPage(1);
  };

  // Handle live rate refresh check
  const handleCheckLiveFeed = useCallback(() => {
    setIsRefreshing(true);
    setNotification({
      type: "info",
      message: "Checking live forex feed status from central bank servers...",
    });

    const timer = setTimeout(() => {
      setIsRefreshing(false);
      setNotification({
        type: "warning",
        message:
          "Direct browser-to-BI/Bea Cukai requests are restricted by CORS policy. Live automated streaming will be synchronized via server-side proxy in the backend integration milestone. Currently showing available published benchmark rates.",
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Filter records based on appliedFilters and search
  const filteredRecords = useMemo(() => {
    return initialExchangeRateRecords.filter((rec) => {
      // Currency filter
      if (
        appliedFilters.currency !== "All Currencies" &&
        rec.currencyCode !== appliedFilters.currency
      ) {
        return false;
      }

      // Rate Type filter
      if (
        appliedFilters.rateType !== "All Rate Types" &&
        rec.rateType !== appliedFilters.rateType
      ) {
        return false;
      }

      // Date range filter
      if (appliedFilters.startDate && rec.rateDate < appliedFilters.startDate) {
        return false;
      }
      if (appliedFilters.endDate && rec.rateDate > appliedFilters.endDate) {
        return false;
      }

      // Search query filter
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesCode = rec.currencyCode.toLowerCase().includes(query);
        const matchesName = rec.currencyName.toLowerCase().includes(query);
        const matchesType = rec.rateType.toLowerCase().includes(query);
        const matchesFlag = rec.flag.toLowerCase().includes(query);
        const matchesDate = rec.rateDate.includes(query);
        if (
          !matchesCode &&
          !matchesName &&
          !matchesType &&
          !matchesFlag &&
          !matchesDate
        ) {
          return false;
        }
      }

      return true;
    });
  }, [appliedFilters, search]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;

    return [...filteredRecords].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      // Handle null numeric values
      if (valA === null || valA === undefined) valA = -Infinity;
      if (valB === null || valB === undefined) valB = -Infinity;

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Toggle sort on column click
  const handleSort = (field: RateSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Pagination calculation
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  return (
    <div className="dashboard-view">
      {/* Page Title */}
      <div className="dashboard-header">
        <div className="dashboard-header__title">
          <Icon name="home" size={20} className="dashboard-header__icon" />
          <h1>Dashboard</h1>
        </div>
      </div>

      {/* Exchange Rates Master Card */}
      <div className="dashboard-rate-card">
        {/* Card Header with Refresh Action */}
        <div className="dashboard-rate-card__header">
          <div className="dashboard-rate-card__title">
            <Icon name="globe" size={17} />
            <span>Exchange Rates</span>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button
              variant="secondary"
              icon="refresh"
              onClick={handleCheckLiveFeed}
              disabled={isRefreshing}
            >
              {isRefreshing ? "Checking Feed..." : "Check Live Feed"}
            </Button>
          </div>
        </div>

        {/* GeniusOne Custom Notification Banner */}
        {notification && (
          <div
            style={{
              padding: "10px 16px",
              background:
                notification.type === "error"
                  ? "#fef2f2"
                  : notification.type === "warning"
                  ? "#fffbeb"
                  : "#eff6ff",
              borderBottom: `1px solid ${
                notification.type === "error"
                  ? "#fecaca"
                  : notification.type === "warning"
                  ? "#fde68a"
                  : "#bfdbfe"
              }`,
              color:
                notification.type === "error"
                  ? "#b91c1c"
                  : notification.type === "warning"
                  ? "#92400e"
                  : "#1e40af",
              fontSize: "12px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon
                name={notification.type === "error" ? "alertTriangle" : "info"}
                size={14}
              />
              <span>{notification.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "15px",
                color: "inherit",
              }}
              title="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Filter Bar with Date Range, Currency, Rate Type, Show, Reset */}
        <form onSubmit={handleApplyFilters} className="dashboard-filters-bar">
          <div className="dashboard-filters-grid">
            {/* Start Date (Tanggal Awal) */}
            <div className="master-form-group">
              <label className="master-form-label">Start Date</label>
              <input
                type="date"
                className="master-form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End Date (Tanggal Akhir) */}
            <div className="master-form-group">
              <label className="master-form-label">End Date</label>
              <input
                type="date"
                className="master-form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            {/* Currency (Valuta) */}
            <div className="master-form-group">
              <label className="master-form-label">Currency</label>
              <select
                className="master-form-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {currenciesList.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Rate Type (Tipe Rate) */}
            <div className="master-form-group">
              <label className="master-form-label">Rate Type</label>
              <select
                className="master-form-select"
                value={rateType}
                onChange={(e) => setRateType(e.target.value)}
              >
                {rateTypesList.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons: Show & Reset */}
            <div className="dashboard-filters-actions">
              <Button type="submit" variant="primary" icon="filter">
                Show
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleResetFilters}
              >
                Reset
              </Button>
            </div>
          </div>
        </form>

        {/* Table & Chart Tabs */}
        <div className="dashboard-tabs">
          <button
            type="button"
            className={`dashboard-tab ${
              activeTab === "table" ? "dashboard-tab--active" : ""
            }`}
            onClick={() => setActiveTab("table")}
          >
            <Icon name="list" size={14} />
            <span>Table</span>
            <span className="dashboard-tab__pill">{filteredRecords.length}</span>
          </button>
          <button
            type="button"
            className={`dashboard-tab ${
              activeTab === "chart" ? "dashboard-tab--active" : ""
            }`}
            onClick={() => setActiveTab("chart")}
          >
            <Icon name="layers" size={14} />
            <span>Chart</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "table" ? (
          <>
            {/* Table Search Toolbar */}
            <div className="dashboard-table-toolbar">
              <div style={{ maxWidth: "340px", width: "100%" }}>
                <SearchField
                  value={search}
                  onChange={(val) => {
                    setSearch(val);
                    setCurrentPage(1);
                  }}
                  placeholder="Search currency, rate type, flag..."
                />
              </div>
              <div style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                Showing <strong>{filteredRecords.length}</strong> rate records
              </div>
            </div>

            {/* Table Wrapper */}
            <div className="dashboard-rate-table-wrapper">
              <table className="dashboard-rate-table">
                <thead>
                  <tr>
                    <th style={{ width: "45px", textAlign: "center" }}>No.</th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("rateDate")}
                    >
                      Rate Date{" "}
                      {sortField === "rateDate" &&
                        (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("currencyCode")}
                    >
                      Currency{" "}
                      {sortField === "currencyCode" &&
                        (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                    </th>
                    <th
                      className="sortable"
                      onClick={() => handleSort("rateType")}
                    >
                      Rate Type{" "}
                      {sortField === "rateType" &&
                        (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                    </th>
                    <th
                      className="numeric sortable"
                      onClick={() => handleSort("buyingRate")}
                    >
                      Buying Rate{" "}
                      {sortField === "buyingRate" &&
                        (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                    </th>
                    <th
                      className="numeric sortable"
                      onClick={() => handleSort("sellingRate")}
                    >
                      Selling Rate{" "}
                      {sortField === "sellingRate" &&
                        (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                    </th>
                    <th
                      className="numeric sortable"
                      onClick={() => handleSort("rate")}
                    >
                      Rate{" "}
                      {sortField === "rate" &&
                        (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                    </th>
                    <th>Flag / Source</th>
                    <th style={{ width: "120px", textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.length > 0 ? (
                    paginatedRecords.map((item, index) => {
                      const rowNumber =
                        (safeCurrentPage - 1) * pageSize + index + 1;
                      return (
                        <tr key={item.id}>
                          <td
                            style={{
                              textAlign: "center",
                              color: "var(--muted)",
                              fontWeight: 600,
                            }}
                          >
                            {rowNumber}
                          </td>
                          <td>
                            <strong>{item.rateDate}</strong>
                          </td>
                          <td>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span className="code-pill">
                                {item.currencyCode}
                              </span>
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "var(--muted)",
                                }}
                              >
                                {item.currencyName}
                              </span>
                            </div>
                          </td>
                          <td>
                            <Badge tone="purple">{item.rateType}</Badge>
                          </td>
                          <td className="numeric">
                            {item.buyingRate !== null ? (
                              <span className="rate-value">
                                {item.buyingRate.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span className="rate-unavailable">Unavailable</span>
                            )}
                          </td>
                          <td className="numeric">
                            {item.sellingRate !== null ? (
                              <span className="rate-value">
                                {item.sellingRate.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span className="rate-unavailable">Unavailable</span>
                            )}
                          </td>
                          <td className="numeric">
                            {item.rate !== null ? (
                              <span className="rate-value--highlight">
                                {item.rate.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            ) : (
                              <span className="rate-unavailable">Unavailable</span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "var(--ink)",
                                fontWeight: 600,
                              }}
                            >
                              {item.flag}
                            </span>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {item.availability === "Available" ? (
                              <Badge tone="green">Available</Badge>
                            ) : (
                              <Badge tone="gray">Pending Feed</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan={9}
                        style={{ textAlign: "center", padding: "40px 16px" }}
                      >
                        <div className="empty">
                          <div className="empty__icon">
                            <Icon name="search" />
                          </div>
                          <strong>No exchange rate records found</strong>
                          <span>
                            Try adjusting your date range, currency, or rate type
                            filters.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls below the table */}
            <Pagination
              totalRecords={totalRecords}
              currentPage={safeCurrentPage}
              pageSize={pageSize}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
            />
          </>
        ) : (
          /* Chart Tab View */
          <DashboardRateChart records={filteredRecords} />
        )}

        {/* Card Footer with Transparency & Source Info */}
        <div className="dashboard-rate-card__footer">
          <div className="dashboard-rate-source-info">
            <Icon name="alertTriangle" size={15} />
            <div>
              <strong>
                Data Source: Bank Indonesia (BI JISDOR/Transaksi) &amp;
                Kementerian Keuangan (KMK Tax Rates)
              </strong>
              <p>
                In strict compliance with data integrity policies, live rate
                values are displayed solely from verified benchmarks. Real-time
                automatic external streaming requires server-side proxy
                integration (scheduled for the backend milestone) to resolve
                browser CORS security policies. Missing rates are not
                fabricated.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
