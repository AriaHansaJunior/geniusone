import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { initialReceiveNoteRecords } from "./receive-note-data";
import type { ReceiveNoteRecord } from "./receive-note-types";

interface ReceiveNoteDetailProps {
  code: string;
  onBack: () => void;
  record?: ReceiveNoteRecord;
}

export function ReceiveNoteDetail({
  code,
  onBack,
  record,
}: ReceiveNoteDetailProps) {
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  // Close print dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        printMenuRef.current &&
        !printMenuRef.current.contains(event.target as Node)
      ) {
        setPrintMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Find record by code/id/rnNumber
  const rnData =
    record ||
    initialReceiveNoteRecords.find(
      (r) =>
        r.id === code ||
        r.rnNumber === code ||
        r.rnNumber.replace(/[\/\\]/g, "-") === code
    ) ||
    initialReceiveNoteRecords[0];

  const handlePrint = (mode: "job" | "po") => {
    setPrintMenuOpen(false);
    window.print();
  };

  return (
    <div className="rn-detail-page">
      {/* Page Title */}
      <div className="rn-detail-header">
        <h1 className="rn-detail-title">
          Detail Receive Note - {rnData.rnNumber}
        </h1>
      </div>

      {/* Main Content Card */}
      <div className="rn-detail-card">
        {/* Status Badge in Upper Portion */}
        <div className="rn-detail-status-bar">
          <span className="rn-status-badge">
            <Icon name="check" size={14} />
            <span>{rnData.status}</span>
          </span>
        </div>

        {/* 3-Column Document Information */}
        <div className="rn-detail-meta-grid">
          {/* Column 1 */}
          <div className="rn-meta-col">
            <div className="rn-meta-item">
              <span className="rn-meta-label">RN Number</span>
              <span className="rn-meta-value font-medium text-ink">
                {rnData.rnNumber}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Arrival Date</span>
              <span className="rn-meta-value">{rnData.arrivalDate}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Supplier</span>
              <span className="rn-meta-value font-medium text-ink">
                {rnData.supplier}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Facility of Document</span>
              <span className="rn-meta-value">
                <span className="rn-badge-facility">{rnData.facility}</span>
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Code of BC Document</span>
              <span className="rn-meta-value font-medium">{rnData.bcCode}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Currency</span>
              <span className="rn-meta-value">{rnData.currency}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Rate</span>
              <span className="rn-meta-value font-mono">
                {rnData.rate.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Column 2 */}
          <div className="rn-meta-col">
            <div className="rn-meta-item">
              <span className="rn-meta-label">Invoice Number</span>
              <span className="rn-meta-value">{rnData.invoiceNumber}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Invoice Date</span>
              <span className="rn-meta-value">{rnData.invoiceDate}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tax Invoice Number</span>
              <span className="rn-meta-value">{rnData.taxInvoiceNumber}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tax Invoice Date</span>
              <span className="rn-meta-value">{rnData.taxInvoiceDate}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Vehicle Type</span>
              <span className="rn-meta-value">{rnData.vehicleType}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">License Plate</span>
              <span className="rn-meta-value font-mono font-medium">
                {rnData.licensePlate}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Nomor Aju</span>
              <span className="rn-meta-value">
                <span className="rn-link-code font-mono">
                  {rnData.ajuNumber}
                </span>
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Nomor Daftar</span>
              <span className="rn-meta-value font-mono">{rnData.noDaftar}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tanggal Daftar</span>
              <span className="rn-meta-value">{rnData.tanggalDaftar}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Nomor Packing List</span>
              <span className="rn-meta-value font-mono">
                {rnData.nomorPackingList}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tanggal Packing List</span>
              <span className="rn-meta-value">{rnData.tanggalPackingList}</span>
            </div>
          </div>

          {/* Column 3 */}
          <div className="rn-meta-col">
            <div className="rn-meta-item">
              <span className="rn-meta-label">Created at</span>
              <span className="rn-meta-value">{rnData.createdAt}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Last Updated at</span>
              <span className="rn-meta-value">{rnData.lastUpdatedAt}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Approval 1 at</span>
              <span className="rn-meta-value">{rnData.approval1At}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Approval 2 at</span>
              <span className="rn-meta-value">{rnData.approval2At}</span>
            </div>
          </div>
        </div>

        {/* Grouped Detail Item Table */}
        <div className="rn-detail-table-wrapper">
          <table className="rn-detail-table">
            <thead>
              <tr>
                <th rowSpan={2} className="rn-detail-th-no">
                  No.
                </th>
                <th rowSpan={2}>PO Number</th>
                <th rowSpan={2}>DN Number</th>
                <th rowSpan={2}>Job Number</th>
                <th rowSpan={2}>Item Name</th>
                <th rowSpan={2} className="text-right">
                  QTY
                </th>
                <th rowSpan={2} className="text-right">
                  Rafaksi
                </th>
                <th colSpan={2} className="text-center rn-detail-th-grouped">
                  Price (IDR)
                </th>
                <th colSpan={2} className="text-center rn-detail-th-grouped">
                  Price (IDR)
                </th>
                <th rowSpan={2}>Remark</th>
              </tr>
              <tr>
                <th className="rn-detail-th-sub text-right">@</th>
                <th className="rn-detail-th-sub text-right">Subtotal</th>
                <th className="rn-detail-th-sub text-right">@</th>
                <th className="rn-detail-th-sub text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rnData.items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="rn-table-empty">
                    No items in this Receive Note.
                  </td>
                </tr>
              ) : (
                rnData.items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="text-center font-medium">{idx + 1}</td>
                    <td>
                      <div className="font-medium text-ink">{it.poNumber}</div>
                      <div className="text-xs text-muted">
                        Date: {it.poDate || rnData.date}
                      </div>
                    </td>
                    <td>
                      <div>{it.dnNumber || "-"}</div>
                      <div className="text-xs text-muted">
                        Date: {it.dnDate || "-"}
                      </div>
                    </td>
                    <td>
                      <div>{it.jobNumber || "-"}</div>
                      <div className="text-xs text-muted">
                        Date: {it.jobDate || "-"}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-ink">{it.itemName}</div>
                      <div className="text-xs text-muted font-mono">
                        {it.itemCode}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium">
                        {it.qty.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted font-medium">
                        {it.unit}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono">
                        {it.rafaksi.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        {it.rafaksiPercent.toFixed(2)}%
                      </div>
                    </td>
                    {/* First Price Section */}
                    <td className="text-right">
                      <div className="font-mono">
                        {it.pricePerUnit.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium text-ink">
                        {it.priceSubtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    {/* Second Price Section */}
                    <td className="text-right">
                      <div className="font-mono">
                        {it.price2PerUnit.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium text-ink">
                        {it.price2Subtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    <td>{it.remark || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {/* TOTAL Row */}
              <tr className="rn-summary-row rn-summary-row--total">
                <td colSpan={5} className="text-right font-bold text-ink">
                  TOTAL
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnData.totalQty.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}
                </td>
                <td></td>
                {/* First Section Total */}
                <td className="text-right font-mono font-bold">
                  {rnData.items.length > 0
                    ? rnData.items[0].pricePerUnit.toLocaleString("en-US", {
                        minimumFractionDigits: 4,
                      })
                    : "0.0000"}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td className="text-right font-mono font-bold">
                  {rnData.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                {/* Second Section Total */}
                <td className="text-right font-mono font-bold">
                  {rnData.items.length > 0
                    ? rnData.items[0].price2PerUnit.toLocaleString("en-US", {
                        minimumFractionDigits: 4,
                      })
                    : "0.0000"}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td className="text-right font-mono font-bold">
                  {rnData.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* Biaya Lain */}
              <tr className="rn-summary-row">
                <td colSpan={10} className="text-right font-medium text-ink">
                  Biaya Lain
                </td>
                <td className="text-right font-mono">
                  {rnData.biayaLain.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* Discount */}
              <tr className="rn-summary-row">
                <td colSpan={10} className="text-right font-medium text-ink">
                  Discount({rnData.discountPercent.toFixed(2)}%)
                </td>
                <td className="text-right font-mono">
                  {rnData.discountAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* PPN */}
              <tr className="rn-summary-row">
                <td colSpan={10} className="text-right font-medium text-ink">
                  PPN({rnData.ppnPercent.toFixed(0)}%)
                </td>
                <td className="text-right font-mono">
                  {rnData.ppnAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* Grand Total */}
              <tr className="rn-summary-row rn-summary-row--grand">
                <td colSpan={10} className="text-right font-bold text-ink">
                  Grand Total
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnData.grandTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Actions: Print Dropdown and Back Button */}
        <div className="rn-detail-actions">
          <div className="rn-print-dropdown-container" ref={printMenuRef}>
            <button
              type="button"
              className="rn-btn-print"
              onClick={() => setPrintMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={printMenuOpen}
            >
              <span>Print ▾</span>
            </button>

            {printMenuOpen && (
              <div className="rn-print-menu" role="menu">
                <button
                  type="button"
                  className="rn-print-menu-item"
                  role="menuitem"
                  onClick={() => handlePrint("job")}
                >
                  Detail Per Job
                </button>
                <button
                  type="button"
                  className="rn-print-menu-item"
                  role="menuitem"
                  onClick={() => handlePrint("po")}
                >
                  Group by PO Number
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            className="rn-btn-back"
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

export default ReceiveNoteDetail;
