import React, { useMemo, useState } from "react";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { initialUnitReferenceRecords } from "./unit-reference-data";
import type {
  UnitReferenceRecord,
  UnitReferenceSortField,
  SortDirection,
} from "./unit-reference-types";

interface UnitReferenceIndexProps {
  records?: UnitReferenceRecord[];
}

export function UnitReferenceIndex({
  records = initialUnitReferenceRecords,
}: UnitReferenceIndexProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<UnitReferenceSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");

  // Filter records across Code and Description
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const query = search.toLowerCase().trim();
    return records.filter(
      (item) =>
        item.code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
    );
  }, [records, search]);

  // Sort records by Code or Description
  const sortedRecords = useMemo(() => {
    if (!sortField || sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal = a[sortField].toLowerCase();
      const bVal = b[sortField].toLowerCase();
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

  // Toggle sorting on a column
  const handleSort = (field: UnitReferenceSortField) => {
    if (sortField === field) {
      if (sortDirection === "none") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortDirection("none");
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: UnitReferenceSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        style={{
          marginLeft: "6px",
          fontSize: "11px",
          color: isActive ? "var(--blue-600)" : "var(--muted)",
          fontWeight: 800,
        }}
      >
        {isActive
          ? sortDirection === "asc"
            ? "▲"
            : "▼"
          : "⇅"}
      </span>
    );
  };

  return (
    <div className="unit-reference-page">
      {/* Main Table Container Card */}
      <div className="panel unit-reference-panel">
        {/* Table Toolbar: Search on left, Page-size selector on right */}
        <div className="unit-reference-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search code or description..."
          />
        </div>

        {/* Responsive Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table unit-reference-table">
              <thead>
                <tr>
                  <th style={{ width: "80px", textAlign: "center" }}>
                    <span>Number</span>
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "160px" }}
                    onClick={() => handleSort("code")}
                  >
                    <span>Code</span>
                    {renderSortIndicator("code")}
                  </th>
                  <th
                    className="sortable-th"
                    onClick={() => handleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
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
                        <td className="unit-reference-num">
                          {rowNumber}
                        </td>
                        <td>
                          <span className="unit-reference-code">
                            {item.code}
                          </span>
                        </td>
                        <td>
                          <span className="unit-reference-desc">
                            {item.description}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No unit references found</strong>
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

export default UnitReferenceIndex;
