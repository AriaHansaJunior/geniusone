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

  const isNonFacility = /non/i.test(item.facility);
  const warehouseBalances = item.warehouseBalances && item.warehouseBalances.length > 0
    ? item.warehouseBalances
    : [
      {
        warehouseId: item.warehouseId ?? null,
        warehouseName: item.warehouseName || "—",
        quantity: item.quantity,
        availableQuantity: item.availableQty ?? item.quantity,
        allocatedQuantity: item.allocatedQty ?? 0,
        coordinate: item.coordinate || "—",
        locationType: item.locationType || "Warehouse",
        lastMovementDate: item.lastMovementDate || "—",
        lotNumber: item.lotNumber || "—",
      },
    ];

  return (
    <div className="master-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="master-modal-content"
        style={{ width: "740px", maxWidth: "95vw" }}
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
        <div className="master-modal-body" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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
            <strong style={{ fontSize: "15px", color: "var(--ink)" }}>{item.materialItem}</strong>
            <div style={{ display: "flex", gap: "10px", marginTop: "4px", alignItems: "center" }}>
              <span className="code-pill">Code: {item.materialCode}</span>
              <span className="code-pill">Ext: {item.externalCode || "—"}</span>
            </div>
          </div>

          {/* Classification & Facility Meta */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            <div className="master-form-group">
              <span className="master-form-label">Classification</span>
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--canvas)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                }}
              >
                {item.classification}
              </div>
            </div>

            <div className="master-form-group">
              <span className="master-form-label">Facility</span>
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--canvas)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12.5px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Badge tone={isNonFacility ? "gray" : "purple"}>
                  {isNonFacility ? "NON FASILITAS" : "FASILITAS"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Total Quantities Summary */}
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

          {/* Section: Stock in Each Warehouse (Stok di Tiap Gudang) */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.3px" }}>
                Stock by Warehouse ({warehouseBalances.length})
              </span>
            </div>

            <div className="table-scroll" style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-sm)" }}>
              <table className="data-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th style={{ width: "45px", textAlign: "center" }}>No</th>
                    <th>Warehouse Name</th>
                    <th>Location Type</th>
                    <th>Coordinate</th>
                    <th>Last Movement</th>
                    <th style={{ textAlign: "right" }}>Stock Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseBalances.map((bal, idx) => (
                    <tr key={bal.warehouseId ?? idx}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                        {idx + 1}
                      </td>
                      <td>
                        <strong>{bal.warehouseName}</strong>
                      </td>
                      <td>{bal.locationType}</td>
                      <td>{bal.coordinate}</td>
                      <td>{bal.lastMovementDate}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <strong
                          style={{
                            color:
                              bal.quantity > 0
                                ? "var(--green-700, #15803d)"
                                : "var(--red-600)",
                          }}
                        >
                          {bal.quantity.toFixed(2)} {item.unit}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                    <td colSpan={5} style={{ textAlign: "right" }}>
                      Total Stock Across Warehouses:
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink)" }}>
                      {item.quantity.toFixed(2)} {item.unit}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
