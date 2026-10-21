import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { Pagination } from "../../../../components/ui/Pagination";
import { initialColorRecords } from "./color-data";
import type {
  ColorRecord,
  ColorSortField,
  SortDirection,
} from "./color-types";

interface ColorIndexProps {
  records?: ColorRecord[];
  onAddNew: () => void;
}

export function ColorIndex({
  records = initialColorRecords,
  onAddNew,
}: ColorIndexProps) {
  const [localRecords, setLocalRecords] = useState<ColorRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<ColorSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter across Color Code and Color Name
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchCode = rec.code.toLowerCase().includes(query);
      const matchName = rec.name.toLowerCase().includes(query);
      return matchCode || matchName;
    });
  }, [localRecords, search]);

  // Column sorting logic
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "code") {
        aVal = a.code.toLowerCase();
        bVal = b.code.toLowerCase();
      } else if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
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

  // Tri-state column sorting toggle
  const handleToggleSort = (field: ColorSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: ColorSortField) => {
    if (sortField !== field || sortDirection === "none") {
      return <span className="color-sort-indicator inactive">⇅</span>;
    }
    return (
      <span className="color-sort-indicator active">
        {sortDirection === "asc" ? "▲" : "▼"}
      </span>
    );
  };

  // Export to genuine Excel (.xlsx) file
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    try {
      const rows = [
        ["No", "Color Code", "Color Name"],
        ...sortedRecords.map((item, index) => [
          index + 1,
          item.code,
          item.name,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 8 },  // No
        { wch: 18 }, // Color Code
        { wch: 30 }, // Color Name
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Colors");

      XLSX.writeFile(
        workbook,
        `Master_Color_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      setExportNotice(
        `Exported ${sortedRecords.length} color record(s) to Excel file.`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export records. Please try again.");
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  const startEntry =
    totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="color-page">
      {/* Page Heading Area: Master Color title on left, Add New and Export on right */}
      <div className="color-page-header">
        <h1 className="color-page-title">Master Color</h1>

        <div className="color-header-actions">
          <Button variant="primary" onClick={onAddNew}>
            Add New
          </Button>

          <Button
            variant="ghost"
            onClick={handleExportToExcel}
            title="Export color records to Excel (.xlsx)"
          >
            Export To Excel
          </Button>
        </div>
      </div>

      {/* Export notification notice */}
      {exportNotice && (
        <div className="color-alert color-alert--info">
          <Icon name="check" size={15} />
          <div className="color-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="color-alert-close"
            onClick={() => setExportNotice(null)}
            aria-label="Dismiss notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="color-table-panel panel">
        {/* Table Toolbar: Search on Left */}
        <div className="color-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search..."
          />
        </div>

        {/* Responsive Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="color-data-table data-table">
              <thead>
                <tr>
                  {/* 1. No */}
                  <th style={{ width: "70px", textAlign: "center" }}>
                    <span>No</span>
                  </th>

                  {/* 2. Color Code */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "160px" }}
                    onClick={() => handleToggleSort("code")}
                  >
                    <span>Color Code</span>
                    {renderSortIndicator("code")}
                  </th>

                  {/* 3. Color Name */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "280px" }}
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Color Name</span>
                    {renderSortIndicator("name")}
                  </th>

                  {/* 4. Option (Retained from reference without unestablished actions) */}
                  <th style={{ width: "100px", textAlign: "center" }}>
                    <span>Option</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber =
                      (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        {/* 1. No (Sequential) */}
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {rowNumber}
                        </td>

                        {/* 2. Color Code */}
                        <td className="color-code-cell">{item.code}</td>

                        {/* 3. Color Name */}
                        <td className="color-name-cell">{item.name}</td>

                        {/* 4. Option Column (Placeholder matching reference appearance) */}
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--muted)",
                            fontSize: "13px",
                          }}
                        >
                          -
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No colors found</strong>
                        <span>Try adjusting your search query.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Unified Bottom Pagination */}
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
    </div>
  );
}

export default ColorIndex;
