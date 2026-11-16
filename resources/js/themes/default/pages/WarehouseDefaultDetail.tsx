import React, { useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { docToSlug } from "../../../utils/docSlug";
import type { DocumentApprovalState } from "../../../types/approval";
import type { TableRow } from "../../../types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface WarehouseHistoryEntry {
  id: string;
  user: string;
  role: string;
  action: string;
  time: string;
  status: string;
  tone: "green" | "blue" | "orange" | "red" | "purple" | "gray";
}

interface WarehouseDefaultDetailProps {
  row: TableRow;
  docNumber: string;
  rnNumber: string;
  poNumber: string;
  prNumber: string;
  supplierName: string;
  receiveDate: string;
  rnDate: string;
  sjNumber: string;
  ajuNumber: string;
  plateNo: string;
  noPen: string;
  bcType: string;
  bpbType: string;
  location: string;
  displayTotalQty: string;
  primaryUnit: string;
  createdBy: string;
  remark: string;
  bpbItems: any[];
  isApproved: boolean;
  approvalState: DocumentApprovalState;
  setApprovalState: React.Dispatch<React.SetStateAction<DocumentApprovalState>>;
  onStateStatusSync: (nextStatus: string) => void;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
  onPrintPdf: () => void;
  onExportXlsx: () => void;
  activityLogEntries: WarehouseHistoryEntry[];
}

export function WarehouseDefaultDetail({
  row,
  docNumber,
  rnNumber,
  poNumber,
  prNumber,
  supplierName,
  receiveDate,
  rnDate,
  sjNumber,
  ajuNumber,
  plateNo,
  noPen,
  bcType,
  bpbType,
  location,
  displayTotalQty,
  primaryUnit,
  createdBy,
  remark,
  bpbItems,
  isApproved,
  approvalState,
  setApprovalState,
  onStateStatusSync,
  onBack,
  onNavigateDetail,
  onPrintPdf,
  onExportXlsx,
  activityLogEntries,
}: WarehouseDefaultDetailProps) {
  const [showHistory, setShowHistory] = useState(false);

  const columns: SmartOneField[][] = [
    [
      { label: "BPB Number", value: <strong>{docNumber}</strong> },
      { label: "Receive Date", value: receiveDate },
      { label: "Supplier", value: supplierName },
      {
        label: "PR Reference",
        value:
          prNumber !== "—" ? (
            <button
              type="button"
              className="smartone-kv-link"
              onClick={() => onNavigateDetail?.("pr", docToSlug(prNumber))}
            >
              {prNumber}
            </button>
          ) : (
            "—"
          ),
      },
      {
        label: "PO Reference",
        value:
          poNumber !== "—" ? (
            <button
              type="button"
              className="smartone-kv-link"
              onClick={() => onNavigateDetail?.("po", docToSlug(poNumber))}
            >
              {poNumber}
            </button>
          ) : (
            "—"
          ),
      },
    ],
    [
      { label: "RN Number", value: rnNumber },
      { label: "RN Date", value: rnDate },
      { label: "Delivery Note (SJ)", value: sjNumber },
      { label: "Warehouse Location", value: location },
      {
        label: "Total Qty Received",
        value: (
          <strong>
            {displayTotalQty} {primaryUnit}
          </strong>
        ),
      },
    ],
    [
      { label: "Vehicle Plate", value: plateNo },
      { label: "No. PEN", value: noPen },
      { label: "No. Aju", value: ajuNumber },
      { label: "Customs Doc.", value: bcType },
      { label: "Created By", value: createdBy },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle="Detail Receive Material (BPB)"
      onBack={onBack}
      toolbarLeft={
        <>
          <ApprovalStatusBadge status={approvalState.status} />
          {isApproved && <Badge tone="green">Locked</Badge>}
          <Badge tone="purple">{bpbType}</Badge>
          <Badge tone="cyan">{bcType}</Badge>
          <Button type="button" variant="secondary" size="sm" onClick={onPrintPdf}>
            Print PDF
          </Button>
          <Button type="button" variant="excel" size="sm" onClick={onExportXlsx}>
            Export XLSX
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setShowHistory((prev) => !prev)}
          >
            {showHistory
              ? "Hide History"
              : `History Transaction (${activityLogEntries.length})`}
          </Button>
        </>
      }
      approvalSection={
        <ApprovalActionBar
          module="bpb"
          documentId={row.id ? String(row.id) : docNumber}
          documentNumber={docNumber}
          state={approvalState}
          onStateChange={(newState) => {
            setApprovalState(newState);
            onStateStatusSync(newState.status);
          }}
        />
      }
      columns={columns}
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">
              Material Items Received ({bpbItems.length})
            </h2>
            <span className="smartone-card-section__meta">Location: {location}</span>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="detail-data-table">
                <thead>
                  <tr>
                    <th className="smartone-td-center">No</th>
                    <th>Material Item</th>
                    <th>Job Number</th>
                    <th>PO Reference</th>
                    <th>PR Reference</th>
                    <th>Delivery Note</th>
                    <th className="smartone-td-right">Received Qty</th>
                    <th>Location</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {bpbItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="smartone-empty-cell">
                        No received material items found.
                      </td>
                    </tr>
                  ) : (
                    bpbItems.map((it, idx) => {
                      const itemQty = Number(it.receiveQty ?? it.rawQty ?? 0).toFixed(2);
                      const itemUnit = it.unit || primaryUnit;
                      const itemLoc = it.warehouse || it.warehouseLocation || it.location || location;
                      return (
                        <tr key={it.id || idx}>
                          <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                          <td>
                            <span className="smartone-td-bold">{it.name || it.item || "-"}</span>
                            {(it.code || it.itemCode) && (
                              <span className="smartone-td-sub smartone-td-mono">
                                {it.code || it.itemCode}
                              </span>
                            )}
                          </td>
                          <td className="smartone-td-muted">{it.jobNumber || "-"}</td>
                          <td className="smartone-td-bold">{it.poNumber || poNumber}</td>
                          <td className="smartone-td-bold">{it.prNumber || prNumber}</td>
                          <td className="smartone-td-mono smartone-td-muted">
                            {it.dnNumber || it.deliveryNote || sjNumber}
                          </td>
                          <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                            {itemQty} {itemUnit}
                          </td>
                          <td>
                            <Badge tone="blue">{itemLoc}</Badge>
                          </td>
                          <td className="smartone-td-muted">{it.purpose || it.remark || remark}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="smartone-tfoot-row">
                    <td colSpan={6} className="smartone-td-right">
                      Total Received Items:
                    </td>
                    <td className="smartone-td-right smartone-td-mono">
                      {displayTotalQty} {primaryUnit}
                    </td>
                    <td colSpan={2} className="smartone-td-muted">
                      {isApproved
                        ? "Posted & verified in inventory stock ledger"
                        : "Pending final approval"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      }
      notesSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">Warehouse Receiving Notes</h2>
          </div>
          <div className="smartone-card-section__body">
            <div className="smartone-notes-box">{remark || "No remarks entered."}</div>
          </div>
        </div>
      }
      historySection={
        showHistory ? (
          <div className="smartone-card-section">
            <div className="smartone-card-section__header">
              <h2 className="smartone-card-section__title">
                Transaction History &amp; Activity Log
              </h2>
              <span className="smartone-card-section__meta">
                {activityLogEntries.length} records
              </span>
            </div>
            <div className="smartone-card-section__body smartone-card-section__body--flush">
              <div className="smartone-table-wrap">
                <table className="audit-log-table">
                  <thead>
                    <tr>
                      <th>Actor / Staff</th>
                      <th>Activity Performed</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogEntries.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.user}</strong>
                          <span className="smartone-td-sub">{log.role}</span>
                        </td>
                        <td>{log.action}</td>
                        <td className="smartone-td-mono smartone-td-muted">{log.time}</td>
                        <td>
                          <Badge tone={log.tone}>{log.status}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : undefined
      }
    />
  );
}
