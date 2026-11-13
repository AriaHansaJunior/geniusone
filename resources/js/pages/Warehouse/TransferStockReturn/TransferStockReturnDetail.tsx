import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "../../../components/ui/Button";
import { Badge, type BadgeTone } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { RejectDialog } from "../../../components/approval/RejectDialog";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import { TransferStockReturnForm } from "./TransferStockReturnForm";
import {
  fetchTransferStockReturnDetailApi,
  saveTransferStockReturnApi,
  deleteTransferStockReturnApi,
  approveTransferStockReturnApi,
  rejectTransferStockReturnApi,
} from "../../../data/masterApi";
import {
  normalizeApprovalStatus,
  type DocumentApprovalState,
} from "../../../types/approval";
import type { TransferStockReturnRecord } from "./transfer-stock-return-types";

interface TransferStockReturnDetailProps {
  code: string;
  record?: TransferStockReturnRecord | null;
  records?: TransferStockReturnRecord[];
  onBack: () => void;
  onUpdated?: () => void;
}

function toIsoDate(dateStr: string): string {
  const clean = (dateStr || "").trim();
  const dmy = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  return clean || new Date().toISOString().slice(0, 10);
}

export function TransferStockReturnDetail({
  code,
  record: initialRecordProp,
  records = [],
  onBack,
  onUpdated,
}: TransferStockReturnDetailProps) {
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
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
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

  const handleSaveEdit = async (updatedRecord: TransferStockReturnRecord) => {
    if (!record) return;
    const payload = {
      return_number: updatedRecord.mutationCode,
      production_code:
        updatedRecord.productionCode && updatedRecord.productionCode !== "-"
          ? updatedRecord.productionCode
          : null,
      request_material_id: updatedRecord.request_material_id || null,
      warehouses_id: updatedRecord.warehouses_id,
      job_number_id: updatedRecord.job_number_id || null,
      job_number:
        updatedRecord.jobNumber && updatedRecord.jobNumber !== "-"
          ? updatedRecord.jobNumber
          : null,
      return_date: toIsoDate(updatedRecord.transferDate),
      note: updatedRecord.transferNote,
      items: updatedRecord.items.map((it) => ({
        items_id: it.items_id,
        quantity: Number(it.quantity),
        unit: it.unit,
        source_location: it.sourceLocation,
        destination_location: it.destinationLocation,
        remark: it.reason,
      })),
    };

    await saveTransferStockReturnApi(payload, record.id);
    await loadDetail(updatedRecord.mutationCode || record.id);
    if (onUpdated) onUpdated();
    setNotification({
      type: "success",
      message: `Stock Transfer Return ${updatedRecord.mutationCode} updated successfully.`,
    });
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
      <div className="full-page-detail">
        <div
          className="panel"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <strong style={{ fontSize: "14px", color: "var(--ink)" }}>
            Loading Stock Transfer Return details...
          </strong>
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="full-page-detail">
        <div
          className="panel"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#b91c1c",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="alertTriangle" size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
            Stock Transfer Return Not Found
          </h3>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: "440px", fontSize: "13px" }}>
            The requested Stock Transfer Return &ldquo;<strong>{code}</strong>&rdquo; could not be located in the database.
          </p>
          <Button variant="primary" icon="arrowLeft" onClick={onBack} style={{ marginTop: "8px" }}>
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
    <div className="full-page-detail transfer-stock-return-detail-page">
      {/* Detail Navigation & Top Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Warehouse</a>
            <span>/</span>
            <a onClick={onBack}>Incoming</a>
            <span>/</span>
            <a onClick={onBack}>Transfer Stock Return</a>
            <span>/</span>
            <span className="current">{record.mutationCode}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone={getStatusTone(record.status)}>{record.status}</Badge>
          {isApproved && (
            <Badge tone="green" style={{ fontSize: "11px", fontWeight: 700 }}>
              <Icon name="lock" size={12} style={{ marginRight: "3px" }} /> Locked
            </Badge>
          )}
          {!isApproved && (
            <>
              <Button
                type="button"
                variant="secondary"
                icon="edit"
                onClick={() => setIsEditModalOpen(true)}
                disabled={actionBusy}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="danger"
                icon="trash"
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
            icon="print"
            onClick={() => window.print()}
          >
            Print
          </Button>
          <Button
            type="button"
            variant="outline"
            icon="arrowLeft"
            onClick={onBack}
          >
            Back to List
          </Button>
        </div>
      </div>

      {/* Inline Feedback Notification */}
      {notification && (
        <div
          style={{
            padding: "10px 16px",
            borderRadius: "var(--radius-sm, 6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              notification.type === "success"
                ? "#ecfdf5"
                : notification.type === "warning"
                  ? "#fffbeb"
                  : "#fef2f2",
            border: `1px solid ${
              notification.type === "success"
                ? "#a7f3d0"
                : notification.type === "warning"
                  ? "#fde68a"
                  : "#fecaca"
            }`,
            color:
              notification.type === "success"
                ? "#065f46"
                : notification.type === "warning"
                  ? "#92400e"
                  : "#991b1b",
            fontSize: "12.5px",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Icon
              name={notification.type === "success" ? "checkCircle" : "alertTriangle"}
              size={16}
            />
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{
              background: "transparent",
              border: 0,
              cursor: "pointer",
              fontSize: "16px",
              color: "inherit",
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">
            WAREHOUSE INCOMING · STOCK TRANSFER RETURN
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <Button
              type="button"
              variant={record.status === "Waiting Approve 2" ? "primary" : "success"}
              icon="check"
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
              icon="close"
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
      <div className="panel" style={{ padding: "20px 24px" }}>
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--ink)",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "8px",
          }}
        >
          Transaction Information
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Column 1 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Mutation Code
              </span>
              <strong
                style={{
                  fontSize: "12.5px",
                  color: "var(--blue-700)",
                  fontFamily: "ui-monospace, monospace",
                  textAlign: "right",
                }}
              >
                {record.mutationCode}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Production Code
              </span>
              <strong style={{ fontSize: "12.5px", color: "var(--ink)", textAlign: "right" }}>
                {record.productionCode || "—"}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Job Number
              </span>
              <strong style={{ fontSize: "12.5px", color: "var(--blue-700)", textAlign: "right" }}>
                {record.jobNumber || "—"}
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Warehouse Destination
              </span>
              <strong style={{ fontSize: "12.5px", color: "var(--ink-soft)", textAlign: "right" }}>
                {warehouseDisplay}
              </strong>
            </div>
          </div>

          {/* Column 2 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Transfer Date
              </span>
              <span style={{ fontSize: "12.5px", fontWeight: 600, textAlign: "right" }}>
                {record.transferDate || "—"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Total Returned Items
              </span>
              <strong style={{ fontSize: "12.5px", color: "var(--ink)", textAlign: "right" }}>
                {record.items.length} {record.items.length === 1 ? "Item" : "Items"} (
                {totalReturnedQty.toLocaleString()} Qty)
              </strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                User Created
              </span>
              <span style={{ fontSize: "12.5px", fontWeight: 600, color: "var(--ink)", textAlign: "right" }}>
                {record.userCreated || "—"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "12px",
                borderBottom: "1px dashed var(--line)",
                paddingBottom: "6px",
              }}
            >
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>
                Last Updated
              </span>
              <span style={{ fontSize: "12px", color: "var(--ink-soft)", textAlign: "right" }}>
                {record.userLastUpdated || "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Returned Stock Items Table Panel */}
      <div className="panel" style={{ padding: 0 }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
            background: "#f8fafc",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 800,
              color: "var(--ink)",
              textTransform: "uppercase",
            }}
          >
            Returned Stock Items
          </span>
          <span className="code-pill">
            {record.items?.length || 0} {record.items?.length === 1 ? "item" : "items"} listed
          </span>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No</th>
                  <th style={{ minWidth: "140px" }}>Item Code</th>
                  <th style={{ minWidth: "220px" }}>Item Name</th>
                  <th style={{ minWidth: "110px", textAlign: "right" }}>Qty Return</th>
                  <th style={{ minWidth: "80px", textAlign: "center" }}>Unit</th>
                  <th style={{ minWidth: "150px" }}>Source Location</th>
                  <th style={{ minWidth: "160px" }}>Destination Location</th>
                  <th style={{ minWidth: "180px" }}>Reason / Condition</th>
                </tr>
              </thead>
              <tbody>
                {record.items && record.items.length > 0 ? (
                  record.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <span className="code-pill">{item.itemCode || "—"}</span>
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {item.itemName || "—"}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <strong style={{ fontSize: "13px", color: "var(--ink)" }}>
                          {Number(item.quantity || 0).toLocaleString()}
                        </strong>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          style={{
                            fontSize: "11.5px",
                            fontWeight: 700,
                            color: "var(--blue-700)",
                          }}
                        >
                          {item.unit || "PCE"}
                        </span>
                      </td>
                      <td style={{ color: "var(--ink-soft)" }}>
                        {item.sourceLocation || "—"}
                      </td>
                      <td style={{ color: "var(--ink-soft)", fontWeight: 500 }}>
                        {item.destinationLocation || "—"}
                      </td>
                      <td style={{ color: "var(--ink-soft)", fontSize: "12px" }}>
                        {item.reason || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", padding: "30px 16px" }}>
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="box" />
                        </div>
                        <strong>No returned items in this transaction</strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {record.items && record.items.length > 0 && (
                <tfoot>
                  <tr style={{ background: "#f8fafc", borderTop: "1px solid var(--line)" }}>
                    <td
                      colSpan={3}
                      style={{
                        padding: "11px 14px",
                        textAlign: "right",
                        fontWeight: 800,
                        color: "var(--ink)",
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      Total Returned Quantity
                    </td>
                    <td
                      style={{
                        padding: "11px 14px",
                        textAlign: "right",
                        fontWeight: 800,
                        color: "var(--blue-700)",
                        fontSize: "13px",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
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
      <div className="panel" style={{ padding: "18px 24px" }}>
        <h4
          style={{
            margin: "0 0 8px 0",
            fontSize: "12px",
            fontWeight: 800,
            color: "var(--muted)",
            textTransform: "uppercase",
          }}
        >
          Transfer Note / Remarks
        </h4>
        <div
          style={{
            padding: "12px 16px",
            background: "#f8fafc",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            color: "var(--ink)",
            lineHeight: 1.5,
          }}
        >
          {record.transferNote && record.transferNote !== "-"
            ? record.transferNote
            : "No transfer note or remarks entered."}
        </div>
      </div>

      {/* Reject Reason Dialog */}
      <RejectDialog
        isOpen={isRejectDialogOpen}
        documentNumber={record.mutationCode}
        tier={record.status === "Waiting Approve 2" ? 2 : 1}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleConfirmReject}
        isLoading={actionBusy}
      />

      {/* Edit Form Modal */}
      <TransferStockReturnForm
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveEdit}
        existingRecord={record}
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
    </div>
  );
}

export default TransferStockReturnDetail;

