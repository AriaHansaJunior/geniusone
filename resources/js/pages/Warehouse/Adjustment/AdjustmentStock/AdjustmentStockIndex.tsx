import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { CustomDatePicker } from "../../../../components/ui/CustomDatePicker";
import { CustomSelect } from "../../../../components/ui/CustomSelect";
import { Pagination } from "../../../../components/ui/Pagination";
import { SearchField } from "../../../../components/ui/SearchField";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import {
  fetchMasterLookupsApi,
  fetchStockAdjustmentsApi,
} from "../../../../data/masterApi";
import type { StockAdjustmentRecord } from "./adjustment-stock-types";

interface AdjustmentStockIndexProps {
  onAddNew: () => void;
  onImportExcel: () => void;
  onOpenDetail: (code: string) => void;
}

export function AdjustmentStockIndex({
  onAddNew,
  onImportExcel,
  onOpenDetail,
}: AdjustmentStockIndexProps) {
  const [records, setRecords] = useState<StockAdjustmentRecord[]>([]);
  const [warehouses, setWarehouses] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [sortField, setSortField] = useState<"adjustmentDate" | "adjustmentNumber" | "warehouseName">("adjustmentDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [adjList, lookups] = await Promise.all([
        fetchStockAdjustmentsApi(),
        fetchMasterLookupsApi().catch(() => null),
      ]);
      setRecords(adjList);
      const whList = Array.isArray(lookups?.warehouses) ? lookups.warehouses : [];
      setWarehouses(whList.map((w: any) => ({ id: Number(w.id), name: String(w.name) })));
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load stock adjustment records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const onChanged = () => loadData();
    window.addEventListener("geniusone_approval_changed", onChanged);
    return () => window.removeEventListener("geniusone_approval_changed", onChanged);
  }, []);

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((rec) => {
      if (q) {
        const hay = `${rec.adjustmentNumber} ${rec.warehouseName} ${rec.referenceCode} ${rec.note} ${rec.createdBy}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (warehouseFilter !== "ALL") {
        const whId = Number(warehouseFilter);
        const matchesHeader = Number(rec.warehouseId || 0) === whId;
        const matchesLine = rec.items.some((it) => it.warehouseId === whId);
        if (!matchesHeader && !matchesLine) return false;
      }
      if (sourceFilter !== "ALL" && rec.sourceType !== sourceFilter) {
        return false;
      }
      if (startDate && rec.adjustmentDate && rec.adjustmentDate < startDate) {
        return false;
      }
      if (endDate && rec.adjustmentDate && rec.adjustmentDate > endDate) {
        return false;
      }
      return true;
    });
  }, [records, search, warehouseFilter, sourceFilter, startDate, endDate]);

  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal = String(a[sortField] || "").toLowerCase();
      const bVal = String(b[sortField] || "").toLowerCase();
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return sortDir === "asc" ? a.rawId - b.rawId : b.rawId - a.rawId;
    });
    return list;
  }, [filteredRecords, sortField, sortDir]);

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleSort = (field: "adjustmentDate" | "adjustmentNumber" | "warehouseName") => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setWarehouseFilter("ALL");
    setSourceFilter("ALL");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  return (
    <div className="adj-page">
      {errorMsg && (
        <div className="adj-notice adj-notice--error">
          <span>{errorMsg}</span>
          <button
            type="button"
            className="adj-notice__close"
            onClick={() => setErrorMsg(null)}
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter & Actions Card */}
      <div className="adj-filter-card">
        <div className="adj-filter-grid">
          <div className="adj-filter-field">
            <label className="adj-filter-label">Search</label>
            <SearchField
              value={search}
              onChange={(v) => {
                setSearch(v);
                setCurrentPage(1);
              }}
              placeholder="Adjustment no, warehouse, ref, or note..."
            />
          </div>

          <div className="adj-filter-field">
            <label className="adj-filter-label">Warehouse</label>
            <CustomSelect
              searchable
              value={warehouseFilter}
              onChange={(v) => {
                setWarehouseFilter(v || "ALL");
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All Warehouses" },
                ...warehouses.map((w) => ({ value: String(w.id), label: w.name })),
              ]}
            />
          </div>

          <div className="adj-filter-field">
            <label className="adj-filter-label">Entry Source</label>
            <CustomSelect
              value={sourceFilter}
              onChange={(v) => {
                setSourceFilter(v || "ALL");
                setCurrentPage(1);
              }}
              options={[
                { value: "ALL", label: "All Sources" },
                { value: "MANUAL", label: "Manual Entry" },
                { value: "EXCEL_IMPORT", label: "Excel Import" },
              ]}
            />
          </div>

          <div className="adj-filter-field">
            <label className="adj-filter-label">From Date</label>
            <CustomDatePicker
              value={startDate}
              onChange={(v) => {
                setStartDate(v);
                setCurrentPage(1);
              }}
              placeholder="All start dates"
            />
          </div>

          <div className="adj-filter-actions">
            <Button type="button" variant="ghost" onClick={handleResetFilters}>
              Reset
            </Button>
          </div>
        </div>

        <div className="adj-toolbar">
          <div className="adj-filter-field">
            <CustomDatePicker
              value={endDate}
              onChange={(v) => {
                setEndDate(v);
                setCurrentPage(1);
              }}
              placeholder="All end dates"
            />
          </div>

          <div className="adj-toolbar__actions">
            <Button type="button" variant="excel" onClick={onImportExcel}>
              Import Excel
            </Button>
            <Button type="button" variant="primary" onClick={onAddNew}>
              Add New
            </Button>
          </div>
        </div>
      </div>

      {/* Stock Adjustment Table */}
      <div className="adj-table-panel">
        <div className="adj-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="adj-th--center adj-col-no">No</th>
                <th>
                  <button
                    type="button"
                    className="sort-header-btn"
                    onClick={() => handleSort("adjustmentNumber")}
                  >
                    Adjustment No
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="sort-header-btn"
                    onClick={() => handleSort("adjustmentDate")}
                  >
                    Date
                  </button>
                </th>
                <th>
                  <button
                    type="button"
                    className="sort-header-btn"
                    onClick={() => handleSort("warehouseName")}
                  >
                    Warehouse
                  </button>
                </th>
                <th>Source</th>
                <th className="adj-th--center">Items</th>
                <th className="adj-th--right">Total In</th>
                <th className="adj-th--right">Total Out</th>
                <th>Note / Remark</th>
                <th>Created By</th>
                <th className="adj-th--center adj-col-action">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && paginatedRecords.length === 0 ? (
                <TableLoadingRow
                  colSpan={11}
                  label="Loading Stock Adjustments..."
                  sublabel="Fetching posted warehouse stock adjustments and Excel injections..."
                />
              ) : paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    <div className="adj-empty-state">
                      <strong className="adj-empty-title">No Stock Adjustments Found</strong>
                      <span>
                        Use Add New for manual stock entry or Import Excel to bulk inject warehouse stock.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rec, idx) => (
                  <tr key={rec.adjustmentNumber}>
                    <td className="adj-td--center">
                      {(safeCurrentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="adj-code-link"
                        onClick={() => onOpenDetail(rec.adjustmentNumber)}
                      >
                        {rec.adjustmentNumber}
                      </button>
                      {rec.referenceCode && (
                        <span className="adj-item-meta">Ref: {rec.referenceCode}</span>
                      )}
                    </td>
                    <td>{rec.adjustmentDate || "—"}</td>
                    <td>{rec.warehouseName || "—"}</td>
                    <td>
                      <Badge tone={rec.sourceType === "EXCEL_IMPORT" ? "purple" : "blue"}>
                        {rec.sourceType === "EXCEL_IMPORT" ? "Excel Import" : "Manual"}
                      </Badge>
                    </td>
                    <td className="adj-td--center">{rec.itemCount}</td>
                    <td className="adj-td--right">
                      {rec.totalIn > 0 ? (
                        <span className="adj-qty-in">+{rec.totalIn.toFixed(2)}</span>
                      ) : (
                        <span className="adj-qty-neutral">—</span>
                      )}
                    </td>
                    <td className="adj-td--right">
                      {rec.totalOut > 0 ? (
                        <span className="adj-qty-out">-{rec.totalOut.toFixed(2)}</span>
                      ) : (
                        <span className="adj-qty-neutral">—</span>
                      )}
                    </td>
                    <td>{rec.note || "—"}</td>
                    <td>{rec.createdBy || "—"}</td>
                    <td className="adj-td--center">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenDetail(rec.adjustmentNumber)}
                      >
                        Detail
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="adj-footer-bar">
          <Pagination
            totalRecords={totalRecords}
            currentPage={safeCurrentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default AdjustmentStockIndex;
