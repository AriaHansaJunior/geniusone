import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Icon } from "../../../components/ui/Icon";
import { Pagination } from "../../../components/ui/Pagination";
import { initialWarehouseMasterRecords } from "./warehouse-master-data";
import type {
  WarehouseMasterRecord,
  WarehouseMasterSortField,
  SortDirection,
} from "./warehouse-master-types";

interface MasterWarehouseIndexProps {
  records?: WarehouseMasterRecord[];
  onAddNew: () => void;
  onViewCoordinates: (warehouse: WarehouseMasterRecord) => void;
}

export function MasterWarehouseIndex({
  records = initialWarehouseMasterRecords,
  onAddNew,
  onViewCoordinates,
}: MasterWarehouseIndexProps) {
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25); // Screenshot 1 shows 25 by default
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] =
    useState<WarehouseMasterSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Search filter across Name, Type, and Description
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const query = search.toLowerCase().trim();
    return records.filter((rec) => {
      const matchName = rec.name.toLowerCase().includes(query);
      const matchType = rec.type.toLowerCase().includes(query);
      const matchDesc = (rec.description || "").toLowerCase().includes(query);
      return matchName || matchType || matchDesc;
    });
  }, [records, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;

    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      switch (sortField) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "type":
          aVal = a.type.toLowerCase();
          bVal = b.type.toLowerCase();
          break;
        case "description":
          aVal = (a.description || "").toLowerCase();
          bVal = (b.description || "").toLowerCase();
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

  // Pagination calculation
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(start, start + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Sorting toggle handler
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

  // Export to Excel handler using SheetJS
  const handleExportExcel = () => {
    try {
      const dataToExport = sortedRecords.map((r, idx) => ({
        No: idx + 1,
        Name: r.name,
        "Warehouse Type": r.type,
        Description: r.description || "-",
        Status: r.status ? "Active" : "Inactive",
        "Coordinate Count": r.coordinates?.length || 0,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master Warehouse");

      XLSX.writeFile(workbook, "Master_Warehouse.xlsx");

      setExportNotice("Master Warehouse exported successfully as Excel.");
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to generate Excel export.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  return (
    <div className="wh-page">
      {/* Page Header matching Screenshot 1 */}
      <div className="wh-page-header">
        <h1 className="wh-page-title">Master Warehouse</h1>
        <div className="wh-header-actions">
          <Button
            variant="primary"
            icon="plus"
            onClick={onAddNew}
            className="wh-btn-add-new"
          >
            Add New
          </Button>
          <Button
            variant="default"
            icon="fileSpreadsheet"
            onClick={handleExportExcel}
            className="wh-btn-export-excel"
          >
            Export To Excel
          </Button>
        </div>
      </div>

      {/* Export / Informational Notice */}
      {exportNotice && (
        <div className="wh-alert wh-alert--info" role="status">
          <Icon name="checkCircle" size={16} />
          <div className="wh-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="wh-alert-close"
            onClick={() => setExportNotice(null)}
            aria-label="Close alert"
          >
            &times;
          </button>
        </div>
      )}

      {/* White Content Card */}
      <div className="wh-table-card">
        {/* Top Filter and Controls Bar */}
        <div className="wh-controls-bar">
          <div className="wh-search-box">
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search..."
            />
          </div>
        </div>

        {/* 6-Column Warehouse Table */}
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
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleSort("type")}
                >
                  <div className="wh-th-content">
                    <span>Warehouse Type</span>
                    {renderSortIndicator("type")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleSort("description")}
                >
                  <div className="wh-th-content">
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable text-center"
                  onClick={() => handleSort("status")}
                >
                  <div className="wh-th-content justify-center">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th className="wh-th-option text-center">Option</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="wh-table-empty">
                    No warehouse records found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((wh, idx) => {
                  const sequentialNumber =
                    (safeCurrentPage - 1) * pageSize + idx + 1;

                  return (
                    <tr key={wh.id}>
                      <td className="wh-td-no text-center">
                        {sequentialNumber}
                      </td>
                      <td className="font-medium text-ink">{wh.name}</td>
                      <td>{wh.type}</td>
                      <td className="wh-td-desc">
                        {wh.description || "-"}
                      </td>
                      <td className="text-center">
                        {wh.status ? (
                          <span
                            className="wh-status-checkbox wh-status-checkbox--checked"
                            title="Active Status"
                            aria-label="Active Status"
                          >
                            <Icon name="check" size={13} />
                          </span>
                        ) : (
                          <span
                            className="wh-status-checkbox wh-status-checkbox--unchecked"
                            title="Inactive Status"
                            aria-label="Inactive Status"
                          />
                        )}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="wh-btn-view-coordinate"
                          onClick={() => onViewCoordinates(wh)}
                          title={`View coordinates for ${wh.name}`}
                          aria-label={`View coordinates for ${wh.name}`}
                        >
                          <Icon name="list" size={15} />
                        </button>
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
    </div>
  );
}

export default MasterWarehouseIndex;
