import React, { useState, useMemo, useEffect } from "react";
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

  return (
    <div className="panel" style={{ width: "100%", padding: 0 }}>
      {/* Table Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid var(--line)",
          background: "var(--white)",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ maxWidth: "340px", width: "100%" }}>
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search location code, name, type, pic..."
          />
        </div>

        <div className="button-row">
          <Button variant="primary" icon="plus" onClick={onAddNew}>
            Add New
          </Button>
        </div>
      </div>

      {/* Table Frame */}
      <div className="table-frame">
        <div className="table-scroll">
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>No</th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("code")}
                  style={{ width: "140px" }}
                >
                  Location Code{" "}
                  {sortField === "code" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("name")}
                  style={{ width: "220px" }}
                >
                  Destination Name{" "}
                  {sortField === "name" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("locationType")}
                  style={{ width: "160px" }}
                >
                  Location Type{" "}
                  {sortField === "locationType" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("pic")}
                  style={{ width: "160px" }}
                >
                  Supervisor / PIC{" "}
                  {sortField === "pic" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th>Description</th>
                <th style={{ width: "100px", textAlign: "center" }}>Status</th>
                <th style={{ width: "130px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, index) => {
                  const sequentialNo = (safeCurrentPage - 1) * pageSize + index + 1;

                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                        {sequentialNo}
                      </td>
                      <td>
                        <span className="code-pill">{item.code}</span>
                      </td>
                      <td>
                        <strong>{item.name}</strong>
                      </td>
                      <td>
                        <Badge tone={getLocationTypeBadgeTone(item.locationType) as any}>
                          {item.locationType}
                        </Badge>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--ink)" }}>{item.pic}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                          {item.description}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          style={{
                            border: 0,
                            background: "transparent",
                            cursor: "pointer",
                            padding: 0,
                          }}
                          title="Click to toggle status"
                        >
                          <Badge tone={item.status === "Active" ? "green" : "gray"}>
                            {item.status}
                          </Badge>
                        </button>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: "6px" }}>
                          {onEdit && (
                            <button
                              type="button"
                              className="btn-icon"
                              onClick={() => onEdit(item)}
                              title="Edit destination location"
                              style={{
                                border: "1px solid var(--line)",
                                borderRadius: "4px",
                                background: "var(--white)",
                                padding: "4px 8px",
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                fontSize: "12px",
                              }}
                            >
                              <Icon name="edit" size={13} />
                              <span>Edit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn-icon"
                            onClick={() => setRecordToDelete(item)}
                            title="Delete destination location"
                            style={{
                              border: "1px solid #fecaca",
                              borderRadius: "4px",
                              background: "#fef2f2",
                              color: "#b91c1c",
                              padding: "4px 8px",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                            }}
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No destination locations found</strong>
                      <span>Try adjusting your search criteria or add a new destination location.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls below table */}
      <Pagination
        totalRecords={totalRecords}
        currentPage={safeCurrentPage}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(1);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!recordToDelete}
        title="Delete Destination Location"
        message={`Are you sure you want to delete destination location "${recordToDelete?.name}" (${recordToDelete?.code})?`}
        confirmLabel="Delete Location"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="trash"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}

export default DestinationLocationIndex;
