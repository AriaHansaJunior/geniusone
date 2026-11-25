import React, { useState, useMemo } from "react";
import { loadXlsxModule } from "../../../../utils/xlsxExport";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { Pagination } from "../../../../components/ui/Pagination";
import { CustomDatePicker } from "../../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { LoadingBuffer, TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { apiFetch } from "../../../../data/api";
import {
  stockCardItemsList,
  stockCardWarehousesList,
  stockCardUnitsList,
  initialStockCardRecords,
  type StockCardItemOption,
} from "./stock-card-data";
import type { StockCardRecord } from "./stock-card-types";

function getTodayWibIso(): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

export function StockCardIndex() {
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState(getTodayWibIso);
  const [selectedItemCode, setSelectedItemCode] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("All Units");
  const [selectedWarehouse, setSelectedWarehouse] = useState("All Warehouse");

  // Applied filter state (triggered on Report button click or initial mount)
  const [appliedFilters, setAppliedFilters] = useState({
    startDate: "2026-01-01",
    endDate: getTodayWibIso(),
    itemCode: "",
    unit: "All Units",
    warehouse: "All Warehouse",
  });

  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [dateSortDir, setDateSortDir] = useState<"desc" | "asc">("desc");
  const [notification, setNotification] = useState<{
    type: "error" | "warning" | "success" | "info";
    message: string;
  } | null>(null);

  const [itemsList, setItemsList] = useState<StockCardItemOption[]>(stockCardItemsList);
  const [warehousesList, setWarehousesList] = useState<string[]>(stockCardWarehousesList);

  // Load real items and warehouses dynamically
  React.useEffect(() => {
    apiFetch("/api/exim/master/items?per_page=500")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const mappedItems: StockCardItemOption[] = json.data.map((it: any) => ({
            code: it.code || "",
            name: it.name || "",
            unit: it.unit?.name || it.unit_of_measurement?.name || "PCE",
            defaultWarehouse: "All Warehouse",
          }));
          const validItems = mappedItems.filter((m) => Boolean(m.code));
          setItemsList(validItems);
          if (validItems.length > 0) {
            const firstItem = validItems[0];
            setSelectedItemCode((prev) => prev || firstItem.code);
            setSelectedUnit((prev) => (prev === "All Units" ? firstItem.unit || "PCE" : prev));
            setAppliedFilters((prev) => ({
              ...prev,
              itemCode: prev.itemCode || firstItem.code,
              unit: prev.unit === "All Units" ? firstItem.unit || "PCE" : prev.unit,
            }));
          }
        }
      })
      .catch(() => { });

    apiFetch("/api/warehouse/master/warehouses?per_page=500")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data && Array.isArray(json.data) && json.data.length > 0) {
          const names = json.data.map((w: any) => w.name).filter(Boolean);
          setWarehousesList(Array.from(new Set(["All Warehouse", ...names])));
        }
      })
      .catch(() => { });
  }, []);

  // Selected item object for info header
  const currentItemInfo = useMemo(() => {
    return (
      itemsList.find((i) => i.code === appliedFilters.itemCode) ||
      itemsList[0] || {
        code: appliedFilters.itemCode || "-",
        name: "-",
        unit: "-",
        defaultWarehouse: "-",
      }
    );
  }, [itemsList, appliedFilters.itemCode]);

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

  const [liveRecords, setLiveRecords] = useState<StockCardRecord[]>(initialStockCardRecords);
  const [backendEndingBalance, setBackendEndingBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  React.useEffect(() => {
    const handleRefresh = () => setRefreshTick((prev) => prev + 1);
    window.addEventListener("geniusone_approval_changed", handleRefresh);
    return () => window.removeEventListener("geniusone_approval_changed", handleRefresh);
  }, []);

  React.useEffect(() => {
    if (!appliedFilters.itemCode) {
      return;
    }
    let isMounted = true;
    setIsLoading(true);

    const params = new URLSearchParams({
      startDate: appliedFilters.startDate,
      endDate: appliedFilters.endDate,
      itemCode: appliedFilters.itemCode,
    });
    if (appliedFilters.warehouse && appliedFilters.warehouse !== "All Warehouse") {
      params.set("warehouseId", appliedFilters.warehouse);
    }

    apiFetch(`/api/warehouse/reports/stock-card?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!isMounted) return;
        if (json?.status === "success" && Array.isArray(json.data?.movements)) {
          const item = json.data.item;
          const summaryEnd = json.data?.summary?.ending_balance ?? item?.current_stock;
          setBackendEndingBalance(summaryEnd !== undefined && summaryEnd !== null ? Number(summaryEnd) : null);
          const totalMovements = json.data.movements.length;
          const mapped: StockCardRecord[] = json.data.movements.map((m: any, idx: number) => ({
            id: String(m.id || idx + 1),
            no: idx + 1,
            seq: totalMovements - idx,
            itemCode: item?.code || appliedFilters.itemCode,
            itemName: item?.name || "-",
            unitCode: m.unit || item?.unit || "PCE",
            warehouse: m.warehouse || appliedFilters.warehouse,
            date: m.date || appliedFilters.startDate,
            ref: m.reference_no || "-",
            description: m.notes && m.notes !== "—" ? `${m.doc_type} · ${m.notes}` : m.doc_type || "Stock movement",
            in: m.qty_in > 0 ? Number(m.qty_in) : null,
            out: m.qty_out > 0 ? Number(m.qty_out) : null,
            stock: Number(m.balance) || 0,
            historyDocIn: m.history_doc_in || (m.qty_in > 0 ? m.doc_number : "-"),
            docOutRef: m.doc_out_ref || (m.qty_out > 0 ? m.doc_number : "-"),
            noLot: m.no_lot || "-",
            jobNumber: m.job_number || "-",
            lastUpdate: m.date || appliedFilters.startDate,
          }));
          setLiveRecords(mapped);
        }
      })
      .catch((err) => {
        console.warn("[GeniusOne Stock Card] Network error, using baseline records:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [appliedFilters, refreshTick]);

  // Filter records based on applied filters
  const filteredRecords = useMemo(() => {
    return liveRecords.filter((rec) => {
      // Item code match
      if (appliedFilters.itemCode && rec.itemCode && rec.itemCode !== appliedFilters.itemCode) {
        return false;
      }
      // Date range match (compare YYYY-MM-DD prefix while preserving HH:mm:ss display)
      const recDateYmd = (rec.date || "").trim().slice(0, 10);
      const sDate = (appliedFilters.startDate || "").trim().slice(0, 10);
      const eDate = (appliedFilters.endDate || "").trim().slice(0, 10);

        if (sDate && recDateYmd && recDateYmd < sDate) {
          return false;
        }
          if (eDate && recDateYmd && recDateYmd > eDate) {
            return false;
          }
          // Warehouse match
          if (appliedFilters.warehouse && appliedFilters.warehouse !== "All Warehouse") {
            const normFilter = appliedFilters.warehouse.toLowerCase().trim();
            const normRec = (rec.warehouse || "").toLowerCase().trim();
            if (normFilter !== normRec && !normRec.includes(normFilter) && !normFilter.includes(normRec)) {
              return false;
            }
          }
          // Unit match
          if (
            appliedFilters.unit !== "All Units" &&
            rec.unitCode &&
            rec.unitCode.toLowerCase() !== appliedFilters.unit.toLowerCase()
          ) {
            return false;
          }
          return true;
        });
  }, [appliedFilters, liveRecords]);

  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const dateCmp = String(a.date || "").localeCompare(String(b.date || ""));
      if (dateCmp !== 0) {
        return dateSortDir === "desc" ? -dateCmp : dateCmp;
      }
      const seqA = a.seq ?? a.no;
      const seqB = b.seq ?? b.no;
      return dateSortDir === "desc" ? seqB - seqA : seqA - seqB;
    });
    return list;
  }, [filteredRecords, dateSortDir]);

  // Totals for In, Out, and running Stock
  const totals = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    let newestRecord: StockCardRecord | null = null;
    filteredRecords.forEach((r) => {
      if (typeof r.in === "number") totalIn += r.in;
      if (typeof r.out === "number") totalOut += r.out;
      if (
        !newestRecord ||
        String(r.date || "") > String(newestRecord.date || "") ||
        (String(r.date || "") === String(newestRecord.date || "") &&
          (r.seq ?? r.no) > (newestRecord.seq ?? newestRecord.no))
      ) {
        newestRecord = r;
      }
    });
    const lastBalance = newestRecord
      ? (newestRecord as StockCardRecord).stock
      : (backendEndingBalance ?? 0);
    return {
      totalIn,
      totalOut,
      lastBalance,
    };
  }, [filteredRecords, backendEndingBalance]);

// Pagination calculation
const totalRecords = sortedRecords.length;
const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

const paginatedRecords = useMemo(() => {
  const startIdx = (safeCurrentPage - 1) * pageSize;
  return sortedRecords.slice(startIdx, startIdx + pageSize);
}, [sortedRecords, safeCurrentPage, pageSize]);

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
const handleExportExcel = async () => {
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
      "Date & Time (WIB)",
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
    ];

    const rowsData = sortedRecords.map((r, idx) => [
      idx + 1,
      r.date ? `${r.date} WIB` : "—",
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
    ]);

    const XLSX = await loadXlsxModule();
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
          border: `1px solid ${notification.type === "error"
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
          <CustomDatePicker
            value={startDate}
            onChange={(val) => setStartDate(val)}
          />
        </div>

        {/* End Date */}
        <div className="master-form-group">
          <label className="master-form-label">End Date</label>
          <CustomDatePicker
            value={endDate}
            onChange={(val) => setEndDate(val)}
          />
        </div>

        {/* Item Selector */}
        <div className="master-form-group" style={{ gridColumn: "span 2" }}>
          <label className="master-form-label">Item</label>
          <CustomSelect
            searchable
            value={selectedItemCode}
            onChange={(newCode) => {
              setSelectedItemCode(newCode);
              const found = itemsList.find((i) => i.code === newCode);
              if (found) {
                setSelectedUnit(found.unit || "PCE");
              }
            }}
            options={itemsList.map((item) => ({
              value: item.code,
              label: `${item.code} — ${item.name}`,
            }))}
          />
        </div>

        {/* Unit Selector (Fixed by Selected Item) */}
        <div className="master-form-group">
          <label className="master-form-label">Unit</label>
          <CustomSelect
            searchable
            disabled={Boolean(selectedItemCode)}
            value={selectedUnit}
            onChange={(val) => setSelectedUnit(val)}
            options={
              selectedUnit && !stockCardUnitsList.includes(selectedUnit)
                ? [selectedUnit, ...stockCardUnitsList]
                : stockCardUnitsList
            }
          />
        </div>

        {/* Warehouse Selector */}
        <div className="master-form-group">
          <label className="master-form-label">Warehouse</label>
          <CustomSelect
            searchable
            value={selectedWarehouse}
            onChange={(val) => setSelectedWarehouse(val)}
            options={warehousesList}
          />
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
        >
          Report
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handlePrint}
        >
          Print
        </Button>
        <Button
          type="button"
          variant="excel"
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
        {isLoading && liveRecords.length > 0 && (
          <div className="table-frame__buffer-bar">
            <LoadingBuffer variant="inline" label="Updating Stock Card movements..." />
          </div>
        )}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>No.</th>
                <th
                  className="th-sortable"
                  style={{ minWidth: "175px" }}
                  onClick={() => {
                    setDateSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
                    setCurrentPage(1);
                  }}
                  title="Click to sort by Date & Time (Descending / Ascending)"
                >
                  Date &amp; Time (WIB)
                  <Icon name={dateSortDir === "desc" ? "arrowDown" : "arrowUp"} size={13} />
                </th>
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
              </tr>
            </thead>
            <tbody>
              {isLoading && liveRecords.length === 0 ? (
                <TableLoadingRow
                  colSpan={12}
                  label="Loading Stock Card Ledger..."
                  sublabel="Calculating inbound, outbound, and running balances..."
                />
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, index) => {
                  const rowNumber =
                    (safeCurrentPage - 1) * pageSize + index + 1;
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                        {rowNumber}
                      </td>
                      <td style={{ whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                        {item.date ? `${item.date} WIB` : "—"}
                      </td>
                      <td style={{ fontWeight: 600, fontFamily: "ui-monospace, monospace", fontSize: "12px" }}>
                        {item.ref}
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} style={{ textAlign: "center", padding: "40px 16px" }}>
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
                  <td colSpan={5} style={{ color: "var(--muted)", fontSize: "11px" }}>
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
