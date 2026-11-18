import React, { useMemo, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Icon } from "../../../components/ui/Icon";
import { Pagination } from "../../../components/ui/Pagination";
import { StatusToggle } from "../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../components/ui/LoadingBuffer";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { MasterDeleteButton } from "../../../components/ui/MasterDeleteButton";
import { useMasterDelete } from "../../../hooks/useMasterDelete";
import type {
  WarehouseCoordinateRecord,
  WarehouseCoordinateSortField,
  WarehouseMasterRecord,
  SortDirection,
} from "./warehouse-master-types";

interface WarehouseCoordinateIndexProps {
  warehouse: WarehouseMasterRecord;
  isLoading?: boolean;
  onAddNew: () => void;
  onBack: () => void;
  onToggleCoordinateStatus?: (coordinateId: string) => Promise<void> | void;
  onDeleteCoordinate?: (coordinateId: string) => Promise<void> | void;
}

export function WarehouseCoordinateIndex({
  warehouse,
  isLoading = false,
  onAddNew,
  onBack,
  onToggleCoordinateStatus,
  onDeleteCoordinate,
}: WarehouseCoordinateIndexProps) {
  const { deleteTarget, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useMasterDelete<WarehouseCoordinateRecord>((r) => r.id, onDeleteCoordinate);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10); // Screenshot 2 shows 10 by default
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] =
    useState<WarehouseCoordinateSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const coordinates: WarehouseCoordinateRecord[] = warehouse.coordinates || [];

  // Filter coordinates by name
  const filteredCoordinates = useMemo(() => {
    if (!search.trim()) return coordinates;
    const query = search.toLowerCase().trim();
    return coordinates.filter((c) => c.name.toLowerCase().includes(query));
  }, [coordinates, search]);

  // Sort coordinates
  const sortedCoordinates = useMemo(() => {
    if (sortDirection === "none") return filteredCoordinates;

    const list = [...filteredCoordinates];
    list.sort((a, b) => {
      const aVal = a.name.toLowerCase();
      const bVal = b.name.toLowerCase();

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredCoordinates, sortDirection]);

  // Pagination calculation
  const totalRecords = sortedCoordinates.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedCoordinates = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedCoordinates.slice(start, start + pageSize);
  }, [sortedCoordinates, safeCurrentPage, pageSize]);

  const handleSort = (field: WarehouseCoordinateSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: WarehouseCoordinateSortField) => {
    if (sortField !== field || sortDirection === "none") {
      return (
        <span className="wh-sort-icon opacity-40">
          <Icon name="arrowUpDown" size={13} />
        </span>
      );
    }
    return (
      <span className="wh-sort-icon text-primary font-bold">
        {sortDirection === "asc" ? (
          <Icon name="arrowUp" size={13} />
        ) : (
          <Icon name="arrowDown" size={13} />
        )}
      </span>
    );
  };

  return (
    <div className="wh-page">
      {/* Page Header */}
      <div className="wh-page-header">
        <div>
          <span className="wh-page-eyebrow">
            WAREHOUSE MASTER
          </span>
          <h1 className="wh-page-heading">
            Warehouse Coordinates <span className="wh-page-subtitle">— {warehouse?.name || "Warehouse"}</span>
          </h1>
        </div>
        <div className="wh-header-actions">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      {/* Content Card */}
      <div className="wh-table-card">
        {/* Filter and Page-Size Controls Bar */}
        <div className="wh-controls-bar">
          <div className="wh-search-box wh-search-box--compact">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search coordinate name..."
            />
          </div>
          <div className="wh-header-actions">
            <Button
              variant="primary"
              onClick={onAddNew}
              className="wh-btn-add-new"
            >
              Add New
            </Button>
          </div>
        </div>

        {/* 3-Column Coordinate Table */}
        <div className="wh-table-wrapper">
          <table className="wh-table">
            <thead>
              <tr>
                <th className="wh-th-no">No</th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleSort("name")}
                >
                  <div className="wh-th-content">
                    <span>Coordinate Name</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th className="master-col-status text-center">Status</th>
                <th className="master-col-actions text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && paginatedCoordinates.length === 0 ? (
                <TableLoadingRow colSpan={4} label="Loading Warehouse Coordinates..." />
              ) : paginatedCoordinates.length === 0 ? (
                <tr>
                    <td colSpan={4} className="wh-table-empty">
                      No coordinate records found for this warehouse.
                    </td>
                </tr>
              ) : (
                paginatedCoordinates.map((coord, idx) => {
                  const sequentialNumber =
                    (safeCurrentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={coord.id}>
                      <td className="wh-td-no text-center">
                        {sequentialNumber}
                      </td>
                      <td className="font-medium text-ink">{coord.name}</td>
                      <td className="master-cell-center">
                        <StatusToggle
                          active={coord.status !== false}
                          onToggle={() => onToggleCoordinateStatus?.(coord.id)}
                          ariaLabel={`Toggle status for coordinate ${coord.name}`}
                        />
                      </td>
                      <td className="master-cell-center">
                        <MasterDeleteButton
                          label={coord.name}
                          onClick={() => requestDelete(coord)}
                        />
                      </td>
                    </tr>
                  );
                })
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        entityType="warehouse coordinate"
        entityName={deleteTarget?.name}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default WarehouseCoordinateIndex;
