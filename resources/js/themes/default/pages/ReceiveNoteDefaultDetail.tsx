import React, { useState, useRef, useEffect } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import type { DocumentApprovalState } from "../../../types/approval";
import type { ReceiveNoteRecord } from "../../../pages/Exim/ReceiveNote/receive-note-types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface ReceiveNoteDefaultDetailProps {
  rnData: ReceiveNoteRecord;
  isApproved: boolean;
  approvalState: DocumentApprovalState;
  onApprovalStateChange: (nextState: DocumentApprovalState) => void;
  onBack: () => void;
  onCreateBpb?: (rnNumber: string) => void;
  onPrint: (mode: "job" | "po") => void;
}

export function ReceiveNoteDefaultDetail({
  rnData,
  isApproved,
  approvalState,
  onApprovalStateChange,
  onBack,
  onCreateBpb,
  onPrint,
}: ReceiveNoteDefaultDetailProps) {
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

  const hasBpb = Boolean(
    rnData.bpb_number ||
      rnData.is_received_in_bpb ||
      (rnData as any).bpbNumber ||
      ((rnData as any).warehouseTransaction &&
        (rnData as any).warehouseTransaction !== "—" &&
        (rnData as any).warehouseTransaction !== "-")
  );

  const bpbRefLabel =
    rnData.bpb_number ||
    (rnData as any).bpbNumber ||
    (rnData as any).warehouseTransaction ||
    "";

  const resolvedRemark =
    rnData.description && rnData.description !== "-"
      ? rnData.description
      : rnData.note && rnData.note !== "-"
        ? rnData.note
        : rnData.remark || "-";

  const columns: SmartOneField[][] = [
    [
      { label: "RN Number", value: <strong>{rnData.rnNumber}</strong> },
      { label: "Arrival Date", value: rnData.arrivalDate },
      { label: "Supplier", value: rnData.supplier },
      { label: "Facility", value: rnData.facility },
      { label: "Code of BC Doc.", value: rnData.bcCode },
      { label: "Currency / Rate", value: `${rnData.currency} · ${rnData.rate.toFixed(4)}` },
      ...(bpbRefLabel
        ? [{ label: "Warehouse BPB", value: <strong>{bpbRefLabel}</strong> }]
        : []),
    ],
    [
      { label: "Invoice Number", value: rnData.invoiceNumber },
      { label: "Invoice Date", value: rnData.invoiceDate },
      { label: "Tax Invoice No.", value: rnData.taxInvoiceNumber },
      { label: "Tax Invoice Date", value: rnData.taxInvoiceDate },
      { label: "Vehicle Type", value: rnData.vehicleType },
      { label: "License Plate", value: rnData.licensePlate },
      { label: "Nomor Aju", value: rnData.ajuNumber },
      { label: "Nomor Daftar", value: rnData.noDaftar },
    ],
    [
      { label: "Tanggal Daftar", value: rnData.tanggalDaftar },
      { label: "Packing List No.", value: rnData.nomorPackingList },
      { label: "Packing List Date", value: rnData.tanggalPackingList },
      { label: "Created at", value: rnData.createdAt },
      { label: "Last Updated at", value: rnData.lastUpdatedAt },
      {
        label: "Approval 1 at",
        value: approvalState.approved1At
          ? `${approvalState.approved1At}${approvalState.approved1By ? ` by ${approvalState.approved1By}` : ""}`
          : rnData.approval1At,
      },
      {
        label: "Approval 2 at",
        value: approvalState.approved2At
          ? `${approvalState.approved2At}${approvalState.approved2By ? ` by ${approvalState.approved2By}` : ""}`
          : rnData.approval2At,
      },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle={`Detail Receive Note — ${rnData.rnNumber}`}
      onBack={onBack}
      toolbarLeft={
        <>
          <ApprovalStatusBadge status={approvalState.status} />
          {isApproved && <Badge tone="green">Locked</Badge>}
          {isApproved && !hasBpb && onCreateBpb && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onCreateBpb(rnData.rnNumber)}
            >
              Create BPB
            </Button>
          )}
          {hasBpb && (
            <Badge tone="green">
              {`Received in BPB${bpbRefLabel ? ` (${bpbRefLabel})` : ""}`}
            </Badge>
          )}
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
            module="receive_note"
            documentId={rnData.rnNumber}
            documentNumber={rnData.rnNumber}
            state={approvalState}
            onStateChange={onApprovalStateChange}
          />
          <div className="smartone-timeline-strip">
            <ApprovalTimeline state={approvalState} />
          </div>
        </>
      }
      columns={columns}
      notesSection={
        resolvedRemark !== "-" ? (
          <div className="smartone-card-section">
            <div className="smartone-card-section__header">
              <h2 className="smartone-card-section__title">Notes / Remarks</h2>
            </div>
            <div className="smartone-card-section__body">
              <div className="smartone-notes-box">{resolvedRemark}</div>
            </div>
          </div>
        ) : undefined
      }
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">
              Receive Note Items ({rnData.items.length})
            </h2>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="rn-detail-table">
                <thead>
                  <tr>
                    <th rowSpan={2} className="rn-detail-th-no">No.</th>
                    <th rowSpan={2}>PO Number</th>
                    <th rowSpan={2}>DN Number</th>
                    <th rowSpan={2}>Job Number</th>
                    <th rowSpan={2}>Item Name</th>
                    <th rowSpan={2} className="smartone-td-right">QTY</th>
                    <th rowSpan={2} className="smartone-td-right">Rafaksi</th>
                    <th colSpan={2} className="smartone-td-center rn-detail-th-grouped">
                      Price ({rnData.currency})
                    </th>
                    <th rowSpan={2}>Remark</th>
                  </tr>
                  <tr>
                    <th className="rn-detail-th-sub smartone-td-right">@</th>
                    <th className="rn-detail-th-sub smartone-td-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {rnData.items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="smartone-empty-cell">
                        No items in this Receive Note.
                      </td>
                    </tr>
                  ) : (
                    rnData.items.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                        <td>{it.poNumber}</td>
                        <td>{it.dnNumber}</td>
                        <td>{it.jobNumber}</td>
                        <td>
                          <span className="smartone-td-bold">{it.itemName}</span>
                          {it.itemCode && it.itemCode !== "-" && (
                            <span className="smartone-td-sub smartone-td-mono">{it.itemCode}</span>
                          )}
                        </td>
                        <td className="smartone-td-right smartone-td-mono">
                          {Number(it.qty || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}{" "}
                          <span className="smartone-td-muted">{it.unit}</span>
                        </td>
                        <td className="smartone-td-right smartone-td-mono">
                          {Number(it.rafaksi || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="smartone-td-right smartone-td-mono">
                          {Number(it.pricePerUnit || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                          {Number(it.priceSubtotal || 0).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="smartone-td-muted">{it.remark || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="rn-summary-row">
                    <td colSpan={8} className="smartone-td-right smartone-td-bold">
                      Subtotal
                    </td>
                    <td className="smartone-td-right smartone-td-mono">
                      {rnData.amount.toLocaleString("en-US", { minimumFractionDigits: 4 })}
                    </td>
                    <td />
                  </tr>
                  <tr className="rn-summary-row">
                    <td colSpan={8} className="smartone-td-right smartone-td-bold">
                      Biaya Lain
                    </td>
                    <td className="smartone-td-right smartone-td-mono">
                      {rnData.biayaLain.toLocaleString("en-US", { minimumFractionDigits: 4 })}
                    </td>
                    <td />
                  </tr>
                  <tr className="rn-summary-row">
                    <td colSpan={8} className="smartone-td-right smartone-td-bold">
                      Discount ({rnData.discountPercent.toFixed(2)}%)
                    </td>
                    <td className="smartone-td-right smartone-td-mono">
                      {rnData.discountAmount.toLocaleString("en-US", { minimumFractionDigits: 4 })}
                    </td>
                    <td />
                  </tr>
                  <tr className="rn-summary-row">
                    <td colSpan={8} className="smartone-td-right smartone-td-bold">
                      PPN ({rnData.ppnPercent.toFixed(0)}%)
                    </td>
                    <td className="smartone-td-right smartone-td-mono">
                      {rnData.ppnAmount.toLocaleString("en-US", { minimumFractionDigits: 4 })}
                    </td>
                    <td />
                  </tr>
                  <tr className="rn-summary-row rn-summary-row--grand">
                    <td colSpan={8} className="smartone-td-right smartone-td-bold">
                      Grand Total
                    </td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      {rnData.grandTotal.toLocaleString("en-US", { minimumFractionDigits: 4 })}
                    </td>
                    <td />
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
