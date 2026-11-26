import React, { useCallback, useEffect, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { LoadingBuffer } from "../../../components/ui/LoadingBuffer";
import { useNotification } from "../../../context/NotificationContext";
import {
  cancelWarehouseStockTransferApi,
  fetchWarehouseStockTransferDetailApi,
  postWarehouseStockTransferApi,
} from "../../../data/masterApi";
import type { WarehouseStockTransferRecord } from "./warehouse-stock-transfer-types";

interface WarehouseStockTransferDetailProps {
  code: string;
  onBack: () => void;
}

export function WarehouseStockTransferDetail({
  code,
  onBack,
}: WarehouseStockTransferDetailProps) {
  const { notifySuccess, notifyError } = useNotification();
  const [record, setRecord] = useState<WarehouseStockTransferRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<"post" | "cancel" | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWarehouseStockTransferDetailApi(code);
      setRecord(data);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const handlePost = async () => {
    if (!record) return;
    try {
      setBusyAction("post");
      const res = await postWarehouseStockTransferApi(record.id);
      setRecord(res.data);
      notifySuccess("Stock Transfer Posted", res.message || `${record.transferNumber} posted.`);
      window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
    } catch (err: any) {
      notifyError("Post Transfer Failed", err?.message || "Failed to post stock transfer.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleCancelTransfer = async () => {
    if (!record) return;
    try {
      setBusyAction("cancel");
      const res = await cancelWarehouseStockTransferApi(record.id, "Cancelled from detail view");
      setRecord(res.data);
      notifySuccess("Stock Transfer Cancelled", res.message || `${record.transferNumber} cancelled.`);
      window.dispatchEvent(new CustomEvent("geniusone_approval_changed"));
    } catch (err: any) {
      notifyError("Cancel Transfer Failed", err?.message || "Failed to cancel draft transfer.");
    } finally {
      setBusyAction(null);
    }
  };

  if (loading && !record) {
    return (
      <div className="wst-detail-page">
        <div className="wst-card">
          <LoadingBuffer variant="inline" label="Loading Stock Transfer Details..." />
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="wst-detail-page">
        <div className="wst-card">
          <div className="wst-banner wst-banner--error">Stock Transfer record not found.</div>
          <div className="wst-form-actions">
            <Button type="button" variant="secondary" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const badgeTone =
    record.status === "Posted" ? "green" : record.status === "Draft" ? "orange" : "red";

  return (
    <div className="wst-detail-page">
      <div className="wst-card">
        <div className="wst-toolbar">
          <div>
            <span className="eyebrow">WAREHOUSE STOCK TRANSFER</span>
            <h2 className="table-panel__title">{record.transferNumber}</h2>
          </div>

          <div className="wst-row-actions">
            <Badge tone={badgeTone}>{record.status}</Badge>
            {record.status === "Draft" && (
              <>
                <Button
                  type="button"
                  variant="primary"
                  disabled={busyAction !== null}
                  onClick={handlePost}
                >
                  {busyAction === "post" ? "Posting..." : "Post Transfer"}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busyAction !== null}
                  onClick={handleCancelTransfer}
                >
                  {busyAction === "cancel" ? "Cancelling..." : "Cancel Transfer"}
                </Button>
              </>
            )}
            <Button type="button" variant="secondary" onClick={onBack}>
              Back
            </Button>
          </div>
        </div>

        <div className="wst-meta-grid">
          <div className="wst-meta-item">
            <span className="wst-meta-item__label">Source Warehouse</span>
            <span className="wst-meta-item__value">
              {record.sourceWarehouseName}
              {record.sourceCoordinateName ? ` (${record.sourceCoordinateName})` : ""}
            </span>
          </div>
          <div className="wst-meta-item">
            <span className="wst-meta-item__label">Destination Warehouse</span>
            <span className="wst-meta-item__value">
              {record.destinationWarehouseName}
              {record.destinationCoordinateName ? ` (${record.destinationCoordinateName})` : ""}
            </span>
          </div>
          <div className="wst-meta-item">
            <span className="wst-meta-item__label">Transfer Date</span>
            <span className="wst-meta-item__value">{record.transferDate}</span>
          </div>
          <div className="wst-meta-item">
            <span className="wst-meta-item__label">Created By</span>
            <span className="wst-meta-item__value">{record.creatorName || "—"}</span>
          </div>
          <div className="wst-meta-item">
            <span className="wst-meta-item__label">Posted By / At</span>
            <span className="wst-meta-item__value">
              {record.postedByName
                ? `${record.postedByName} (${record.postedAt?.slice(0, 16) || ""})`
                : "Not Posted"}
            </span>
          </div>
          <div className="wst-meta-item">
            <span className="wst-meta-item__label">Reference / Note</span>
            <span className="wst-meta-item__value">
              {[record.referenceCode, record.note].filter(Boolean).join(" · ") || "—"}
            </span>
          </div>
        </div>
      </div>

      <div className="wst-table-card">
        <div className="wst-items-header">
          <h3 className="wst-items-title">Transferred Material Lines ({record.items.length})</h3>
        </div>
        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="wst-col-no">No</th>
                  <th>Item Code</th>
                  <th>Item Name</th>
                  <th className="wst-col-num">Quantity</th>
                  <th>Unit</th>
                  <th>Lot Number</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                {record.items.map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td className="wst-col-no">{idx + 1}</td>
                    <td>{line.itemCode || "—"}</td>
                    <td>{line.itemName || "—"}</td>
                    <td className="wst-col-num">{line.quantity.toFixed(2)}</td>
                    <td>{line.unit}</td>
                    <td>{line.lotNumber || "—"}</td>
                    <td>{line.remark || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
