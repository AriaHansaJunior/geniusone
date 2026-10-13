import React, { useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import {
  initialPaymentTermRecords,
  type PaymentTermRecord,
} from "./payment-term-types";

interface PaymentTermIndexProps {
  onAddNew: () => void;
}

type SortDirection = "none" | "asc" | "desc";

export function PaymentTermIndex({ onAddNew }: PaymentTermIndexProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return initialPaymentTermRecords;
    const query = search.toLowerCase().trim();
    return initialPaymentTermRecords.filter((rec) => {
      return rec.name.toLowerCase().includes(query);
    });
  }, [search]);

  // Sort records by Payment Term Name
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      const aVal = a.name.toLowerCase();
      const bVal = b.name.toLowerCase();
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Toggle sorting on Payment Term Name
  const handleToggleSort = () => {
    setSortDirection((prev) => {
      if (prev === "none") return "asc";
      if (prev === "asc") return "desc";
      return "asc";
    });
  };

  return (
    <div className="payment-term-page">
      {/* Main Table Container Card */}
      <div className="panel table-panel">
        {/* Table Toolbar: Search on left, Single Add New action on right */}
        <div className="table-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--line)", background: "var(--white)", gap: "16px" }}>
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search payment term..."
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
                    onClick={handleToggleSort}
                  >
                    <span>Payment Term Name</span>
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "11px",
                        color: sortDirection === "none" ? "var(--muted)" : "var(--blue-600)",
                        fontWeight: 800,
                      }}
                    >
                      {sortDirection === "asc" ? "▲" : sortDirection === "desc" ? "▼" : "⇅"}
                    </span>
                  </th>
                  <th style={{ width: "100px", textAlign: "center" }}>
                    <span>Options</span>
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
                        <td style={{ textAlign: "center" }}>
                          {/* Options column preserved; cells left empty per scope instructions */}
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
                        <strong>No payment terms found</strong>
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

export default PaymentTermIndex;
