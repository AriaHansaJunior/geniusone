import React from "react";
import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Icon } from "../../../components/ui/Icon";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import type { DocumentApprovalState } from "../../../types/approval";
import type { TransferStockReturnRecord } from "../../../pages/Warehouse/TransferStockReturn/transfer-stock-return-types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface TransferStockReturnDefaultDetailProps {
  record: TransferStockReturnRecord;
  isApproved: boolean;
  canApproveOrReject: boolean;
  actionBusy: boolean;
  warehouseDisplay: string;
  totalReturnedQty: number;
  approvalTimelineState: DocumentApprovalState;
  getStatusTone: (status?: TransferStockReturnRecord["status"]) => BadgeTone;
  notification: { type: "success" | "warning" | "error"; message: string } | null;
  onDismissNotification: () => void;
  onApprove: () => void;
  onOpenRejectDialog: () => void;
  onOpenDeleteConfirm: () => void;
  onEdit?: (record: TransferStockReturnRecord) => void;
  onBack: () => void;
}

export function TransferStockReturnDefaultDetail({
  record,
  isApproved,
  canApproveOrReject,
  actionBusy,
  warehouseDisplay,
  totalReturnedQty,
  approvalTimelineState,
  getStatusTone,
  notification,
  onDismissNotification,
  onApprove,
  onOpenRejectDialog,
  onOpenDeleteConfirm,
  onEdit,
  onBack,
}: TransferStockReturnDefaultDetailProps) {
  const columns: SmartOneField[][] = [
    [
      { label: "Mutation Code", value: <strong>{record.mutationCode}</strong> },
      { label: "Production Code", value: record.productionCode || "—" },
      { label: "Job Number", value: record.jobNumber || "—" },
      { label: "Warehouse Dest.", value: warehouseDisplay },
    ],
    [
      { label: "Transfer Date", value: record.transferDate || "—" },
      {
        label: "Total Returned",
        value: (
          <strong>
            {record.items.length} {record.items.length === 1 ? "Item" : "Items"} (
            {totalReturnedQty.toLocaleString()} Qty)
          </strong>
        ),
      },
      { label: "User Created", value: record.userCreated || "—" },
      { label: "Last Updated", value: record.userLastUpdated || "—" },
    ],
    [
      { label: "Status", value: record.status },
      { label: "Approval 1", value: approvalTimelineState.approved1At || "—" },
      { label: "Approval 2", value: approvalTimelineState.approved2At || "—" },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle={`Detail Transfer Stock Return — ${record.mutationCode}`}
      onBack={onBack}
      topBanner={
        notification ? (
          <div className={`smartone-notice-banner smartone-notice-banner--${notification.type}`}>
            <span>{notification.message}</span>
            <button
              type="button"
              className="smartone-close-btn"
              onClick={onDismissNotification}
              aria-label="Dismiss notification"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ) : undefined
      }
      toolbarLeft={
        <>
          <Badge tone={getStatusTone(record.status)}>{record.status}</Badge>
          {isApproved && <Badge tone="green">Locked</Badge>}
          {warehouseDisplay !== "—" && <Badge tone="blue">{warehouseDisplay}</Badge>}
          {!isApproved && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => onEdit?.(record)}
                disabled={actionBusy || !onEdit}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={onOpenDeleteConfirm}
                disabled={actionBusy}
              >
                Delete
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
          >
            Print
          </Button>
        </>
      }
      approvalSection={
        <>
          {canApproveOrReject && (
            <div className="smartone-card-bar__group">
              <Button
                type="button"
                variant={record.status === "Waiting Approve 2" ? "primary" : "success"}
                size="sm"
                disabled={actionBusy}
                onClick={onApprove}
              >
                {actionBusy
                  ? "Processing..."
                  : record.status === "Waiting Approve 2"
                    ? "Approve Stage 2"
                    : "Approve Stage 1"}
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={actionBusy}
                onClick={onOpenRejectDialog}
              >
                Reject
              </Button>
            </div>
          )}
          <div className="smartone-timeline-strip">
            <ApprovalTimeline state={approvalTimelineState} />
          </div>
        </>
      }
      columns={columns}
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">
              Returned Stock Items ({record.items?.length || 0})
            </h2>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="smartone-td-center">No</th>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th className="smartone-td-right">Qty Return</th>
                    <th className="smartone-td-center">Unit</th>
                    <th>Source Location</th>
                    <th>Destination Location</th>
                    <th>Reason / Condition</th>
                  </tr>
                </thead>
                <tbody>
                  {!record.items || record.items.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="smartone-empty-cell">
                        No returned items in this transaction.
                      </td>
                    </tr>
                  ) : (
                    record.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                        <td>
                          <span className="code-pill">{item.itemCode || "—"}</span>
                        </td>
                        <td className="smartone-td-bold">{item.itemName || "—"}</td>
                        <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                          {Number(item.quantity || 0).toLocaleString()}
                        </td>
                        <td className="smartone-td-center">{item.unit || "PCE"}</td>
                        <td className="smartone-td-muted">{item.sourceLocation || "—"}</td>
                        <td className="smartone-td-muted">{item.destinationLocation || "—"}</td>
                        <td className="smartone-td-muted">{item.reason || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {record.items && record.items.length > 0 && (
                  <tfoot>
                    <tr className="smartone-tfoot-row">
                      <td colSpan={3} className="smartone-td-right">
                        Total Returned Quantity
                      </td>
                      <td className="smartone-td-right smartone-td-mono">
                        {totalReturnedQty.toLocaleString()}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      }
      notesSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">Transfer Note / Remarks</h2>
          </div>
          <div className="smartone-card-section__body">
            <div className="smartone-notes-box">
              {record.transferNote && record.transferNote !== "-"
                ? record.transferNote
                : "No transfer note or remarks entered."}
            </div>
          </div>
        </div>
      }
    />
  );
}
