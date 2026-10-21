import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { Badge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { initialStockNotificationRecords } from "./stock-notification-data";
import type { StockNotificationRecord, StockNotificationSortField } from "./stock-notification-types";

interface StockNotificationIndexProps {
  records?: StockNotificationRecord[];
  onAddNew: () => void;
  onEdit?: (record: StockNotificationRecord) => void;
  onDelete?: (id: string) => void;
  onNavigateDashboard?: () => void;
}

type SortDirection = "none" | "asc" | "desc";

export function StockNotificationIndex({
  records = initialStockNotificationRecords,
  onAddNew,
  onEdit,
  onDelete,
  onNavigateDashboard,
}: StockNotificationIndexProps) {
  const [localRecords, setLocalRecords] = useState<StockNotificationRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<StockNotificationSortField>("no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [recordToDelete, setRecordToDelete] = useState<StockNotificationRecord | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        rec.itemCode.toLowerCase().includes(query) ||
        rec.itemName.toLowerCase().includes(query) ||
        rec.category.toLowerCase().includes(query) ||
        rec.unit.toLowerCase().includes(query) ||
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

  const handleToggleSort = (field: StockNotificationSortField) => {
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

  const handleToggleStatus = (record: StockNotificationRecord) => {
    const nextStatus = record.status === "Active" ? "Inactive" : "Active";
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === record.id ? { ...r, status: nextStatus } : r))
    );
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
            placeholder="Search item code, name, category..."
          />
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {onNavigateDashboard && (
            <Button
              variant="secondary"
              icon="arrowLeft"
              onClick={onNavigateDashboard}
            >
              Back to Dashboard
            </Button>
          )}
          <Button variant="primary" icon="plus" onClick={onAddNew}>
            Add New
          </Button>
        </div>
      </div>

      {/* Table Content */}
      <div className="table-frame">
        <div className="table-scroll">
          <table className="data-table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ width: "50px", textAlign: "center" }}>No</th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("itemCode")}
                  style={{ width: "150px" }}
                >
                  Item Code{" "}
                  {sortField === "itemCode" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("itemName")}
                >
                  Item Name{" "}
                  {sortField === "itemName" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("category")}
                  style={{ width: "160px" }}
                >
                  Category{" "}
                  {sortField === "category" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th style={{ width: "70px", textAlign: "center" }}>Unit</th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("currentStock")}
                  style={{ width: "110px", textAlign: "right" }}
                >
                  Current Stock{" "}
                  {sortField === "currentStock" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th
                  className="sortable"
                  onClick={() => handleToggleSort("bufferQuantity")}
                  style={{ width: "120px", textAlign: "right" }}
                >
                  Buffer Threshold{" "}
                  {sortField === "bufferQuantity" &&
                    (sortDirection === "asc" ? "↑" : sortDirection === "desc" ? "↓" : "")}
                </th>
                <th style={{ width: "130px", textAlign: "center" }}>Trigger Status</th>
                <th style={{ width: "100px", textAlign: "center" }}>Status</th>
                <th style={{ width: "130px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length > 0 ? (
                paginatedRecords.map((item, index) => {
                  const sequentialNo = (safeCurrentPage - 1) * pageSize + index + 1;
                  const isTriggered = item.currentStock <= item.bufferQuantity;
                  const isCritical = item.currentStock <= Math.floor(item.bufferQuantity / 2);

                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                        {sequentialNo}
                      </td>
                      <td>
                        <span className="code-pill">{item.itemCode}</span>
                      </td>
                      <td>
                        <strong>{item.itemName}</strong>
                        {item.notes && (
                          <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>
                            {item.notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "12px" }}>{item.unit}</span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        <span style={{ color: isTriggered ? "var(--red-600)" : "var(--ink)" }}>
                          {item.currentStock.toLocaleString("en-US")}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontWeight: 700, color: "var(--blue-600)" }}>
                        {item.bufferQuantity.toLocaleString("en-US")}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {isTriggered ? (
                          <Badge tone={isCritical ? "red" : "orange"}>
                            {isCritical ? "Critical Low" : "Triggered"}
                          </Badge>
                        ) : (
                          <Badge tone="green">Safe Buffer</Badge>
                        )}
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
                              title="Edit buffer rule"
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
                            title="Delete buffer rule"
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
                  <td colSpan={10} style={{ textAlign: "center", padding: "40px 16px" }}>
                    <div className="empty">
                      <div className="empty__icon">
                        <Icon name="search" />
                      </div>
                      <strong>No stock buffer rules found</strong>
                      <span>Try adjusting your search criteria or add a new buffer rule.</span>
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
        title="Delete Stock Buffer Rule"
        message={`Are you sure you want to delete the buffer threshold rule for "${recordToDelete?.itemName}"?`}
        confirmLabel="Delete Rule"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="trash"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRecordToDelete(null)}
      />
    </div>
  );
}

export default StockNotificationIndex;
