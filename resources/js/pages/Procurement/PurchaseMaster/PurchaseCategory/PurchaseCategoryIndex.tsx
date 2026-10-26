import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import {
  initialPurchaseCategoryRecords,
  type PurchaseCategoryRecord,
} from "./purchase-category-types";

interface PurchaseCategoryIndexProps {
  records?: PurchaseCategoryRecord[];
  onAddNew: () => void;
  onToggleHide?: (id: string) => void;
}

type SortField = "categoryCode" | "categoryName";
type SortDirection = "asc" | "desc";

export function PurchaseCategoryIndex({
  records = initialPurchaseCategoryRecords,
  onAddNew,
  onToggleHide,
}: PurchaseCategoryIndexProps) {
  const [localRecords, setLocalRecords] = useState<PurchaseCategoryRecord[]>(records);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleToggleHide = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
    if (onToggleHide) {
      onToggleHide(id);
    }
  };

  // Filter records based on search query (Code and Name)
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.categoryCode.toLowerCase().includes(query) ||
        rec.categoryName.toLowerCase().includes(query)
      );
    });
  }, [localRecords, search]);

  // Sort records by Category Code or Category Name
  const sortedRecords = useMemo(() => {
    if (!sortField) return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal = (a[sortField] || "").toLowerCase();
      const bVal = (b[sortField] || "").toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination calculations
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Toggle sorting for a field
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
    <div className="purchase-category-page" style={{ width: "100%", animation: "fadeIn 0.15s ease-in-out" }}>
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
            placeholder="Search category code, name..."
          />

          <div className="button-row">
            <Button variant="primary" onClick={onAddNew}>
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
                    style={{ width: "180px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("categoryCode")}
                  >
                    <span>Category Code</span>
                    {renderSortArrow("categoryCode")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("categoryName")}
                  >
                    <span>Category Name</span>
                    {renderSortArrow("categoryName")}
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
                        <td style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono, monospace)" }}>
                          {item.categoryCode}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {item.categoryName}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <StatusToggle
                            hidden={item.hidden}
                            onToggle={() => handleToggleHide(item.id)}
                          />
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
                        <strong>No purchase categories found</strong>
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

export default PurchaseCategoryIndex;
