import React, { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { Badge } from "../../../../components/ui/Badge";
import { Pagination } from "../../../../components/ui/Pagination";
import { CustomDatePicker } from "../../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { LoadingBuffer, TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { apiFetch } from "../../../../data/api";
import {
  stockItemClassificationsList,
  stockItemFacilitiesList,
  initialWarehouseStockRecords,
} from "./stock-item-data";
import { StockItemDetailModal } from "./StockItemDetailModal";
import type {
  WarehouseStockRecord,
  StockStatusFilter,
} from "./stock-item-types";

export function StockItemIndex() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [classification, setClassification] = useState("All Classifications");
  const [stockStatus, setStockStatus] = useState<StockStatusFilter>("All");
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

  const [liveRecords, setLiveRecords] = useState<WarehouseStockRecord[]>(initialWarehouseStockRecords);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);

  React.useEffect(() => {
    const handleRefresh = () => setRefreshTick((prev) => prev + 1);
    window.addEventListener("geniusone_approval_changed", handleRefresh);
    return () => window.removeEventListener("geniusone_approval_changed", handleRefresh);
  }, []);

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());

    apiFetch(`/api/warehouse/reports/stock-item?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Unable to load warehouse stock items.");
        }
        return res.json();
      })
      .then((json) => {
        if (!isMounted) return;
        if (json?.status !== "success" || !Array.isArray(json.data)) {
          throw new Error(json?.message || "Unexpected warehouse stock response.");
        }
        const mapped: WarehouseStockRecord[] = json.data.map((it: any, idx: number) => {
          const balances = (it.warehouseBalances || []).map((balance: any) => ({
            warehouseId: balance.warehouseId == null ? null : Number(balance.warehouseId),
            warehouseName: balance.warehouseName || "—",
            quantity: Number(balance.quantity) || 0,
            availableQuantity: Number(balance.availableQuantity ?? balance.quantity) || 0,
            allocatedQuantity: Number(balance.allocatedQuantity ?? balance.pendingQty) || 0,
            coordinate: balance.coordinate || "—",
            locationType: (balance.locationType === "Production Area" ? "Production Area" : "Warehouse") as "Warehouse" | "Production Area",
            lastMovementDate: balance.lastMovementDate || "—",
            lotNumber: balance.lotNumber || "—",
          }));

          const totalStock =
            typeof it.quantity === "number"
              ? it.quantity
              : typeof it.current_stock === "number"
                ? it.current_stock
                : balances.reduce((sum: number, b: any) => sum + b.quantity, 0);

          const rawFac = String(it.facility || "");
          const normalizedFacility = /non/i.test(rawFac) ? "NON FASILITAS" : "FASILITAS";

          return {
            id: String(it.id || it.item_id || idx),
            itemId: Number(it.item_id || it.id),
            warehouseId: balances[0]?.warehouseId ?? null,
            number: idx + 1,
            materialCode: it.materialCode || it.item_code || "",
            externalCode: it.externalCode || it.external_code || "—",
            materialItem: it.materialItem || it.item_name || "",
            classification: it.classification || it.category || "—",
            coordinate: balances.map((b: any) => b.coordinate).filter((c: string) => c && c !== "—").join(", ") || "—",
            warehouseName: balances.map((b: any) => b.warehouseName).filter(Boolean).join(", ") || "—",
            warehouseBalances: balances,
            facility: normalizedFacility,
            locationType: (balances[0]?.locationType ?? "Warehouse") as "Warehouse" | "Production Area",
            stockStatus: (totalStock > 0 ? "Available" : "Not Available") as StockStatusFilter,
            quantity: totalStock,
            unit: it.unit || "—",
            pendingQty: Number(it.pendingQty) || balances.reduce((sum: number, b: any) => sum + b.allocatedQuantity, 0),
            availableQty: Number(it.availableQty) || balances.reduce((sum: number, b: any) => sum + b.availableQuantity, 0),
            date: balances[0]?.lastMovementDate || "—",
            lotNumber: balances[0]?.lotNumber || "—",
            allocatedQty: Number(it.pendingQty) || balances.reduce((sum: number, b: any) => sum + b.allocatedQuantity, 0),
            lastMovementDate: balances[0]?.lastMovementDate || "—",
            remark: it.status || "",
          };
        });
        setLiveRecords(mapped);
      })
      .catch((err) => {
        if (isMounted) {
          setNotification({
            type: "error",
            message: err instanceof Error ? err.message : "Failed to load warehouse stock items.",
          });
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
}, [search, refreshTick]);

// Filter records
const filteredRecords = useMemo(() => {
  return liveRecords.filter((rec) => {
    // Classification
    if (
      classification !== "All Classifications" &&
      rec.classification !== classification
    ) {
      return false;
    }
    // Stock Status (Available / Not Available / All)
    if (stockStatus !== "All" && rec.stockStatus !== stockStatus) {
      return false;
    }
    // Facility (strictly FASILITAS vs NON FASILITAS)
    if (facility !== "All Facilities") {
      const isFilterNon = /non/i.test(facility);
      const isItemNon = /non/i.test(rec.facility);
      if (isFilterNon !== isItemNon) {
        return false;
      }
    }
    // Search query (code, external, item name, warehouse name)
    if (search.trim()) {
      const query = search.toLowerCase().trim();
      const matchesCode = rec.materialCode.toLowerCase().includes(query);
      const matchesExt = rec.externalCode.toLowerCase().includes(query);
      const matchesName = rec.materialItem.toLowerCase().includes(query);
      const matchesWh = rec.warehouseName.toLowerCase().includes(query);
      if (!matchesCode && !matchesExt && !matchesName && !matchesWh) {
        return false;
      }
    }
    return true;
  });
}, [liveRecords, classification, stockStatus, facility, search]);

const dynamicClassifications = useMemo(() => {
  const vals = liveRecords.map((r) => r.classification).filter((v) => v && v !== "—" && v !== "-");
  return Array.from(new Set([...stockItemClassificationsList, ...vals]));
}, [liveRecords]);

const dynamicFacilities = useMemo(() => {
  return [
    { value: "All Facilities", label: "Facility: All" },
    { value: "FASILITAS", label: "FASILITAS" },
    { value: "NON FASILITAS", label: "NON FASILITAS" },
  ];
}, []);

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
      "Warehouse Stock Breakdown",
      "Quantity",
      "Unit",
      "Stock Status",
    ];

    const rowsData = filteredRecords.map((r, idx) => {
      const whBreakdown =
        r.warehouseBalances && r.warehouseBalances.length > 0
          ? r.warehouseBalances
            .map((b) => `${b.warehouseName}: ${b.quantity} ${r.unit}`)
            .join("; ")
          : r.warehouseName;

      return [
        idx + 1,
        r.materialCode,
        r.externalCode,
        r.materialItem,
        r.classification,
        /non/i.test(r.facility) ? "NON FASILITAS" : "FASILITAS",
        whBreakdown,
        r.quantity,
        r.unit,
        r.stockStatus,
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([
      [`WAREHOUSE STOCK REPORT - ${date}`],
      [`Stock Status: ${stockStatus} | Facility: ${facility}`],
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
          <CustomDatePicker
            value={date}
            onChange={(val) => {
              setDate(val);
              setCurrentPage(1);
            }}
          />
        </div>

        {/* Classification */}
        <div className="master-form-group">
          <label className="master-form-label">Classification</label>
          <CustomSelect
            searchable
            value={classification}
            onChange={(val) => {
              setClassification(val);
              setCurrentPage(1);
            }}
            options={dynamicClassifications}
          />
        </div>

        {/* Facility */}
        <div className="master-form-group">
          <label className="master-form-label">Facility</label>
          <CustomSelect
            searchable
            value={facility}
            onChange={(val) => {
              setFacility(val);
              setCurrentPage(1);
            }}
            options={dynamicFacilities}
          />
        </div>
      </div>

      {/* Stock Filter */}
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
            variant="excel"
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
        {isLoading && liveRecords.length > 0 && (
          <div className="table-frame__buffer-bar">
            <LoadingBuffer variant="inline" label="Updating warehouse stock balances..." />
          </div>
        )}
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: "55px", textAlign: "center" }}>Number</th>
                <th style={{ minWidth: "140px" }}>Material Code</th>
                <th style={{ minWidth: "120px" }}>External Code</th>
                <th style={{ minWidth: "220px" }}>Material Item</th>
                <th style={{ minWidth: "160px" }}>Classification</th>
                <th style={{ minWidth: "120px" }}>Facility</th>
                <th style={{ minWidth: "220px" }}>Warehouse Stock</th>
                <th style={{ minWidth: "120px", textAlign: "right" }}>Total Stock</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && liveRecords.length === 0 ? (
                <TableLoadingRow
                  colSpan={8}
                  label="Loading Warehouse Stock Items..."
                  sublabel="Calculating latest on-hand stock quantities across locations..."
                />
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, index) => {
                  const rowNumber =
                    (safeCurrentPage - 1) * pageSize + index + 1;
                  const isNonFacility = /non/i.test(item.facility);
                  const balancesCount = item.warehouseBalances?.length ?? 0;
                  const warehouseLabel =
                    balancesCount > 1
                      ? `${balancesCount} Warehouses`
                      : balancesCount === 1
                        ? item.warehouseBalances?.[0]?.warehouseName || item.warehouseName
                        : item.warehouseName || "—";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleShowDetailSafe(item)}
                      style={{ cursor: "pointer" }}
                      title="Click row to open stock item details"
                    >
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
                        <Badge tone={isNonFacility ? "gray" : "purple"}>
                          {isNonFacility ? "NON FASILITAS" : "FASILITAS"}
                        </Badge>
                      </td>
                      <td>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "8px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 500 }}>
                            {warehouseLabel}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e?.stopPropagation();
                              handleShowDetailSafe(item);
                            }}
                            title={`View stock breakdown for ${item.materialItem}`}
                          >
                            View Stock
                          </Button>
                        </div>
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px" }}>
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
