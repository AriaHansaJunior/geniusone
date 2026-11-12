import React, { useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { SearchField } from "../../../components/ui/SearchField";
import { Pagination } from "../../../components/ui/Pagination";
import { CustomSelect } from "../../../components/ui/CustomSelect";
import { CustomDatePicker } from "../../../components/ui/CustomDatePicker";
import { TableColumnSettings, type TableColumnOption } from "../../../components/ui/TableColumnSettings";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { getLocalApprovalState } from "../../../services/approvalApi";
import { normalizeApprovalStatus } from "../../../types/approval";
import { formatDisplayDate } from "../../../data/masterApi";
import {
  initialReceiveNoteRecords,
  suppliersList,
  docTypesList,
} from "./receive-note-data";
import type {
  ReceiveNoteRecord,
  ReceiveNoteSortField,
  SortDirection,
} from "./receive-note-types";

const DEFAULT_RN_COLUMNS: TableColumnOption[] = [
  { key: "rnNumber", label: "RN Number", visible: true, disabled: true },
  { key: "poNumber", label: "PO Number", visible: true },
  { key: "date", label: "Date", visible: true },
  { key: "supplier", label: "Supplier", visible: true },
  { key: "facility", label: "Facility", visible: true },
  { key: "ajuNumber", label: "Aju Number / Registration Number", visible: true },
  { key: "amount", label: "Amount", visible: true },
  { key: "description", label: "Description", visible: true },
  { key: "warehouseTx", label: "Warehouse Transaction", visible: true },
];

interface ReceiveNoteIndexProps {
  records?: ReceiveNoteRecord[];
  onAddNew: () => void;
  onViewDetail: (rnNumber: string) => void;
}

export function ReceiveNoteIndex({
  records = initialReceiveNoteRecords,
  onAddNew,
  onViewDetail,
}: ReceiveNoteIndexProps) {
  const [localRecords, setLocalRecords] = useState<ReceiveNoteRecord[]>(records);

  useEffect(() => {
    setLocalRecords(records);
  }, [records]);

  // Sync with backend API on mount
  useEffect(() => {
    let isMounted = true;
    fetch("/api/warehouse/rn?per_page=100", { headers: { Accept: "application/json" } })
      .then((r) => r.json())
      .then((d) => {
        if (!isMounted) return;
        const apiRows = d?.rows || (Array.isArray(d?.data) ? d.data : d?.data?.data) || [];
        if (Array.isArray(apiRows) && apiRows.length > 0) {
          setLocalRecords((prev) => {
            const map = new Map<string, ReceiveNoteRecord>();
            // Add existing / initial records first
            prev.forEach((r) => map.set(r.rnNumber, r));
            // Merge / overwrite with API data
            apiRows.forEach((ar: any, idx: number) => {
              const rnNum = ar.rn_number || ar.rnNumber;
              if (!rnNum) return;
              const existing = map.get(rnNum);
              const mapped: ReceiveNoteRecord = {
                id: String(ar.id || existing?.id || `rn-api-${idx}`),
                no: existing?.no || idx + 1,
                rnNumber: rnNum,
                arrivalDate: ar.arrival_date ? ar.arrival_date.slice(0, 10) : (existing?.arrivalDate || "-"),
                poNumber: ar.items?.[0]?.po_number || existing?.poNumber || "—",
                date: ar.sj_date || existing?.date || "—",
                supplier: ar.supplier?.name || existing?.supplier || "—",
                facility: ar.facility || existing?.facility || "FASILITAS",
                bcCode: ar.bc_code || ar.bcCode || existing?.bcCode || "BC 4.0",
                ajuNumber: ar.aju_number || ar.ajuNumber || existing?.ajuNumber || "00004001456220261014004999",
                noDaftar: ar.no_daftar || ar.noDaftar || ar.no_pen || existing?.noDaftar || "090400",
                amount: ar.items?.reduce((sum: number, it: any) => sum + (Number(it.grand_total) || 0), 0) || existing?.amount || 0,
                amountFormatted: existing?.amountFormatted || "IDR 0.00",
                description: ar.note || ar.remark || ar.notes || existing?.description || existing?.remark || "—",
                note: ar.note || ar.remark || ar.notes || existing?.note || existing?.remark || "—",
                remark: ar.remark || ar.note || ar.notes || existing?.remark || existing?.note || "—",
                warehouseTransaction: ar.bpb_number || existing?.warehouseTransaction || "—",
                currency: "IDR",
                rate: 1.0,
                invoiceNumber: ar.invoice_number || ar.invoiceNumber || existing?.invoiceNumber || "—",
                invoiceDate: ar.invoice_date || ar.invoiceDate || existing?.invoiceDate || "—",
                taxInvoiceNumber: ar.tax_invoice || ar.taxInvoiceNumber || existing?.taxInvoiceNumber || "—",
                taxInvoiceDate: ar.tax_invoice_date || ar.taxInvoiceDate || existing?.taxInvoiceDate || "—",
                vehicleType: ar.vehicle_type || ar.vehicleType || existing?.vehicleType || "MOBIL BARANG",
                licensePlate: ar.license_plate || ar.licensePlate || existing?.licensePlate || "—",
                tanggalDaftar: ar.tanggal_daftar || ar.tanggalDaftar || (ar.arrival_date ? ar.arrival_date.slice(0, 10) : (existing?.tanggalDaftar || "—")),
                nomorPackingList: ar.pl_number || ar.nomorPackingList || ar.sj_number || existing?.nomorPackingList || "—",
                tanggalPackingList: ar.pl_date || ar.tanggalPackingList || ar.sj_date || existing?.tanggalPackingList || "—",
                status: ar.status || existing?.status || "Waiting for Approve 1",
                createdAt: existing?.createdAt || "-",
                lastUpdatedAt: existing?.lastUpdatedAt || "-",
                approval1At: ar.approval_1_at || existing?.approval1At,
                approval2At: ar.approval_2_at || existing?.approval2At,
                items: Array.isArray(ar.items) && ar.items.length > 0
                  ? ar.items.map((it: any, i: number) => ({
                    id: String(it.id || `item-${i}`),
                    no: i + 1,
                    poNumber: it.po_number || it.poNumber || "—",
                    itemCode: it.item_code || it.itemCode || "—",
                    itemName: it.item_name || it.itemName || "—",
                    qty: Number(it.gross_quantity ?? it.quantity ?? 0),
                    suratJalanQty: Number(it.gross_quantity ?? it.quantity ?? 0),
                    unit: it.unit || "PCE",
                    rafaksi: Number(it.rafaksi || 0),
                    rafaksiPercent: Number(it.rafaksiPercent || 0),
                    pricePerUnit: Number(it.price ?? it.pricePerUnit ?? 0),
                    priceSubtotal: Number(it.grand_total ?? ((it.price || 0) * (it.quantity || it.gross_quantity || 0))),
                    price2PerUnit: Number(it.price ?? it.price2PerUnit ?? 0),
                    price2Subtotal: Number(it.grand_total ?? ((it.price || 0) * (it.quantity || it.gross_quantity || 0))),
                    remark: it.remark || it.note || "-",
                    sjNumber: it.sj_number || ar.sj_number || "—",
                    sjDate: it.sj_date || ar.sj_date || "—",
                  }))
                  : (existing?.items || []),
                totalQty: existing?.totalQty || 0,
                biayaLain: existing?.biayaLain || 0,
                discountPercent: existing?.discountPercent || 0,
                discountAmount: existing?.discountAmount || 0,
                ppnPercent: existing?.ppnPercent || 0,
                ppnAmount: existing?.ppnAmount || 0,
                grandTotal: existing?.grandTotal || 0,
              };
              map.set(rnNum, mapped);
            });
            return Array.from(map.values());
          });
        }
      })
      .catch(() => { });

    return () => {
      isMounted = false;
    };
  }, []);

  // Search & Filter State
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("2026-10-14");
  const [endDate, setEndDate] = useState("2026-10-14");
  const [selectedSupplier, setSelectedSupplier] = useState("All Suppliers");
  const [selectedDocType, setSelectedDocType] = useState("All Type of Documents");
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortField, setSortField] = useState<ReceiveNoteSortField>("rnNumber");
  const [sortDirection, setSortDirection] = useState<SortDirection>("none");
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Column visibility configuration
  const [columns, setColumns] = useState<TableColumnOption[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("geniusone_rn_table_columns");
        if (saved) {
          const parsed = JSON.parse(saved);
          return DEFAULT_RN_COLUMNS.map((def) => {
            const match = parsed.find((p: any) => p.key === def.key);
            return match ? { ...def, visible: match.visible } : def;
          });
        }
      } catch (_) { }
    }
    return DEFAULT_RN_COLUMNS;
  });
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  const isColVisible = (key: string) => {
    const col = columns.find((c) => c.key === key);
    return col ? col.visible : true;
  };

  const handleToggleColumn = (key: string) => {
    setColumns((prev) => {
      const next = prev.map((c) => (c.key === key && !c.disabled ? { ...c, visible: !c.visible } : c));
      try {
        localStorage.setItem("geniusone_rn_table_columns", JSON.stringify(next));
      } catch (_) { }
      return next;
    });
  };

  const handleResetColumns = () => {
    setColumns(DEFAULT_RN_COLUMNS);
    try {
      localStorage.removeItem("geniusone_rn_table_columns");
    } catch (_) { }
  };

  // Filter records
  const filteredRecords = useMemo(() => {
    return localRecords.filter((rec) => {
      // Supplier filter
      if (
        selectedSupplier !== "All Suppliers" &&
        rec.supplier !== selectedSupplier
      ) {
        return false;
      }

      // Document Type / BC Code filter
      if (
        selectedDocType !== "All Type of Documents" &&
        rec.bcCode !== selectedDocType &&
        !rec.facility.toLowerCase().includes(selectedDocType.toLowerCase())
      ) {
        return false;
      }

      // General Search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matches =
          rec.rnNumber.toLowerCase().includes(q) ||
          rec.poNumber.toLowerCase().includes(q) ||
          rec.supplier.toLowerCase().includes(q) ||
          rec.facility.toLowerCase().includes(q) ||
          rec.bcCode.toLowerCase().includes(q) ||
          rec.ajuNumber.toLowerCase().includes(q) ||
          rec.noDaftar.toLowerCase().includes(q) ||
          rec.amountFormatted.toLowerCase().includes(q) ||
          (rec.description && rec.description.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [localRecords, selectedSupplier, selectedDocType, search]);

  // Sort records
  const sortedRecords = useMemo(() => {
    if (sortDirection === "none") return filteredRecords;

    const list = [...filteredRecords];
    list.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "rnNumber":
          aVal = a.rnNumber.toLowerCase();
          bVal = b.rnNumber.toLowerCase();
          break;
        case "poNumber":
          aVal = a.poNumber.toLowerCase();
          bVal = b.poNumber.toLowerCase();
          break;
        case "date":
          aVal = a.date;
          bVal = b.date;
          break;
        case "supplier":
          aVal = a.supplier.toLowerCase();
          bVal = b.supplier.toLowerCase();
          break;
        case "facility":
          aVal = a.facility.toLowerCase();
          bVal = b.facility.toLowerCase();
          break;
        case "ajuNumber":
          aVal = a.ajuNumber;
          bVal = b.ajuNumber;
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredRecords, sortField, sortDirection]);

  // Pagination calculations
  const totalRecords = sortedRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    const startIdx = (safeCurrentPage - 1) * pageSize;
    return sortedRecords.slice(startIdx, startIdx + pageSize);
  }, [sortedRecords, safeCurrentPage, pageSize]);

  const handleSort = (field: ReceiveNoteSortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") setSortDirection("none");
      else setSortDirection("asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const renderSortIndicator = (field: ReceiveNoteSortField) => {
    const isActive = sortField === field && sortDirection !== "none";
    return (
      <span
        style={{
          marginLeft: "6px",
          display: "inline-flex",
          alignItems: "center",
          color: isActive ? "var(--blue-600)" : "var(--muted-2)",
        }}
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

  // Export to genuine Excel (.xlsx) file
  const handleExportToExcel = () => {
    if (sortedRecords.length === 0) {
      setExportNotice("No records available to export.");
      setTimeout(() => setExportNotice(null), 3500);
      return;
    }

    try {
      const rows = [
        [
          "No",
          "RN Number",
          "Arrival Date",
          "PO Number",
          "Date",
          "Supplier",
          "Facility",
          "Code of BC",
          "Aju Number",
          "No. Daftar",
          "Amount",
          "Description",
          "Warehouse Transaction",
        ],
        ...sortedRecords.map((item, index) => [
          index + 1,
          item.rnNumber,
          item.arrivalDate,
          item.poNumber,
          item.date,
          item.supplier,
          item.facility,
          item.bcCode,
          item.ajuNumber,
          item.noDaftar,
          item.amount,
          item.description,
          item.warehouseTransaction,
        ]),
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 6 },  // No
        { wch: 26 }, // RN Number
        { wch: 14 }, // Arrival Date
        { wch: 16 }, // PO Number
        { wch: 12 }, // Date
        { wch: 32 }, // Supplier
        { wch: 14 }, // Facility
        { wch: 12 }, // BC Code
        { wch: 30 }, // Aju Number
        { wch: 14 }, // No Daftar
        { wch: 20 }, // Amount
        { wch: 16 }, // Description
        { wch: 22 }, // Warehouse Transaction
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Receive Notes");

      XLSX.writeFile(
        workbook,
        `Receive_Note_Export_${new Date().toISOString().slice(0, 10)}.xlsx`
      );

      setExportNotice(
        `Successfully exported ${sortedRecords.length} Receive Note record(s) to Excel.`
      );
      setTimeout(() => setExportNotice(null), 4000);
    } catch {
      setExportNotice("Failed to export records. Please try again.");
      setTimeout(() => setExportNotice(null), 3500);
    }
  };

  const startEntry = totalRecords === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endEntry = Math.min(safeCurrentPage * pageSize, totalRecords);

  return (
    <div className="rn-page">
      {/* Export Notice */}
      {exportNotice && (
        <div className="rn-alert rn-alert--info">
          <Icon name="check" size={15} />
          <div className="rn-alert__content">
            <p>{exportNotice}</p>
          </div>
          <button
            type="button"
            className="rn-alert-close"
            onClick={() => setExportNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Table Card */}
      <div className="rn-table-card">
        {/* Filter Area (Matching Screenshot 1) */}
        <div className="rn-filter-bar">
          {/* General Search */}
          <div className="rn-filter-item rn-filter-search">
            <label className="rn-filter-label">Search</label>
            <SearchField
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search"
            />
          </div>

          {/* Range Date */}
          <div className="rn-filter-item rn-filter-date-range">
            <label className="rn-filter-label">Range Date</label>
            <div className="rn-date-inputs">
              <CustomDatePicker
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  setCurrentPage(1);
                }}
              />
              <span className="rn-date-sep">-</span>
              <CustomDatePicker
                value={endDate}
                align="left"
                onChange={(val) => {
                  setEndDate(val);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>

          {/* Supplier Dropdown */}
          <div className="rn-filter-item rn-filter-supplier">
            <label className="rn-filter-label">Supplier</label>
            <CustomSelect
              className="rn-filter-select"
              value={selectedSupplier}
              onChange={(val) => {
                setSelectedSupplier(val);
                setCurrentPage(1);
              }}
              options={suppliersList}
            />
          </div>

          {/* Type of Document Dropdown */}
          <div className="rn-filter-item rn-filter-doctype">
            <label className="rn-filter-label">Type of Document</label>
            <CustomSelect
              className="rn-filter-select"
              value={selectedDocType}
              onChange={(val) => {
                setSelectedDocType(val);
                setCurrentPage(1);
              }}
              options={docTypesList}
            />
          </div>

          {/* Actions & Settings */}
          <div className="rn-filter-settings" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Button variant="primary" onClick={onAddNew}>
              Add New
            </Button>
            <Button
              variant="excel"
              onClick={handleExportToExcel}
              title="Export records to Excel (.xlsx)"
            >
              Export To Excel
            </Button>
            <div style={{ position: "relative", zIndex: 60 }}>
              <button
                type="button"
                className={`rn-btn-settings ${isColumnSettingsOpen ? "active" : ""}`}
                title="Table Column Settings"
                aria-label="Table settings"
                onClick={() => setIsColumnSettingsOpen((prev) => !prev)}
              >
                <Icon name="settings" size={16} />
                <Icon name="chevronDown" size={12} />
              </button>

              <TableColumnSettings
                isOpen={isColumnSettingsOpen}
                columns={columns}
                onToggleColumn={handleToggleColumn}
                onResetDefault={handleResetColumns}
                onClose={() => setIsColumnSettingsOpen(false)}
              />
            </div>
          </div>
        </div>

        {/* 11-Column Table Container */}
        <div className="rn-table-wrapper">
          <table className="rn-table">
            <thead>
              <tr>
                <th className="rn-th-no">No</th>
                {isColVisible("rnNumber") && (
                  <th
                    className="rn-th-sortable rn-th-rnNumber"
                    onClick={() => handleSort("rnNumber")}
                  >
                    <div className="rn-th-content">
                      <span>RN Number</span>
                      {renderSortIndicator("rnNumber")}
                    </div>
                  </th>
                )}
                {isColVisible("poNumber") && (
                  <th
                    className="rn-th-sortable rn-th-poNumber"
                    onClick={() => handleSort("poNumber")}
                  >
                    <div className="rn-th-content">
                      <span>PO Number</span>
                      {renderSortIndicator("poNumber")}
                    </div>
                  </th>
                )}
                {isColVisible("date") && (
                  <th
                    className="rn-th-sortable rn-th-date"
                    onClick={() => handleSort("date")}
                  >
                    <div className="rn-th-content">
                      <span>Date</span>
                      {renderSortIndicator("date")}
                    </div>
                  </th>
                )}
                {isColVisible("supplier") && (
                  <th
                    className="rn-th-sortable rn-th-supplier"
                    onClick={() => handleSort("supplier")}
                  >
                    <div className="rn-th-content">
                      <span>Supplier</span>
                      {renderSortIndicator("supplier")}
                    </div>
                  </th>
                )}
                {isColVisible("facility") && (
                  <th
                    className="rn-th-sortable rn-th-facility"
                    onClick={() => handleSort("facility")}
                  >
                    <div className="rn-th-content">
                      <span>Facility</span>
                      {renderSortIndicator("facility")}
                    </div>
                  </th>
                )}
                {isColVisible("ajuNumber") && (
                  <th
                    className="rn-th-sortable rn-th-ajuNumber"
                    onClick={() => handleSort("ajuNumber")}
                  >
                    <div className="rn-th-content">
                      <span>Aju Number/Registration Number</span>
                      {renderSortIndicator("ajuNumber")}
                    </div>
                  </th>
                )}
                {isColVisible("amount") && (
                  <th
                    className="rn-th-sortable rn-th-amount text-right"
                    onClick={() => handleSort("amount")}
                  >
                    <div className="rn-th-content justify-end">
                      <span>Amount</span>
                      {renderSortIndicator("amount")}
                    </div>
                  </th>
                )}
                {isColVisible("description") && <th className="rn-th-description">Description</th>}
                {isColVisible("warehouseTx") && <th className="rn-th-warehouseTx">Warehouse Transaction</th>}
                <th className="rn-th-option text-center">Option</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={2 + columns.filter((c) => c.visible).length} className="rn-table-empty">
                    No Receive Note records found.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((rn, idx) => {
                  const sequentialNumber = (safeCurrentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr
                      key={rn.id}
                      className="rn-clickable-row"
                      onClick={() => onViewDetail(rn.rnNumber)}
                      style={{ cursor: "pointer" }}
                      title={`Click row to view details of Receive Note ${rn.rnNumber}`}
                    >
                      <td className="rn-td-no text-center">{sequentialNumber}</td>
                      {isColVisible("rnNumber") && (
                        <td
                          className="rn-td-rnNumber"
                          title={`Open Receive Note ${rn.rnNumber}`}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              className="rn-link-number"
                              onClick={(e) => {
                                e.stopPropagation();
                                onViewDetail(rn.rnNumber);
                              }}
                              title={`Open Receive Note ${rn.rnNumber}`}
                            >
                              {rn.rnNumber}
                            </button>
                            <ApprovalStatusBadge
                              status={
                                getLocalApprovalState(
                                  "receive_note",
                                  rn.rnNumber,
                                  normalizeApprovalStatus(rn.status)
                                ).status
                              }
                              showIcon={false}
                            />
                          </div>
                          <div className="text-xs text-muted">
                            Arrival Date: {formatDisplayDate(rn.arrivalDate)}
                          </div>
                        </td>
                      )}
                      {isColVisible("poNumber") && (
                        <td className="rn-td-poNumber font-medium text-ink">{rn.poNumber}</td>
                      )}
                      {isColVisible("date") && (
                        <td className="rn-td-date">{formatDisplayDate(rn.date)}</td>
                      )}
                      {isColVisible("supplier") && (
                        <td className="rn-td-supplier font-medium">{rn.supplier}</td>
                      )}
                      {isColVisible("facility") && (
                        <td className="rn-td-facility">
                          <div className="rn-facility-cell">
                            <span className="rn-facility-title">{rn.facility}</span>
                            <span className="rn-badge-bc">{rn.bcCode}</span>
                          </div>
                        </td>
                      )}
                      {isColVisible("ajuNumber") && (
                        <td className="rn-td-ajuNumber">
                          <button
                            type="button"
                            className="rn-link-aju"
                            onClick={() => onViewDetail(rn.rnNumber)}
                            title="View document details"
                          >
                            {rn.ajuNumber}
                          </button>
                          <div className="text-xs text-muted">
                            No. Daftar: {rn.noDaftar}
                          </div>
                        </td>
                      )}
                      {isColVisible("amount") && (
                        <td className="rn-td-amount text-right font-mono font-medium text-ink">
                          {rn.amountFormatted}
                        </td>
                      )}
                      {isColVisible("description") && (
                        <td className="rn-td-description text-muted">{rn.description}</td>
                      )}
                      {isColVisible("warehouseTx") && (
                        <td className="rn-td-warehouseTx text-muted">{rn.warehouseTransaction}</td>
                      )}
                      <td className="rn-td-option text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="rn-btn-row-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(rn.rnNumber);
                          }}
                          title="View Detail Receive Note"
                          aria-label={`View detail for ${rn.rnNumber}`}
                        >
                          <Icon name="list" size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
  );
}

export default ReceiveNoteIndex;
