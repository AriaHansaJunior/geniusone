import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { DataTable } from "../../../components/ui/DataTable";
import { FilterPanel } from "../../../components/common/FilterPanel";
import { listColumns } from "../../../config/listColumns";
import { fetchList } from "../../../data/api";
import type { TableRow } from "../../../types";

interface WarehouseProps {
  onDetail: (row: TableRow) => void;
  onCreate?: () => void;
}

export function Warehouse({ onDetail, onCreate }: WarehouseProps) {
  const [search, setSearch] = useState("");
  const columns = listColumns.warehouse;
  const [rows, setRows] = useState<TableRow[]>([]);
  const [whFilters, setWhFilters] = useState<Record<string, any>>({
    dateRange: "all",
    docType: "all",
    bpbType: "all",
    approval: "all",
  });

  useEffect(() => {
    let isMounted = true;
    fetchList("warehouse").then((res) => {
      if (isMounted) {
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
      if (whFilters.docType && whFilters.docType !== "all") {
        const dt = String(r._rawDocType || r._rawBc || r.docType || r.bcType || "").toLowerCase();
        if (!dt.includes(whFilters.docType.toLowerCase())) return false;
      }
      if (whFilters.bpbType && whFilters.bpbType !== "all") {
        const bt = String(r._rawBpbType || r.bpbType || "").toLowerCase();
        if (!bt.includes(whFilters.bpbType.toLowerCase())) return false;
      }
      if (whFilters.approval && whFilters.approval !== "all") {
        const ap = String(r._rawApproval || r._rawStatus || r.statusApprove || r.status || r.approval || "").toLowerCase();
        if (!ap.includes(whFilters.approval.toLowerCase())) return false;
      }
      return true;
    });
  }, [rows, search, whFilters]);

  const handleExportXLSX = () => {
    if (filtered.length === 0) {
      alert("No receive material records to export.");
      return;
    }
    const headers = [
      "No",
      "Receive Number (BPB)",
      "RN Number",
      "Delivery Order (SJ)",
      "BPB Type",
      "Supplier",
      "Document Type",
      "Status Facility",
      "Approval",
      "Created By",
    ];

    const dataRows = filtered.map((r, idx) => [
      idx + 1,
      typeof r._rawNumber === "string" ? r._rawNumber : (typeof r.receiveNumber === "string" ? r.receiveNumber : ""),
      typeof r._rawRn === "string" ? r._rawRn : (typeof r.rnNumber === "string" ? r.rnNumber : ""),
      typeof r._rawSj === "string" ? r._rawSj : (typeof r.deliveryOrder === "string" ? r.deliveryOrder : ""),
      typeof r._rawBpbType === "string" ? r._rawBpbType : (typeof r.bpbType === "string" ? r.bpbType : ""),
      typeof r._rawSupplier === "string" ? r._rawSupplier : (typeof r.supplier === "string" ? r.supplier : ""),
      typeof r._rawBc === "string" ? r._rawBc : (typeof r.docType === "string" ? r.docType : "BC 4.0"),
      typeof r._rawFacility === "string" ? r._rawFacility : "Non Fasilitas",
      typeof r._rawApproval === "string" ? r._rawApproval : (typeof r._rawStatus === "string" ? r._rawStatus : "Waiting for Approve 1"),
      typeof r._rawCreatedBy === "string" ? r._rawCreatedBy : (typeof r.created === "string" ? r.created : ""),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws["!cols"] = [
      { wch: 6 },
      { wch: 24 },
      { wch: 22 },
      { wch: 20 },
      { wch: 18 },
      { wch: 28 },
      { wch: 18 },
      { wch: 18 },
      { wch: 20 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Receive Material BPB");
    XLSX.writeFile(wb, `Receive_Material_BPB_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleResetFilters = () => {
    setSearch("");
    setWhFilters({
      dateRange: "all",
      docType: "all",
      bpbType: "all",
      approval: "all",
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
          <Button variant="danger" size="sm" onClick={handleResetFilters}>
            Reset Filters
          </Button>
        </div>

        <FilterPanel
          page="warehouse"
          filters={whFilters}
          onFilterChange={(k, v) => setWhFilters((prev) => ({ ...prev, [k]: v }))}
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
            <strong>Receive material documents</strong>
          </div>
          <div className="button-row">
            <Button variant="excel" onClick={handleExportXLSX}>
              Export XLSX
            </Button>
            <Button onClick={onCreate}>
              Receive material
            </Button>
          </div>
        </div>

        <DataTable
          columns={columns}
          rows={filtered}
          onDetail={onDetail}
        />
      </section>
    </>
  );
}

export default Warehouse;
