import { useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import { SummaryCard } from "../components/ui/SummaryCard";
import { SearchField } from "../components/ui/SearchField";
import { DataTable } from "../components/ui/DataTable";
import { FilterPanel } from "../components/common/FilterPanel";
import { pageConfigs } from "../data/mockData";
import type { PageKey, TableRow } from "../types";

interface ListingPageProps {
  page: Exclude<PageKey, "foundation">;
  onDetail: (row: TableRow) => void;
}

export function ListingPage({ page, onDetail }: ListingPageProps) {
  const [search, setSearch] = useState("");
  const config = pageConfigs[page];

  const filtered = useMemo(() => {
    if (!search.trim()) return config.rows;
    const q = search.toLowerCase();
    return config.rows.filter((r) =>
      (r._search || "").toLowerCase().includes(q)
    );
  }, [config.rows, search]);

  const tableTitle =
    page === "warehouse"
      ? "Receive material documents"
      : page === "report"
      ? "PR–PO reporting records"
      : `${page.toUpperCase()} documents`;

  const actionButtonText =
    page === "warehouse"
      ? "Receive material"
      : `Create ${page.toUpperCase()}`;

  return (
    <>
      {/* Metric Cards Summary Grid */}
      <div className="summary-grid">
        {config.stats.map(([label, value, sub], i) => (
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

        <FilterPanel page={page} />

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
            <strong>{tableTitle}</strong>
            <span>{filtered.length} records shown · Updated just now</span>
          </div>
          <div className="button-row">
            <Button variant="secondary" icon="download">
              Export XLSX
            </Button>
            {page !== "report" && (
              <Button icon="plus">{actionButtonText}</Button>
            )}
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
