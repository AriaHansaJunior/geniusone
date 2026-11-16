import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import {
  type AdditionalCostRecord,
} from "./additional-costs-types";

interface AdditionalCostsIndexProps {
  records?: AdditionalCostRecord[];
  onAddNew: () => void;
  onToggleHide?: (id: string) => void;
}

type SortField = "costCode" | "costName";
type SortDirection = "asc" | "desc";

export function AdditionalCostsIndex({
  records = [],
  onAddNew,
  onToggleHide,
}: AdditionalCostsIndexProps) {
  const [localRecords, setLocalRecords] = useState<AdditionalCostRecord[]>(records);

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

  // Filter records based on search query (Cost Code and Cost Name)
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.costCode.toLowerCase().includes(query) ||
        rec.costName.toLowerCase().includes(query)
      );
    });
  }, [localRecords, search]);

  // Sort records by Cost Code or Cost Name
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
        className={`master-sort-indicator ${
          isActive ? "master-sort-indicator--active" : ""
        }`}
      >
        {isActive ? (
          sortDirection === "asc" ? (
            <Icon name="arrowUp" size={12} />
          ) : (
            <Icon name="arrowDown" size={12} />
          )
        ) : (
          <Icon name="arrowUpDown" size={12} />
        )}
      </span>
    );
  };

  return (
    <div className="additional-costs-page">
      {/* Main Table Container Card */}
      <div className="panel table-panel">
        {/* Table Toolbar: Search on left, Single Add New action on right */}
        <div className="table-toolbar master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search cost code, name..."
          />

          <div className="button-row master-toolbar-actions">
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
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-code"
                    onClick={() => handleToggleSort("costCode")}
                  >
                    <span>Cost Code</span>
                    {renderSortArrow("costCode")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={() => handleToggleSort("costName")}
                  >
                    <span>Cost Name</span>
                    {renderSortArrow("costName")}
                  </th>
                  <th className="master-col-status">
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
                        <td className="master-cell-no">
                          {rowNumber}
                        </td>
                        <td className="master-cell-code">
                          {item.costCode}
                        </td>
                        <td className="master-cell-name">
                          {item.costName}
                        </td>
                        <td className="master-cell-center">
                          <StatusToggle
                            hidden={item.hidden}
                            onToggle={() => handleToggleHide(item.id)}
                            ariaLabel={`Toggle status for ${item.costName}`}
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
                        <strong>No additional costs found</strong>
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

export default AdditionalCostsIndex;
