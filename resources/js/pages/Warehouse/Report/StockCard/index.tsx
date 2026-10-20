import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { Pagination } from "../../../../components/ui/Pagination";
import {
  stockCardItemsList,
  stockCardWarehousesList,
  stockCardUnitsList,
  initialStockCardRecords,
} from "./stock-card-data";
import type { StockCardRecord } from "./stock-card-types";

export function StockCardIndex() {
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");
  const [selectedItemCode, setSelectedItemCode] = useState("60.154.300.101");
  const [selectedUnit, setSelectedUnit] = useState("All Units");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All Warehouse");

  // Applied filter state (triggered on Report button click or initial mount)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "2026-10-01",
    endDate: "2026-10-31",
    itemCode: "60.154.300.101",
    unit: "All Units",
    warehouse: "All Warehouse",
  });

  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [notification, setNotification] = useState<{
    type: "error" | "warning" | "success" | "info";
    message: string;
  } | null>(null);

  // Selected item object for info header
  const currentItemInfo = useMemo(() => {
    return (
      stockCardItemsList.find((i) => i.code === appliedFilters.itemCode) ||
      stockCardItemsList[0]
    );
  }, [appliedFilters.itemCode]);

  // Handle clicking "Report" button
  const handleApplyReport = (e?: React.FormEvent) => {
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
        itemCode: selectedItemCode,
        unit: selectedUnit,
        warehouse: selectedWarehouse,
      });
      setCurrentPage(1);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to generate Stock Card report.",
      });
    }
  };

  // Filter records based on applied filters
  const filteredRecords = useMemo(() => {
    return initialStockCardRecords.filter((rec) => {
      // Item code match
      if (appliedFilters.itemCode && rec.itemCode !== appliedFilters.itemCode) {
        return false;
      }
      // Date range match
      if (appliedFilters.startDate && rec.date < appliedFilters.startDate) {
        return false;
      }
      if (appliedFilters.endDate && rec.date > appliedFilters.endDate) {
        return false;
      }
      // Warehouse match
      if (
        appliedFilters.warehouse !== "All Warehouse" &&
        rec.warehouse !== appliedFilters.warehouse
      ) {
        return false;
      }
      // Unit match
      if (
        appliedFilters.unit !== "All Units" &&
        rec.unitCode !== appliedFilters.unit
      ) {
        return false;
      }
      return true;
    });
  }, [appliedFilters]);

  // Totals for In, Out, and running Stock
  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredRecords.forEach((r) => {
      if (typeof r.in === "number") totalIn += r.in;
      if (typeof r.out === "number") totalOut += r.out;
    });
    const lastBalance =
      filteredRecords.length > 0
        ? filteredRecords[filteredRecords.length - 1].stock
        : 0;
    return {
      totalIn,
      totalOut,
      lastBalance,
    };
  }, [filteredRecords]);

  // Pagination calculation
  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

  // Print report
  const handlePrint = () => {
    try {
      window.print();
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to trigger print dialog.",
      });
    }
  };

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    try {
      if (filteredRecords.length === 0) {
        setNotification({
          type: "warning",
          message: "No stock card transaction records found matching the active filters to export.",
        });
        return;
      }
      setNotification(null);

      const headers = [
        "No.",
        "Date",
        "Ref",
        "Description",
        "In",
        "Out",
        "Stock",
        "Warehouse",
        "History Doc In",
        "Doc Out Ref",
        "No Lot",
        "Job Number",
        "Last Update",
      ];

      const rowsData = filteredRecords.map((r, idx) => [
        idx + 1,
        r.date,
        r.ref,
        r.description,
        r.in !== null ? r.in : 0,
        r.out !== null ? r.out : 0,
        r.stock,
        r.warehouse,
        r.historyDocIn,
        r.docOutRef,
        r.noLot,
        r.jobNumber,
        r.lastUpdate,
      ]);

      // Add summary total row
      rowsData.push([
        "",
        "TOTAL",
        "",
        "",
        totals.totalIn,
        totals.totalOut,
        totals.lastBalance,
        "",
        "",
        "",
        "",
        "",
        "",
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([
        [`STOCK CARD REPORT - ${currentItemInfo.name} (${currentItemInfo.code})`],
        [`Date Range: ${appliedFilters.startDate} to ${appliedFilters.endDate} | Warehouse: ${appliedFilters.warehouse}`],
        [],
        headers,
        ...rowsData,
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Stock Card");
      XLSX.writeFile(
        workbook,
        `Stock_Card_${appliedFilters.itemCode}_${appliedFilters.startDate}_${appliedFilters.endDate}.xlsx`
      );
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to generate Excel export file.",
      });
    }
  };

  return (
    <div className="stock-card-page transaction-create-page">
      {/* GeniusOne Notification Banner */}
      {notification && (
        <div
          style={{
            padding: "10px 16px",
            background:
              notification.type === "error"
                ? "#fef2f2"
                : notification.type === "warning"
                ? "#fffbeb"
                : "#f0fdf4",
            border: `1px solid ${
              notification.type === "error"
                ? "#fecaca"
                : notification.type === "warning"
                ? "#fde68a"
                : "#bbf7d0"
            }`,
            borderRadius: "var(--radius-sm)",
            color:
              notification.type === "error"
                ? "#b91c1c"
                : notification.type === "warning"
                ? "#92400e"
                : "#15803d",
            fontSize: "12.5px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={notification.type === "success" ? "check" : "alertTriangle"}
              size={15}
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
              fontSize: "16px",
              color: "inherit",
            }}
            title="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Filter & Action Panel */}
      <form onSubmit={handleApplyReport} className="tx-panel" style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            alignItems: "flex-end",
          }}
        >
          {/* Start Date */}
          <div className="master-form-group">
            <label className="master-form-label">Start Date</label>
            <input
              type="date"
              className="master-form-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* End Date */}
          <div className="master-form-group">
            <label className="master-form-label">End Date</label>
            <input
              type="date"
              className="master-form-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Item Selector */}
          <div className="master-form-group" style={{ gridColumn: "span 2" }}>
            <label className="master-form-label">Item</label>
            <select
              className="master-form-select"
              value={selectedItemCode}
              onChange={(e) => {
                const newCode = e.target.value;
                setSelectedItemCode(newCode);
                const found = stockCardItemsList.find((i) => i.code === newCode);
                if (found) {
                  setSelectedUnit(found.unit);
                  setSelectedWarehouse(found.defaultWarehouse);
                }
              }}
            >
              {stockCardItemsList.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.code} — {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Selector */}
          <div className="master-form-group">
            <label className="master-form-label">Unit</label>
            <select
              className="master-form-select"
              value={selectedUnit}
              onChange={(e) => setSelectedUnit(e.target.value)}
            >
              {stockCardUnitsList.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Selector */}
          <div className="master-form-group">
            <label className="master-form-label">Warehouse</label>
            <select
              className="master-form-select"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
            >
              {stockCardWarehousesList.map((wh) => (
                <option key={wh} value={wh}>
                  {wh}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Button Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <Button
            type="submit"
            variant="primary"
            icon="filter"
          >
            Report
          </Button>
          <Button
            type="button"
            variant="secondary"
            icon="print"
            onClick={handlePrint}
          >
            Print
          </Button>
          <Button
            type="button"
            icon="download"
            onClick={handleExportExcel}
          >
            Export to Excel
          </Button>
        </div>
      </form>

      {/* Selected Item Reference Information Banner */}
      <div
        className="tx-panel"
        style={{
          padding: "14px 20px",
          background: "#f8fbff",
          borderColor: "#bfdbfe",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.4px" }}>
            SELECTED ITEM INFORMATION
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--ink)" }}>
              {currentItemInfo.name}
            </span>
            <span className="code-pill">{currentItemInfo.code}</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "24px", alignItems: "center" }}>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", display: "block" }}>
              UNIT CODE
            </span>
            <strong style={{ fontSize: "13px", color: "var(--blue-700)" }}>
              {currentItemInfo.unit}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", display: "block" }}>
              WAREHOUSE
            </span>
            <strong style={{ fontSize: "13px", color: "var(--ink-soft)" }}>
              {appliedFilters.warehouse === "All Warehouse" ? currentItemInfo.defaultWarehouse : appliedFilters.warehouse}
            </strong>
          </div>
          <div>
            <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", display: "block" }}>
              CURRENT STOCK
            </span>
            <strong style={{ fontSize: "14px", color: "var(--green-700, #15803d)" }}>
              {totals.lastBalance.toFixed(2)} {currentItemInfo.unit}
            </strong>
          </div>
        </div>
      </div>

      {/* Report Table Panel */}
      <div className="panel" style={{ padding: "0" }}>
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No.</th>
                  <th style={{ minWidth: "95px" }}>Date</th>
                  <th style={{ minWidth: "160px" }}>Ref</th>
                  <th style={{ minWidth: "200px" }}>Description</th>
                  <th style={{ minWidth: "80px", textAlign: "right" }}>In</th>
                  <th style={{ minWidth: "80px", textAlign: "right" }}>Out</th>
                  <th style={{ minWidth: "85px", textAlign: "right" }}>Stock</th>
                  <th style={{ minWidth: "130px" }}>Warehouse</th>
                  <th style={{ minWidth: "130px" }}>History Doc In</th>
                  <th style={{ minWidth: "130px" }}>Doc Out Ref</th>
                  <th style={{ minWidth: "120px" }}>No Lot</th>
                  <th style={{ minWidth: "120px" }}>Job Number</th>
                  <th style={{ minWidth: "130px" }}>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber =
                      (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                          {rowNumber}
                        </td>
                        <td>{item.date}</td>
                        <td>
                          <span className="code-pill">{item.ref}</span>
                        </td>
                        <td style={{ fontWeight: 500 }}>{item.description}</td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: item.in ? "var(--green-600)" : "var(--muted)" }}>
                          {item.in !== null ? item.in.toFixed(2) : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: item.out ? "var(--red-600)" : "var(--muted)" }}>
                          {item.out !== null ? item.out.toFixed(2) : "—"}
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "var(--ink)" }}>
                          {item.stock.toFixed(2)}
                        </td>
                        <td>{item.warehouse}</td>
                        <td style={{ color: item.historyDocIn !== "—" ? "var(--blue-700)" : "var(--muted)" }}>
                          {item.historyDocIn}
                        </td>
                        <td style={{ color: item.docOutRef !== "—" ? "var(--orange-700)" : "var(--muted)" }}>
                          {item.docOutRef}
                        </td>
                        <td>{item.noLot}</td>
                        <td>
                          <span style={{ fontSize: "11px", fontWeight: 600 }}>{item.jobNumber}</span>
                        </td>
                        <td style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {item.lastUpdate}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={13} style={{ textAlign: "center", padding: "40px 16px" }}>
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No transactions found</strong>
                        <span>Try adjusting the date range or selected filters.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Total Row at bottom */}
              {paginatedRecords.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: 800, borderTop: "2px solid var(--line)" }}>
                    <td colSpan={4} style={{ textAlign: "right", paddingRight: "16px", textTransform: "uppercase", fontSize: "11px", letterSpacing: "0.5px" }}>
                      TOTAL
                    </td>
                    <td style={{ textAlign: "right", color: "var(--green-600)", fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
                      {totals.totalIn.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--red-600)", fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>
                      {totals.totalOut.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", color: "var(--ink)", fontVariantNumeric: "tabular-nums", fontWeight: 900 }}>
                      {totals.lastBalance.toFixed(2)}
                    </td>
                    <td colSpan={6} style={{ color: "var(--muted)", fontSize: "11px" }}>
                      Balance calculated for current filtered view
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Unified Pagination */}
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
    </div>
  );
}

export default StockCardIndex;
