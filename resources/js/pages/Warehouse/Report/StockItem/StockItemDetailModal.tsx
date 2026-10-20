import React from "react";
import { Icon } from "../../../../components/ui/Icon";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import type { WarehouseStockRecord } from "./stock-item-types";

interface StockItemDetailModalProps {
  item: WarehouseStockRecord | null;
  onClose: () => void;
}

export function StockItemDetailModal({ item, onClose }: StockItemDetailModalProps) {
  if (!item) return null;

  return (
    <div className="master-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="master-modal-content"
        style={{ width: "640px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="master-modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <h3 className="master-modal-title">Warehouse Stock Details</h3>
            <Badge tone={item.stockStatus === "Available" ? "green" : "red"}>
              {item.stockStatus}
            </Badge>
          </div>
          <button
            type="button"
            className="master-modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="master-modal-body">
          {/* Item Identification Card */}
          <div
            style={{
              padding: "12px 16px",
              background: "#f8fafc",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <span style={{ fontSize: "10.5px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
              MATERIAL ITEM
            </span>
            <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{item.materialItem}</strong>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px", alignItems: "center" }}>
              <span className="code-pill">Code: {item.materialCode}</span>
              <span className="code-pill">Ext: {item.externalCode}</span>
            </div>
          </div>

          {/* Location & Facility Information */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div className="master-form-group">
              <span className="master-form-label">Classification</span>
              <div style={{ padding: "8px 12px", background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", fontSize: "12.5px", fontWeight: 600 }}>
                {item.classification}
              </div>
            </div>

            <div className="master-form-group">
              <span className="master-form-label">Facility</span>
              <div style={{ padding: "8px 12px", background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", fontSize: "12.5px", fontWeight: 600 }}>
                <Badge tone="purple">{item.facility}</Badge>
              </div>
            </div>

            <div className="master-form-group">
              <span className="master-form-label">Location Type / Warehouse</span>
              <div style={{ padding: "8px 12px", background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", fontSize: "12.5px" }}>
                <strong>{item.locationType}</strong> · {item.warehouseName}
              </div>
            </div>

            <div className="master-form-group">
              <span className="master-form-label">Storage Coordinate</span>
              <div style={{ padding: "8px 12px", background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-sm)", fontSize: "12.5px" }}>
                <strong style={{ color: "var(--blue-700)" }}>{item.coordinate}</strong>
                {item.zone && <span style={{ color: "var(--muted)", marginLeft: "6px" }}>({item.zone})</span>}
              </div>
            </div>
          </div>

          {/* Quantities & Lots Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
              padding: "12px",
              background: "#f1f5f9",
              borderRadius: "var(--radius-sm)",
              textAlign: "center",
            }}
          >
            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", display: "block" }}>
                TOTAL QUANTITY
              </span>
              <strong style={{ fontSize: "16px", color: "var(--ink)" }}>
                {item.quantity.toFixed(2)} {item.unit}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", display: "block" }}>
                AVAILABLE QUANTITY
              </span>
              <strong style={{ fontSize: "16px", color: "var(--green-700, #15803d)" }}>
                {(item.availableQty ?? item.quantity).toFixed(2)} {item.unit}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--muted)", display: "block" }}>
                ALLOCATED / RESERVED
              </span>
              <strong style={{ fontSize: "16px", color: "var(--orange-700, #b45309)" }}>
                {(item.allocatedQty ?? 0).toFixed(2)} {item.unit}
              </strong>
            </div>
          </div>

          {/* Additional Traceability Meta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "12px" }}>
            <div>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>Lot / Batch Number: </span>
              <strong>{item.lotNumber || "—"}</strong>
            </div>
            <div>
              <span style={{ color: "var(--muted)", fontWeight: 600 }}>Last Movement: </span>
              <strong>{item.lastMovementDate || "—"}</strong>
            </div>
            {item.remark && (
              <div style={{ gridColumn: "span 2", marginTop: "4px" }}>
                <span style={{ color: "var(--muted)", fontWeight: 600 }}>Remark: </span>
                <span>{item.remark}</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="master-modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
