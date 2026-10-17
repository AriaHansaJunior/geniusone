import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { RafaksiTypeForm } from "./RafaksiTypeForm";
import {
  initialRafaksiTypeRecords,
  type RafaksiTypeRecord,
  type RafaksiTypeSortField,
  type SortDirection,
} from "./rafaksi-type-types";

interface RafaksiTypeIndexProps {
  records?: RafaksiTypeRecord[];
  onAddNew?: () => void;
  onEdit?: (record: RafaksiTypeRecord) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
}

export function RafaksiTypeIndex({
  records = initialRafaksiTypeRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: RafaksiTypeIndexProps) {
  const [localRecords, setLocalRecords] = useState<RafaksiTypeRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<RafaksiTypeSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Dialog & Modal States
  const [rafaksiToDelete, setRafaksiToDelete] = useState<RafaksiTypeRecord | null>(null);
  const [rafaksiToConfirmEdit, setRafaksiToConfirmEdit] = useState<RafaksiTypeRecord | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeRecord, setActiveRecord] = useState<RafaksiTypeRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const q = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchCode = rec.code.toLowerCase().includes(q);
      const matchName = rec.name.toLowerCase().includes(q);
      const matchDesc = rec.description.toLowerCase().includes(q);
      return matchCode || matchName || matchDesc;
    });
  }, [localRecords, search]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "code") {
        aVal = a.code;
        bVal = b.code;
      } else if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "description") {
        aVal = a.description.toLowerCase();
        bVal = b.description.toLowerCase();
      } else if (sortField === "status") {
        const aNum = a.status ? 1 : 0;
        const bNum = b.status ? 1 : 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
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
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  // Toggle sorting on column click
  const handleToggleSort = (field: RafaksiTypeSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Toggle active status
  const handleToggleStatus = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: !rec.status } : rec))
    );
    if (onToggleStatus) onToggleStatus(id);
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setActiveRecord(null);
    setFormMode("create");
    setIsFormModalOpen(true);
    if (onAddNew) onAddNew();
  };

  // Open Edit after confirmation
  const handleConfirmEdit = () => {
    if (!rafaksiToConfirmEdit) return;
    setActiveRecord(rafaksiToConfirmEdit);
    setFormMode("edit");
    setIsFormModalOpen(true);
    setRafaksiToConfirmEdit(null);
    if (onEdit) onEdit(rafaksiToConfirmEdit);
  };

  // Save from Modal
  const handleSaveRafaksiType = (data: {
    code: string;
    name: string;
    description: string;
    status: boolean;
  }) => {
    if (formMode === "create") {
      const newRecord: RafaksiTypeRecord = {
        id: `rfk-${Date.now()}`,
        no: localRecords.length + 1,
        code: data.code,
        name: data.name,
        description: data.description,
        status: data.status,
        createdAt: new Date().toISOString().replace("T", " ").substring(0, 19),
        createdBy: "ADMINISTRATOR",
      };
      setLocalRecords((prev) => [newRecord, ...prev]);
    } else if (formMode === "edit" && activeRecord) {
      setLocalRecords((prev) =>
        prev.map((rec) =>
          rec.id === activeRecord.id
            ? {
                ...rec,
                code: data.code,
                name: data.name,
                description: data.description,
                status: data.status,
              }
            : rec
        )
      );
    }
    setIsFormModalOpen(false);
    setActiveRecord(null);
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (!rafaksiToDelete) return;
    const idToDelete = rafaksiToDelete.id;
    setLocalRecords((prev) => prev.filter((r) => r.id !== idToDelete));
    if (onDelete) onDelete(idToDelete);
    setRafaksiToDelete(null);
  };

  // Export to Excel-compatible CSV
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const headers = ["No", "Rafaksi Code", "Type Rafaksi Name", "Description", "Status", "Created At", "Created By"];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.code || "").replace(/"/g, '""')}"`,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.description || "").replace(/"/g, '""')}"`,
          row.status ? "Active" : "Inactive",
          `"${row.createdAt || ""}"`,
          `"${row.createdBy || ""}"`,
        ];
        csvRows.push(values.join(","));
      });

      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Master_Rafaksi_Type_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${sortedRecords.length} rafaksi type record(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const renderSortIndicator = (field: RafaksiTypeSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        style={{
          marginLeft: "6px",
          fontSize: "11px",
          color: isActive ? "var(--blue-600)" : "var(--muted)",
          fontWeight: 800,
        }}
      >
        {isActive ? (sortDirection === "asc" ? "▲" : "▼") : "⇅"}
      </span>
    );
  };

  return (
    <div className="rafaksi-type-page">
      {/* Header action bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.3px" }}>
          Master Rafaksi Type
        </h1>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="primary" icon="plus" onClick={handleOpenCreateModal}>
            Add New
          </Button>
          <Button
            variant="ghost"
            icon="download"
            onClick={handleExportToExcel}
            title="Export to Excel CSV"
          >
            Export to Excel
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div style={{ padding: "10px 14px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "var(--radius-sm)", color: "#166534", marginBottom: "14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span>{exportNotice}</span>
          <button type="button" onClick={() => setExportNotice(null)} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#166534", fontWeight: 700 }}>×</button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="panel table-panel">
        <div className="table-toolbar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--line)", background: "var(--white)" }}>
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search rafaksi code, name, description..."
          />
        </div>

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
                    style={{ width: "130px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("code")}
                  >
                    <span>Rafaksi Code</span>
                    {renderSortIndicator("code")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "220px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Type Rafaksi Name</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "95px", textAlign: "center", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                  <th style={{ width: "140px", textAlign: "center" }}>
                    <span>Option</span>
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
                        <td style={{ fontWeight: 700, color: "var(--blue-700)", fontFamily: "ui-monospace, monospace" }}>
                          {item.code}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {item.name}
                        </td>
                        <td style={{ color: "var(--ink-soft)" }}>
                          {item.description || "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item.id)}
                            style={{
                              border: 0,
                              background: item.status ? "#dcfce7" : "#f1f5f9",
                              color: item.status ? "#15803d" : "#64748b",
                              padding: "3px 8px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Click to toggle status"
                          >
                            {item.status ? "Active" : "Inactive"}
                          </button>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <div style={{ display: "inline-flex", gap: "6px" }}>
                            <button
                              type="button"
                              className="btn-action-edit"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid #0284c7",
                                color: "#0284c7",
                                background: "#fff",
                              }}
                              onClick={() => setRafaksiToConfirmEdit(item)}
                              title={`Edit ${item.name}`}
                            >
                              <Icon name="edit" size={13} />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              className="btn-action-delete"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "4px 8px",
                                borderRadius: "var(--radius-sm)",
                                fontSize: "11px",
                                fontWeight: 700,
                                cursor: "pointer",
                                border: "1px solid #dc2626",
                                color: "#dc2626",
                                background: "#fff",
                              }}
                              onClick={() => setRafaksiToDelete(item)}
                              title={`Delete ${item.name}`}
                            >
                              <Icon name="trash" size={13} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-table-cell">
                      <div className="empty" style={{ padding: "36px", textAlign: "center" }}>
                        <div className="empty__icon" style={{ marginBottom: "8px" }}>
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No rafaksi types found</strong>
                        <span style={{ display: "block", color: "var(--muted)", fontSize: "12px", marginTop: "4px" }}>
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

      {/* Rafaksi Type Form Modal */}
      <RafaksiTypeForm
        isOpen={isFormModalOpen}
        mode={formMode}
        record={activeRecord}
        onSave={handleSaveRafaksiType}
        onCancel={() => {
          setIsFormModalOpen(false);
          setActiveRecord(null);
        }}
      />

      {/* Edit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!rafaksiToConfirmEdit}
        title="Edit Record?"
        message={`Do you want to edit rafaksi type "${rafaksiToConfirmEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={handleConfirmEdit}
        onCancel={() => setRafaksiToConfirmEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!rafaksiToDelete}
        title="Delete Record?"
        message={`Are you sure you want to delete rafaksi type "${rafaksiToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={handleConfirmDelete}
        onCancel={() => setRafaksiToDelete(null)}
      />
    </div>
  );
}

export default RafaksiTypeIndex;
