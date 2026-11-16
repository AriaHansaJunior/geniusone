import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Icon } from "../../../components/ui/Icon";
import { Pagination } from "../../../components/ui/Pagination";
import { StatusToggle } from "../../../components/ui/StatusToggle";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { useNotification } from "../../../context/NotificationContext";
import { initialWarehouseMasterRecords } from "./warehouse-master-data";
import type {
  WarehouseMasterRecord,
  WarehouseMasterSortField,
  SortDirection,
} from "./warehouse-master-types";

interface MasterWarehouseIndexProps {
  records?: WarehouseMasterRecord[];
  onAddNew: () => void;
  onEdit?: (warehouse: WarehouseMasterRecord) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onToggleStatus?: (id: string) => Promise<void> | void;
  onViewCoordinates: (warehouse: WarehouseMasterRecord) => void;
}

export function MasterWarehouseIndex({
  records = initialWarehouseMasterRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
  onViewCoordinates,
}: MasterWarehouseIndexProps) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [localRecords, setLocalRecords] = useState<WarehouseMasterRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] =
    useState<WarehouseMasterSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [warehouseToEdit, setWarehouseToEdit] =
    useState<WarehouseMasterRecord | null>(null);
  const [warehouseToDelete, setWarehouseToDelete] =
    useState<WarehouseMasterRecord | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const getWarehouseTypeString = (val: any): string => {
    if (!val) return "Raw Material";
    if (typeof val === "object") return val.name || val.type || "Raw Material";
    return String(val);
  };

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchName = String(rec.name || "").toLowerCase().includes(query);
      const matchType = getWarehouseTypeString(rec.type).toLowerCase().includes(query);
      const matchDesc = String(rec.description || "").toLowerCase().includes(query);
      return matchName || matchType || matchDesc;
    });
  }, [localRecords, search]);

  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;

    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      switch (sortField) {
        case "name":
          aVal = String(a.name || "").toLowerCase();
          bVal = String(b.name || "").toLowerCase();
          break;
        case "type":
          aVal = getWarehouseTypeString(a.type).toLowerCase();
          bVal = getWarehouseTypeString(b.type).toLowerCase();
          break;
        case "description":
          aVal = String(a.description || "").toLowerCase();
          bVal = String(b.description || "").toLowerCase();
          break;
        case "status":
          aVal = a.status ? "active" : "inactive";
          bVal = b.status ? "active" : "inactive";
          break;
        case "no":
        default:
          return sortDirection === "asc" ? a.no - b.no : b.no - a.no;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [filteredRecords, sortField, sortDirection]);

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleSort = (field: WarehouseMasterSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: WarehouseMasterSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
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

  const handleConfirmDelete = async () => {
    if (!warehouseToDelete) return;
    const target = warehouseToDelete;
    setWarehouseToDelete(null);
    if (onDelete) {
      await onDelete(target.id);
    }
  };

  const handleExportExcel = () => {
    if (sortedRecords.length === 0) {
      notifyWarning("Nothing to Export", "No warehouse records match your current filter.");
      return;
    }

    try {
      const dataToExport = sortedRecords.map((r, idx) => ({
        No: idx + 1,
        Name: r.name,
        "Warehouse Type": getWarehouseTypeString(r.type),
        Description: r.description || "-",
        Status: r.status ? "Active" : "Inactive",
        "Coordinate Count": r.coordinates?.length || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master Warehouse");

      XLSX.writeFile(workbook, "Master_Warehouse.xlsx");

      notifySuccess("Export Completed", `Exported ${sortedRecords.length} warehouse record(s).`);
    } catch {
      notifyError("Export Failed", "Failed to generate Excel export.");
    }
  };

  return (
    <div className="master-page-shell wh-page">
      <div className="panel table-panel wh-table-card">
        <div className="master-table-toolbar">
          <div className="wh-search-box">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search warehouse name, type, description..."
            />
          </div>
          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button variant="excel" onClick={handleExportExcel}>
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table wh-table">
              <thead>
                <tr>
                  <th className="master-col-no">No</th>
                  <th
                    className="sortable-th master-sortable-th master-col-name"
                    onClick={() => handleSort("name")}
                  >
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-type"
                    onClick={() => handleSort("type")}
                  >
                    <span>Warehouse Type</span>
                    {renderSortIndicator("type")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-description"
                    onClick={() => handleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-status"
                    onClick={() => handleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                  <th className="master-col-actions">Option</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No warehouse records found</strong>
                        <span className="master-empty-subtitle">
                          Try adjusting your search filter.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((wh, idx) => {
                    const sequentialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;

                    return (
                      <tr key={wh.id}>
                        <td className="master-cell-no">{sequentialNumber}</td>
                        <td className="master-cell-name">{wh.name}</td>
                        <td>{getWarehouseTypeString(wh.type)}</td>
                        <td className="master-cell-muted">{wh.description || "-"}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            active={wh.status}
                            onToggle={() => onToggleStatus?.(wh.id)}
                            ariaLabel={`Toggle status for ${wh.name}`}
                          />
                        </td>
                        <td className="master-cell-center">
                          <div className="master-actions-group">
                            <button
                              type="button"
                              className="wh-action-btn wh-btn-view-coordinate"
                              onClick={() => onViewCoordinates(wh)}
                              title={`View coordinates for ${wh.name}`}
                              aria-label={`View coordinates for ${wh.name}`}
                            >
                              <Icon name="list" size={13} />
                            </button>
                            {onEdit && (
                              <button
                                type="button"
                                className="btn-action-edit"
                                onClick={() => setWarehouseToEdit(wh)}
                                title={`Edit ${wh.name}`}
                                aria-label={`Edit ${wh.name}`}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                className="btn-action-delete"
                                onClick={() => setWarehouseToDelete(wh)}
                                title={`Delete ${wh.name}`}
                                aria-label={`Delete ${wh.name}`}
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
        isOpen={!!warehouseToEdit}
        title="Edit Warehouse"
        message={`Do you want to edit warehouse "${warehouseToEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (warehouseToEdit && onEdit) {
            onEdit(warehouseToEdit);
          }
          setWarehouseToEdit(null);
        }}
        onCancel={() => setWarehouseToEdit(null)}
      />

      <ConfirmDialog
        isOpen={!!warehouseToDelete}
        entityType="warehouse"
        entityName={warehouseToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setWarehouseToDelete(null)}
      />
    </div>
  );
}

export default MasterWarehouseIndex;
