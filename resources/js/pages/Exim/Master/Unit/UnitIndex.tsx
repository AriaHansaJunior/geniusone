import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { MasterDeleteButton } from "../../../../components/ui/MasterDeleteButton";
import { useMasterDelete } from "../../../../hooks/useMasterDelete";
import { initialUnitRecords } from "./unit-data";
import type { UnitRecord } from "./unit-types";

interface UnitIndexProps {
  records?: UnitRecord[];
  isLoading?: boolean;
  onAddNew: () => void;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
}

type SortDirection = "none" | "asc" | "desc";

export function UnitIndex({
  records = initialUnitRecords,
  isLoading = false,
  onAddNew,
  onToggleStatus,
  onDelete,
}: UnitIndexProps) {
  const { deleteTarget, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useMasterDelete<UnitRecord>((r) => r.id, onDelete);
  const [localRecords, setLocalRecords] = useState<UnitRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) =>
      rec.name.toLowerCase().includes(query)
    );
  }, [localRecords, search]);

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

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleToggleSort = () => {
    setSortDirection((prev) => {
      if (prev === "none") return "asc";
      if (prev === "asc") return "desc";
      return "none";
    });
  };

  return (
    <div className="master-page-shell unit-page">
      <div className="panel table-panel unit-table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search unit..."
          />

          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="unit-data-table data-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th"
                    onClick={handleToggleSort}
                  >
                    <span>Unit</span>
                    <span
                      className={`master-sort-indicator ${sortDirection !== "none" ? "master-sort-indicator--active" : ""
                        }`}
                    >
                      {sortDirection === "asc" ? (
                        <Icon name="arrowUp" size={12} />
                      ) : sortDirection === "desc" ? (
                        <Icon name="arrowDown" size={12} />
                      ) : (
                        <Icon name="arrowUpDown" size={12} />
                      )}
                    </span>
                  </th>
                  <th className="master-col-status">
                    <span>Status</span>
                  </th>
                  <th className="master-col-actions text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && paginatedRecords.length === 0 ? (
                  <TableLoadingRow colSpan={4} label="Loading Units..." />
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-name unit-name-cell">{item.name}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status ?? true}
                            onToggle={() => onToggleStatus?.(item.id)}
                            ariaLabel={`Toggle status for ${item.name}`}
                          />
                        </td>
                        <td className="master-cell-center">
                          <MasterDeleteButton
                            label={item.name}
                            onClick={() => requestDelete(item)}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                      <td colSpan={4} className="empty-table-cell">
                        <div className="empty master-empty-box">
                          <div className="empty__icon master-empty-icon">
                            <Icon name="search" size={24} />
                          </div>
                          <strong>No units found</strong>
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
            showPageSize={true}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        entityType="unit"
        entityName={deleteTarget?.name}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default UnitIndex;
