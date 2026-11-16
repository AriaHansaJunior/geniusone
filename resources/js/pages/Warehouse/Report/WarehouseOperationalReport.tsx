import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { Badge } from "../../../components/ui/Badge";
import { apiFetch } from "../../../data/api";

export type WarehouseReportKind =
  | "receive-material"
  | "stock-transfer"
  | "stock-mutation"
  | "outstanding-request";

interface ColumnDef {
  key: string;
  label: string;
  align?: "left" | "right";
  type?: "number" | "badge" | "text";
}

interface ReportConfig {
  endpoint: string;
  sheetName: string;
  filePrefix: string;
  emptyMessage: string;
  columns: ColumnDef[];
}

const REPORT_CONFIGS: Record<WarehouseReportKind, ReportConfig> = {
  "receive-material": {
    endpoint: "/api/warehouse/reports/receive-material",
    sheetName: "Receive Material Report",
    filePrefix: "Receive_Material_Report",
    emptyMessage: "No inbound receive material records found for the selected criteria.",
    columns: [
      { key: "bpb_number", label: "BPB Number" },
      { key: "date", label: "Date" },
      { key: "source_type", label: "Source" },
      { key: "rn_number", label: "RN Number" },
      { key: "po_number", label: "PO Number" },
      { key: "supplier", label: "Supplier" },
      { key: "warehouse", label: "Warehouse" },
      { key: "coordinate", label: "Coordinate" },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "unit", label: "Unit" },
      { key: "net_qty", label: "Net Qty", align: "right", type: "number" },
      { key: "status", label: "Status", type: "badge" },
    ],
  },
  "stock-transfer": {
    endpoint: "/api/warehouse/reports/stock-transfer",
    sheetName: "Stock Transfer Report",
    filePrefix: "Stock_Transfer_Report",
    emptyMessage: "No stock transfer or return records found for the selected criteria.",
    columns: [
      { key: "doc_number", label: "Document No" },
      { key: "doc_type", label: "Transfer Type" },
      { key: "date", label: "Date" },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "quantity", label: "Quantity", align: "right", type: "number" },
      { key: "unit", label: "Unit" },
      { key: "warehouse", label: "Warehouse" },
      { key: "destination", label: "Destination / Ref" },
      { key: "job_number", label: "Job Number" },
      { key: "status", label: "Status", type: "badge" },
    ],
  },
  "stock-mutation": {
    endpoint: "/api/warehouse/reports/stock-mutation",
    sheetName: "Stock Mutation Report",
    filePrefix: "Stock_Mutation_Report",
    emptyMessage: "No stock mutation records found for the selected criteria.",
    columns: [
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "classification", label: "Classification" },
      { key: "facility", label: "Facility" },
      { key: "unit", label: "Unit" },
      { key: "opening", label: "Opening", align: "right", type: "number" },
      { key: "total_in", label: "In", align: "right", type: "number" },
      { key: "total_out", label: "Out", align: "right", type: "number" },
      { key: "ending", label: "Ending", align: "right", type: "number" },
      { key: "current_stock", label: "Current Stock", align: "right", type: "number" },
    ],
  },
  "outstanding-request": {
    endpoint: "/api/warehouse/reports/outstanding-request",
    sheetName: "Outstanding Request Report",
    filePrefix: "Outstanding_Request_Report",
    emptyMessage: "No material request records found for the selected criteria.",
    columns: [
      { key: "request_number", label: "Request No" },
      { key: "date", label: "Request Date" },
      { key: "department", label: "Department" },
      { key: "warehouse", label: "Warehouse" },
      { key: "destination", label: "Destination" },
      { key: "item_code", label: "Item Code" },
      { key: "item_name", label: "Item Name" },
      { key: "requested_qty", label: "Requested", align: "right", type: "number" },
      { key: "issued_qty", label: "Issued", align: "right", type: "number" },
      { key: "returned_qty", label: "Returned", align: "right", type: "number" },
      { key: "outstanding_qty", label: "Outstanding", align: "right", type: "number" },
      { key: "unit", label: "Unit" },
      { key: "status", label: "Status", type: "badge" },
    ],
  },
};

function resolveStatusTone(status: string): "green" | "orange" | "blue" | "red" | "gray" {
  const s = String(status || "").toLowerCase();
  if (s.includes("reject")) return "red";
  if (s === "approved" || s === "approved 2") return "green";
  if (s.includes("approve 2")) return "blue";
  if (s.includes("waiting") || s.includes("approve 1")) return "orange";
  return "gray";
}

interface WarehouseOperationalReportProps {
  reportKind: WarehouseReportKind;
}

export function WarehouseOperationalReport({ reportKind }: WarehouseOperationalReportProps) {
  const config = REPORT_CONFIGS[reportKind];
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    apiFetch(`${config.endpoint}?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active) return;
        setRows(Array.isArray(json?.data) ? json.data : []);
      })
      .catch(() => {
        if (active) setRows([]);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [config.endpoint, startDate, endDate]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      config.columns.some((col) =>
        String(row[col.key] ?? "")
          .toLowerCase()
          .includes(q)
      )
    );
  }, [rows, search, config.columns]);

  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRows = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return filteredRows.slice(startIdx, startIdx + pageSize);
  }, [filteredRows, safeCurrentPage, pageSize]);

  const handleExportExcel = () => {
    if (filteredRows.length === 0) {
      setNotice("No report records match the current filter to export.");
      setTimeout(() => setNotice(null), 4000);
      return;
    }

    const headers = ["No", ...config.columns.map((c) => c.label)];
    const body = filteredRows.map((row, idx) => [
      idx + 1,
      ...config.columns.map((col) => {
        const val = row[col.key];
        return col.type === "number" ? Number(val ?? 0) : String(val ?? "-");
      }),
    ]);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...body]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, config.sheetName.slice(0, 31));
    XLSX.writeFile(wb, `${config.filePrefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="master-page-shell">
      {notice && (
        <div className="dh-alert dh-alert--info" role="status">
          <div className="dh-alert__content">
            <p>{notice}</p>
          </div>
          <button
            type="button"
            className="dh-alert-close"
            onClick={() => setNotice(null)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="panel filter-panel">
        <div className="dh-filter-bar">
          <div className="dh-filter-item dh-filter-search">
            <label className="dh-filter-label">Search</label>
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search code, item, warehouse..."
            />
          </div>

          <div className="dh-filter-item dh-filter-date-range">
            <label className="dh-filter-label">Period</label>
            <div className="dh-date-inputs">
              <CustomDatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setCurrentPage(1);
                }}
              />
              <span className="dh-date-sep">To</span>
              <CustomDatePicker
                value={endDate}
                onChange={(val) => {
                  setEndDate(val);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          <div className="dh-filter-item">
            <Button type="button" variant="excel" onClick={handleExportExcel}>
              Export XLSX
            </Button>
          </div>
        </div>
      </div>

      <div className="panel table-panel">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>No</th>
                {config.columns.map((col) => (
                  <th key={col.key} className={col.align === "right" ? "text-right" : undefined}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="table-empty-cell">
                    Loading report records...
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length + 1} className="table-empty-cell">
                    {config.emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => (
                  <tr key={String(row.id ?? idx)}>
                    <td>{(safeCurrentPage - 1) * pageSize + idx + 1}</td>
                    {config.columns.map((col) => {
                      const val = row[col.key];
                      if (col.type === "badge") {
                        return (
                          <td key={col.key}>
                            <Badge tone={resolveStatusTone(String(val || ""))}>
                              {String(val || "-")}
                            </Badge>
                          </td>
                        );
                      }
                      if (col.type === "number") {
                        return (
                          <td key={col.key} className="text-right">
                            {Number(val ?? 0).toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })}
                          </td>
                        );
                      }
                      return <td key={col.key}>{String(val ?? "-")}</td>;
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={safeCurrentPage}
          totalRecords={totalRecords}
          pageSize={pageSize}
          showPageSize={true}
          onPageChange={setCurrentPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setCurrentPage(1);
          }}
        />
      </div>
    </div>
  );
}
