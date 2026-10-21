import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import {
  initialSupplierRecords,
  type SupplierRecord,
} from "./supplier-types";

interface SupplierIndexProps {
  records?: SupplierRecord[];
  onAddNew: () => void;
  onToggleHide?: (id: string) => void;
}

type SortField =
  | "no"
  | "supplierCode"
  | "supplierName"
  | "address"
  | "country"
  | "npwp"
  | "nitku"
  | "created";

type SortDirection = "asc" | "desc";

export function SupplierIndex({
  records = initialSupplierRecords,
  onAddNew,
  onToggleHide,
}: SupplierIndexProps) {
  const [localRecords, setLocalRecords] = useState<SupplierRecord[]>(records);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField>("no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleToggleHide = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
    if (onToggleHide) {
      onToggleHide(id);
    }
  };

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        String(rec.no).includes(query) ||
        rec.supplierCode.toLowerCase().includes(query) ||
        rec.supplierName.toLowerCase().includes(query) ||
        rec.address.toLowerCase().includes(query) ||
        rec.country.toLowerCase().includes(query) ||
        rec.npwp.toLowerCase().includes(query) ||
        rec.nitku.toLowerCase().includes(query) ||
        rec.createdBy.toLowerCase().includes(query) ||
        rec.createdAt.toLowerCase().includes(query)
      );
    });
  }, [search]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "no") {
        aVal = a.no;
        bVal = b.no;
      } else if (sortField === "created") {
        aVal = a.createdAt;
        bVal = b.createdAt;
      } else {
        aVal = (a[sortField] || "").toLowerCase();
        bVal = (b[sortField] || "").toLowerCase();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Toggle column sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Export to Excel-compatible CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      return;
    }

    try {
      const headers = [
        "No",
        "Supplier Code",
        "Supplier Name",
        "Address",
        "Country",
        "NPWP",
        "NITKU",
        "Created By",
        "Created At",
      ];

      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.supplierCode || "").replace(/"/g, '""')}"`,
          `"${(row.supplierName || "").replace(/"/g, '""')}"`,
          `"${(row.address || "").replace(/"/g, '""')}"`,
          `"${(row.country || "").replace(/"/g, '""')}"`,
          `"${(row.npwp || "").replace(/"/g, '""')}"`,
          `"${(row.nitku || "").replace(/"/g, '""')}"`,
          `"${(row.createdBy || "").replace(/"/g, '""')}"`,
          `"${(row.createdAt || "").replace(/"/g, '""')}"`,
        ];
        csvRows.push(values.join(","));
      });

      // Prepend UTF-8 BOM (\uFEFF) so Excel correctly recognizes UTF-8 formatting
      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Supplier_Master_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(
        `Successfully exported ${sortedRecords.length} supplier record(s) to CSV.`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      setExportNotice("Export could not be completed from current frontend environment.");
    }
  };

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span className={`table-sort-arrow ${isActive ? "active" : ""}`}>
        {isActive ? (
          sortDirection === "asc" ? "▲" : "▼"
        ) : (
          "⇅"
        )}
      </span>
    );
  };

  return (
    <div className="supplier-master-page">
      {/* Export status toast if active */}
      {exportNotice && (
        <div className="supplier-toast-notice">
          <Icon name="check" size={14} />
          <span>{exportNotice}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Container Card */}
      <div className="panel table-panel supplier-table-panel">
        {/* Table Toolbar: Search on left, Actions on right */}
        <div className="supplier-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search document, supplier, material..."
          />
          <div className="button-row">
            <Button
              variant="secondary"
              onClick={handleExportToExcel}
            >
              Export to Excel
            </Button>
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
          </div>
        </div>

        {/* Responsive Table Scroll Container */}
        <div className="table-frame supplier-table-frame">
          <div className="table-scroll">
            <table className="data-table supplier-data-table">
              <thead>
                <tr>
                  <th
                    style={{ width: "48px", textAlign: "center" }}
                    onClick={() => handleSort("no")}
                    className="sortable-th"
                  >
                    <span>No</span>
                    {renderSortIndicator("no")}
                  </th>
                  <th
                    style={{ width: "130px" }}
                    onClick={() => handleSort("supplierCode")}
                    className="sortable-th"
                  >
                    <span>Supplier Code</span>
                    {renderSortIndicator("supplierCode")}
                  </th>
                  <th
                    style={{ width: "230px" }}
                    onClick={() => handleSort("supplierName")}
                    className="sortable-th"
                  >
                    <span>Supplier Name</span>
                    {renderSortIndicator("supplierName")}
                  </th>
                  <th
                    style={{ minWidth: "260px" }}
                    onClick={() => handleSort("address")}
                    className="sortable-th"
                  >
                    <span>Address</span>
                    {renderSortIndicator("address")}
                  </th>
                  <th
                    style={{ width: "95px", textAlign: "center" }}
                    onClick={() => handleSort("country")}
                    className="sortable-th"
                  >
                    <span>Country</span>
                    {renderSortIndicator("country")}
                  </th>
                  <th
                    style={{ width: "135px" }}
                    onClick={() => handleSort("npwp")}
                    className="sortable-th"
                  >
                    <span>NPWP</span>
                    {renderSortIndicator("npwp")}
                  </th>
                  <th
                    style={{ width: "145px" }}
                    onClick={() => handleSort("nitku")}
                    className="sortable-th"
                  >
                    <span>NITKU</span>
                    {renderSortIndicator("nitku")}
                  </th>
                  <th
                    style={{ width: "135px" }}
                    onClick={() => handleSort("created")}
                    className="sortable-th"
                  >
                    <span>Created</span>
                    {renderSortIndicator("created")}
                  </th>
                  <th style={{ width: "95px", textAlign: "center" }}>
                    <span>Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id} className={item.hidden ? "row--hidden" : ""}>
                        <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                          {rowNumber}
                        </td>
                      <td>
                        {item.supplierCode ? (
                          <strong className="supplier-code-badge">
                            {item.supplierCode}
                          </strong>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td className="supplier-name-cell">
                        <strong>{item.supplierName}</strong>
                      </td>
                      <td className="supplier-address-cell">
                        {item.address}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span className="supplier-country-tag">
                          {item.country}
                        </span>
                      </td>
                      <td className="supplier-id-cell">
                        {item.npwp || "—"}
                      </td>
                      <td className="supplier-id-cell">
                        {item.nitku || "—"}
                      </td>
                      <td className="supplier-created-cell">
                        <strong className="supplier-creator">{item.createdBy}</strong>
                        <span className="supplier-timestamp">{item.createdAt}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <label
                          className="status-hide-checklist"
                          title={item.hidden ? "Checked: Hidden from PO, transactions, and reports" : "Unchecked: Active and selectable"}
                        >
                          <input
                            type="checkbox"
                            checked={!!item.hidden}
                            onChange={() => handleToggleHide(item.id)}
                          />
                          <span className={item.hidden ? "status-text status-text--hidden" : "status-text status-text--active"}>
                            {item.hidden ? "Hidden" : "Active"}
                          </span>
                        </label>
                      </td>
                    </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No suppliers found</strong>
                        <span>Try adjusting your search criteria.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            totalRecords={totalRecords}
            currentPage={safeCurrentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default SupplierIndex;
