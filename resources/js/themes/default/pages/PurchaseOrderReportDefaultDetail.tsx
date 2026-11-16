import React from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { docToSlug } from "../../../utils/docSlug";
import type { TableRow } from "../../../types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface PurchaseOrderReportDefaultDetailProps {
  row: TableRow;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function PurchaseOrderReportDefaultDetail({
  row,
  onBack,
  onNavigateDetail,
}: PurchaseOrderReportDefaultDetailProps) {
  const prNumber = String(row._rawPr || "—");
  const poNumber = String(row._rawPo || "—");
  const bpbNumber = String(row._rawBpbNumber || "—");
  const supplier = String(row._rawSupplier || "—");
  const dept = String(row._rawDeptRequest || "—");
  const section = String(row._rawSection || "—");
  const statusPr = String(row._rawStatusPr || "—");
  const statusPo = String(row._rawStatusPo || "—");
  const facility = String(row._rawFacility || "—");
  const subTotal = String(row._rawSubTotal || "—");
  const price = String(row._rawPrice || "—");
  const ppn = String(row._rawTotalPpn || "—");
  const pph = String(row._rawTotalPph || "—");
  const qtyPr = String(row._rawQtyPr || "—");
  const qtyPo = String(row._rawQtyPo || "—");
  const qtyBpb = String(row._rawQtyBpb || "—");
  const outstandingPp = String(row._rawOutstandingPp || "—");
  const bcType = String(row._rawBc || "—");
  const ajuNumber = String(row._rawAju || "—");
  const dnNumber = String(row._rawSj || "—");
  const description = String(row._rawDescription || "—");
  const materialName = String(row._rawMaterialName || "—");
  const materialCode = String(row._rawMaterialCode || "—");

  const columns: SmartOneField[][] = [
    [
      {
        label: "PR Number",
        value:
          prNumber !== "—" ? (
            <button
              type="button"
              className="smartone-kv-link"
              onClick={() => onNavigateDetail?.("pr", docToSlug(prNumber))}
            >
              {prNumber}
            </button>
          ) : (
            "—"
          ),
      },
      { label: "PR Status", value: statusPr },
      { label: "Requesting Dept.", value: dept },
      { label: "Section", value: section },
    ],
    [
      {
        label: "PO Number",
        value:
          poNumber !== "—" ? (
            <button
              type="button"
              className="smartone-kv-link"
              onClick={() => onNavigateDetail?.("po", docToSlug(poNumber))}
            >
              {poNumber}
            </button>
          ) : (
            "—"
          ),
      },
      { label: "PO Status", value: statusPo },
      { label: "Supplier", value: supplier },
      { label: "Sub Total", value: `IDR ${subTotal}` },
    ],
    [
      {
        label: "BPB Number",
        value:
          bpbNumber !== "—" ? (
            <button
              type="button"
              className="smartone-kv-link"
              onClick={() => onNavigateDetail?.("warehouse", docToSlug(bpbNumber))}
            >
              {bpbNumber}
            </button>
          ) : (
            "—"
          ),
      },
      { label: "Delivery Note (SJ)", value: dnNumber },
      { label: "Customs (BC)", value: bcType },
      { label: "Aju Number", value: ajuNumber },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle="Detail Combined PR–PO Report"
      onBack={onBack}
      toolbarLeft={
        <>
          <Badge tone="blue">{`PO: ${statusPo}`}</Badge>
          <Badge tone="green">{`PR: ${statusPr}`}</Badge>
          <Badge tone="purple">{facility}</Badge>
          <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
            Print PDF
          </Button>
        </>
      }
      columns={columns}
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">Document Line Item Cross-Match</h2>
            <span className="smartone-card-section__meta">PR → PO → BPB Traceability</span>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="detail-data-table">
                <thead>
                  <tr>
                    <th className="smartone-td-center">No</th>
                    <th>Material Name &amp; Code</th>
                    <th>Dept / Section</th>
                    <th className="smartone-td-right">Qty PR</th>
                    <th className="smartone-td-right">Qty PO</th>
                    <th className="smartone-td-right">Qty BPB</th>
                    <th className="smartone-td-right">Outst. PP</th>
                    <th className="smartone-td-right">Unit Price</th>
                    <th className="smartone-td-right">PPn</th>
                    <th className="smartone-td-right">PPh</th>
                    <th className="smartone-td-right">Sub Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="smartone-td-center smartone-td-muted">1</td>
                    <td>
                      <span className="smartone-td-bold">{materialName}</span>
                      <span className="smartone-td-sub smartone-td-mono">{materialCode}</span>
                    </td>
                    <td>
                      <strong>{dept}</strong>
                      <span className="smartone-td-sub">{section}</span>
                    </td>
                    <td className="smartone-td-right smartone-td-mono">{qtyPr}</td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">{qtyPo}</td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">{qtyBpb}</td>
                    <td className="smartone-td-right smartone-td-mono">{outstandingPp}</td>
                    <td className="smartone-td-right smartone-td-mono">IDR {price}</td>
                    <td className="smartone-td-right smartone-td-mono">IDR {ppn}</td>
                    <td className="smartone-td-right smartone-td-mono">IDR {pph}</td>
                    <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                      IDR {subTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
      notesSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">Description / Purpose</h2>
          </div>
          <div className="smartone-card-section__body">
            <div className="smartone-notes-box">{description}</div>
          </div>
        </div>
      }
    />
  );
}
