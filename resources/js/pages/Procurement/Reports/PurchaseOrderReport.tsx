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

interface PurchaseOrderReportProps {
  onDetail: (row: TableRow) => void;
}

export function PurchaseOrderReport({ onDetail }: PurchaseOrderReportProps) {
  const [search, setSearch] = useState("");
  const config = pageConfigs.report;
  const [stats, setStats] = useState(config.stats);
  const [rows, setRows] = useState(config.rows);
  const [reportFilters, setReportFilters] = useState<Record<string, any>>({
    poDateRange: "all",
    prDateRange: "all",
    supplier: "all",
    material: "",
    overallStatus: "all",
    poStatus: "all",
    prStatus: "all",
    facility: "all",
    section: "all",
  });

  useEffect(() => {
    let isMounted = true;
    fetchList("report").then((res) => {
      if (isMounted && res.rows && res.rows.length > 0) {
        setStats(res.stats);
        setRows(res.rows);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!(r._search || "").toLowerCase().includes(q)) return false;
      }
      if (reportFilters.supplier && reportFilters.supplier !== "all") {
        const s = String(r._rawSupplier || r.supplier || "").toLowerCase();
        if (!s.includes(reportFilters.supplier.toLowerCase())) return false;
      }
      if (reportFilters.material && reportFilters.material.trim()) {
        const m = reportFilters.material.trim().toLowerCase();
        const rowMat = String(r._rawMaterial || r.materialItem || "").toLowerCase();
        if (!rowMat.includes(m)) return false;
      }
      if (reportFilters.overallStatus && reportFilters.overallStatus !== "all") {
        const os = String(r._rawStatus || r.status || "").toLowerCase();
        if (!os.includes(reportFilters.overallStatus.toLowerCase())) return false;
      }
      if (reportFilters.facility && reportFilters.facility !== "all") {
        const f = String(r._rawFacility || r.facility || "").toLowerCase();
        if (!f.includes(reportFilters.facility.toLowerCase())) return false;
      }
      if (reportFilters.section && reportFilters.section !== "all") {
        const sec = String(r._rawDeptRequest || r.section || "").toLowerCase();
        if (!sec.includes(reportFilters.section.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, search, reportFilters]);

  const handleExportXLSX = () => {
    if (filtered.length === 0) {
      alert("No report records to export.");
      return;
    }
    const headers = [
      "No",
      "PO Number",
      "PR Number",
      "Supplier",
      "Item Material",
      "Quantity",
      "Total Price",
      "PO Status",
      "PR Status",
    ];

    const dataRows = filtered.map((r, idx) => [
      idx + 1,
      typeof r._rawPo === "string" ? r._rawPo : (typeof r.poNumber === "string" ? r.poNumber : ""),
      typeof r._rawPr === "string" ? r._rawPr : (typeof r.prNumber === "string" ? r.prNumber : ""),
      typeof r._rawSupplier === "string" ? r._rawSupplier : (typeof r.supplier === "string" ? r.supplier : ""),
      typeof r._rawMaterial === "string" ? r._rawMaterial : (typeof r.materialItem === "string" ? r.materialItem : ""),
      r._rawQty || 1,
      typeof r._rawTotalPrice === "string" ? r._rawTotalPrice : (typeof r.totalPrice === "string" ? r.totalPrice : ""),
      typeof r._rawPoStatus === "string" ? r._rawPoStatus : "Approved",
      typeof r._rawPrStatus === "string" ? r._rawPrStatus : "Approved",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 22 },
      { wch: 28 },
      { wch: 30 },
      { wch: 14 },
      { wch: 20 },
      { wch: 18 },
      { wch: 18 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PR-PO Traceability Report");
    XLSX.writeFile(wb, `PR_PO_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleResetFilters = () => {
    setSearch("");
    setReportFilters({
      poDateRange: "all",
      prDateRange: "all",
      supplier: "all",
      material: "",
      overallStatus: "all",
      poStatus: "all",
      prStatus: "all",
      facility: "all",
      section: "all",
    });
  };

  const handleApplyFilters = () => {
    // Triggers search evaluation
  };

  return (
    <>
      {/* Metric Cards Summary Grid */}
      <div className="summary-grid">
        {stats.map(([label, value, sub], i) => (
          <SummaryCard
            key={label}
            label={label}
            value={value}
            sub={sub}
            tone={i === 3 ? "accent" : undefined}
          />
        ))}
      </div>

      {/* Filter Panel */}
      <section className="panel filter-panel">
        <div className="panel__heading">
          <div>
            <strong>Filter documents</strong>
            <span>Refine the records shown in the table</span>
          </div>
          <Button variant="ghost" onClick={handleResetFilters}>
            Reset filters
          </Button>
        </div>

        <FilterPanel
          page="report"
          filters={reportFilters}
          onFilterChange={(k, v) => setReportFilters((prev) => ({ ...prev, [k]: v }))}
        />

        <div className="filter-actions">
          <SearchField value={search} onChange={setSearch} />
          <Button variant="secondary" icon="filter">
            More filters
          </Button>
          <Button onClick={handleApplyFilters}>Apply filters</Button>
        </div>
      </section>

      {/* Main Table Panel */}
      <section className="panel table-panel">
        <div className="panel__heading table-panel__heading">
          <div>
            <strong>PR–PO reporting records</strong>
            <span>{filtered.length} records shown</span>
          </div>
          <div className="button-row">
            <Button variant="excel" onClick={handleExportXLSX}>
              Export XLSX
            </Button>
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

export default PurchaseOrderReport;
