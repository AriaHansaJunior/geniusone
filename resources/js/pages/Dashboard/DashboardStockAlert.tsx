import React, { useState } from "react";
import { Icon } from "../../components/ui/Icon";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import type { StockNotificationRecord } from "./StockNotificationMaster/stock-notification-types";
import { initialStockNotificationRecords } from "./StockNotificationMaster/stock-notification-data";

interface DashboardStockAlertProps {
  onAddNewRule?: () => void;
  onManageRules?: () => void;
  onNavigatePrCreate?: () => void;
}

export function DashboardStockAlert({
  onAddNewRule,
  onManageRules,
  onNavigatePrCreate,
}: DashboardStockAlertProps) {
  const [records] = useState<StockNotificationRecord[]>(initialStockNotificationRecords);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter triggered items (active rules where current stock <= buffer quantity)
  const triggeredItems = records.filter(
    (item) => item.status === "Active" && item.currentStock <= item.bufferQuantity
  );

  const criticalCount = triggeredItems.filter(
    (item) => item.currentStock <= Math.floor(item.bufferQuantity / 2)
  ).length;

  const warningCount = triggeredItems.length - criticalCount;
  const safeCount = records.filter(
    (item) => item.status === "Active" && item.currentStock > item.bufferQuantity
  ).length;

  return (
    <div
      className="dashboard-stock-alert-card"
      style={{
        background: "var(--white)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        width: "100%",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Alert Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 18px",
          background: "#fffbeb",
          borderBottom: "1px solid #fde68a",
          flexWrap: "wrap",
          gap: "10px",
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: "1 1 auto" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "#fef3c7",
              color: "#d97706",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="alertTriangle" size={18} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#92400e", whiteSpace: "nowrap" }}>
                Stock Buffer Alerts
              </span>
              <Badge tone="orange">{triggeredItems.length} Low Stock</Badge>
              {criticalCount > 0 && (
                <Badge tone="red">{criticalCount} Critical</Badge>
              )}
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#b45309" }}>
              Automated reminders triggered when stock falls below buffer thresholds.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, flexWrap: "wrap" }}>
          {onManageRules && (
            <Button
              variant="secondary"
              icon="list"
              onClick={onManageRules}
            >
              Stock Notification
            </Button>
          )}

          {onAddNewRule && (
            <Button
              variant="primary"
              icon="plus"
              onClick={onAddNewRule}
            >
              Add New
            </Button>
          )}

          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              border: "1px solid #fde68a",
              background: "#fef3c7",
              color: "#92400e",
              borderRadius: "4px",
              padding: "6px 10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: 600,
              minHeight: "32px",
            }}
            title={isCollapsed ? "Expand alert panel" : "Collapse alert panel"}
          >
            <span>{isCollapsed ? "Show" : "Hide"}</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!isCollapsed && (
        <div
          style={{
            padding: "14px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            minWidth: 0,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              alignItems: "center",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#991b1b",
              }}
            >
              <span>Critical Shortage:</span>
              <strong>{criticalCount} Items</strong>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#92400e",
              }}
            >
              <span>Low Buffer:</span>
              <strong>{warningCount} Items</strong>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 10px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: 600,
                color: "#166534",
              }}
            >
              <span>Safe Stock:</span>
              <strong>{safeCount} Items</strong>
            </div>
          </div>

          {/* Low Stock Table */}
          <div
            className="table-frame"
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
              width: "100%",
              minWidth: 0,
            }}
          >
            <div className="table-scroll">
              <table className="data-table" style={{ width: "100%", margin: 0 }}>
                <thead>
                  <tr style={{ background: "#f8fafc" }}>
                    <th style={{ width: "45px", textAlign: "center" }}>No</th>
                    <th style={{ width: "120px" }}>Item Code</th>
                    <th style={{ minWidth: "160px" }}>Item Description</th>
                    <th style={{ width: "120px" }}>Category</th>
                    <th style={{ width: "95px", textAlign: "right" }}>Current Stock</th>
                    <th style={{ width: "105px", textAlign: "right" }}>Buffer Threshold</th>
                    <th style={{ width: "80px", textAlign: "right" }}>Deficit</th>
                    <th style={{ width: "95px", textAlign: "center" }}>Severity</th>
                    <th style={{ width: "95px", textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {triggeredItems.length > 0 ? (
                    triggeredItems.map((item, idx) => {
                      const deficit = item.bufferQuantity - item.currentStock;
                      const isCritical = item.currentStock <= Math.floor(item.bufferQuantity / 2);

                      return (
                        <tr key={item.id}>
                          <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td>
                            <span className="code-pill">{item.itemCode}</span>
                          </td>
                          <td>
                            <strong style={{ fontSize: "12.5px" }}>{item.itemName}</strong>
                            {item.notes && (
                              <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                                {item.notes}
                              </div>
                            )}
                          </td>
                          <td>
                            <span style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                              {item.category}
                            </span>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "#dc2626" }}>
                            {item.currentStock.toLocaleString("en-US")} {item.unit}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, color: "var(--blue-600)" }}>
                            {item.bufferQuantity.toLocaleString("en-US")} {item.unit}
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 600, color: "#b91c1c" }}>
                            {deficit > 0 ? `-${deficit} ${item.unit}` : `0 ${item.unit}`}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <Badge tone={isCritical ? "red" : "orange"}>
                              {isCritical ? "Critical" : "Low Stock"}
                            </Badge>
                          </td>
                          <td style={{ textAlign: "center" }}>
                            {onNavigatePrCreate ? (
                              <button
                                type="button"
                                onClick={onNavigatePrCreate}
                                style={{
                                  border: "1px solid var(--line)",
                                  background: "var(--white)",
                                  borderRadius: "4px",
                                  padding: "3px 8px",
                                  fontSize: "11.5px",
                                  fontWeight: 600,
                                  color: "var(--blue-600)",
                                  cursor: "pointer",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  whiteSpace: "nowrap",
                                }}
                                title="Create Purchase Requisition for this item"
                              >
                                <span>Reorder</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                                Pending PR
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: "24px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "var(--green-700)" }}>
                          <Icon name="checkCircle" size={16} />
                          <span style={{ fontWeight: 600 }}>All items are within safe stock buffer levels!</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardStockAlert;
