import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { Pagination } from "../../../../components/ui/Pagination";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { useNotification } from "../../../../context/NotificationContext";
import { initialColorRecords } from "./color-data";
import type {
  ColorRecord,
  ColorSortField,
  SortDirection,
} from "./color-types";

interface ColorIndexProps {
  records?: ColorRecord[];
  onAddNew: () => void;
  onEdit?: (record: ColorRecord) => void;
  onDelete?: (id: string) => Promise<void> | void;
  onToggleStatus?: (id: string) => Promise<void> | void;
}

export function ColorIndex({
  records = initialColorRecords,
  onAddNew,
  onEdit,
  onDelete,
  onToggleStatus,
}: ColorIndexProps) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [localRecords, setLocalRecords] = useState<ColorRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<ColorSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [colorToEdit, setColorToEdit] = useState<ColorRecord | null>(null);
  const [colorToDelete, setColorToDelete] = useState<ColorRecord | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchCode = (rec.code || "").toLowerCase().includes(query);
      const matchName = (rec.name || "").toLowerCase().includes(query);
      const matchGrade = (rec.grade || "").toLowerCase().includes(query);
      return matchCode || matchName || matchGrade;
    });
  }, [localRecords, search]);

  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      if (sortField === "status") {
        const aNum = a.status ? 1 : 0;
        const bNum = b.status ? 1 : 0;
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum;
      }

      const aVal = (sortField === "code" ? a.code : a.name || "").toLowerCase();
      const bVal = (sortField === "code" ? b.code : b.name || "").toLowerCase();

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

  const handleToggleSort = (field: ColorSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: ColorSortField) => {
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

  const handleToggleStatus = (id: string) => {
    if (onToggleStatus) {
      onToggleStatus(id);
    } else {
      setLocalRecords((prev) =>
        prev.map((rec) => (rec.id === id ? { ...rec, status: !rec.status } : rec))
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!colorToDelete) return;
    const target = colorToDelete;
    setColorToDelete(null);
    if (onDelete) {
      await onDelete(target.id);
    }
  };

  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      notifyWarning("Nothing to Export", "No colour records match your current filter.");
      return;
    }

    try {
      const rows = [
        ["No", "Color Code", "Color Name", "Status"],
        ...sortedRecords.map((item, index) => [
          index + 1,
          item.code,
          item.name,
          item.status ? "Active" : "Inactive",
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 18 },
        { wch: 30 },
        { wch: 14 },
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Colors");

      XLSX.writeFile(
        workbook,
        `Master_Color_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      notifySuccess("Export Completed", `Exported ${sortedRecords.length} colour record(s).`);
    } catch {
      notifyError("Export Failed", "Failed to export colour records.");
    }
  };

  return (
    <div className="master-page-shell color-page">
      <div className="panel table-panel color-table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search color code or name..."
          />

          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button
              variant="excel"
              onClick={handleExportToExcel}
              title="Export color records to Excel (.xlsx)"
            >
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="color-data-table data-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-code"
                    onClick={() => handleToggleSort("code")}
                  >
                    <span>Color Code</span>
                    {renderSortIndicator("code")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-name"
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Color Name</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-status"
                    onClick={() => handleToggleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                  <th className="master-col-actions">
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
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-code">{item.code || "—"}</td>
                        <td className="master-cell-name">{item.name}</td>
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status ?? true}
                            onToggle={() => handleToggleStatus(item.id)}
                            ariaLabel={`Toggle status for ${item.name}`}
                          />
                        </td>
                        <td className="master-cell-center">
                          <div className="master-actions-group">
                            {onEdit && (
                              <button
                                type="button"
                                className="btn-action-edit"
                                title={`Edit ${item.name}`}
                                aria-label={`Edit ${item.name}`}
                                onClick={() => setColorToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            {onDelete && (
                              <button
                                type="button"
                                className="btn-action-delete"
                                title={`Delete ${item.name}`}
                                aria-label={`Delete ${item.name}`}
                                onClick={() => setColorToDelete(item)}
                              >
                                <Icon name="trash" size={13} />
                              </button>
                            )}
                          </div>
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
                        <strong>No colours found</strong>
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
        isOpen={!!colorToEdit}
        title="Edit Record"
        message={`Do you want to edit colour "${colorToEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (colorToEdit && onEdit) {
            onEdit(colorToEdit);
          }
          setColorToEdit(null);
        }}
        onCancel={() => setColorToEdit(null)}
      />

      <ConfirmDialog
        isOpen={!!colorToDelete}
        entityType="colour"
        entityName={colorToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={() => setColorToDelete(null)}
      />
    </div>
  );
}

export default ColorIndex;
