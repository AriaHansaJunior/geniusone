import React, { useEffect, useState } from "react";
import { Badge } from "../../../../components/ui/Badge";
import { Button } from "../../../../components/ui/Button";
import { LoadingBuffer } from "../../../../components/ui/LoadingBuffer";
import { fetchStockAdjustmentDetailApi } from "../../../../data/masterApi";
import type { StockAdjustmentRecord } from "./adjustment-stock-types";

interface AdjustmentStockDetailProps {
  code: string;
  onBack: () => void;
}

export function AdjustmentStockDetail({ code, onBack }: AdjustmentStockDetailProps) {
  const [record, setRecord] = useState<StockAdjustmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    fetchStockAdjustmentDetailApi(code)
      .then((res) => {
        if (!cancelled) setRecord(res);
      })
      .catch((err: any) => {
        if (!cancelled) setErrorMsg(err?.message || "Unable to load adjustment detail.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (loading && !record) {
    return (
      <div className="adj-detail-page">
        <LoadingBuffer
          variant="panel"
          label="Loading Stock Adjustment Detail..."
          sublabel="Fetching adjusted items and warehouse balance history..."
          skeletonRows={4}
        />
      </div>
    );
  }

  if (!record || errorMsg) {
    return (
      <div className="adj-detail-page">
        <div className="adj-card">
          <div className="adj-empty-state">
            <strong className="adj-empty-title">Stock Adjustment Not Found</strong>
            <span>{errorMsg || `Record "${code}" could not be found.`}</span>
            <Button type="button" variant="primary" onClick={onBack}>
              Back to List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="adj-detail-page">
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Warehouse</a>
            <span>/</span>
            <a onClick={onBack}>Adjustment</a>
            <span>/</span>
            <a onClick={onBack}>Adjustment Stock</a>
            <span>/</span>
            <span className="current">{record.adjustmentNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <Badge tone={record.sourceType === "EXCEL_IMPORT" ? "purple" : "blue"}>
            {record.sourceType === "EXCEL_IMPORT" ? "Excel Import" : "Manual"}
          </Badge>
          <Badge tone="green">{record.status}</Badge>
          <Button type="button" variant="secondary" onClick={() => window.print()}>
            Print
          </Button>
          <Button type="button" variant="outline" onClick={onBack}>
            Back to List
          </Button>
        </div>
      </div>

      <div className="adj-card">
        <div className="adj-card-header">
          <h3 className="adj-card-title">{record.adjustmentNumber}</h3>
        </div>

        <div className="adj-info-grid">
          <div className="adj-info-col">
            <div className="adj-info-row">
              <span className="adj-info-label">Adjustment Date</span>
              <span className="adj-info-value">{record.adjustmentDate || "—"}</span>
            </div>
            <div className="adj-info-row">
              <span className="adj-info-label">Warehouse</span>
              <span className="adj-info-value">{record.warehouseName || "—"}</span>
            </div>
            <div className="adj-info-row">
              <span className="adj-info-label">Reference Code</span>
              <span className="adj-info-value">{record.referenceCode || "—"}</span>
            </div>
          </div>

          <div className="adj-info-col">
            <div className="adj-info-row">
              <span className="adj-info-label">Entry Source</span>
              <span className="adj-info-value">
                {record.sourceType === "EXCEL_IMPORT" ? "Excel Import" : "Manual Entry"}
              </span>
            </div>
            <div className="adj-info-row">
              <span className="adj-info-label">Created By</span>
              <span className="adj-info-value">{record.createdBy || "—"}</span>
            </div>
            <div className="adj-info-row">
              <span className="adj-info-label">Note</span>
              <span className="adj-info-value">{record.note || "—"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="adj-table-panel">
        <div className="adj-table-panel__header">
          <h4 className="adj-table-panel__title">Adjusted Items ({record.items.length})</h4>
        </div>
        <div className="adj-table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th className="adj-th--center adj-col-no">No</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Warehouse</th>
                <th>Type</th>
                <th className="adj-th--right">Before</th>
                <th className="adj-th--right">Qty</th>
                <th className="adj-th--right">After</th>
                <th>Unit</th>
                <th>Lot No</th>
                <th>Coordinate</th>
                <th>Remark</th>
              </tr>
            </thead>
            <tbody>
              {record.items.map((line, idx) => (
                <tr key={line.id}>
                  <td className="adj-td--center">{idx + 1}</td>
                  <td>{line.itemCode}</td>
                  <td>{line.itemName}</td>
                  <td>{line.warehouseName}</td>
                  <td>
                    <Badge
                      tone={
                        line.adjustmentType === "OUT"
                          ? "red"
                          : line.adjustmentType === "SET"
                            ? "purple"
                            : "green"
                      }
                    >
                      {line.adjustmentType}
                    </Badge>
                  </td>
                  <td className="adj-td--right">{line.balanceBefore.toFixed(2)}</td>
                  <td className="adj-td--right">{line.quantity.toFixed(2)}</td>
                  <td className="adj-td--right">
                    <strong>{line.balanceAfter.toFixed(2)}</strong>
                  </td>
                  <td>{line.unit}</td>
                  <td>{line.lotNumber || "—"}</td>
                  <td>{line.coordinateName || "—"}</td>
                  <td>{line.remark || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdjustmentStockDetail;
