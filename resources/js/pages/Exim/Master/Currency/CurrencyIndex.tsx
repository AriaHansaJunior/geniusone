import React, { useState, useMemo, useEffect } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { CurrencyForm } from "./CurrencyForm";
import {
  initialCurrencyRecords,
  type CurrencyRecord,
  type CurrencySortField,
  type SortDirection,
  type SyncStatus,
} from "./currency-types";

interface CurrencyIndexProps {
  records?: CurrencyRecord[];
  onAddNew?: () => void;
  onEdit?: (record: CurrencyRecord) => void;
  onDelete?: (id: string) => void;
}

export function CurrencyIndex({
  records = initialCurrencyRecords,
  onAddNew,
  onEdit,
  onDelete,
}: CurrencyIndexProps) {
  const [localRecords, setLocalRecords] = useState<CurrencyRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<CurrencySortField>("currencyCode");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Dialog & Modal States
  const [currencyToDelete, setCurrencyToDelete] = useState<CurrencyRecord | null>(null);
  const [currencyToConfirmEdit, setCurrencyToConfirmEdit] = useState<CurrencyRecord | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [activeRecord, setActiveRecord] = useState<CurrencyRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Filter records based on search query
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const q = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchCode = rec.currencyCode.toLowerCase().includes(q);
      const matchName = rec.currencyName.toLowerCase().includes(q);
      const matchStatus = rec.syncStatus.toLowerCase().includes(q);
      return matchCode || matchName || matchStatus;
    });
  }, [localRecords, search]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal = "";
      let bVal = "";

      if (sortField === "currencyCode") {
        aVal = a.currencyCode;
        bVal = b.currencyCode;
      } else if (sortField === "currencyName") {
        aVal = a.currencyName.toLowerCase();
        bVal = b.currencyName.toLowerCase();
      } else if (sortField === "syncStatus") {
        aVal = a.syncStatus;
        bVal = b.syncStatus;
      } else if (sortField === "lastSynced") {
        aVal = a.lastSynced;
        bVal = b.lastSynced;
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
  const handleToggleSort = (field: CurrencySortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
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
    if (!currencyToConfirmEdit) return;
    setActiveRecord(currencyToConfirmEdit);
    setFormMode("edit");
    setIsFormModalOpen(true);
    setCurrencyToConfirmEdit(null);
    if (onEdit) onEdit(currencyToConfirmEdit);
  };

  // Save from Modal
  const handleSaveCurrency = (data: {
    currencyCode: string;
    currencyName: string;
    symbol: string;
    syncStatus: SyncStatus;
  }) => {
    if (formMode === "create") {
      const newRecord: CurrencyRecord = {
        id: `curr-${Date.now()}`,
        no: localRecords.length + 1,
        currencyCode: data.currencyCode,
        currencyName: data.currencyName,
        symbol: data.symbol,
        syncStatus: data.syncStatus,
        lastSynced: data.syncStatus === "Synced" ? new Date().toISOString().replace("T", " ").substring(0, 19) : "—",
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
                currencyCode: data.currencyCode,
                currencyName: data.currencyName,
                symbol: data.symbol,
                syncStatus: data.syncStatus,
                lastSynced:
                  data.syncStatus === "Synced"
                    ? new Date().toISOString().replace("T", " ").substring(0, 19)
                    : rec.lastSynced,
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
    if (!currencyToDelete) return;
    const idToDelete = currencyToDelete.id;
    setLocalRecords((prev) => prev.filter((c) => c.id !== idToDelete));
    if (onDelete) onDelete(idToDelete);
    setCurrencyToDelete(null);
  };

  // Export to Excel-compatible CSV
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const headers = ["No", "Currency Code", "Currency Name", "Symbol", "Sync Status", "Last Synced", "Created At"];
      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.currencyCode || "").replace(/"/g, '""')}"`,
          `"${(row.currencyName || "").replace(/"/g, '""')}"`,
          `"${(row.symbol || "").replace(/"/g, '""')}"`,
          `"${row.syncStatus || ""}"`,
          `"${row.lastSynced || ""}"`,
          `"${row.createdAt || ""}"`,
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
        `Master_Currency_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${sortedRecords.length} currency record(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  const renderSortIndicator = (field: CurrencySortField) => {
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

  const renderSyncBadge = (status: SyncStatus) => {
    switch (status) {
      case "Synced":
        return <span className="sync-status-badge sync-status-badge--synced">● Synced</span>;
      case "Pending":
        return <span className="sync-status-badge sync-status-badge--pending">⏳ Pending</span>;
      case "Failed":
        return <span className="sync-status-badge sync-status-badge--failed">✕ Failed</span>;
      case "Not Synced":
      default:
        return <span className="sync-status-badge sync-status-badge--not-synced">○ Not Synced</span>;
    }
  };

  return (
    <div className="currency-page">
      {/* Header action bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.3px" }}>
          Master Currency
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
            placeholder="Search currency code, name, status..."
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
                    onClick={() => handleToggleSort("currencyCode")}
                  >
                    <span>Currency Code</span>
                    {renderSortIndicator("currencyCode")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("currencyName")}
                  >
                    <span>Currency Name</span>
                    {renderSortIndicator("currencyName")}
                  </th>
                  <th style={{ width: "90px", textAlign: "center" }}>
                    <span>Symbol</span>
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "140px", textAlign: "center", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("syncStatus")}
                  >
                    <span>Sync Status</span>
                    {renderSortIndicator("syncStatus")}
                  </th>
                  <th
                    className="sortable-th"
                    style={{ width: "170px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => handleToggleSort("lastSynced")}
                  >
                    <span>Last Synced</span>
                    {renderSortIndicator("lastSynced")}
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
                          {item.currencyCode}
                        </td>
                        <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {item.currencyName}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: 700, color: "var(--ink-soft)" }}>
                          {item.symbol || "—"}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {renderSyncBadge(item.syncStatus)}
                        </td>
                        <td style={{ fontSize: "11.5px", color: "var(--muted)", fontFamily: "ui-monospace, monospace" }}>
                          {item.lastSynced}
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
                              onClick={() => setCurrencyToConfirmEdit(item)}
                              title={`Edit ${item.currencyName}`}
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
                              onClick={() => setCurrencyToDelete(item)}
                              title={`Delete ${item.currencyName}`}
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
                    <td colSpan={7} className="empty-table-cell">
                      <div className="empty" style={{ padding: "36px", textAlign: "center" }}>
                        <div className="empty__icon" style={{ marginBottom: "8px" }}>
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No currencies found</strong>
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

      {/* Currency Form Modal */}
      <CurrencyForm
        isOpen={isFormModalOpen}
        mode={formMode}
        record={activeRecord}
        onSave={handleSaveCurrency}
        onCancel={() => {
          setIsFormModalOpen(false);
          setActiveRecord(null);
        }}
      />

      {/* Edit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!currencyToConfirmEdit}
        title="Edit Record?"
        message={`Do you want to edit currency "${currencyToConfirmEdit?.currencyName}" (${currencyToConfirmEdit?.currencyCode})?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={handleConfirmEdit}
        onCancel={() => setCurrencyToConfirmEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!currencyToDelete}
        title="Delete Record?"
        message={`Are you sure you want to delete currency "${currencyToDelete?.currencyName}" (${currencyToDelete?.currencyCode})? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        confirmVariant="danger"
        icon="alertTriangle"
        onConfirm={handleConfirmDelete}
        onCancel={() => setCurrencyToDelete(null)}
      />
    </div>
  );
}

export default CurrencyIndex;
