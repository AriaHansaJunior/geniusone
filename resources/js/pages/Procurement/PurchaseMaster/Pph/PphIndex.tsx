import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { type PphRecord } from "./pph-types";

interface PphIndexProps {
  records?: PphRecord[];
  isLoading?: boolean;
  onAddNew: () => void;
  onToggleHide?: (id: string) => void;
}

type SortField = "name" | "rate" | "deduction";
type SortDirection = "asc" | "desc";

export function PphIndex({
  records = [],
  isLoading = false,
  onAddNew,
  onToggleHide,
}: PphIndexProps) {
  const [localRecords, setLocalRecords] = useState<PphRecord[]>(records);

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

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.name.toLowerCase().includes(query) ||
        rec.rate.toFixed(4).includes(query) ||
        rec.deduction.toLowerCase().includes(query)
      );
    });
  }, [localRecords, search]);

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

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

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
    <div className="master-page-shell pph-page">
      <div className="panel table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search PPH name, rate, deduction..."
          />

          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Nama PPH</span>
                    {renderSortArrow("name")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-code"
                    onClick={() => handleToggleSort("rate")}
                  >
                    <span>Nilai PPH</span>
                    {renderSortArrow("rate")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-status"
                    onClick={() => handleToggleSort("deduction")}
                  >
                    <span>Deduction</span>
                    {renderSortArrow("deduction")}
                  </th>
                  <th className="master-col-status">
                    <span>Status</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && paginatedRecords.length === 0 ? (
                  <TableLoadingRow colSpan={5} label="Loading PPH Rates..." />
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id} className={item.hidden ? "row--hidden" : ""}>
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-name">{item.name}</td>
                        <td className="master-cell-code">{item.rate.toFixed(4)}</td>
                        <td className="master-cell-center">{item.deduction}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            hidden={item.hidden}
                            onToggle={() => handleToggleHide(item.id)}
                            ariaLabel={`Toggle status for ${item.name}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No PPH records found</strong>
                        <span className="master-empty-subtitle">
                          Try adjusting your search query.
                        </span>
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

export default PphIndex;
