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
          padding: "14px 20px",
          background: "#fffbeb",
          borderBottom: "1px solid #fde68a",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              background: "#fef3c7",
              color: "#d97706",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="alertTriangle" size={18} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 800, color: "#92400e" }}>
                Stock Buffer Alerts &amp; Low Inventory Reminders
              </span>
              <Badge tone="orange">{triggeredItems.length} Low Stock</Badge>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "11.5px", color: "#b45309" }}>
              Automated reminders triggered when stock falls below custom buffer thresholds.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {onManageRules && (
            <Button
              variant="secondary"
              icon="list"
              onClick={onManageRules}
            >
              Master Notifikasi
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
              padding: "6px 8px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: 600,
            }}
            title={isCollapsed ? "Expand alert panel" : "Collapse alert panel"}
          >
            <Icon name={isCollapsed ? "chevronDown" : "chevron"} size={14} />
            <span style={{ marginLeft: "4px" }}>{isCollapsed ? "Show" : "Hide"}</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      {!isCollapsed && (
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Quick Metrics Bar */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#991b1b",
              }}
            >
              <span>Critical Shortage:</span>
              <strong style={{ fontSize: "13px" }}>{criticalCount} Items</strong>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#92400e",
              }}
            >
              <span>Low Buffer:</span>
              <strong style={{ fontSize: "13px" }}>{warningCount} Items</strong>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "6px 12px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "#166534",
              }}
            >
              <span>Safe Stock:</span>
              <strong style={{ fontSize: "13px" }}>{safeCount} Items</strong>
            </div>

            <div style={{ marginLeft: "auto", fontSize: "11.5px", color: "var(--muted)" }}>
              Total Monitored Buffer Rules: <strong>{records.length} items</strong>
            </div>
          </div>

          {/* Low Stock Table */}
          <div className="table-frame" style={{ border: "1px solid var(--line)", borderRadius: "4px" }}>
            <table className="data-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr style={{ background: "#f8fafc" }}>
                  <th style={{ width: "45px", textAlign: "center" }}>No</th>
                  <th style={{ width: "140px" }}>Item Code</th>
                  <th>Item Description</th>
                  <th style={{ width: "150px" }}>Category</th>
                  <th style={{ width: "100px", textAlign: "right" }}>Current Stock</th>
                  <th style={{ width: "110px", textAlign: "right" }}>Buffer Threshold</th>
                  <th style={{ width: "80px", textAlign: "right" }}>Deficit</th>
                  <th style={{ width: "110px", textAlign: "center" }}>Severity</th>
                  <th style={{ width: "130px", textAlign: "center" }}>Action</th>
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
                              }}
                              title="Create Purchase Requisition for this item"
                            >
                              <Icon name="cart" size={12} />
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
      )}
    </div>
  );
}

export default DashboardStockAlert;
