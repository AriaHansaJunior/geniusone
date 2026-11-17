import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { SearchField } from "../../../../components/ui/SearchField";
import { Icon } from "../../../../components/ui/Icon";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { Pagination } from "../../../../components/ui/Pagination";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { useNotification } from "../../../../context/NotificationContext";
import { initialHsRecords } from "./hs-data";
import type {
  HsRecord,
  HsSortField,
  SortDirection,
} from "./hs-types";

interface HsIndexProps {
  records?: HsRecord[];
  isLoading?: boolean;
  onAddNew: () => void;
}

export function HsIndex({
  records = initialHsRecords,
  isLoading = false,
  onAddNew,
}: HsIndexProps) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();

  const [localRecords, setLocalRecords] = useState<HsRecord[]>(records);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<HsSortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const formatPercent = (val: number | undefined | null) => {
    if (val === undefined || val === null || isNaN(val)) return "0%";
    return `${val}%`;
  };

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      const matchName = rec.name.toLowerCase().includes(query);
      const matchDesc = (rec.description || "").toLowerCase().includes(query);
      const matchBm = (rec.typeRateBm || "").toLowerCase().includes(query);
      const matchCukai = (rec.typeRateCukai || "").toLowerCase().includes(query);
      return matchName || matchDesc || matchBm || matchCukai;
    });
  }, [localRecords, search]);

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
      } else if (sortField === "typeRateBm") {
        aVal = (a.typeRateBm || "").toLowerCase();
        bVal = (b.typeRateBm || "").toLowerCase();
      } else if (sortField === "typeRateCukai") {
        aVal = (a.typeRateCukai || "").toLowerCase();
        bVal = (b.typeRateCukai || "").toLowerCase();
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
      } else if (sortField === "status") {
        aVal = a.status === false ? 0 : 1;
        bVal = b.status === false ? 0 : 1;
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

  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

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

  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      notifyWarning("Nothing to Export", "No HS records match your filter.");
      return;
    }

    try {
      const headers = [
        "No",
        "HS Code",
        "Description",
        "BM Type",
        "BM Rate (%)",
        "Cukai Type",
        "Cukai Rate (%)",
      ];

      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.name || "").replace(/"/g, '""')}"`,
          `"${(row.description || "").replace(/"/g, '""')}"`,
          `"${row.typeRateBm || "ADVOLORUM"}"`,
          row.ratesBm,
          `"${row.typeRateCukai || "ADVOLORUM"}"`,
          row.ratesCukai,
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
        `Master_HS_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifySuccess("Export Completed", `Exported ${sortedRecords.length} HS Code record(s).`);
    } catch {
      notifyError("Export Failed", "Failed to export HS Code data.");
    }
  };

  const renderSortIndicator = (field: HsSortField) => {
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

  return (
    <div className="master-page-shell hs-page">
      <div className="panel table-panel hs-table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search HS code, description, tariff type..."
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

        <div className="table-frame">
          <div className="table-scroll">
            <table className="hs-data-table data-table">
              <thead>
                <tr>
                  <th className="master-col-no">
                    <span>No</span>
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-code-wide"
                    onClick={() => handleToggleSort("name")}
                  >
                    <span>HS Code</span>
                    {renderSortIndicator("name")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-description"
                    onClick={() => handleToggleSort("description")}
                  >
                    <span>Description</span>
                    {renderSortIndicator("description")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-type"
                    onClick={() => handleToggleSort("typeRateBm")}
                  >
                    <span>Type Rates BM</span>
                    {renderSortIndicator("typeRateBm")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-num-rate"
                    onClick={() => handleToggleSort("ratesBm")}
                  >
                    <span>BM (%)</span>
                    {renderSortIndicator("ratesBm")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-type"
                    onClick={() => handleToggleSort("typeRateCukai")}
                  >
                    <span>Type Rates Cukai</span>
                    {renderSortIndicator("typeRateCukai")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-num-rate"
                    onClick={() => handleToggleSort("ratesCukai")}
                  >
                    <span>Cukai (%)</span>
                    {renderSortIndicator("ratesCukai")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th master-col-status"
                    onClick={() => handleToggleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading && paginatedRecords.length === 0 ? (
                  <TableLoadingRow colSpan={8} label="Loading HS Codes..." sublabel="Synchronizing tariff & HS code catalog..." />
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id}>
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-code hs-name-cell">{item.name}</td>
                        <td className="master-cell-muted hs-desc-cell">
                          {item.description || "-"}
                        </td>
                        <td className="master-cell-name">
                          {item.typeRateBm || "ADVOLORUM"}
                        </td>
                        <td className="master-cell-center">
                          <span className="hs-tariff-rate">
                            {formatPercent(item.ratesBm)}
                          </span>
                        </td>
                        <td className="master-cell-name">
                          {item.typeRateCukai || "ADVOLORUM"}
                        </td>
                        <td className="master-cell-center">
                          <span className="hs-tariff-rate">
                            {formatPercent(item.ratesCukai)}
                          </span>
                        </td>
                        <td className="master-cell-center">
                          <StatusToggle
                            active={item.status ?? true}
                            onToggle={() =>
                              notifyError(
                                "Status Toggle Unavailable",
                                `Cannot change status for HS Code "${item.name}": table \`hs_code\` has no status column and backend endpoint PATCH /api/exim/master/hs-codes/{id}/toggle-status is not yet registered in routes/api.php.`
                              )
                            }
                            ariaLabel={`Toggle status for ${item.name}`}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="empty-table-cell">
                      <div className="empty master-empty-box">
                        <div className="empty__icon master-empty-icon">
                          <Icon name="search" size={24} />
                        </div>
                        <strong>No HS records found</strong>
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
    </div>
  );
}

export default HsIndex;
