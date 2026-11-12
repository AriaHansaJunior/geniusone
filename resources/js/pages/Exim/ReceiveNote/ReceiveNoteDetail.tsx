import React, { useState, useEffect, useRef } from "react";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { initialReceiveNoteRecords } from "./receive-note-data";
import type { ReceiveNoteRecord } from "./receive-note-types";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { getLocalApprovalState } from "../../../services/approvalApi";
import { normalizeApprovalStatus, type DocumentApprovalState } from "../../../types/approval";
import { fetchDetail } from "../../../data/api";

interface ReceiveNoteDetailProps {
  code: string;
  onBack: () => void;
  record?: ReceiveNoteRecord;
  onApprovalChange?: (rnNumber: string, state: DocumentApprovalState) => void;
  onCreateBpb?: (rnNumber: string) => void;
}

export function ReceiveNoteDetail({
  code,
  onBack,
  record,
  onApprovalChange,
  onCreateBpb,
}: ReceiveNoteDetailProps) {
  const [printMenuOpen, setPrintMenuOpen] = useState(false);
  const printMenuRef = useRef<HTMLDivElement>(null);

  // Close print dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        printMenuRef.current &&
        !printMenuRef.current.contains(event.target as Node)
      ) {
        setPrintMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [apiData, setApiData] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    if (code) {
      fetchDetail("rn", code).then((data: any) => {
        if (isMounted && data) {
          setApiData(data);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [code]);

  // Find record by code/id/rnNumber or API data
  const baseData =
    record ||
    apiData ||
    initialReceiveNoteRecords.find(
      (r) =>
        r.id === code ||
        r.rnNumber === code ||
        (typeof r.rnNumber === "string" && r.rnNumber.replace(/[\/\\]/g, "-") === code)
    ) ||
    initialReceiveNoteRecords[0];

  const rnData: ReceiveNoteRecord = {
    ...baseData,
    rnNumber: baseData.rnNumber || baseData.rn_number || code || "0001/RN-IMLI/X/2026",
    arrivalDate: baseData.arrivalDate || baseData.formatted_arrival_date || baseData.arrival_date || "-",
    supplier: typeof baseData.supplier === "object" ? (baseData.supplier?.name || "—") : (baseData.supplier || "—"),
    facility: baseData.facility || (baseData.dn_status === 1 ? "FASILITAS" : "NON FASILITAS"),
    bcCode: baseData.bcCode || baseData.bc_code || "BC 4.0",
    currency: typeof baseData.currency === "object" ? (baseData.currency?.code || "IDR") : (baseData.currency || "IDR"),
    rate: Number(baseData.rate || 1.0),
    invoiceNumber: baseData.invoiceNumber || baseData.invoice_number || "-",
    invoiceDate: baseData.invoiceDate || baseData.invoice_date || "-",
    taxInvoiceNumber: baseData.taxInvoiceNumber || baseData.tax_invoice || "-",
    taxInvoiceDate: baseData.taxInvoiceDate || baseData.tax_invoice_date || "-",
    licensePlate: baseData.licensePlate || baseData.license_plate || "-",
    vehicleType: baseData.vehicleType || baseData.vehicle_type || "-",
    ajuNumber: baseData.ajuNumber || baseData.aju_number || "00004001456220261014004999",
    noDaftar: baseData.noDaftar || baseData.no_daftar || "090400",
    tanggalDaftar: baseData.tanggalDaftar || baseData.tanggal_daftar || "-",
    nomorPackingList: baseData.nomorPackingList || baseData.pl_number || "-",
    tanggalPackingList: baseData.tanggalPackingList || baseData.pl_date || "-",
    description: baseData.description || baseData.note || baseData.notes || baseData.remark || "-",
    note: baseData.note || baseData.notes || baseData.description || baseData.remark || "-",
    remark: baseData.remark || baseData.note || baseData.description || "-",
    status: baseData.status || "Waiting for Approve 1",
    createdAt: baseData.createdAt || baseData.created_at || "-",
    lastUpdatedAt: baseData.lastUpdatedAt || baseData.updated_at || "-",
    approval1At: baseData.approval1At || baseData.approval_1_at || "-",
    approval2At: baseData.approval2At || baseData.approval_2_at || "-",
    items: Array.isArray(baseData.items) ? baseData.items.map((it: any, i: number) => ({
      id: it.id || `item-${i}`,
      poNumber: it.poNumber || it.po_number || "-",
      poDate: it.poDate || it.po_date || "-",
      dnNumber: it.dnNumber || it.dn_number || "-",
      dnDate: it.dnDate || it.dn_date || "-",
      jobNumber: it.jobNumber || it.job_number || "-",
      jobDate: it.jobDate || it.job_date || "-",
      itemCode: it.itemCode || it.item_code || it.code || "-",
      itemName: it.itemName || it.item_name || it.item || "-",
      qty: Number(it.qty ?? it.gross_quantity ?? it.quantity ?? 0),
      suratJalanQty: Number(it.suratJalanQty ?? it.gross_quantity ?? it.quantity ?? 0),
      unit: it.unit || "PCE",
      rafaksi: Number(it.rafaksi || 0),
      rafaksiPercent: Number(it.rafaksiPercent || 0),
      pricePerUnit: Number(it.pricePerUnit ?? it.price ?? 0),
      priceSubtotal: Number(it.priceSubtotal ?? ((it.qty ?? it.quantity ?? 0) * (it.price ?? 0))),
      price2PerUnit: Number(it.price2PerUnit ?? it.price ?? 0),
      price2Subtotal: Number(it.price2Subtotal ?? ((it.qty ?? it.quantity ?? 0) * (it.price ?? 0))),
      remark: it.remark || it.note || "-",
    })) : [],
    totalQty: Number(baseData.totalQty ?? baseData.total_gross_quantity ?? 0),
    amount: Number(baseData.amount ?? 0),
    biayaLain: Number(baseData.biayaLain ?? 0),
    discountPercent: Number(baseData.discountPercent ?? 0),
    discountAmount: Number(baseData.discountAmount ?? 0),
    ppnPercent: Number(baseData.ppnPercent ?? 12),
    ppnAmount: Number(baseData.ppnAmount ?? 0),
    grandTotal: Number(baseData.grandTotal ?? 0),
  };

  const [approvalState, setApprovalState] = useState<DocumentApprovalState>(() =>
    getLocalApprovalState("receive_note", rnData.rnNumber, normalizeApprovalStatus(rnData.status))
  );

  useEffect(() => {
    setApprovalState(
      getLocalApprovalState("receive_note", rnData.rnNumber, normalizeApprovalStatus(rnData.status))
    );
  }, [rnData.rnNumber, rnData.status]);

  const isApproved = approvalState.status === "APPROVED";

  const handlePrint = (mode: "job" | "po") => {
    setPrintMenuOpen(false);
    window.print();
  };

  return (
    <div className="rn-detail-page">
      {/* Top Header */}
      <div className="rn-detail-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <h1 className="rn-detail-title" style={{ margin: 0 }}>
            Detail Receive Note - {rnData.rnNumber}
          </h1>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <ApprovalStatusBadge status={approvalState.status} />
          {isApproved && (
            <span className="badge badge--green" style={{ fontSize: "11px", fontWeight: 700 }}>
              <Icon name="lock" size={12} style={{ marginRight: "3px" }} /> Locked
            </span>
          )}
          {isApproved && !rnData.bpb_number && !rnData.is_received_in_bpb && !(rnData as any).warehouseTransaction && !(rnData as any).bpbNumber && onCreateBpb && (
            <Button
              variant="primary"
              icon="box"
              onClick={() => onCreateBpb(rnData.rnNumber)}
              title="Create Receive Material (BPB) for this Approved RN"
            >
              Create BPB
            </Button>
          )}
          {Boolean(rnData.bpb_number || rnData.is_received_in_bpb || (rnData as any).bpbNumber || ((rnData as any).warehouseTransaction && (rnData as any).warehouseTransaction !== "—" && (rnData as any).warehouseTransaction !== "-")) && (
            <span
              className="badge badge--green"
              style={{ fontSize: "11px", fontWeight: 700, padding: "5px 9px", display: "inline-flex", alignItems: "center", gap: "4px" }}
              title={`Received into Warehouse BPB ${rnData.bpb_number || (rnData as any).bpbNumber || (rnData as any).warehouseTransaction || ""}`}
            >
              <Icon name="check" size={12} /> Received in BPB {rnData.bpb_number || (rnData as any).bpbNumber || (rnData as any).warehouseTransaction ? `(${rnData.bpb_number || (rnData as any).bpbNumber || (rnData as any).warehouseTransaction})` : ""}
            </span>
          )}
          <Button variant="secondary" icon="print" onClick={() => handlePrint("po")}>
            Print Document
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rn-detail-card">
        {/* Dynamic Two-Stage Approval Action Bar & Timeline */}
        <div className="rn-detail-status-bar">
          <ApprovalActionBar
            module="receive_note"
            documentId={rnData.rnNumber}
            documentNumber={rnData.rnNumber}
            state={approvalState}
            onStateChange={(nextState) => {
              setApprovalState(nextState);
              onApprovalChange?.(rnData.rnNumber, nextState);
            }}
          />
          <ApprovalTimeline state={approvalState} />
        </div>

        {/* 3-Column Document Information */}
        <div className="rn-detail-meta-grid">
          {/* Column 1 */}
          <div className="rn-meta-col">
            <div className="rn-meta-section-title">
              <Icon name="file" size={13} />
              <span>Document & Supplier</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">RN Number</span>
              <span className="rn-meta-value font-medium text-ink">
                {rnData.rnNumber}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Arrival Date</span>
              <span className="rn-meta-value">{rnData.arrivalDate}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Supplier</span>
              <span className="rn-meta-value font-medium text-ink">
                {rnData.supplier}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Facility of Document</span>
              <span className="rn-meta-value">
                <span className="rn-badge-facility">{rnData.facility}</span>
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Code of BC Document</span>
              <span className="rn-meta-value font-medium">{rnData.bcCode}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Currency</span>
              <span className="rn-meta-value">{rnData.currency}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Rate</span>
              <span className="rn-meta-value font-mono">
                {rnData.rate.toFixed(4)}
              </span>
            </div>

            {Boolean(rnData.bpb_number || (rnData as any).warehouseTransaction) && (
              <div className="rn-meta-item">
                <span className="rn-meta-label">Warehouse BPB</span>
                <span className="rn-meta-value font-mono font-medium text-ink">
                  {rnData.bpb_number || (rnData as any).warehouseTransaction}
                </span>
              </div>
            )}
          </div>

          {/* Column 2 */}
          <div className="rn-meta-col">
            <div className="rn-meta-section-title">
              <Icon name="box" size={13} />
              <span>Invoice & Logistics</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Invoice Number</span>
              <span className="rn-meta-value">{rnData.invoiceNumber}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Invoice Date</span>
              <span className="rn-meta-value">{rnData.invoiceDate}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tax Invoice Number</span>
              <span className="rn-meta-value">{rnData.taxInvoiceNumber}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tax Invoice Date</span>
              <span className="rn-meta-value">{rnData.taxInvoiceDate}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Vehicle Type</span>
              <span className="rn-meta-value">{rnData.vehicleType}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">License Plate</span>
              <span className="rn-meta-value font-mono font-medium">
                {rnData.licensePlate}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Nomor Aju</span>
              <span className="rn-meta-value">
                <span className="rn-link-code font-mono">
                  {rnData.ajuNumber}
                </span>
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Nomor Daftar</span>
              <span className="rn-meta-value font-mono">{rnData.noDaftar}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tanggal Daftar</span>
              <span className="rn-meta-value">{rnData.tanggalDaftar}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Nomor Packing List</span>
              <span className="rn-meta-value font-mono">
                {rnData.nomorPackingList}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Tanggal Packing List</span>
              <span className="rn-meta-value">{rnData.tanggalPackingList}</span>
            </div>
          </div>

          {/* Column 3 */}
          <div className="rn-meta-col">
            <div className="rn-meta-section-title">
              <Icon name="clock" size={13} />
              <span>Customs & Timestamps</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Created at</span>
              <span className="rn-meta-value">{rnData.createdAt}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Last Updated at</span>
              <span className="rn-meta-value">{rnData.lastUpdatedAt}</span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Approval 1 at</span>
              <span className="rn-meta-value">
                {approvalState.approved1At
                  ? `${approvalState.approved1At}${approvalState.approved1By ? ` by ${approvalState.approved1By}` : ""}`
                  : rnData.approval1At}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Approval 2 at</span>
              <span className="rn-meta-value">
                {approvalState.approved2At
                  ? `${approvalState.approved2At}${approvalState.approved2By ? ` by ${approvalState.approved2By}` : ""}`
                  : rnData.approval2At}
              </span>
            </div>

            <div className="rn-meta-item">
              <span className="rn-meta-label">Notes / Remarks</span>
              <span className="rn-meta-value font-medium text-ink">
                {rnData.description && rnData.description !== "-" ? rnData.description : (rnData.note && rnData.note !== "-" ? rnData.note : (rnData.remark || "-"))}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Remarks Callout if present */}
        {((rnData.description && rnData.description !== "-") || (rnData.note && rnData.note !== "-") || (rnData.remark && rnData.remark !== "-")) && (
          <div style={{
            background: "var(--surface-hover, #f8fafc)",
            border: "1px solid var(--border-color, #e2e8f0)",
            borderRadius: "6px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "flex-start",
            gap: "10px"
          }}>
            <Icon name="file" size={16} className="text-secondary" style={{ marginTop: "2px", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink-secondary, #64748b)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                Notes / Remarks
              </div>
              <div style={{ fontSize: "14px", color: "var(--ink, #1e293b)", whiteSpace: "pre-wrap" }}>
                {rnData.description && rnData.description !== "-" ? rnData.description : (rnData.note && rnData.note !== "-" ? rnData.note : rnData.remark)}
              </div>
            </div>
          </div>
        )}

        {/* Grouped Detail Item Table */}
        <div className="rn-detail-table-wrapper">
          <table className="rn-detail-table">
            <thead>
              <tr>
                <th rowSpan={2} className="rn-detail-th-no">
                  No.
                </th>
                <th rowSpan={2}>PO Number</th>
                <th rowSpan={2}>DN Number</th>
                <th rowSpan={2}>Job Number</th>
                <th rowSpan={2}>Item Name</th>
                <th rowSpan={2} className="text-right">
                  QTY
                </th>
                <th rowSpan={2} className="text-right">
                  Rafaksi
                </th>
                <th colSpan={2} className="text-center rn-detail-th-grouped">
                  Price (IDR)
                </th>
                <th colSpan={2} className="text-center rn-detail-th-grouped">
                  Price (IDR)
                </th>
                <th rowSpan={2}>Remark</th>
              </tr>
              <tr>
                <th className="rn-detail-th-sub text-right">@</th>
                <th className="rn-detail-th-sub text-right">Subtotal</th>
                <th className="rn-detail-th-sub text-right">@</th>
                <th className="rn-detail-th-sub text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {rnData.items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="rn-table-empty">
                    No items in this Receive Note.
                  </td>
                </tr>
              ) : (
                rnData.items.map((it, idx) => (
                  <tr key={it.id || idx}>
                    <td className="text-center font-medium">{idx + 1}</td>
                    <td>
                      <div className="font-medium text-ink">{it.poNumber}</div>
                      <div className="text-xs text-muted">
                        Date: {it.poDate || rnData.date}
                      </div>
                    </td>
                    <td>
                      <div>{it.dnNumber || "-"}</div>
                      <div className="text-xs text-muted">
                        Date: {it.dnDate || "-"}
                      </div>
                    </td>
                    <td>
                      <div>{it.jobNumber || "-"}</div>
                      <div className="text-xs text-muted">
                        Date: {it.jobDate || "-"}
                      </div>
                    </td>
                    <td>
                      <div className="font-medium text-ink">{it.itemName}</div>
                      <div className="text-xs text-muted font-mono">
                        {it.itemCode}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium">
                        {it.qty.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted font-medium">
                        {it.unit}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono">
                        {it.rafaksi.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-purple-600 font-medium">
                        {it.rafaksiPercent.toFixed(2)}%
                      </div>
                    </td>
                    {/* First Price Section */}
                    <td className="text-right">
                      <div className="font-mono">
                        {it.pricePerUnit.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium text-ink">
                        {it.priceSubtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    {/* Second Price Section */}
                    <td className="text-right">
                      <div className="font-mono">
                        {it.price2PerUnit.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    <td className="text-right">
                      <div className="font-mono font-medium text-ink">
                        {it.price2Subtotal.toLocaleString("en-US", {
                          minimumFractionDigits: 4,
                          maximumFractionDigits: 4,
                        })}
                      </div>
                      <div className="text-xs text-muted">IDR</div>
                    </td>
                    <td>{it.remark || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              {/* TOTAL Row */}
              <tr className="rn-summary-row rn-summary-row--total">
                <td colSpan={5} className="text-right font-bold text-ink">
                  TOTAL
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnData.totalQty.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                    maximumFractionDigits: 4,
                  })}
                </td>
                <td></td>
                {/* First Section Total */}
                <td className="text-right font-mono font-bold">
                  {rnData.items.length > 0
                    ? rnData.items[0].pricePerUnit.toLocaleString("en-US", {
                      minimumFractionDigits: 4,
                    })
                    : "0.0000"}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td className="text-right font-mono font-bold">
                  {rnData.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                {/* Second Section Total */}
                <td className="text-right font-mono font-bold">
                  {rnData.items.length > 0
                    ? rnData.items[0].price2PerUnit.toLocaleString("en-US", {
                      minimumFractionDigits: 4,
                    })
                    : "0.0000"}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td className="text-right font-mono font-bold">
                  {rnData.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* Biaya Lain */}
              <tr className="rn-summary-row">
                <td colSpan={10} className="text-right font-medium text-ink">
                  Biaya Lain
                </td>
                <td className="text-right font-mono">
                  {rnData.biayaLain.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* Discount */}
              <tr className="rn-summary-row">
                <td colSpan={10} className="text-right font-medium text-ink">
                  Discount({rnData.discountPercent.toFixed(2)}%)
                </td>
                <td className="text-right font-mono">
                  {rnData.discountAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* PPN */}
              <tr className="rn-summary-row">
                <td colSpan={10} className="text-right font-medium text-ink">
                  PPN({rnData.ppnPercent.toFixed(0)}%)
                </td>
                <td className="text-right font-mono">
                  {rnData.ppnAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs text-muted">IDR</div>
                </td>
                <td></td>
              </tr>

              {/* Grand Total */}
              <tr className="rn-summary-row rn-summary-row--grand">
                <td colSpan={10} className="text-right font-bold text-ink">
                  Grand Total
                </td>
                <td className="text-right font-mono font-bold text-ink">
                  {rnData.grandTotal.toLocaleString("en-US", {
                    minimumFractionDigits: 4,
                  })}
                  <div className="text-xs font-normal text-muted">IDR</div>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Bottom Actions: Print Dropdown */}
        <div className="rn-detail-actions">
          <div className="rn-print-dropdown-container" ref={printMenuRef}>
            <button
              type="button"
              className="rn-btn-print"
              onClick={() => setPrintMenuOpen((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={printMenuOpen}
            >
              <Icon name="print" size={14} />
              <span>Print Options ▾</span>
            </button>

            {printMenuOpen && (
              <div className="rn-print-menu" role="menu">
                <button
                  type="button"
                  className="rn-print-menu-item"
                  role="menuitem"
                  onClick={() => handlePrint("job")}
                >
                  Detail Per Job
                </button>
                <button
                  type="button"
                  className="rn-print-menu-item"
                  role="menuitem"
                  onClick={() => handlePrint("po")}
                >
                  Group by PO Number
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReceiveNoteDetail;
