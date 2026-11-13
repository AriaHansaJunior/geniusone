import React from "react";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Icon } from "../../../components/ui/Icon";
import type { TransferStockReturnRecord } from "./transfer-stock-return-types";

interface TransferStockReturnDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TransferStockReturnRecord | null;
  onApprove?: (record: TransferStockReturnRecord) => void | Promise<any>;
  onReject?: (record: TransferStockReturnRecord) => void | Promise<any>;
  busy?: boolean;
}

export function TransferStockReturnDetailModal({
  isOpen,
  onClose,
  record,
  onApprove,
  onReject,
  busy = false,
}: TransferStockReturnDetailModalProps) {
  if (!isOpen || !record) return null;

  const getStatusTone = (status: TransferStockReturnRecord["status"]) => {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="master-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tsr-detail-title"
    >
      <div
        className="master-modal-content"
        style={{
          width: "min(860px, 95vw)",
          maxWidth: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <div className="master-modal-header" style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <h3 id="tsr-detail-title" className="master-modal-title">
              Stock Transfer Return Details
            </h3>
            <span
              style={{
                fontFamily: "ui-monospace, monospace",
                fontWeight: 700,
                color: "var(--blue-700)",
                background: "var(--blue-50)",
                padding: "2px 8px",
                borderRadius: "4px",
                fontSize: "12px",
              }}
            >
              {record.mutationCode}
            </span>
            <Badge tone={getStatusTone(record.status)}>{record.status}</Badge>
          </div>
          <button
            type="button"
            className="master-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="master-modal-body" style={{ padding: "18px 20px", overflowY: "auto" }}>
          {/* Metadata Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
              background: "#f8fafc",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              padding: "14px 16px",
            }}
          >
            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Mutation Code
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
                {record.mutationCode}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Production Code
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                {record.productionCode || "-"}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Job Number
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 700, color: "var(--blue-700)" }}>
                {record.jobNumber || "-"}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Transfer Date
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
                {record.transferDate}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                User Created
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", fontWeight: 600, color: "var(--ink)" }}>
                {record.userCreated}
              </p>
            </div>

            <div>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Last Updated
              </span>
              <p style={{ margin: "2px 0 0", fontSize: "12.5px", fontWeight: 600, color: "var(--slate-600)" }}>
                {record.userLastUpdated}
              </p>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--slate-500)", textTransform: "uppercase" }}>
                Transfer Note / Remarks
              </span>
              <p style={{ margin: "3px 0 0", fontSize: "12.5px", color: "var(--ink-soft)" }}>
                {record.transferNote || "No remarks entered."}
              </p>
            </div>
          </div>

          {/* Items Table Section */}
          <div style={{ marginTop: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <h4 style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "var(--ink)" }}>
                Returned Stock Items ({record.items.length})
              </h4>
            </div>

            <div
              className="table-scroll"
              style={{
                border: "1px solid var(--line)",
                borderRadius: "var(--radius-sm)",
                overflowX: "auto",
                WebkitOverflowScrolling: "touch",
              }}
            >
              <table style={{ width: "100%", minWidth: "720px", borderCollapse: "collapse", fontSize: "12px" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ width: "40px", padding: "10px 12px", textAlign: "center", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                      No
                    </th>
                    <th style={{ width: "140px", padding: "10px 12px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                      Item Code
                    </th>
                    <th style={{ minWidth: "180px", padding: "10px 12px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                      Item Name
                    </th>
                    <th style={{ width: "100px", padding: "10px 12px", textAlign: "right", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                      Qty Return
                    </th>
                    <th style={{ width: "80px", padding: "10px 12px", textAlign: "center", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                      Unit
                    </th>
                    <th style={{ minWidth: "150px", padding: "10px 12px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                      Destination Location
                    </th>
                    <th style={{ minWidth: "160px", padding: "10px 12px", textAlign: "left", fontSize: "10.5px", fontWeight: 800, color: "var(--slate-600)", textTransform: "uppercase" }}>
                      Reason / Condition
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.items.map((item, idx) => (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: idx === record.items.length - 1 ? "none" : "1px solid var(--line)",
                        background: "#ffffff",
                      }}
                    >
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--slate-500)" }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: "10px 12px", fontFamily: "ui-monospace, monospace", fontWeight: 600, color: "var(--ink)" }}>
                        {item.itemCode}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "var(--ink)" }}>
                        {item.itemName}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--ink)" }}>
                        {item.quantity.toLocaleString()}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: "var(--slate-600)" }}>
                        {item.unit}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--ink-soft)" }}>
                        {item.destinationLocation}
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--slate-600)", fontSize: "11.5px" }}>
                        {item.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="master-modal-footer" style={{ padding: "12px 20px", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {onApprove &&
              (record.status === "Draft" ||
                record.status === "Waiting Approve 1" ||
                record.status === "Waiting Approve 2") && (
                <Button
                  type="button"
                  variant="primary"
                  icon="check"
                  disabled={busy}
                  onClick={() => onApprove(record)}
                >
                  {record.status === "Waiting Approve 2" ? "Approve Stage 2" : "Approve Stage 1"}
                </Button>
              )}
            {onReject &&
              (record.status === "Draft" ||
                record.status === "Waiting Approve 1" ||
                record.status === "Waiting Approve 2") && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={busy}
                  onClick={() => onReject(record)}
                >
                  Reject
                </Button>
              )}
          </div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <Button
              type="button"
              className="button-refresh-sky"
              onClick={handlePrint}
              title="Print Stock Transfer Return"
            >
              Print
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
