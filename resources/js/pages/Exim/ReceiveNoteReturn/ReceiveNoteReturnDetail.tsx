import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { initialReceiveNoteReturnRecords } from "./receive-note-return-data";
import type { ReceiveNoteReturnRecord } from "./receive-note-return-types";

interface ReceiveNoteReturnDetailProps {
  code: string;
  onBack: () => void;
  record?: ReceiveNoteReturnRecord;
}

export function ReceiveNoteReturnDetail({
  code,
  onBack,
  record,
}: ReceiveNoteReturnDetailProps) {
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  // Close print menu on click outside
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
  const rnrData =
    record ||
    initialReceiveNoteReturnRecords.find(
      (r) =>
        r.id === code ||
        r.rnNumber === code ||
        r.rnNumber.replace(/[\/\\]/g, "-") === code
    ) ||
    initialReceiveNoteReturnRecords[0];

  const handlePrint = (mode: "job" | "po") => {
    setPrintMenuOpen(false);
    window.print();
  };

  return (
    <div className="rnr-detail-page">
      {/* Page Title */}
      <div className="rnr-detail-header">
        <h1 className="rnr-detail-title">
          Detail Receive Note - {rnrData.rnNumber}
        </h1>
      </div>

      {/* Main Content Card */}
      <div className="rnr-detail-card">
        {/* Status Badge in Upper Portion */}
        <div className="rnr-detail-status-bar">
          <span className="rnr-status-badge">
            <Icon name="check" size={14} />
            <span>{rnrData.approvalStatus}</span>
          </span>
        </div>

        {/* 3-Column Document Information */}
        <div className="rnr-detail-meta-grid">
          {/* Column 1 */}
          <div className="rnr-meta-col">
            <div className="rnr-meta-item">
              <span className="rnr-meta-label">RN Number</span>
              <span className="rnr-meta-value font-medium text-ink">
                {rnrData.rnNumber}
              </span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Arrival Date</span>
              <span className="rnr-meta-value">{rnrData.arrivalDate}</span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Customer</span>
              <span className="rnr-meta-value font-medium text-ink">
                {rnrData.customer}
              </span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Type of Return</span>
              <span className="rnr-meta-value">{rnrData.typeOfReturn}</span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Sales Delivery Number</span>
              <span className="rnr-meta-value">
                <div className="font-medium text-ink">
                  {rnrData.salesDeliveryNumber}
                </div>
                {rnrData.salesDeliveryLine && (
                  <div className="text-xs text-muted">
                    {rnrData.salesDeliveryLine}
                  </div>
                )}
              </span>
            </div>
          </div>

          {/* Column 2 */}
          <div className="rnr-meta-col">
            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Vehicle Type</span>
              <span className="rnr-meta-value">{rnrData.vehicleType}</span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">License Plate</span>
              <span className="rnr-meta-value font-mono font-medium">
                {rnrData.licensePlate}
              </span>
            </div>
          </div>

          {/* Column 3 */}
          <div className="rnr-meta-col">
            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Created at</span>
              <span className="rnr-meta-value">{rnrData.createdAt}</span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Last Updated at</span>
              <span className="rnr-meta-value">{rnrData.lastUpdatedAt}</span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Released at</span>
              <span className="rnr-meta-value">{rnrData.releasedAt}</span>
            </div>

            <div className="rnr-meta-item">
              <span className="rnr-meta-label">Approved at</span>
              <span className="rnr-meta-value">{rnrData.approvedAt}</span>
            </div>
          </div>
        </div>

        {/* Return Item Table */}
        <div className="rnr-detail-table-wrapper">
          <table className="rnr-detail-table">
            <thead>
              <tr>
                <th className="rnr-detail-th-no">No.</th>
                <th>DO Number</th>
                <th>Item Name</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Qty Package</th>
                <th className="text-right">Price</th>
                <th className="text-right">Subtotal</th>
                <th className="text-right">Subtotal (IDR)</th>
              </tr>
            </thead>
            <tbody>
              {rnrData.items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="rnr-table-empty">
                    No items in this Receive Note Return.
                  </td>
                </tr>
              ) : (
                rnrData.items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="text-center font-medium">{idx + 1}</td>
                    <td>
                      <div className="font-medium text-ink">{it.doNumber}</div>
                      <div className="text-xs text-muted">
                        Date: {it.doDate || "-"}
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
                        {it.quantity.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted font-medium">
                        {it.unit}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium">{it.qtyPackage}</div>
                      <div className="text-xs text-muted">{it.packageType}</div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono">
                        {it.price.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    <td className="text-right font-mono font-medium text-ink">
                      {it.subtotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium text-ink">
                        {it.subtotalIdr.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {/* Total Summary Row */}
              <tr className="rnr-summary-row rnr-summary-row--total">
                <td colSpan={6} className="text-right font-bold text-ink">
                  Total
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnrData.totalSubtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnrData.totalSubtotal.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}
                </td>
              </tr>

              {/* Grand Total Row */}
              <tr className="rnr-summary-row rnr-summary-row--grand">
                <td colSpan={6} className="text-right font-bold text-ink">
                  Grand Total
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnrData.grandTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnrData.grandTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Actions: Print Dropdown and Back Button */}
        <div className="rnr-detail-actions">
          <div className="rnr-print-dropdown-container" ref={printMenuRef}>
            <button
              type="button"
              className="rnr-btn-print"
              onClick={() => setPrintMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={printMenuOpen}
            >
              <span>Print ▾</span>
            </button>

            {printMenuOpen && (
              <div className="rnr-print-menu" role="menu">
                <button
                  type="button"
                  className="rnr-print-menu-item"
                  role="menuitem"
                  onClick={() => handlePrint("job")}
                >
                  Detail Per Job
                </button>
                <button
                  type="button"
                  className="rnr-print-menu-item"
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
            className="rnr-btn-back"
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

export default ReceiveNoteReturnDetail;
