import React, { useEffect, useMemo, useState } from "react";
import { downloadCsvFile } from "../../../../utils/csvExport";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { Pagination } from "../../../../components/ui/Pagination";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { MasterDeleteButton } from "../../../../components/ui/MasterDeleteButton";
import { useMasterDelete } from "../../../../hooks/useMasterDelete";
import { initialClassificationRecords } from "./classification-data";
import type {
  ClassificationRecord,
  ClassificationSortField,
  SortDirection,
} from "./classification-types";

interface ClassificationIndexProps {
  records?: ClassificationRecord[];
  isLoading?: boolean;
  onAddNew: () => void;
  onToggleStatus?: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
}

export function ClassificationIndex({
  records = initialClassificationRecords,
  isLoading = false,
  onAddNew,
  onToggleStatus,
  onDelete,
}: ClassificationIndexProps) {
  const { deleteTarget, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useMasterDelete<ClassificationRecord>((r) => r.id, onDelete);
  const [localRecords, setLocalRecords] = useState<ClassificationRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<ClassificationSortField>("code");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Search filter across code, name, description, and reporting type
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchCode = rec.code.toLowerCase().includes(query);
      const matchName = rec.name.toLowerCase().includes(query);
      const matchDesc = (rec.description || "").toLowerCase().includes(query);
      const matchRep = (rec.reportingType || "").toLowerCase().includes(query);
      return matchCode || matchName || matchDesc || matchRep;
    });
  }, [localRecords, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
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
        aVal = (a.description || "").toLowerCase();
        bVal = (b.description || "").toLowerCase();
      } else if (sortField === "reportingType") {
        aVal = (a.reportingType || "").toLowerCase();
        bVal = (b.reportingType || "").toLowerCase();
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

  // Toggle sorting for columns
  const handleToggleSort = (field: ClassificationSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Toggle status for a record
  const handleToggleStatus = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((rec) => (rec.id === id ? { ...rec, status: !rec.status } : rec))
    );
    if (onToggleStatus) {
      onToggleStatus(id);
    }
  };

  // Export to Excel-compatible CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3000);
      return;
    }

    try {
      const headers = [
        "No",
        "Classification Code",
        "Name",
        "Description",
        "Reporting Type",
        "Account",
        "Status",
      ];

      const rows = sortedRecords.map((row, index) => [
        index + 1,
        row.code || "",
        row.name || "",
        row.description || "",
        row.reportingType || "",
        row.account || "",
        row.status ? "Active" : "Inactive",
      ]);

      downloadCsvFile(
        `Master_Classification_Export_${new Date().toISOString().slice(0, 10)}.csv`,
        headers,
        rows
      );

      setExportNotice(`Exported ${sortedRecords.length} classification record(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Render sorting indicator icon
  const renderSortIndicator = (field: ClassificationSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`master-sort-indicator ${isActive ? "master-sort-indicator--active" : ""
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

  const startEntry = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  // Generate pagination page list
  const pageNumbers: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pageNumbers.push(i);
  }

  return (
    <div className="classification-page">
      {/* Export notification notice */}
      {exportNotice && (
        <div className="classification-alert classification-alert--info">
          <Icon name="check" size={15} />
          <div className="classification-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="classification-alert-close"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="classification-table-panel panel">
        {/* Table Toolbar: Search on Left, Actions on Right */}
        <div className="classification-toolbar master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search..."
          />

          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button
              variant="excel"
              onClick={handleExportToExcel}
              title="Export filtered records to Excel-compatible CSV"
            >
              Export to Excel
            </Button>
          </div>
        </div>

        {/* Responsive Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="classification-data-table data-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-col-w90"
                    onClick={() => handleToggleSort("code")}
                  >
                    <span>Code</span>
                    {renderSortIndicator("code")}
                  </th>
                  <th
                    className="sortable-th master-col-mw220"
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th master-col-mw220"
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>
                  <th
                    className="sortable-th master-col-mw240"
                    onClick={() => handleToggleSort("reportingType")}
                  >
                    <span>Reporting Type</span>
                    {renderSortIndicator("reportingType")}
                  </th>
                  <th
                    className="sortable-th master-col-status-sm"
                    onClick={() => handleToggleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                  <th className="master-col-actions text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && paginatedRecords.length === 0 ? (
                  <TableLoadingRow colSpan={7} label="Loading Classifications..." />
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber =
                      (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        {/* 1. Sequential No */}
                        <td className="master-cell-no">
                          {rowNumber}
                        </td>

                        {/* 2. Code */}
                        <td className="classification-code-cell">
                          {item.code}
                        </td>

                        {/* 3. Name */}
                        <td className="classification-name-cell">
                          {item.name}
                        </td>

                        {/* 4. Description */}
                        <td className="classification-desc-cell">
                          {item.description || "-"}
                        </td>

                        {/* 5. Reporting Type */}
                        <td className="classification-reporting-cell">
                          {item.reportingType || "-"}
                        </td>

                        {/* 6. Status Toggle */}
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status}
                            onToggle={() => handleToggleStatus(item.id)}
                            ariaLabel={`Toggle status for ${item.name}`}
                          />
                        </td>

                        {/* 7. Action */}
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
                      <td colSpan={7} className="empty-table-cell">
                        <div className="empty">
                          <div className="empty__icon">
                            <Icon name="search" />
                          </div>
                          <strong>No classifications found</strong>
                          <span>Try adjusting your search query.</span>
                        </div>
                      </td>
                  </tr>
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

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        entityType="classification"
        entityName={deleteTarget?.name}
        entityCode={deleteTarget?.code}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default ClassificationIndex;
