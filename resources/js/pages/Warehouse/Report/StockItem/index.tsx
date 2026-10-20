import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { Badge } from "../../../../components/ui/Badge";
import { Pagination } from "../../../../components/ui/Pagination";
import {
  stockItemClassificationsList,
  stockItemFacilitiesList,
  stockItemCoordinatesList,
  initialWarehouseStockRecords,
} from "./stock-item-data";
import { StockItemDetailModal } from "./StockItemDetailModal";
import type {
  WarehouseStockRecord,
  LocationFilter,
  StockStatusFilter,
} from "./stock-item-types";

export function StockItemIndex() {
  const [date, setDate] = useState("2026-10-20");
  const [classification, setClassification] = useState("All Classifications");
  const [location, setLocation] = useState<LocationFilter>("All");
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>("All");
  const [coordinate, setCoordinate] = useState("All Coordinates");
  const [facility, setFacility] = useState("All Facilities");
  const [search, setSearch] = useState("");

  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [notification, setNotification] = useState<{
    type: "error" | "warning" | "success" | "info";
    message: string;
  } | null>(null);

  // Selected item for Show modal
  const [detailItem, setDetailItem] = useState<WarehouseStockRecord | null>(null);

  const handleShowDetailSafe = (item: WarehouseStockRecord) => {
    try {
      if (!item) {
        setNotification({
          type: "error",
          message: "Unable to inspect stock detail: Record not found.",
        });
        return;
      }
      setDetailItem(item);
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to open stock detail modal.",
      });
    }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return initialWarehouseStockRecords.filter((rec) => {
      // Classification
      if (
        classification !== "All Classifications" &&
        rec.classification !== classification
      ) {
        return false;
      }
      // Location (Warehouse / Production Area / All)
      if (location !== "All" && rec.locationType !== location) {
        return false;
      }
      // Stock Status (Available / Not Available / All)
      if (stockStatus !== "All" && rec.stockStatus !== stockStatus) {
        return false;
      }
      // Coordinate
      if (
        coordinate !== "All Coordinates" &&
        rec.coordinate !== coordinate
      ) {
        return false;
      }
      // Facility
      if (facility !== "All Facilities" && rec.facility !== facility) {
        return false;
      }
      // Search query (code, external, item name)
      if (search.trim()) {
        const query = search.toLowerCase().trim();
        const matchesCode = rec.materialCode.toLowerCase().includes(query);
        const matchesExt = rec.externalCode.toLowerCase().includes(query);
        const matchesName = rec.materialItem.toLowerCase().includes(query);
        if (!matchesCode && !matchesExt && !matchesName) {
          return false;
        }
      }
      return true;
    });
  }, [classification, location, stockStatus, coordinate, facility, search]);

  // Pagination calculation
  const totalRecords = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(startIdx, startIdx + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

  // Export to Excel (.xlsx) using SheetJS
  const handleExportExcel = () => {
    try {
      if (filteredRecords.length === 0) {
        setNotification({
          type: "warning",
          message: "No warehouse stock items found matching the active filters to export.",
        });
        return;
      }
      setNotification(null);

      const headers = [
        "Number",
        "Material Code",
        "External Code",
        "Material Item",
        "Classification",
        "Facility",
        "Coordinate",
        "Location Type",
        "Warehouse Name",
        "Quantity",
        "Unit",
        "Stock Status",
      ];

      const rowsData = filteredRecords.map((r, idx) => [
        idx + 1,
        r.materialCode,
        r.externalCode,
        r.materialItem,
        r.classification,
        r.facility,
        r.coordinate,
        r.locationType,
        r.warehouseName,
        r.quantity,
        r.unit,
        r.stockStatus,
      ]);

      const worksheet = XLSX.utils.aoa_to_sheet([
        [`WAREHOUSE STOCK REPORT - ${date}`],
        [`Location: ${location} | Stock Status: ${stockStatus} | Facility: ${facility}`],
        [],
        headers,
        ...rowsData,
      ]);

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Warehouse Stock");
      XLSX.writeFile(
        workbook,
        `Warehouse_Stock_Report_${date}.xlsx`
      );
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || "Failed to generate Excel export file.",
      });
    }
  };

  return (
    <div className="stock-item-page transaction-create-page">
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

      {/* Filter Panel */}
      <div className="tx-panel" style={{ padding: "16px 20px" }}>
        {/* Main Grid Filters */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "14px",
            alignItems: "flex-end",
          }}
        >
          {/* Date */}
          <div className="master-form-group">
            <label className="master-form-label">Date</label>
            <input
              type="date"
              className="master-form-input"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Classification */}
          <div className="master-form-group">
            <label className="master-form-label">Classification</label>
            <select
              className="master-form-select"
              value={classification}
              onChange={(e) => {
                setClassification(e.target.value);
                setCurrentPage(1);
              }}
            >
              {stockItemClassificationsList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Coordinate */}
          <div className="master-form-group">
            <label className="master-form-label">Coordinate</label>
            <select
              className="master-form-select"
              value={coordinate}
              onChange={(e) => {
                setCoordinate(e.target.value);
                setCurrentPage(1);
              }}
            >
              {stockItemCoordinatesList.map((coord) => (
                <option key={coord} value={coord}>
                  {coord}
                </option>
              ))}
            </select>
          </div>

          {/* Facility */}
          <div className="master-form-group">
            <label className="master-form-label">Facility</label>
            <select
              className="master-form-select"
              value={facility}
              onChange={(e) => {
                setFacility(e.target.value);
                setCurrentPage(1);
              }}
            >
              {stockItemFacilitiesList.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Radio Groups for Location and Stock */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "28px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid var(--line)",
            alignItems: "center",
          }}
        >
          {/* Location Radio Group */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
              Location:
            </span>
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              {(["Warehouse", "Production Area", "All"] as LocationFilter[]).map((loc) => (
                <label
                  key={loc}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: location === loc ? "var(--blue-700)" : "var(--ink-soft)",
                  }}
                >
                  <input
                    type="radio"
                    name="location-filter"
                    value={loc}
                    checked={location === loc}
                    onChange={() => {
                      setLocation(loc);
                      setCurrentPage(1);
                    }}
                    style={{ accentColor: "var(--blue-600)", cursor: "pointer" }}
                  />
                  <span>{loc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Radio Group */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
              Stock:
            </span>
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              {(["Available", "Not Available", "All"] as StockStatusFilter[]).map((st) => (
                <label
                  key={st}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                    color: stockStatus === st ? "var(--blue-700)" : "var(--ink-soft)",
                  }}
                >
                  <input
                    type="radio"
                    name="stock-filter"
                    value={st}
                    checked={stockStatus === st}
                    onChange={() => {
                      setStockStatus(st);
                      setCurrentPage(1);
                    }}
                    style={{ accentColor: "var(--blue-600)", cursor: "pointer" }}
                  />
                  <span>{st}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Search & Export Toolbar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid var(--line)",
          }}
        >
          <div style={{ minWidth: "260px" }}>
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search material code, external code, or item..."
            />
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <Button
              type="button"
              icon="download"
              onClick={handleExportExcel}
            >
              Export to Excel
            </Button>
          </div>
        </div>
      </div>

      {/* Table Panel */}
      <div className="panel" style={{ padding: "0" }}>
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "55px", textAlign: "center" }}>Number</th>
                  <th style={{ minWidth: "140px" }}>Material Code</th>
                  <th style={{ minWidth: "120px" }}>External Code</th>
                  <th style={{ minWidth: "240px" }}>Material Item</th>
                  <th style={{ minWidth: "160px" }}>Classification</th>
                  <th style={{ minWidth: "120px" }}>Facility</th>
                  <th style={{ minWidth: "120px" }}>Coordinate</th>
                  <th style={{ minWidth: "120px", textAlign: "right" }}>Quantity</th>
                  <th style={{ width: "90px", textAlign: "center" }}>Option</th>
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
                        <td>
                          <span className="code-pill">{item.materialCode}</span>
                        </td>
                        <td style={{ color: "var(--muted)", fontSize: "11.5px" }}>
                          {item.externalCode || "—"}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {item.materialItem}
                        </td>
                        <td>{item.classification}</td>
                        <td>
                          <Badge tone="purple">{item.facility}</Badge>
                        </td>
                        <td>
                          <strong style={{ color: "var(--blue-700)" }}>{item.coordinate}</strong>
                        </td>
                        <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                          <strong
                            style={{
                              color:
                                item.quantity > 0
                                  ? "var(--green-700, #15803d)"
                                  : "var(--red-600)",
                            }}
                          >
                            {item.quantity.toFixed(2)} {item.unit}
                          </strong>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            className="icon-action"
                            style={{ margin: "0 auto" }}
                            title="Show stock item details"
                            aria-label={`Show details for ${item.materialItem}`}
                            onClick={() => handleShowDetailSafe(item)}
                          >
                            <Icon name="eye" size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "40px 16px" }}>
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No warehouse stock records found</strong>
                        <span>Try adjusting your filters or search keywords.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
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

      {/* Row-Level "Show" Stock Item Detail Modal */}
      <StockItemDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}

export default StockItemIndex;
