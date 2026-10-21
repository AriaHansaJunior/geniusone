import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { Pagination } from "../../../../components/ui/Pagination";
import { initialHsRecords } from "./hs-data";
import type {
  HsRecord,
  HsSortField,
  SortDirection,
} from "./hs-types";

interface HsIndexProps {
  records?: HsRecord[];
  onAddNew: () => void;
  onEdit?: (record: HsRecord) => void;
  onDelete?: (id: string) => void;
}

export function HsIndex({
  records = initialHsRecords,
  onAddNew,
  onEdit,
  onDelete,
}: HsIndexProps) {
  const [localRecords, setLocalRecords] = useState<HsRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<HsSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [hsToDelete, setHsToDelete] = useState<HsRecord | null>(null);
  const [hsToEdit, setHsToEdit] = useState<HsRecord | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Format percentage number neatly
  const formatPercent = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return "0%";
    return `${val}%`;
  };

  // Search filter across HS Code Name and Description
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchName = rec.name.toLowerCase().includes(query);
      const matchDesc = (rec.description || "").toLowerCase().includes(query);
      return matchName || matchDesc;
    });
  }, [localRecords, search]);

  // Sorting
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") {
      return filteredRecords;
    }
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "description") {
        aVal = (a.description || "").toLowerCase();
        bVal = (b.description || "").toLowerCase();
      } else if (sortField === "ratesBm") {
        aVal = a.ratesBm;
        bVal = b.ratesBm;
      } else if (sortField === "ratesCukai") {
        aVal = a.ratesCukai;
        bVal = b.ratesCukai;
      } else if (sortField === "ratesPpn") {
        aVal = a.ratesPpn;
        bVal = b.ratesPpn;
      } else if (sortField === "ratesPph") {
        aVal = a.ratesPph;
        bVal = b.ratesPph;
      } else if (sortField === "ratesPpnbm") {
        aVal = a.ratesPpnbm;
        bVal = b.ratesPpnbm;
      }

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
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
  const handleToggleSort = (field: HsSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Delete confirmed
  const handleConfirmDelete = () => {
    if (!hsToDelete) return;
    const idToDelete = hsToDelete.id;
    setLocalRecords((prev) => prev.filter((h) => h.id !== idToDelete));
    if (onDelete) {
      onDelete(idToDelete);
    }
    setHsToDelete(null);
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
        "Name",
        "Description",
        "BM Rate (%)",
        "BM Type",
        "Cukai Rate (%)",
        "Cukai Type",
        "PPN (%)",
        "PPH (%)",
        "PPNBM (%)",
      ];

      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.description || "").replace(/"/g, '""')}"`,
          row.ratesBm,
          `"${row.typeRateBm || "ADVOLORUM"}"`,
          row.ratesCukai,
          `"${row.typeRateCukai || "ADVOLORUM"}"`,
          row.ratesPpn,
          row.ratesPph,
          row.ratesPpnbm,
        ];
        csvRows.push(values.join(","));
      });

      // Prepend UTF-8 BOM so Excel opens special characters correctly
      const csvString = "\uFEFF" + csvRows.join("\r\n");
      const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Master_HS_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportNotice(`Exported ${sortedRecords.length} HS record(s) to CSV.`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export data. Please try again.");
      setTimeout(() => setExportNotice(null), 4000);
    }
  };

  // Render sorting indicator icon
  const renderSortIndicator = (field: HsSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        className={`hs-sort-indicator ${isActive ? "active" : "inactive"}`}
      >
        {isActive
          ? sortDirection === "asc"
            ? "▲"
            : "▼"
          : "⇅"}
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
    <div className="hs-page">
      {/* Page Heading Area: Master HS title on left, Add New & Export on right */}
      <div className="hs-page-header">
        <h1 className="hs-page-title">Master HS</h1>

        <div className="hs-header-actions">
          <Button variant="primary" onClick={onAddNew}>
            Add New
          </Button>

          <Button
            variant="ghost"
            onClick={handleExportToExcel}
            title="Export filtered records to Excel-compatible CSV"
          >
            Export To Excel
          </Button>
        </div>
      </div>

      {/* Export notification notice */}
      {exportNotice && (
        <div className="hs-alert hs-alert--info">
          <Icon name="check" size={15} />
          <div className="hs-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="hs-alert-close"
            onClick={() => setExportNotice(null)}
            aria-label="Dismiss export notice"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Panel */}
      <div className="hs-table-panel panel">
        {/* Table Toolbar: Search on Left */}
        <div className="hs-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search..."
          />
        </div>

        {/* Responsive Table Frame */}
        <div className="table-frame">
          <div className="table-scroll">
            <table className="hs-data-table data-table">
              <thead>
                <tr>
                  {/* 1. No */}
                  <th style={{ width: "55px", textAlign: "center" }}>
                    <span>No</span>
                  </th>

                  {/* 2. Name */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "130px" }}
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>Name</span>
                    {renderSortIndicator("name")}
                  </th>

                  {/* 3. Description */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "240px" }}
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>

                  {/* 4. BM */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "110px", textAlign: "center" }}
                    onClick={() => handleToggleSort("ratesBm")}
                  >
                    <span>BM</span>
                    {renderSortIndicator("ratesBm")}
                  </th>

                  {/* 5. cukai */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "110px", textAlign: "center" }}
                    onClick={() => handleToggleSort("ratesCukai")}
                  >
                    <span>cukai</span>
                    {renderSortIndicator("ratesCukai")}
                  </th>

                  {/* 6. PPN */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "90px", textAlign: "center" }}
                    onClick={() => handleToggleSort("ratesPpn")}
                  >
                    <span>PPN</span>
                    {renderSortIndicator("ratesPpn")}
                  </th>

                  {/* 7. PPH */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "90px", textAlign: "center" }}
                    onClick={() => handleToggleSort("ratesPph")}
                  >
                    <span>PPH</span>
                    {renderSortIndicator("ratesPph")}
                  </th>

                  {/* 8. PPNBM */}
                  <th
                    className="sortable-th"
                    style={{ minWidth: "90px", textAlign: "center" }}
                    onClick={() => handleToggleSort("ratesPpnbm")}
                  >
                    <span>PPNBM</span>
                    {renderSortIndicator("ratesPpnbm")}
                  </th>

                  {/* 9. Option */}
                  <th style={{ width: "140px", textAlign: "center" }}>
                    <span>Option</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber =
                      (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        {/* 1. Sequential No */}
                        <td
                          style={{
                            textAlign: "center",
                            color: "var(--muted)",
                            fontWeight: 600,
                          }}
                        >
                          {rowNumber}
                        </td>

                        {/* 2. HS Code Name */}
                        <td className="hs-name-cell">
                          {item.name}
                        </td>

                        {/* 3. Description */}
                        <td className="hs-desc-cell">
                          {item.description || "-"}
                        </td>

                        {/* 4. BM: Rate & Tariff Type */}
                        <td style={{ textAlign: "center" }}>
                          <div className="hs-tariff-cell">
                            <span className="hs-tariff-rate">
                              {formatPercent(item.ratesBm)}
                            </span>
                            <span className="hs-tariff-type">
                              {item.typeRateBm || "ADVOLORUM"}
                            </span>
                          </div>
                        </td>

                        {/* 5. Cukai: Rate & Tariff Type */}
                        <td style={{ textAlign: "center" }}>
                          <div className="hs-tariff-cell">
                            <span className="hs-tariff-rate">
                              {formatPercent(item.ratesCukai)}
                            </span>
                            <span className="hs-tariff-type">
                              {item.typeRateCukai || "ADVOLORUM"}
                            </span>
                          </div>
                        </td>

                        {/* 6. PPN Rate */}
                        <td style={{ textAlign: "center" }}>
                          <span className="hs-rate-badge">
                            {formatPercent(item.ratesPpn)}
                          </span>
                        </td>

                        {/* 7. PPH Rate */}
                        <td style={{ textAlign: "center" }}>
                          <span className="hs-rate-badge">
                            {formatPercent(item.ratesPph)}
                          </span>
                        </td>

                        {/* 8. PPNBM Rate */}
                        <td style={{ textAlign: "center" }}>
                          <span className="hs-rate-badge">
                            {formatPercent(item.ratesPpnbm)}
                          </span>
                        </td>

                        {/* 9. Option Actions */}
                        <td style={{ textAlign: "center" }}>
                          <div className="hs-row-actions">
                            {onEdit && (
                              <button
                                type="button"
                                className="hs-action-btn hs-action-btn--edit"
                                title={`Edit ${item.name}`}
                                onClick={() => setHsToEdit(item)}
                              >
                                <Icon name="edit" size={13} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="hs-action-btn hs-action-btn--delete"
                              title={`Delete ${item.name}`}
                              onClick={() => setHsToDelete(item)}
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
                    <td colSpan={9} className="empty-table-cell">
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No HS records found</strong>
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

      {/* Edit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!hsToEdit}
        title="Edit Record"
        message={`Do you want to edit HS Code "${hsToEdit?.name}"?`}
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        icon="edit"
        onConfirm={() => {
          if (hsToEdit && onEdit) {
            onEdit(hsToEdit);
          }
          setHsToEdit(null);
        }}
        onCancel={() => setHsToEdit(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!hsToDelete}
        entityType="HS code"
        entityName={hsToDelete?.name}
        entityCode={hsToDelete?.code}
        onConfirm={handleConfirmDelete}
        onCancel={() => setHsToDelete(null)}
      />
    </div>
  );
}

export default HsIndex;
