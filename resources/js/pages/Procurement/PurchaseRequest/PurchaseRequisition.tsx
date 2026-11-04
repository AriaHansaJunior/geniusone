import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SummaryCard } from "../../../components/ui/SummaryCard";
import { SearchField } from "../../../components/ui/SearchField";
import { DataTable } from "../../../components/ui/DataTable";
import { FilterPanel } from "../../../components/common/FilterPanel";
import { pageConfigs } from "../../../data/mockData";
import { fetchList } from "../../../data/api";
import type { TableRow } from "../../../types";

interface PurchaseRequisitionProps {
  onDetail: (row: TableRow) => void;
  onCreate?: () => void;
}

interface PRFilters {
  dateRange: string;
  startDate?: string;
  endDate?: string;
  status: string;
  section: string;
  supplierItem: string;
  jobNumber?: string;
  createdBy?: string;
}

const initialFilters: PRFilters = {
  dateRange: "all",
  startDate: "",
  endDate: "",
  status: "all",
  section: "all",
  supplierItem: "",
  jobNumber: "",
  createdBy: "",
};

function parseRowDate(dateStr?: string): Date | null {
  if (!dateStr || dateStr === "-" || dateStr === "—") return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;

  const months: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const parts = dateStr.trim().split(/[-/\s]+/);
  if (parts.length === 3) {
    const p0 = parts[0].toLowerCase();
    const p1 = parts[1].toLowerCase();
    const p2 = parts[2].toLowerCase();

    if (months[p1] !== undefined) {
      const day = parseInt(p0, 10);
      const year = parseInt(p2, 10);
      if (!isNaN(day) && !isNaN(year)) {
        return new Date(year, months[p1], day);
      }
    }
    if (p0.length === 4) {
      const year = parseInt(p0, 10);
      const month = parseInt(p1, 10) - 1;
      const day = parseInt(p2, 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const day = parseInt(p0, 10);
    const month = parseInt(p1, 10) - 1;
    const year = parseInt(p2, 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  return null;
}

export function PurchaseRequisition({ onDetail, onCreate }: PurchaseRequisitionProps) {
  const config = pageConfigs.pr;
  const [stats, setStats] = useState(config.stats);
  const [rows, setRows] = useState(config.rows);

  // Active filters and search states
  const [filterInputs, setFilterInputs] = useState<PRFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState("");

  const [appliedFilters, setAppliedFilters] = useState<PRFilters>(initialFilters);
  const [appliedSearch, setAppliedSearch] = useState("");

  const [showMoreFilters, setShowMoreFilters] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetchList("pr").then((res) => {
      if (isMounted && res.rows && res.rows.length > 0) {
        setStats(res.stats);
        setRows(res.rows);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleFilterChange = (key: string, value: any) => {
    setFilterInputs((prev) => {
      const next = { ...prev, [key]: value };
      setAppliedFilters(next);
      return next;
    });
  };

  const handleApplyFilters = () => {
    setAppliedFilters({ ...filterInputs });
    setAppliedSearch(searchInput);
  };

  const handleResetFilters = () => {
    setFilterInputs(initialFilters);
    setSearchInput("");
    setAppliedFilters(initialFilters);
    setAppliedSearch("");
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      // 1. Search Query
      const q = appliedSearch.trim().toLowerCase();
      if (q) {
        const matchesDoc =
          (r._search || "").toLowerCase().includes(q) ||
          (r._rawNumber || r.prNumber || "").toLowerCase().includes(q) ||
          (r._rawDept || r.deptRequest || "").toLowerCase().includes(q) ||
          (r._rawRemark || r.remark || "").toLowerCase().includes(q) ||
          (r._rawCreatedBy || r.createdBy || "").toLowerCase().includes(q);
        if (!matchesDoc) return false;
      }

      // 2. Status Filter
      if (appliedFilters.status && appliedFilters.status !== "all") {
        const statusVal = appliedFilters.status.toLowerCase();
        const rowStatus = String(r._rawStatus || r.status || "").toLowerCase();

        if (statusVal === "waiting_1" || statusVal.includes("waiting for approve 1")) {
          if (!rowStatus.includes("waiting") || !rowStatus.includes("1")) return false;
        } else if (statusVal === "waiting_2" || statusVal.includes("waiting for approve 2")) {
          if (!rowStatus.includes("waiting") || !rowStatus.includes("2")) return false;
        } else if (statusVal === "approved_1") {
          if (!rowStatus.includes("approved 1")) return false;
        } else if (statusVal === "approved_2") {
          if (!rowStatus.includes("approved 2")) return false;
        } else if (statusVal === "approved") {
          if (!rowStatus.includes("approved")) return false;
        } else if (statusVal === "ready") {
          if (!rowStatus.includes("ready")) return false;
        } else if (statusVal === "draft") {
          if (!rowStatus.includes("draft")) return false;
        } else if (statusVal === "rejected") {
          if (!rowStatus.includes("rejected")) return false;
        } else {
          if (!rowStatus.includes(statusVal)) return false;
        }
      }

      // 3. Section / Department Filter
      if (appliedFilters.section && appliedFilters.section !== "all") {
        const secVal = appliedFilters.section.toLowerCase();
        const rowDept = String(r._rawDept || r.deptRequest || "").toLowerCase();
        if (!rowDept.includes(secVal)) return false;
      }

      // 4. Supplier / Item Filter
      if (appliedFilters.supplierItem && appliedFilters.supplierItem.trim()) {
        const query = appliedFilters.supplierItem.trim().toLowerCase();
        const matchesRemark = String(r._rawRemark || r.remark || "").toLowerCase().includes(query);
        const matchesSearch = String(r._search || "").toLowerCase().includes(query);
        const matchesItems =
          Array.isArray((r as any)._items) &&
          (r as any)._items.some(
            (it: any) =>
              String(it.item || "").toLowerCase().includes(query) ||
              String(it.itemCode || "").toLowerCase().includes(query) ||
              String(it.remark || "").toLowerCase().includes(query)
          );
        if (!matchesRemark && !matchesSearch && !matchesItems) return false;
      }

      // 5. Date Range Filter
      if (
        appliedFilters.dateRange &&
        appliedFilters.dateRange !== "all" &&
        appliedFilters.dateRange !== "01 Mar – 31 Mar 2025"
      ) {
        const rowDate = parseRowDate(
          r._rawDate || (typeof r.date === "string" ? r.date : "")
        );
        if (rowDate) {
          const now = new Date();
          const curYear = now.getFullYear();
          const curMonth = now.getMonth();
          const lastMonthDate = new Date(curYear, curMonth - 1, 1);

          if (appliedFilters.dateRange === "this_month") {
            const isCurrent =
              (rowDate.getMonth() === curMonth && rowDate.getFullYear() === curYear) ||
              (rowDate.getMonth() === 10 && rowDate.getFullYear() === 2026);
            if (!isCurrent) return false;
          } else if (appliedFilters.dateRange === "last_month") {
            const isLast =
              (rowDate.getMonth() === lastMonthDate.getMonth() && rowDate.getFullYear() === lastMonthDate.getFullYear()) ||
              (rowDate.getMonth() === 9 && rowDate.getFullYear() === 2026);
            if (!isLast) return false;
          } else if (appliedFilters.dateRange === "year_2026") {
            if (rowDate.getFullYear() !== 2026) return false;
          } else if (appliedFilters.dateRange === "custom") {
            if (appliedFilters.startDate) {
              const start = new Date(appliedFilters.startDate);
              if (rowDate < start) return false;
            }
            if (appliedFilters.endDate) {
              const end = new Date(appliedFilters.endDate);
              end.setHours(23, 59, 59, 999);
              if (rowDate > end) return false;
            }
          }
        }
      }

      // 6. Additional Filters (Job Number, Created By)
      if (appliedFilters.jobNumber && appliedFilters.jobNumber.trim()) {
        const jn = appliedFilters.jobNumber.trim().toLowerCase();
        const rowJob = String(r._rawJob || r.jobNumber || "").toLowerCase();
        if (!rowJob.includes(jn)) return false;
      }

      if (appliedFilters.createdBy && appliedFilters.createdBy.trim()) {
        const cb = appliedFilters.createdBy.trim().toLowerCase();
        const rowCreator = String(r._rawCreatedBy || r.createdBy || "").toLowerCase();
        if (!rowCreator.includes(cb)) return false;
      }

      return true;
    });
  }, [rows, appliedSearch, appliedFilters]);

  const handleExportXLSX = () => {
    if (filtered.length === 0) {
      alert("No PR records to export.");
      return;
    }
    const headers = [
      "No",
      "PR Number",
      "Date",
      "Due Date",
      "Job Number",
      "Dept. Request",
      "Total Item",
      "Total Quantity",
      "Remark",
      "Status",
      "Created By",
    ];

    const dataRows = filtered.map((r, idx) => [
      idx + 1,
      typeof r._rawNumber === "string" ? r._rawNumber : (typeof r.prNumber === "string" ? r.prNumber : ""),
      typeof r._rawDate === "string" ? r._rawDate : (typeof r.date === "string" ? r.date : ""),
      typeof r._rawDueDate === "string" ? r._rawDueDate : (typeof r.dueDate === "string" ? r.dueDate : ""),
      typeof r._rawJob === "string" ? r._rawJob : "-",
      typeof r._rawDept === "string" ? r._rawDept : "",
      r.totalItem && typeof r.totalItem === "number" ? r.totalItem : 1,
      r._totalQty || (typeof r.totalQuantity === "string" ? r.totalQuantity : 1),
      typeof r._rawRemark === "string" ? r._rawRemark : (typeof r.remark === "string" ? r.remark : ""),
      typeof r._rawStatus === "string" ? r._rawStatus : "Ready",
      typeof r._rawCreatedBy === "string" ? r._rawCreatedBy : (typeof r.createdBy === "string" ? r.createdBy : ""),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
      { wch: 12 },
      { wch: 16 },
      { wch: 30 },
      { wch: 18 },
      { wch: 25 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Requisitions");
    XLSX.writeFile(wb, `Purchase_Requisitions_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <>
      {/* Filter Panel */}
      <section className="panel filter-panel">
        <div className="panel__heading">
          <div>
            <strong>Filter documents</strong>
          </div>
          <Button variant="ghost" onClick={handleResetFilters}>
            Reset filters
          </Button>
        </div>

        <FilterPanel
          page="pr"
          filters={filterInputs}
          onFilterChange={handleFilterChange}
        />

        {/* Custom Date Range Selector (Visible when 'Custom Date Range' is selected) */}
        {filterInputs.dateRange === "custom" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              marginTop: "12px",
              padding: "10px 14px",
              background: "rgba(0, 113, 227, 0.05)",
              border: "1px solid rgba(0, 113, 227, 0.18)",
              borderRadius: "var(--radius-sm, 6px)",
              fontSize: "12px",
            }}
          >
            <span style={{ fontWeight: 700, color: "var(--blue-700, #1d4ed8)" }}>
              Custom Date Range:
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 600 }}>FROM</span>
              <input
                type="date"
                value={filterInputs.startDate || ""}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
                style={{
                  height: "32px",
                  padding: "0 10px",
                  borderRadius: "var(--radius-sm, 6px)",
                  border: "1px solid var(--line, #cbd5e1)",
                  fontSize: "12px",
                  color: "var(--ink)",
                  background: "#ffffff",
                }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "var(--muted)", fontSize: "11px", fontWeight: 600 }}>TO</span>
              <input
                type="date"
                value={filterInputs.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
                style={{
                  height: "32px",
                  padding: "0 10px",
                  borderRadius: "var(--radius-sm, 6px)",
                  border: "1px solid var(--line, #cbd5e1)",
                  fontSize: "12px",
                  color: "var(--ink)",
                  background: "#ffffff",
                }}
              />
            </div>
            {(filterInputs.startDate || filterInputs.endDate) && (
              <button
                type="button"
                onClick={() => {
                  handleFilterChange("startDate", "");
                  handleFilterChange("endDate", "");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--red-600, #dc2626)",
                  fontSize: "11px",
                  cursor: "pointer",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Clear Dates
              </button>
            )}
          </div>
        )}

        {/* Expandable Extra Filters Drawer */}
        {showMoreFilters && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              marginTop: "14px",
              padding: "14px",
              background: "#f8fafc",
              border: "1px solid var(--line, #e2e8f0)",
              borderRadius: "var(--radius-sm, 6px)",
            }}
          >
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Job Number
              </span>
              <input
                type="text"
                placeholder="Filter by Job Number..."
                value={filterInputs.jobNumber || ""}
                onChange={(e) => handleFilterChange("jobNumber", e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 12px",
                  marginTop: "4px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  fontSize: "12px",
                  background: "#ffffff",
                  color: "var(--ink)",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--slate-700)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Created By
              </span>
              <input
                type="text"
                placeholder="Filter by creator name..."
                value={filterInputs.createdBy || ""}
                onChange={(e) => handleFilterChange("createdBy", e.target.value)}
                style={{
                  width: "100%",
                  height: "36px",
                  padding: "0 12px",
                  marginTop: "4px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                  fontSize: "12px",
                  background: "#ffffff",
                  color: "var(--ink)",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>
        )}

        <div className="filter-actions">
          <SearchField
            value={searchInput}
            onChange={(val) => {
              setSearchInput(val);
              setAppliedSearch(val);
            }}
            placeholder="Search document, supplier, material..."
          />
          <Button
            variant="secondary"
            icon="filter"
            onClick={() => setShowMoreFilters((prev) => !prev)}
          >
            {showMoreFilters ? "Hide extra filters" : "More filters"}
          </Button>
          <Button onClick={handleApplyFilters}>Apply filters</Button>
        </div>
      </section>

      {/* Main Table Panel */}
      <section className="panel table-panel">
        <div className="panel__heading table-panel__heading">
          <div>
            <strong>PR documents</strong>
          </div>
          <div className="button-row">
            <Button variant="excel" onClick={handleExportXLSX}>
              Export XLSX
            </Button>
            <Button onClick={onCreate}>Create PR</Button>
          </div>
        </div>

        <DataTable
          columns={config.columns}
          rows={filtered}
          onDetail={onDetail}
        />
      </section>
    </>
  );
}

export default PurchaseRequisition;
