import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { ExpandedHistoryTable } from "./ExpandedHistoryTable";
import { initialDocumentHistoryRecords } from "./document-history-data";
import type { DocumentHistoryRecord } from "./document-history-types";

interface DocumentHistoryDetailProps {
  code: string;
  onBack: () => void;
  record?: DocumentHistoryRecord;
}

export function DocumentHistoryDetail({
  code,
  onBack,
  record,
}: DocumentHistoryDetailProps) {
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<{
    type: "info" | "success" | "warning";
    message: string;
  } | null>(null);

  const generateMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        generateMenuRef.current &&
        !generateMenuRef.current.contains(event.target as Node)
      ) {
        setGenerateMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Find record by code/id/invoiceNumber
  const dhData =
    record ||
    initialDocumentHistoryRecords.find(
      (r) =>
        r.id === code ||
        r.invoiceNumber === code ||
        r.invoiceNumber.replace(/[\/\\]/g, "-") === code
    ) ||
    initialDocumentHistoryRecords[0];

  // Toggle independent row history
  const handleToggleHistory = (itemId: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Generate History dropdown selection
  const handleSelectGenerateOption = (option: string) => {
    setGenerateMenuOpen(false);
    setNotice({
      type: "info",
      message: `Selected generation mode: "${option}". (Frontend demonstration mode — not connected to backend processing)`,
    });
    setTimeout(() => setNotice(null), 4500);
  };

  // Export detail data to genuine Excel (.xlsx) file
  const handleExportToExcel = () => {
    try {
      const rows: (string | number)[][] = [
        ["DOCUMENT HISTORY DETAIL", dhData.invoiceNumber],
        ["Transaction Number", dhData.transactionNumber],
        ["Invoice Date", dhData.invoiceDate],
        ["Customer", dhData.customer],
        ["Type of Mutation", dhData.mutationType],
        ["Destination", dhData.destination],
        ["Currency", dhData.currency],
        ["Created At", dhData.createdAt],
        ["Last Updated At", dhData.lastUpdatedAt],
        [],
        [
          "No.",
          "SO Number",
          "SO Date",
          "PL Number",
          "PL Date",
          "Item Product",
          "Item Code",
          "Nett Weight (KGM)",
          "Gross Weight (KGM)",
          "Pack",
          "Pack Unit",
          "Quantity",
          "Unit",
          "Unit Price",
          "Subtotal",
          "Currency",
        ],
        ...dhData.items.map((it) => [
          it.no,
          it.soNumber,
          it.soDate,
          it.plNumber,
          it.plDate,
          it.itemProduct,
          it.itemCode,
          it.nettWeight,
          it.grossWeight,
          it.pack,
          it.packUnit,
          it.quantity,
          it.unit,
          it.unitPrice,
          it.subtotal,
          it.currency,
        ]),
        [],
        ["TOTAL", "", "", "", "", "", "", "", "", "", "", "", "", dhData.totalUnitPrice, dhData.totalSubtotal, dhData.currency],
      ];

      // Append expanded history records if any exist
      dhData.items.forEach((it) => {
        if (it.history && it.history.length > 0) {
          rows.push([]);
          rows.push([`ITEM HISTORY FOR: ${it.itemProduct} (${it.itemCode})`]);
          rows.push([
            "Item Name",
            "Item Code",
            "Production Number",
            "SPK Number",
            "Submission No.",
            "Submission Date",
            "Registration No.",
            "Registration Date",
            "Document Type",
            "Item Series",
            "Qty",
            "Netto",
          ]);
          it.history.forEach((h) => {
            rows.push([
              h.namaBarang,
              h.itemCode,
              h.productionNumber,
              h.spkNumber,
              h.nomorAju,
              h.nomorAjuDate,
              h.nomorDaftar,
              h.nomorDaftarDate,
              h.jenisDokumen,
              h.seriBarang,
              h.qtyFormatted,
              h.nettoFormatted,
            ]);
          });
        }
      });

      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Document History");

      const safeInvoiceSlug = dhData.invoiceNumber.replace(/[\/\\]/g, "_");
      XLSX.writeFile(
        workbook,
        `Document_History_${safeInvoiceSlug}.xlsx`
      );

      setNotice({
        type: "success",
        message: `Successfully exported Detail Document History to Excel (.xlsx).`,
      });
      setTimeout(() => setNotice(null), 4000);
    } catch {
      setNotice({
        type: "warning",
        message: "Failed to export Excel file. Please try again.",
      });
      setTimeout(() => setNotice(null), 3500);
    }
  };

  return (
    <div className="dh-detail-page">
      {/* Page Title */}
      <div className="dh-detail-header">
        <h1 className="dh-detail-title">
          Detail Document History {dhData.invoiceNumber}
        </h1>
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className={`dh-alert dh-alert--${notice.type}`}>
          <Icon
            name={
              notice.type === "info"
                ? "info"
                : notice.type === "success"
                ? "check"
                : "alertTriangle"
            }
            size={16}
          />
          <div className="dh-alert__content">
            <p>{notice.message}</p>
          </div>
          <button
            type="button"
            className="dh-alert-close"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Main Content Card */}
      <div className="dh-detail-card">
        {/* Two-Column Document Information */}
        <div className="dh-detail-meta-grid">
          {/* Left Column */}
          <div className="dh-meta-col">
            <div className="dh-meta-item">
              <span className="dh-meta-label">Transaction Number</span>
              <span className="dh-meta-value font-medium text-ink">
                {dhData.transactionNumber}
              </span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">Invoice Alias</span>
              <span className="dh-meta-value font-medium text-ink">
                {dhData.invoiceAlias}
              </span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">Invoice Date</span>
              <span className="dh-meta-value">{dhData.invoiceDate}</span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">Type of Mutation</span>
              <span className="dh-meta-value font-medium">
                {dhData.mutationType}
              </span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">Customer</span>
              <span className="dh-meta-value font-medium text-ink">
                {dhData.customer}
              </span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">Destination</span>
              <span className="dh-meta-value">{dhData.destination}</span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">BL Number</span>
              <span className="dh-meta-value">{dhData.blNumber}</span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">Currency</span>
              <span className="dh-meta-value">{dhData.currency}</span>
            </div>
          </div>

          {/* Right Column */}
          <div className="dh-meta-col">
            <div className="dh-meta-item">
              <span className="dh-meta-label">Created at</span>
              <span className="dh-meta-value">{dhData.createdAt}</span>
            </div>

            <div className="dh-meta-item">
              <span className="dh-meta-label">Last Updated at</span>
              <span className="dh-meta-value">{dhData.lastUpdatedAt}</span>
            </div>
          </div>
        </div>

        {/* Main Item Table */}
        <div className="dh-detail-table-wrapper">
          <table className="dh-detail-table">
            <thead>
              <tr>
                <th rowSpan={2} className="dh-detail-th-no">
                  No.
                </th>
                <th rowSpan={2}>SO Number</th>
                <th rowSpan={2}>PL Number</th>
                <th rowSpan={2}>Item Product</th>
                <th rowSpan={2} className="text-right">
                  Nett Weight (KGM)
                </th>
                <th rowSpan={2} className="text-right">
                  Gross Weight (KGM)
                </th>
                <th rowSpan={2} className="text-center">
                  Pack
                </th>
                <th rowSpan={2} className="text-right">
                  Quantity
                </th>
                <th colSpan={2} className="text-center dh-detail-th-grouped">
                  Price
                </th>
                <th rowSpan={2} className="text-center dh-detail-th-history">
                  History
                </th>
              </tr>
              <tr>
                <th className="dh-detail-th-sub text-right">@</th>
                <th className="dh-detail-th-sub text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {dhData.items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="dh-table-empty">
                    No items in this document history record.
                  </td>
                </tr>
              ) : (
                dhData.items.map((it, idx) => {
                  const isExpanded = expandedRowIds.has(it.id);
                  return (
                    <React.Fragment key={it.id || idx}>
                      <tr className={isExpanded ? "dh-row--expanded" : ""}>
                        <td className="text-center font-medium">{idx + 1}</td>
                        <td>
                          <span className="dh-link-code">{it.soNumber}</span>
                          <div className="text-xs text-muted">
                            Date : {it.soDate}
                          </div>
                        </td>
                        <td>
                          <span className="dh-link-code">{it.plNumber}</span>
                          <div className="text-xs text-muted">
                            Date : {it.plDate}
                          </div>
                        </td>
                        <td>
                          <div className="font-medium text-ink">
                            {it.itemProduct}
                          </div>
                          <div className="text-xs text-muted font-mono">
                            {it.itemCode}
                          </div>
                        </td>
                        <td className="text-right font-mono">
                          {it.nettWeight.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-right font-mono">
                          {it.grossWeight.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="text-center">
                          <div className="font-mono">{it.pack}</div>
                          <div className="text-xs text-muted">{it.packUnit}</div>
                        </td>
                        <td className="text-right">
                          <div className="font-mono font-medium">
                            {it.quantity.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted">{it.unit}</div>
                        </td>
                        <td className="text-right">
                          <div className="font-mono">
                            {it.unitPrice.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted">
                            {it.currency}
                          </div>
                        </td>
                        <td className="text-right">
                          <div className="font-mono font-medium text-ink">
                            {it.subtotal.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          <div className="text-xs text-muted">
                            {it.currency}
                          </div>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className={`dh-btn-history-toggle ${
                              isExpanded ? "dh-btn-history-toggle--hide" : ""
                            }`}
                            onClick={() => handleToggleHistory(it.id)}
                            title={isExpanded ? "Hide history" : "Show history"}
                          >
                            <span>{isExpanded ? "Hide" : "Show"}</span>
                          </button>
                        </td>
                      </tr>

                      {/* Expandable nested history row */}
                      {isExpanded && (
                        <tr className="dh-expanded-row">
                          <td colSpan={11} className="dh-expanded-cell">
                            <ExpandedHistoryTable history={it.history} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            <tfoot>
              {/* Total Summary Row */}
              <tr className="dh-table-total-row">
                <td colSpan={8} className="text-right font-bold text-ink">
                  TOTAL
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {dhData.currency}{" "}
                  {dhData.totalUnitPrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {dhData.currency}{" "}
                  {dhData.totalSubtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Actions: Generate History Dropdown, Export To Excel, and Back Button */}
        <div className="dh-detail-actions">
          <div className="dh-generate-dropdown-container" ref={generateMenuRef}>
            <button
              type="button"
              className="dh-btn-generate"
              onClick={() => setGenerateMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={generateMenuOpen}
            >
              <span>Generate History ▾</span>
            </button>

            {generateMenuOpen && (
              <div className="dh-generate-menu" role="menu">
                <button
                  type="button"
                  className="dh-generate-menu-item"
                  role="menuitem"
                  onClick={() => handleSelectGenerateOption("Based BoM")}
                >
                  Based BoM
                </button>
                <button
                  type="button"
                  className="dh-generate-menu-item"
                  role="menuitem"
                  onClick={() =>
                    handleSelectGenerateOption("Based Production Out")
                  }
                >
                  Based Production Out
                </button>
                <button
                  type="button"
                  className="dh-generate-menu-item"
                  role="menuitem"
                  onClick={() =>
                    handleSelectGenerateOption("Based Lot Number")
                  }
                >
                  Based Lot Number
                </button>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            icon="download"
            onClick={handleExportToExcel}
            title="Export Document History to Excel (.xlsx)"
          >
            Export To Excel
          </Button>

          <button
            type="button"
            className="dh-btn-back"
            onClick={onBack}
            aria-label="Back to listing"
          >
            <span>Back</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DocumentHistoryDetail;
