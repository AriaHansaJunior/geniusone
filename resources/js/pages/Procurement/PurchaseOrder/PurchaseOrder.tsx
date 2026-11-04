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

interface PurchaseOrderProps {
  onDetail: (row: TableRow) => void;
  onCreate?: () => void;
  onSelectPr?: (prNumber: string) => void;
}

export function PurchaseOrder({ onDetail, onCreate, onSelectPr }: PurchaseOrderProps) {
  const [search, setSearch] = useState("");
  const config = pageConfigs.po;
  const [stats, setStats] = useState(config.stats);
  const [rows, setRows] = useState(config.rows);
  const [poFilters, setPoFilters] = useState<Record<string, any>>({
    dateRange: "all",
    supplier: "all",
    facility: "all",
    status: "all",
    dept: "all",
  });

  useEffect(() => {
    let isMounted = true;
    fetchList("po").then((res) => {
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
      if (poFilters.supplier && poFilters.supplier !== "all") {
        const s = String(r._rawSupplier || r.supplier || "").toLowerCase();
        if (!s.includes(poFilters.supplier.toLowerCase())) return false;
      }
      if (poFilters.facility && poFilters.facility !== "all") {
        const f = String(r._rawFacility || r.facility || "").toLowerCase();
        if (!f.includes(poFilters.facility.toLowerCase())) return false;
      }
      if (poFilters.status && poFilters.status !== "all") {
        const st = String(r._rawStatus || r.status || "").toLowerCase();
        if (!st.includes(poFilters.status.toLowerCase())) return false;
      }
      if (poFilters.dept && poFilters.dept !== "all") {
        const d = String(r._rawDept || r.deptCreated || "").toLowerCase();
        if (!d.includes(poFilters.dept.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, search, poFilters]);

  const handleExportXLSX = () => {
    if (filtered.length === 0) {
      alert("No PO records to export.");
      return;
    }
    const headers = [
      "No",
      "PO Number",
      "PR Number",
      "Date",
      "Supplier",
      "Facility",
      "Total Price",
      "Status",
      "Dept. Created",
    ];

    const dataRows = filtered.map((r, idx) => [
      idx + 1,
      typeof r._rawPo === "string" ? r._rawPo : (typeof r.poNumber === "string" ? r.poNumber : ""),
      typeof r._rawPr === "string" ? r._rawPr : (typeof r.prNumber === "string" ? r.prNumber : ""),
      typeof r._rawDate === "string" ? r._rawDate : (typeof r.date === "string" ? r.date : ""),
      typeof r._rawSupplier === "string" ? r._rawSupplier : (typeof r.supplier === "string" ? r.supplier : ""),
      typeof r._rawFacility === "string" ? r._rawFacility : "Non Fasilitas",
      typeof r._rawTotalPrice === "string" ? r._rawTotalPrice : (typeof r.totalPrice === "string" ? r.totalPrice : ""),
      typeof r._rawStatus === "string" ? r._rawStatus : "Approved",
      typeof r._rawDept === "string" ? r._rawDept : "",
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 22 },
      { wch: 14 },
      { wch: 28 },
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders");
    XLSX.writeFile(wb, `Purchase_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleResetFilters = () => {
    setSearch("");
    setPoFilters({
      dateRange: "all",
      supplier: "all",
      facility: "all",
      status: "all",
      dept: "all",
    });
  };

  const handleApplyFilters = () => {
    // Triggers search evaluation
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
          page="po"
          filters={poFilters}
          onFilterChange={(k, v) => setPoFilters((prev) => ({ ...prev, [k]: v }))}
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
            <strong>PO documents</strong>
          </div>
          <div className="button-row">
            <Button variant="excel" onClick={handleExportXLSX}>
              Export XLSX
            </Button>
            <Button onClick={onCreate}>Create PO</Button>
          </div>
        </div>

        <DataTable
          columns={config.columns}
          rows={filtered}
          onDetail={onDetail}
          onSelectPr={(pr) => (onSelectPr ? onSelectPr(pr) : undefined)}
        />
      </section>
    </>
  );
}

export default PurchaseOrder;
