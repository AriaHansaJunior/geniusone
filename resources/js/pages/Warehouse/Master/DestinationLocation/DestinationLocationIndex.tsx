import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Badge } from "../../../../components/ui/Badge";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { initialDestinationLocationRecords } from "./destination-location-data";
import type { DestinationLocationRecord, DestinationLocationSortField } from "./destination-location-types";

interface DestinationLocationIndexProps {
  records?: DestinationLocationRecord[];
  onAddNew: () => void;
  onEdit?: (record: DestinationLocationRecord) => void;
  onDelete?: (id: string) => void;
}

type SortDirection = "none" | "asc" | "desc";

export function DestinationLocationIndex({
  records = initialDestinationLocationRecords,
  onAddNew,
  onEdit,
  onDelete,
}: DestinationLocationIndexProps) {
  const [localRecords, setLocalRecords] = useState<DestinationLocationRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<DestinationLocationSortField>("no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [recordToDelete, setRecordToDelete] = useState<DestinationLocationRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.code.toLowerCase().includes(query) ||
        rec.name.toLowerCase().includes(query) ||
        rec.locationType.toLowerCase().includes(query) ||
        rec.pic.toLowerCase().includes(query) ||
        rec.description.toLowerCase().includes(query) ||
        rec.status.toLowerCase().includes(query)
      );
    });
  }, [localRecords, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;
    return [...filteredRecords].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === "string") {
        return sortDirection === "asc"
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDirection === "asc" ? valA - valB : valB - valA;
    });
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleToggleSort = (field: DestinationLocationSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: DestinationLocationSortField) => {
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

  const handleConfirmDelete = () => {
    if (!recordToDelete) return;
    const id = recordToDelete.id;
    setLocalRecords((prev) => prev.filter((r) => r.id !== id));
    if (onDelete) onDelete(id);
    setRecordToDelete(null);
  };

  const handleToggleStatus = (record: DestinationLocationRecord) => {
    const nextStatus = record.status === "Active" ? "Inactive" : "Active";
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, status: nextStatus } : r))
    );
  };

  const getLocationTypeBadgeTone = (type: string) => {
    switch (type) {
      case "Production Area":
        return "purple";
      case "Warehouse":
        return "blue";
      case "Workshop":
        return "orange";
      case "Laboratory":
        return "green";
      default:
        return "gray";
    }
  };

  const handleExportExcel = () => {
    try {
      const dataToExport = sortedRecords.map((r, idx) => ({
        No: idx + 1,
        "Location Code": r.code,
        "Destination Name": r.name,
        "Location Type": r.locationType,
        "Supervisor / PIC": r.pic,
        Description: r.description || "-",
        Status: r.status,
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Destination Location");
      XLSX.writeFile(workbook, "Destination_Location.xlsx");

      setExportNotice("Destination Location exported successfully as Excel.");
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to generate Excel export.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  return (
    <div className="wh-page">
      {/* Page Header */}
      <div className="wh-page-header">
        <h1 className="wh-page-title">Destination Location</h1>
        <div className="wh-header-actions">
          <Button variant="primary" onClick={onAddNew}>
            Add New
          </Button>
          <Button variant="excel" onClick={handleExportExcel}>
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
        {/* Top Controls Bar */}
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

        {/* Unified Responsive Table Wrapper */}
        <div className="wh-table-wrapper">
          <table className="wh-table">
            <thead>
              <tr>
                <th className="wh-th-no">No</th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("code")}
                  style={{ width: "130px" }}
                >
                  <div className="wh-th-content">
                    <span>Location Code</span>
                    {renderSortIndicator("code")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("name")}
                  style={{ minWidth: "180px" }}
                >
                  <div className="wh-th-content">
                    <span>Destination Name</span>
                    {renderSortIndicator("name")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("locationType")}
                  style={{ width: "150px" }}
                >
                  <div className="wh-th-content">
                    <span>Location Type</span>
                    {renderSortIndicator("locationType")}
                  </div>
                </th>
                <th
                  className="wh-th-sortable"
                  onClick={() => handleToggleSort("pic")}
                  style={{ width: "150px" }}
                >
                  <div className="wh-th-content">
                    <span>Supervisor / PIC</span>
                    {renderSortIndicator("pic")}
                  </div>
                </th>
                <th style={{ minWidth: "220px" }}>Description</th>
                <th
                  className="wh-th-sortable text-center"
                  onClick={() => handleToggleSort("status")}
                  style={{ width: "80px" }}
                >
                  <div className="wh-th-content justify-center">
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </div>
                </th>
                <th className="wh-th-option text-center" style={{ width: "80px" }}>
                  Option
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="wh-table-empty">
                    No destination location records found matching filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((item, index) => {
                  const sequentialNo = (safeCurrentPage - 1) * pageSize + index + 1;

                  return (
                    <tr key={item.id}>
                      <td className="wh-td-no text-center">{sequentialNo}</td>
                      <td>
                        <span className="code-pill">{item.code}</span>
                      </td>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        <Badge tone={getLocationTypeBadgeTone(item.locationType)}>
                          {item.locationType}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--ink)", fontWeight: 600 }}>
                          {item.pic}
                        </span>
                      </td>
                      <td className="wh-td-desc">{item.description}</td>
                      <td className="text-center">
                        <button
                          type="button"
                          className="wh-status-toggle"
                          onClick={() => handleToggleStatus(item)}
                          title={`Click to toggle status (${
                            item.status === "Active" ? "Active" : "Inactive"
                          })`}
                          aria-label={`Toggle status for ${item.name}`}
                        >
                          <span
                            className={`wh-status-checkbox ${
                              item.status === "Active"
                                ? "wh-status-checkbox--checked"
                                : "wh-status-checkbox--unchecked"
                            }`}
                          >
                            {item.status === "Active" && <Icon name="check" size={13} />}
                          </span>
                        </button>
                      </td>
                      <td className="text-center">
                        <div className="wh-row-actions">
                          {onEdit && (
                            <button
                              type="button"
                              className="wh-action-btn wh-action-btn--edit"
                              title={`Edit ${item.name}`}
                              onClick={() => onEdit(item)}
                            >
                              <Icon name="edit" size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="wh-action-btn wh-action-btn--delete"
                            title={`Delete ${item.name}`}
                            onClick={() => setRecordToDelete(item)}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
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

      {/* Delete Confirmation Modal */}
      {recordToDelete && (
        <ConfirmDialog
          isOpen={true}
          entityType="destination location"
          entityName={recordToDelete.name}
          entityCode={recordToDelete.code}
          onConfirm={handleConfirmDelete}
          onCancel={() => setRecordToDelete(null)}
        />
      )}
    </div>
  );
}

export default DestinationLocationIndex;
