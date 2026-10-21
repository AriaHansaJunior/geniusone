import { useEffect, useMemo, useState } from "react";
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
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      (r._search || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

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
          <Button variant="ghost" onClick={() => setSearch("")}>
            Reset filters
          </Button>
        </div>

        <FilterPanel page="report" />

        <div className="filter-actions">
          <SearchField value={search} onChange={setSearch} />
          <Button variant="secondary" icon="filter">
            More filters
          </Button>
          <Button>Apply filters</Button>
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
            <Button variant="excel">
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
