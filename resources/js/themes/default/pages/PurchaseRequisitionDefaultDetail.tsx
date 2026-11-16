import React, { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { docToSlug } from "../../../utils/docSlug";
import { isPrItemClosed } from "../../../services/approvalApi";
import type { DocumentApprovalState } from "../../../types/approval";
import type { TableRow } from "../../../types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

export interface PrHistoryEntry {
  id: string;
  actor: string;
  role: string;
  action: string;
  timestamp: string;
  statusLabel: string;
  tone: "green" | "blue" | "orange" | "red" | "purple" | "gray";
}

interface PurchaseRequisitionDefaultDetailProps {
  row: TableRow;
  docNumber: string;
  reqDate: string;
  dueDate: string;
  dept: string;
  sectionName: string;
  remark: string;
  createdBy: string;
  totalQty: string;
  items: any[];
  poNumbersList: string[];
  approvalState: DocumentApprovalState;
  setApprovalState: React.Dispatch<React.SetStateAction<DocumentApprovalState>>;
  onStateStatusSync: (nextStatus: string) => void;
  onResubmitRevision: () => void;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
  onPrintPdf: () => void;
  onExportXlsx: () => void;
  onDownloadAttachment: () => void;
  onToggleItemClosing: (item: any, idx: number) => void;
  activityLogEntries: PrHistoryEntry[];
}

export function PurchaseRequisitionDefaultDetail({
  row,
  docNumber,
  reqDate,
  dueDate,
  dept,
  sectionName,
  remark,
  createdBy,
  totalQty,
  items,
  poNumbersList,
  approvalState,
  setApprovalState,
  onStateStatusSync,
  onResubmitRevision,
  onBack,
  onNavigateDetail,
  onPrintPdf,
  onExportXlsx,
  onDownloadAttachment,
  onToggleItemClosing,
  activityLogEntries,
}: PurchaseRequisitionDefaultDetailProps) {
  const [showHistory, setShowHistory] = useState(false);

  const isApproved = approvalState.status === "APPROVED";
  const allClosed = items.length > 0 && items.every((it, idx) => isPrItemClosed(docNumber, it, idx));
  const hasClosed = items.length > 0 && items.some((it, idx) => isPrItemClosed(docNumber, it, idx));
  const hasActiveItems = items.some((it, idx) => !isPrItemClosed(docNumber, it, idx));
  const statusStr = String(row._rawStatus || row.status || "");
  const canConvertToPo = isApproved && hasActiveItems && statusStr !== "Closing";

  const headerFacility = items[0]?.facility || row.facility || row._rawFacility || "NON FASILITAS";
  const isNonFacHeader = /non/i.test(String(headerFacility));

  const approval1Value =
    approvalState.approved1At || approvalState.approved1By
      ? `${approvalState.approved1At || "-"}${approvalState.approved1By ? ` (${approvalState.approved1By})` : ""}`
      : "-";

  const approval2Value =
    approvalState.approved2At || approvalState.approved2By
      ? `${approvalState.approved2At || "-"}${approvalState.approved2By ? ` (${approvalState.approved2By})` : ""}`
      : "-";

  const poRefValue =
    poNumbersList.length > 0 ? (
      <div className="smartone-inline-links">
        {poNumbersList.map((po, idx) => (
          <button
            key={po}
            type="button"
            className="smartone-kv-link"
            onClick={() => onNavigateDetail?.("po", docToSlug(po))}
          >
            {po}
            {idx < poNumbersList.length - 1 ? "," : ""}
          </button>
        ))}
      </div>
    ) : (
      "-"
    );

  const columns: SmartOneField[][] = [
    [
      { label: "PR Number", value: <strong>{docNumber}</strong> },
      { label: "Date", value: reqDate },
      { label: "Due Date", value: dueDate },
      { label: "Total Quantity", value: totalQty },
    ],
    [
      { label: "Dept. Request", value: dept },
      { label: "Section", value: sectionName },
      { label: "PO Reference", value: poRefValue },
      { label: "Remark", value: remark || "-" },
    ],
    [
      {
        label: "Attachment file",
        value:
          row.attachment_file || row.attachment_url ? (
            <button
              type="button"
              className="smartone-kv-link"
              onClick={onDownloadAttachment}
            >
              {row.attachment_file || "Download Attachment"}
            </button>
          ) : (
            "-"
          ),
      },
      { label: "Created By", value: String(createdBy || "-") },
      {
        label: "Last Updated",
        value: String(row._rawLastUpdated || createdBy || "-"),
      },
      { label: "Revisi Ke", value: String(row._rawRevision || row.revisi || "0") },
      { label: "Approval 1", value: approval1Value },
      { label: "Approval 2", value: approval2Value },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle="Detail Purchase Requisition"
      onBack={onBack}
      toolbarLeft={
        <>
          <ApprovalStatusBadge status={approvalState.status} />
          <Badge tone={isNonFacHeader ? "gray" : "purple"}>
            {isNonFacHeader ? "NON FASILITAS" : "FASILITAS"}
          </Badge>
          {allClosed && <Badge tone="red">PR Closing</Badge>}
          {!allClosed && hasClosed && <Badge tone="orange">Partial Closing</Badge>}
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
          {canConvertToPo && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onNavigateDetail?.("po-create" as any, docNumber)}
            >
              Create PO
            </Button>
          )}
        </>
      }
      toolbarRight={
        row.attachment_file || row.attachment_url ? (
          <Button type="button" variant="outline" size="sm" onClick={onDownloadAttachment}>
            Download Attachments
          </Button>
        ) : undefined
      }
      approvalSection={
        <ApprovalActionBar
          module="purchase_requisition"
          documentId={row.id ? String(row.id) : docNumber}
          documentNumber={docNumber}
          state={approvalState}
          onResubmitClick={onResubmitRevision}
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
              Requested Material Items ({items.length})
            </h2>
            <span className="smartone-card-section__meta">
              {items.filter((it, idx) => !isPrItemClosed(docNumber, it, idx)).length} active ·{" "}
              {items.filter((it, idx) => isPrItemClosed(docNumber, it, idx)).length} closing
            </span>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="detail-data-table">
                <thead>
                  <tr>
                    <th className="smartone-td-center">No</th>
                    <th>Material Item</th>
                    <th>Facility</th>
                    <th className="smartone-td-right">Quantity</th>
                    <th>PO Reference</th>
                    <th>Job Number</th>
                    <th>Due Date</th>
                    <th>Remark</th>
                    <th className="smartone-td-center">Status / Closing</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="smartone-empty-cell">
                        No material items recorded for this Purchase Requisition.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => {
                      const isClosed = isPrItemClosed(docNumber, it, idx);
                      const isNonFac = /non/i.test(String(it.facility || ""));
                      const rawPo = String(it.poNumber || it.po_number || "-");
                      const rowPoList =
                        rawPo !== "—" && rawPo !== "-"
                          ? rawPo.split(",").map((s) => s.trim()).filter(Boolean)
                          : [];

                      return (
                        <tr key={it.id || idx} className={isClosed ? "smartone-row-closed" : undefined}>
                          <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                          <td>
                            <span className="smartone-td-bold">{it.item || it.itemName || "-"}</span>
                            {it.itemCode && (
                              <span className="smartone-td-sub smartone-td-mono">{it.itemCode}</span>
                            )}
                          </td>
                          <td>
                            <Badge tone={isNonFac ? "gray" : "purple"}>
                              {isNonFac ? "NON FASILITAS" : "FASILITAS"}
                            </Badge>
                          </td>
                          <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                            {it.quantity || "-"}
                          </td>
                          <td>
                            {rowPoList.length > 0 ? (
                              <div className="smartone-inline-links">
                                {rowPoList.map((po, pIdx) => (
                                  <button
                                    key={po}
                                    type="button"
                                    className="smartone-kv-link"
                                    onClick={() => onNavigateDetail?.("po", docToSlug(po))}
                                  >
                                    {po}
                                    {pIdx < rowPoList.length - 1 ? "," : ""}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="smartone-td-muted">-</span>
                            )}
                          </td>
                          <td className="smartone-td-muted">{it.jobNumber || "-"}</td>
                          <td className="smartone-td-muted">{it.dueDate || dueDate}</td>
                          <td className="smartone-td-muted">{it.remark || remark || "-"}</td>
                          <td className="smartone-td-center">
                            <div className="smartone-inline-links">
                              {isClosed ? (
                                <Badge tone="red">Closing</Badge>
                              ) : rowPoList.length > 0 ? (
                                <Badge tone="green">Ordered</Badge>
                              ) : (
                                <Badge tone="gray">Open</Badge>
                              )}
                              <Button
                                type="button"
                                variant={isClosed ? "outline" : "danger"}
                                size="sm"
                                onClick={() => onToggleItemClosing(it, idx)}
                              >
                                {isClosed ? "Unclosing" : "Closing"}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
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
                      <th>Actor</th>
                      <th>Activity Performed</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activityLogEntries.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <strong>{log.actor}</strong>
                          <span className="smartone-td-sub">{log.role}</span>
                        </td>
                        <td>{log.action}</td>
                        <td className="smartone-td-mono smartone-td-muted">{log.timestamp}</td>
                        <td>
                          <Badge tone={log.tone}>{log.statusLabel}</Badge>
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
