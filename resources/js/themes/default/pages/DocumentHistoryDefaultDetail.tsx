import React, { useState, useRef, useEffect } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { ExpandedHistoryTable } from "../../../pages/Exim/DocumentHistory/ExpandedHistoryTable";
import type { DocumentHistoryRecord } from "../../../pages/Exim/DocumentHistory/document-history-types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface DocumentHistoryDefaultDetailProps {
  dhData: DocumentHistoryRecord;
  expandedRowIds: Set<string>;
  onToggleHistory: (itemId: string) => void;
  notice: { type: "info" | "success" | "warning"; message: string } | null;
  onDismissNotice: () => void;
  onSelectGenerateOption: (option: string) => void;
  onExportToExcel: () => void;
  onBack: () => void;
}

export function DocumentHistoryDefaultDetail({
  dhData,
  expandedRowIds,
  onToggleHistory,
  notice,
  onDismissNotice,
  onSelectGenerateOption,
  onExportToExcel,
  onBack,
}: DocumentHistoryDefaultDetailProps) {
  const [generateMenuOpen, setGenerateMenuOpen] = useState(false);
  const generateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (generateMenuRef.current && !generateMenuRef.current.contains(event.target as Node)) {
        setGenerateMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const columns: SmartOneField[][] = [
    [
      { label: "Transaction No.", value: <strong>{dhData.transactionNumber}</strong> },
      { label: "Invoice Alias", value: dhData.invoiceAlias },
      { label: "Invoice Date", value: dhData.invoiceDate },
      { label: "Type of Mutation", value: dhData.mutationType },
      { label: "Customer", value: dhData.customer },
    ],
    [
      { label: "Destination", value: dhData.destination },
      { label: "BL Number", value: dhData.blNumber },
      { label: "Currency", value: dhData.currency },
      { label: "Created at", value: dhData.createdAt },
      { label: "Last Updated at", value: dhData.lastUpdatedAt },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle={`Detail Document History — ${dhData.invoiceNumber}`}
      onBack={onBack}
      topBanner={
        notice ? (
          <div className={`smartone-notice-banner smartone-notice-banner--${notice.type}`}>
            <span>{notice.message}</span>
            <button
              type="button"
              className="smartone-close-btn"
              onClick={onDismissNotice}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : undefined
      }
      toolbarLeft={
        <>
          <div className="smartone-dropdown-anchor" ref={generateMenuRef}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setGenerateMenuOpen((prev) => !prev)}
            >
              Generate History
            </Button>
            {generateMenuOpen && (
              <div className="smartone-dropdown-menu" role="menu">
                <button
                  type="button"
                  className="smartone-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setGenerateMenuOpen(false);
                    onSelectGenerateOption("Based BoM");
                  }}
                >
                  Based BoM
                </button>
                <button
                  type="button"
                  className="smartone-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setGenerateMenuOpen(false);
                    onSelectGenerateOption("Based Production Out");
                  }}
                >
                  Based Production Out
                </button>
                <button
                  type="button"
                  className="smartone-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    setGenerateMenuOpen(false);
                    onSelectGenerateOption("Based Lot Number");
                  }}
                >
                  Based Lot Number
                </button>
              </div>
            )}
          </div>
          <Button type="button" variant="excel" size="sm" onClick={onExportToExcel}>
            Export To Excel
          </Button>
        </>
      }
      columns={columns}
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">
              Document History Items ({dhData.items.length})
            </h2>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="dh-detail-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="dh-detail-th-no">No.</th>
                    <th rowSpan={2}>SO Number</th>
                    <th rowSpan={2}>PL Number</th>
                    <th rowSpan={2}>Item Product</th>
                    <th rowSpan={2} className="smartone-td-right">Nett Weight (KGM)</th>
                    <th rowSpan={2} className="smartone-td-right">Gross Weight (KGM)</th>
                    <th rowSpan={2} className="smartone-td-center">Pack</th>
                    <th rowSpan={2} className="smartone-td-right">Quantity</th>
                    <th colSpan={2} className="smartone-td-center dh-detail-th-grouped">Price</th>
                    <th rowSpan={2} className="smartone-td-center dh-detail-th-history">History</th>
                  </tr>
                  <tr>
                    <th className="dh-detail-th-sub smartone-td-right">@</th>
                    <th className="dh-detail-th-sub smartone-td-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {dhData.items.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="smartone-empty-cell">
                        No items in this document history record.
                      </td>
                    </tr>
                  ) : (
                    dhData.items.map((it, idx) => {
                      const isExpanded = expandedRowIds.has(it.id);
                      return (
                        <React.Fragment key={it.id || idx}>
                          <tr className={isExpanded ? "dh-row--expanded" : ""}>
                            <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                            <td>
                              <span className="dh-link-code">{it.soNumber}</span>
                              <span className="smartone-td-sub">Date: {it.soDate}</span>
                            </td>
                            <td>
                              <span className="dh-link-code">{it.plNumber}</span>
                              <span className="smartone-td-sub">Date: {it.plDate}</span>
                            </td>
                            <td>
                              <span className="smartone-td-bold">{it.itemProduct}</span>
                              <span className="smartone-td-sub smartone-td-mono">{it.itemCode}</span>
                            </td>
                            <td className="smartone-td-right smartone-td-mono">
                              {it.nettWeight.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="smartone-td-right smartone-td-mono">
                              {it.grossWeight.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="smartone-td-center">
                              <span className="smartone-td-mono">{it.pack}</span>
                              <span className="smartone-td-sub">{it.packUnit}</span>
                            </td>
                            <td className="smartone-td-right smartone-td-mono">
                              {it.quantity.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{" "}
                              <span className="smartone-td-muted">{it.unit}</span>
                            </td>
                            <td className="smartone-td-right smartone-td-mono">
                              {it.unitPrice.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                              {it.subtotal.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                            <td className="smartone-td-center">
                              <Button
                                type="button"
                                variant={isExpanded ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => onToggleHistory(it.id)}
                              >
                                {isExpanded ? "Hide" : "Show"}
                              </Button>
                            </td>
                          </tr>
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
                  <tr className="dh-table-total-row">
                    <td colSpan={8} className="smartone-td-right smartone-td-bold">
                      TOTAL
                    </td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      {dhData.currency}{" "}
                      {dhData.totalUnitPrice.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      {dhData.currency}{" "}
                      {dhData.totalSubtotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      }
    />
  );
}
