import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { SearchField } from "../../../../components/ui/SearchField";
import { Pagination } from "../../../../components/ui/Pagination";
import { StatusToggle } from "../../../../components/ui/StatusToggle";
import { TableLoadingRow } from "../../../../components/ui/LoadingBuffer";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { MasterDeleteButton } from "../../../../components/ui/MasterDeleteButton";
import { useMasterDelete } from "../../../../hooks/useMasterDelete";
import { useNotification } from "../../../../context/NotificationContext";
import { type SupplierRecord } from "./supplier-types";

interface SupplierIndexProps {
  records?: SupplierRecord[];
  isLoading?: boolean;
  onAddNew: () => void;
  onToggleHide?: (id: string) => void;
  onDelete?: (id: string) => Promise<void> | void;
}

type SortField =
  | "no"
  | "supplierCode"
  | "supplierName"
  | "address"
  | "country"
  | "npwp"
  | "nitku"
  | "created"
  | "status";

type SortDirection = "asc" | "desc";

export function SupplierIndex({
  records = [],
  isLoading = false,
  onAddNew,
  onToggleHide,
  onDelete,
}: SupplierIndexProps) {
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const { deleteTarget, isDeleting, requestDelete, cancelDelete, confirmDelete } =
    useMasterDelete<SupplierRecord>((r) => r.id, onDelete);

  const [localRecords, setLocalRecords] = useState<SupplierRecord[]>(records);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<SortField>("no");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleToggleHide = (id: string) => {
    setLocalRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, hidden: !r.hidden } : r))
    );
    if (onToggleHide) {
      onToggleHide(id);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return localRecords;
    const query = search.toLowerCase().trim();
    return localRecords.filter((rec) => {
      return (
        String(rec.no).includes(query) ||
        rec.supplierCode.toLowerCase().includes(query) ||
        rec.supplierName.toLowerCase().includes(query) ||
        rec.address.toLowerCase().includes(query) ||
        rec.country.toLowerCase().includes(query) ||
        rec.npwp.toLowerCase().includes(query) ||
        rec.nitku.toLowerCase().includes(query) ||
        rec.createdBy.toLowerCase().includes(query) ||
        rec.createdAt.toLowerCase().includes(query)
      );
    });
  }, [localRecords, search]);

  const sortedRecords = useMemo(() => {
    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "no") {
        aVal = a.no;
        bVal = b.no;
      } else if (sortField === "created") {
        aVal = a.createdAt;
        bVal = b.createdAt;
      } else if (sortField === "status") {
        aVal = a.hidden ? 0 : 1;
        bVal = b.hidden ? 0 : 1;
      } else {
        aVal = (a[sortField] || "").toLowerCase();
        bVal = (b[sortField] || "").toLowerCase();
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      notifyWarning("Nothing to Export", "No supplier records match the current filter.");
      return;
    }

    try {
      const headers = [
        "No",
        "Supplier Code",
        "Supplier Name",
        "Address",
        "Country",
        "NPWP",
        "NITKU",
        "Created By",
        "Created At",
        "Status",
      ];

      const csvRows = [headers.join(",")];

      sortedRecords.forEach((row, index) => {
        const values = [
          index + 1,
          `"${(row.supplierCode || "").replace(/"/g, '""')}"`,
          `"${(row.supplierName || "").replace(/"/g, '""')}"`,
          `"${(row.address || "").replace(/"/g, '""')}"`,
          `"${(row.country || "").replace(/"/g, '""')}"`,
          `"${(row.npwp || "").replace(/"/g, '""')}"`,
          `"${(row.nitku || "").replace(/"/g, '""')}"`,
          `"${(row.createdBy || "").replace(/"/g, '""')}"`,
          `"${(row.createdAt || "").replace(/"/g, '""')}"`,
          row.hidden ? "Inactive" : "Active",
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
        `Supplier_Master_Export_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notifySuccess("Export Completed", `Exported ${sortedRecords.length} supplier record(s).`);
    } catch {
      notifyError("Export Failed", "Could not export supplier records.");
    }
  };

  const renderSortIndicator = (field: SortField) => {
    const isActive = sortField === field;
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

  return (
    <div className="master-page-shell supplier-master-page">
      <div className="panel table-panel supplier-table-panel">
        <div className="master-table-toolbar">
          <SearchField
            value={search}
            onChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            placeholder="Search supplier code, name, NPWP, address..."
          />
          <div className="master-toolbar-actions">
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button variant="excel" onClick={handleExportToExcel}>
              Export to Excel
            </Button>
          </div>
        </div>

        <div className="table-frame supplier-table-frame">
          <div className="table-scroll">
            <table className="data-table supplier-data-table">
              <thead>
                <tr>
                  <th
                    className="sortable-th master-sortable-th supplier-col-no"
                    onClick={() => handleSort("no")}
                  >
                    <span>No</span>
                    {renderSortIndicator("no")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-code"
                    onClick={() => handleSort("supplierCode")}
                  >
                    <span>Supplier Code</span>
                    {renderSortIndicator("supplierCode")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-name"
                    onClick={() => handleSort("supplierName")}
                  >
                    <span>Supplier Name</span>
                    {renderSortIndicator("supplierName")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-address"
                    onClick={() => handleSort("address")}
                  >
                    <span>Address</span>
                    {renderSortIndicator("address")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-country"
                    onClick={() => handleSort("country")}
                  >
                    <span>Country</span>
                    {renderSortIndicator("country")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-npwp"
                    onClick={() => handleSort("npwp")}
                  >
                    <span>NPWP</span>
                    {renderSortIndicator("npwp")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-nitku"
                    onClick={() => handleSort("nitku")}
                  >
                    <span>NITKU</span>
                    {renderSortIndicator("nitku")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-created"
                    onClick={() => handleSort("created")}
                  >
                    <span>Created</span>
                    {renderSortIndicator("created")}
                  </th>
                  <th
                    className="sortable-th master-sortable-th supplier-col-status"
                    onClick={() => handleSort("status")}
                  >
                    <span>Status</span>
                    {renderSortIndicator("status")}
                  </th>
                  <th className="master-col-actions text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && paginatedRecords.length === 0 ? (
                  <TableLoadingRow colSpan={10} label="Loading Suppliers..." sublabel="Fetching vendor directory & compliance details..." />
                ) : paginatedRecords.length > 0 ? (
                  paginatedRecords.map((item, index) => {
                    const rowNumber = (safeCurrentPage - 1) * pageSize + index + 1;
                    return (
                      <tr key={item.id} className={item.hidden ? "row--hidden" : ""}>
                        <td className="master-cell-no">{rowNumber}</td>
                        <td className="master-cell-code">
                          {item.supplierCode || "—"}
                        </td>
                        <td className="master-cell-name">{item.supplierName}</td>
                        <td className="supplier-address-cell">{item.address || "—"}</td>
                        <td className="master-cell-center">
                          <span className="supplier-country-tag">{item.country || "—"}</span>
                        </td>
                        <td className="master-cell-mono">{item.npwp || "—"}</td>
                        <td className="master-cell-mono">{item.nitku || "—"}</td>
                        <td>
                          <div className="supplier-created-cell">
                            <span className="supplier-creator">{item.createdBy || "-"}</span>
                            <span className="supplier-timestamp">{item.createdAt || "-"}</span>
                          </div>
                        </td>
                        <td className="master-cell-center">
                          <StatusToggle
                            hidden={item.hidden}
                            onToggle={() => handleToggleHide(item.id)}
                            ariaLabel={`Toggle status for ${item.supplierName}`}
                          />
                        </td>
                        <td className="master-cell-center">
                          <MasterDeleteButton
                            label={item.supplierName}
                            onClick={() => requestDelete(item)}
                          />
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                      <td colSpan={10} className="empty-table-cell">
                        <div className="empty master-empty-box">
                          <div className="empty__icon master-empty-icon">
                            <Icon name="search" size={24} />
                          </div>
                          <strong>No suppliers found</strong>
                          <span className="master-empty-subtitle">
                            Try adjusting your search criteria.
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
        entityType="supplier"
        entityName={deleteTarget?.supplierName}
        entityCode={deleteTarget?.supplierCode}
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}

export default SupplierIndex;
