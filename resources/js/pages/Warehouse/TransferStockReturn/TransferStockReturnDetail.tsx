import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../../components/ui/Button";
import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { RejectDialog } from "../../../components/approval/RejectDialog";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import {
  fetchTransferStockReturnDetailApi,
  deleteTransferStockReturnApi,
  approveTransferStockReturnApi,
  rejectTransferStockReturnApi,
} from "../../../data/masterApi";
import {
  normalizeApprovalStatus,
  type DocumentApprovalState,
} from "../../../types/approval";
import type { TransferStockReturnRecord } from "./transfer-stock-return-types";
import { useTheme } from "../../../context/ThemeContext";
import { TransferStockReturnDefaultDetail } from "../../../themes/default/pages/TransferStockReturnDefaultDetail";
import { LoadingBuffer } from "../../../components/ui/LoadingBuffer";

interface TransferStockReturnDetailProps {
  code: string;
  record?: TransferStockReturnRecord | null;
  records?: TransferStockReturnRecord[];
  onBack: () => void;
  onEdit?: (record: TransferStockReturnRecord) => void;
  onUpdated?: () => void;
}

export function TransferStockReturnDetail({
  code,
  record: initialRecordProp,
  records = [],
  onBack,
  onEdit,
  onUpdated,
}: TransferStockReturnDetailProps) {
  const { isDefaultTheme } = useTheme();
  const matchedFromProps = useMemo(() => {
    if (initialRecordProp) return initialRecordProp;
    if (!code || !records.length) return null;
    const cleanTarget = code.replace(/[^A-Za-z0-9]/g, "").toLowerCase();
    return (
      records.find(
        (r) =>
          r.id.toLowerCase() === code.toLowerCase() ||
          r.mutationCode.toLowerCase() === code.toLowerCase() ||
          r.mutationCode.replace(/[^A-Za-z0-9]/g, "").toLowerCase() === cleanTarget
      ) || null
    );
  }, [code, initialRecordProp, records]);

  const [record, setRecord] = useState<TransferStockReturnRecord | null>(matchedFromProps);
  const [loading, setLoading] = useState<boolean>(!matchedFromProps);
  const [actionBusy, setActionBusy] = useState<boolean>(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState<boolean>(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  const [notification, setNotification] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const loadDetail = useCallback(async (targetCode: string) => {
    if (!targetCode) return;
    setLoading((prev) => prev);
    try {
      const data = await fetchTransferStockReturnDetailApi(targetCode);
      if (data) {
        setRecord(data);
      }
    } catch {
      // Keep fallback record if already populated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (matchedFromProps) {
      setRecord(matchedFromProps);
    }
    loadDetail(matchedFromProps?.mutationCode || code);
  }, [code, matchedFromProps, loadDetail]);

  const getStatusTone = (status?: TransferStockReturnRecord["status"]): BadgeTone => {
    switch (status) {
      case "Approved":
        return "green";
      case "Waiting Approve 1":
        return "orange";
      case "Waiting Approve 2":
        return "purple";
      case "Draft":
        return "gray";
      case "Rejected":
        return "red";
      default:
        return "gray";
    }
  };

  const approvalTimelineState: DocumentApprovalState = useMemo(() => {
    const rawStatus = record?.status || "Waiting Approve 1";
    const norm = normalizeApprovalStatus(rawStatus);
    const isStage1Done = norm === "WAITING_APPROVE_2" || norm === "APPROVED";
    const isStage2Done = norm === "APPROVED";
    return {
      status: norm,
      currentTier: norm === "WAITING_APPROVE_2" ? 2 : 1,
      approved1By: isStage1Done ? record?.userCreated || "Warehouse Supervisor" : undefined,
      approved1At: isStage1Done ? record?.userLastUpdated || "" : undefined,
      approved2By: isStage2Done ? "Warehouse Manager" : undefined,
      approved2At: isStage2Done ? record?.userLastUpdated || "" : undefined,
      rejectedBy: norm === "REJECTED" ? "Approver" : undefined,
      rejectedAt: norm === "REJECTED" ? record?.userLastUpdated || "" : undefined,
      rejectionNote:
        norm === "REJECTED" && record?.transferNote && record.transferNote !== "-"
          ? record.transferNote
          : undefined,
      history: [],
    };
  }, [record]);

  const totalReturnedQty = useMemo(() => {
    if (!record?.items?.length) return 0;
    return record.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  }, [record]);

  const handleApprove = async () => {
    if (!record) return;
    const tier = record.status === "Waiting Approve 2" ? 2 : 1;
    setActionBusy(true);
    setNotification(null);
    try {
      const res = await approveTransferStockReturnApi(
        record.id,
        tier,
        `Approved Stage ${tier} via Stock Transfer Return Detail`
      );
      await loadDetail(record.mutationCode || record.id);
      if (onUpdated) onUpdated();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
      }
      setNotification({
        type: "success",
        message: res?.message || `${record.mutationCode} approved for Stage ${tier}.`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || `Failed to approve ${record.mutationCode}.`,
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmReject = async (reason: string) => {
    if (!record) return;
    setActionBusy(true);
    setNotification(null);
    try {
      const res = await rejectTransferStockReturnApi(record.id, reason);
      setIsRejectDialogOpen(false);
      await loadDetail(record.mutationCode || record.id);
      if (onUpdated) onUpdated();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
      }
      setNotification({
        type: "warning",
        message: res?.message || `${record.mutationCode} has been rejected.`,
      });
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err?.message || `Failed to reject ${record.mutationCode}.`,
      });
    } finally {
      setActionBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!record) return;
    setActionBusy(true);
    try {
      await deleteTransferStockReturnApi(record.id);
      if (onUpdated) onUpdated();
      onBack();
    } catch (err: any) {
      setIsDeleteConfirmOpen(false);
      setNotification({
        type: "error",
        message: err?.message || `Failed to delete ${record.mutationCode}.`,
      });
    } finally {
      setActionBusy(false);
    }
  };

  if (loading && !record) {
    return (
      <div className="full-page-detail tsr-detail-page">
        <LoadingBuffer
          variant="panel"
          label="Loading Stock Transfer Return Details..."
          sublabel="Fetching warehouse transfer lines and approval timeline..."
          skeletonRows={4}
        />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="full-page-detail tsr-detail-page">
        <div className="panel tsr-empty-panel">
          <div className="tsr-empty-badge-icon">
            <Icon name="alertTriangle" size={28} />
          </div>
          <h3 className="tsr-empty-heading">Stock Transfer Return Not Found</h3>
          <p className="tsr-empty-text">
            The requested Stock Transfer Return &ldquo;<strong>{code}</strong>&rdquo; could not be located in the database.
          </p>
          <Button type="button" variant="primary" onClick={onBack}>
            Back to List
          </Button>
        </div>
      </div>
    );
  }

  const isApproved = record.status === "Approved";
  const canApproveOrReject =
    record.status === "Draft" ||
    record.status === "Waiting Approve 1" ||
    record.status === "Waiting Approve 2";

  const warehouseDisplay =
    record.warehouseName || record.items?.[0]?.destinationLocation || "—";

  return (
    <>
      {isDefaultTheme ? (
        <TransferStockReturnDefaultDetail
          record={record}
          isApproved={isApproved}
          canApproveOrReject={canApproveOrReject}
          actionBusy={actionBusy}
          warehouseDisplay={warehouseDisplay}
          totalReturnedQty={totalReturnedQty}
          approvalTimelineState={approvalTimelineState}
          getStatusTone={getStatusTone}
          notification={notification}
          onDismissNotification={() => setNotification(null)}
          onApprove={handleApprove}
          onOpenRejectDialog={() => setIsRejectDialogOpen(true)}
          onOpenDeleteConfirm={() => setIsDeleteConfirmOpen(true)}
          onEdit={onEdit}
          onBack={onBack}
        />
      ) : (
        <div className="full-page-detail tsr-detail-page">
      {/* Detail Navigation & Top Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Warehouse</a>
            <span>/</span>
            <a onClick={onBack}>Operasional</a>
            <span>/</span>
            <a onClick={onBack}>TSR (Transfer Stock Return)</a>
            <span>/</span>
            <span className="current">{record.mutationCode}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone={getStatusTone(record.status)}>{record.status}</Badge>
          {isApproved && <Badge tone="green">Locked</Badge>}
          {!isApproved && (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onEdit?.(record)}
                disabled={actionBusy || !onEdit}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => setIsDeleteConfirmOpen(true)}
                disabled={actionBusy}
              >
                Delete
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button type="button" variant="outline" onClick={onBack}>
            Back to List
          </Button>
        </div>
      </div>

      {/* Inline Feedback Notification */}
      {notification && (
        <div className={`tsr-notice tsr-notice--${notification.type}`}>
          <div className="tsr-detail-action-left">
            <Icon
              name={notification.type === "success" ? "checkCircle" : "alertTriangle"}
              size={16}
            />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            className="tsr-notice__close"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">
            WAREHOUSE OPERASIONAL · STOCK TRANSFER RETURN
          </span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{record.mutationCode}</h2>
            <Badge tone={getStatusTone(record.status)}>{record.status}</Badge>
            {warehouseDisplay !== "—" && <Badge tone="blue">{warehouseDisplay}</Badge>}
          </div>
          <span className="detail-header-card__meta">
            Transfer Date: <strong>{record.transferDate || "—"}</strong> · Production Code:{" "}
            <strong>{record.productionCode || "—"}</strong> · Job Number:{" "}
            <strong>{record.jobNumber || "—"}</strong>
          </span>
        </div>

        {/* Approval Action Controls */}
        {canApproveOrReject && (
          <div className="tsr-detail-action-right">
            <Button
              type="button"
              variant={record.status === "Waiting Approve 2" ? "primary" : "success"}
              disabled={actionBusy}
              onClick={handleApprove}
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
              disabled={actionBusy}
              onClick={() => setIsRejectDialogOpen(true)}
            >
              Reject
            </Button>
          </div>
        )}
      </div>

      {/* Visual Two-Stage Approval Timeline */}
      <ApprovalTimeline state={approvalTimelineState} />

      {/* 2-Column Transaction Information Card */}
      <div className="panel tsr-detail-panel">
        <h3 className="tsr-section-heading">Transaction Information</h3>

        <div className="tsr-info-grid">
          {/* Column 1 */}
          <div className="tsr-info-col">
            <div className="tsr-info-row">
              <span className="tsr-info-label">Mutation Code</span>
              <strong className="tsr-info-value tsr-info-value--code">
                {record.mutationCode}
              </strong>
            </div>

            <div className="tsr-info-row">
              <span className="tsr-info-label">Production Code</span>
              <strong className="tsr-info-value">{record.productionCode || "—"}</strong>
            </div>

            <div className="tsr-info-row">
              <span className="tsr-info-label">Job Number</span>
              <strong className="tsr-info-value tsr-info-value--link">
                {record.jobNumber || "—"}
              </strong>
            </div>

            <div className="tsr-info-row">
              <span className="tsr-info-label">Warehouse Destination</span>
              <strong className="tsr-info-value tsr-info-value--soft">
                {warehouseDisplay}
              </strong>
            </div>
          </div>

          {/* Column 2 */}
          <div className="tsr-info-col">
            <div className="tsr-info-row">
              <span className="tsr-info-label">Transfer Date</span>
              <span className="tsr-info-value">{record.transferDate || "—"}</span>
            </div>

            <div className="tsr-info-row">
              <span className="tsr-info-label">Total Returned Items</span>
              <strong className="tsr-info-value">
                {record.items.length} {record.items.length === 1 ? "Item" : "Items"} (
                {totalReturnedQty.toLocaleString()} Qty)
              </strong>
            </div>

            <div className="tsr-info-row">
              <span className="tsr-info-label">User Created</span>
              <span className="tsr-info-value">{record.userCreated || "—"}</span>
            </div>

            <div className="tsr-info-row">
              <span className="tsr-info-label">Last Updated</span>
              <span className="tsr-info-value tsr-info-value--soft">
                {record.userLastUpdated || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Returned Stock Items Table Panel */}
      <div className="tsr-items-panel">
        <div className="tsr-items-header">
          <span className="tsr-items-title">Returned Stock Items</span>
          <span className="code-pill">
            {record.items?.length || 0} {record.items?.length === 1 ? "item" : "items"} listed
          </span>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="tsr-th tsr-th-col-no tsr-th--center">No</th>
                  <th className="tsr-th tsr-th-col-item-code">Item Code</th>
                  <th className="tsr-th tsr-th-col-item-name">Item Name</th>
                  <th className="tsr-th tsr-th-col-qty tsr-th--right">Qty Return</th>
                  <th className="tsr-th tsr-th-col-unit tsr-th--center">Unit</th>
                  <th className="tsr-th tsr-th-col-loc">Source Location</th>
                  <th className="tsr-th tsr-th-col-loc">Destination Location</th>
                  <th className="tsr-th tsr-th-col-reason">Reason / Condition</th>
                </tr>
              </thead>
              <tbody>
                {record.items && record.items.length > 0 ? (
                  record.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="tsr-td tsr-td-no">{idx + 1}</td>
                      <td className="tsr-td">
                        <span className="code-pill">{item.itemCode || "—"}</span>
                      </td>
                      <td className="tsr-td tsr-primary-text">{item.itemName || "—"}</td>
                      <td className="tsr-td tsr-td--right">
                        <strong className="tsr-qty-strong">
                          {Number(item.quantity || 0).toLocaleString()}
                        </strong>
                      </td>
                      <td className="tsr-td tsr-td--center">
                        <span className="tsr-unit-text">{item.unit || "PCE"}</span>
                      </td>
                      <td className="tsr-td tsr-info-value--soft">
                        {item.sourceLocation || "—"}
                      </td>
                      <td className="tsr-td tsr-info-value--soft">
                        {item.destinationLocation || "—"}
                      </td>
                      <td className="tsr-td tsr-muted-text">{item.reason || "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty tsr-empty-box">
                        <div className="empty__icon">
                          <Icon name="box" />
                        </div>
                        <strong className="tsr-empty-title">
                          No returned items in this transaction
                        </strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {record.items && record.items.length > 0 && (
                <tfoot>
                  <tr className="tsr-tfoot-row">
                    <td colSpan={3} className="tsr-tfoot-label">
                      Total Returned Quantity
                    </td>
                    <td className="tsr-tfoot-total">
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

      {/* Transfer Note / Remarks Card */}
      <div className="panel tsr-detail-panel">
        <h4 className="tsr-notes-title">Transfer Note / Remarks</h4>
        <div className="tsr-notes-box">
          {record.transferNote && record.transferNote !== "-"
            ? record.transferNote
            : "No transfer note or remarks entered."}
        </div>
      </div>
        </div>
      )}

      {/* Reject Reason Dialog */}
      <RejectDialog
        isOpen={isRejectDialogOpen}
        documentNumber={record.mutationCode}
        tier={record.status === "Waiting Approve 2" ? 2 : 1}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        isLoading={actionBusy}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteConfirmOpen}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Stock Transfer Return"
        message={`Are you sure you want to delete ${record.mutationCode}? This action cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}

export default TransferStockReturnDetail;
