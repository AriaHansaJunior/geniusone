import React, { useState, useRef, useEffect } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import type { DocumentApprovalState } from "../../../types/approval";
import type { ReceiveNoteReturnRecord } from "../../../pages/Exim/ReceiveNoteReturn/receive-note-return-types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface ReceiveNoteReturnDefaultDetailProps {
  rnrData: ReceiveNoteReturnRecord;
  isApproved: boolean;
  approvalState: DocumentApprovalState;
  setApprovalState: React.Dispatch<React.SetStateAction<DocumentApprovalState>>;
  onBack: () => void;
  onPrint: (mode: "job" | "po") => void;
}

export function ReceiveNoteReturnDefaultDetail({
  rnrData,
  isApproved,
  approvalState,
  setApprovalState,
  onBack,
  onPrint,
}: ReceiveNoteReturnDefaultDetailProps) {
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (printMenuRef.current && !printMenuRef.current.contains(event.target as Node)) {
        setPrintMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const columns: SmartOneField[][] = [
    [
      { label: "RN Number", value: <strong>{rnrData.rnNumber}</strong> },
      { label: "Arrival Date", value: rnrData.arrivalDate },
      { label: "Customer", value: rnrData.customer },
      { label: "Type of Return", value: rnrData.typeOfReturn },
      { label: "Sales Delivery No.", value: rnrData.salesDeliveryNumber || "-" },
    ],
    [
      { label: "Vehicle Type", value: rnrData.vehicleType },
      { label: "License Plate", value: rnrData.licensePlate },
      { label: "Facility", value: rnrData.facility },
      { label: "BC Code", value: rnrData.bcCode },
      { label: "No. Aju", value: rnrData.ajuNumber },
    ],
    [
      { label: "Created at", value: rnrData.createdAt },
      { label: "Last Updated at", value: rnrData.lastUpdatedAt },
      { label: "Released at", value: rnrData.releasedAt },
      { label: "Approved at", value: rnrData.approvedAt },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle={`Detail Receive Note Return — ${rnrData.rnNumber}`}
      onBack={onBack}
      toolbarLeft={
        <>
          <ApprovalStatusBadge status={approvalState.status} />
          {isApproved && <Badge tone="green">Locked</Badge>}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onPrint("po")}
          >
            Print Document
          </Button>
        </>
      }
      approvalSection={
        <>
          <ApprovalActionBar
            module="receive_note_return"
            documentId={rnrData.rnNumber}
            documentNumber={rnrData.rnNumber}
            state={approvalState}
            onStateChange={setApprovalState}
          />
          <div className="smartone-timeline-strip">
            <ApprovalTimeline state={approvalState} />
          </div>
        </>
      }
      columns={columns}
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">
              Return Items ({rnrData.items.length})
            </h2>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="rnr-detail-table">
                <thead>
                  <tr>
                    <th className="rnr-detail-th-no">No.</th>
                    <th>DO Number</th>
                    <th>Item Name</th>
                    <th className="smartone-td-right">Quantity</th>
                    <th className="smartone-td-right">Qty Package</th>
                    <th className="smartone-td-right">Price</th>
                    <th className="smartone-td-right">Subtotal</th>
                    <th className="smartone-td-right">Subtotal (IDR)</th>
                  </tr>
                </thead>
                <tbody>
                  {rnrData.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="smartone-empty-cell">
                        No items in this Receive Note Return.
                      </td>
                    </tr>
                  ) : (
                    rnrData.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                        <td>
                          <span className="smartone-td-bold">{it.doNumber}</span>
                          <span className="smartone-td-sub">Date: {it.doDate || "-"}</span>
                        </td>
                        <td>
                          <span className="smartone-td-bold">{it.itemName}</span>
                          <span className="smartone-td-sub smartone-td-mono">{it.itemCode}</span>
                        </td>
                        <td className="smartone-td-right smartone-td-mono">
                          {it.quantity.toLocaleString("en-US", {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })}{" "}
                          <span className="smartone-td-muted">{it.unit}</span>
                        </td>
                        <td className="smartone-td-right smartone-td-mono">
                          {it.qtyPackage}{" "}
                          <span className="smartone-td-muted">{it.packageType}</span>
                        </td>
                        <td className="smartone-td-right smartone-td-mono">
                          {it.price.toLocaleString("en-US", {
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
                        <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                          {it.subtotalIdr.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="rnr-summary-row rnr-summary-row--total">
                    <td colSpan={6} className="smartone-td-right smartone-td-bold">
                      Total
                    </td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      {rnrData.totalSubtotal.toLocaleString("en-US", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      {rnrData.totalSubtotal.toLocaleString("en-US", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 4,
                      })}
                    </td>
                  </tr>
                  <tr className="rnr-summary-row rnr-summary-row--grand">
                    <td colSpan={6} className="smartone-td-right smartone-td-bold">
                      Grand Total
                    </td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      {rnrData.grandTotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      {rnrData.grandTotal.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      }
      bottomActions={
        <div className="smartone-dropdown-anchor" ref={printMenuRef}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setPrintMenuOpen((prev) => !prev)}
          >
            Print Options
          </Button>
          {printMenuOpen && (
            <div className="smartone-dropdown-menu" role="menu">
              <button
                type="button"
                className="smartone-dropdown-item"
                role="menuitem"
                onClick={() => {
                  setPrintMenuOpen(false);
                  onPrint("job");
                }}
              >
                Detail Per Job
              </button>
              <button
                type="button"
                className="smartone-dropdown-item"
                role="menuitem"
                onClick={() => {
                  setPrintMenuOpen(false);
                  onPrint("po");
                }}
              >
                Group by PO Number
              </button>
            </div>
          )}
        </div>
      }
    />
  );
}
