import React, { useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import {
  initialPphRecords,
  type PphRecord,
} from "./pph-types";

interface PphIndexProps {
  records?: PphRecord[];
  onAddNew: () => void;
}

type SortField = "name" | "rate" | "deduction";
type SortDirection = "asc" | "desc";

export function PphIndex({ records = initialPphRecords, onAddNew }: PphIndexProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const query = search.toLowerCase().trim();
    return records.filter((rec) => {
      return (
        rec.name.toLowerCase().includes(query) ||
        rec.rate.toFixed(4).includes(query) ||
        rec.deduction.toLowerCase().includes(query)
      );
    });
  }, [records, search]);

  // Sort records by Name, Rate, or Deduction
  const sortedRecords = useMemo(() => {
    if (!sortField) return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: string | number = a[sortField];
      let bVal: string | number = b[sortField];

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
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

  // Toggle sorting on a field
  const handleToggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
        setSortDirection("asc");
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortArrow = (field: SortField) => {
    const isActive = sortField === field;
    return (
      <span
        style={{
          marginLeft: "6px",
          fontSize: "11px",
          color: isActive ? "var(--blue-600)" : "var(--muted)",
          fontWeight: 800,
        }}
      >
        {isActive ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  };

  return (
    <div className="pph-page" style={{ width: "100%", animation: "fadeIn 0.15s ease-in-out" }}>
      {/* Main Table Container Card */}
      <div className="panel table-panel">
        {/* Table Toolbar: Search on left, Single Add New action on right */}
        <div
          className="table-toolbar"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 18px",
            borderBottom: "1px solid var(--line)",
            background: "var(--white)",
            gap: "16px",
          }}
        >
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search PPH name, rate, deduction..."
          />

          <div className="button-row">
            <Button variant="primary" icon="plus" onClick={onAddNew}>
              Add New
            </Button>
          </div>
        </div>

        {/* Responsive Table Scroll Container */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "60px", textAlign: "center" }}>
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Nama PPH</span>
                    {renderSortArrow("name")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "140px", textAlign: "right", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("rate")}
                  >
                    <span>Nilai PPH</span>
                    {renderSortArrow("rate")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "130px", textAlign: "center", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("deduction")}
                  >
                    <span>Deduction</span>
                    {renderSortArrow("deduction")}
                  </th>
                  <th style={{ width: "100px", textAlign: "center" }}>
                    <span>Option</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                          {rowNumber}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--ink)", wordBreak: "break-word" }}>
                          {item.name}
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono, monospace)" }}>
                          {item.rate.toFixed(4)}
                        </td>
                        <td style={{ textAlign: "center", color: item.deduction === "Yes" ? "var(--green-700, #15803d)" : "var(--muted)", fontWeight: item.deduction === "Yes" ? 700 : 500 }}>
                          {item.deduction}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {/* Option column preserved; cells left empty per scope instructions */}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No PPH records found</strong>
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

export default PphIndex;
