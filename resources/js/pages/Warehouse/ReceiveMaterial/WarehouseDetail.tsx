import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { Icon } from "../../../components/ui/Icon";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { Material } from "../../../components/common/CommonCells";
import { warehouseRows, findRowBySlug, docToSlug } from "../../../data/mockData";
import { fetchDetail } from "../../../data/api";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { getLocalApprovalState, recordDocumentActivity } from "../../../services/approvalApi";
import { useAuthPermission } from "../../../context/AuthPermissionContext";
import { normalizeApprovalStatus, type DocumentApprovalState } from "../../../types/approval";
import type { TableRow } from "../../../types";

interface WarehouseDetailProps {
  code: string;
  onBack: () => void;
  onNavigateDetail?: (type: "pr" | "po" | "report" | "warehouse", code: string) => void;
}

export function WarehouseDetail({
  code,
  onBack,
  onNavigateDetail,
}: WarehouseDetailProps) {
  const [row, setRow] = useState<TableRow>(() => {
    if (typeof document !== "undefined") {
      const rootEl = document.getElementById("root");
      if (rootEl?.dataset?.initialJson) {
        try {
          const parsed = JSON.parse(rootEl.dataset.initialJson);
          if (parsed?.item) {
            const parsedNum = String(
              parsed.item._rawNumber || parsed.item.receiveNumber || parsed.item.bpbNumber || ""
            )
              .replace(/[^A-Za-z0-9]/g, "")
              .toLowerCase();
            const targetCode = String(code || "")
              .replace(/[^A-Za-z0-9]/g, "")
              .toLowerCase();
            if (!targetCode || parsedNum === targetCode) {
              return parsed.item;
            }
          }
        } catch (_) { }
      }
    }
    const match = findRowBySlug(warehouseRows, code);
    if (match) return match;
    const cleanDoc = code ? code.replace(/-/g, "/") : "BPB";
    return {
      _id: `wh-${code}`,
      _type: "warehouse",
      receiveNumber: cleanDoc,
      bpbNumber: cleanDoc,
      _rawNumber: cleanDoc,
      status: "Waiting for Approve 1",
      _rawStatus: "Waiting for Approve 1",
      _rawApproval: "Waiting for Approve 1",
      _rawDate: "-",
      _rawRn: "-",
      _rawPo: "—",
      _rawPr: "—",
      _rawSupplier: "Loading...",
      items: [],
      _items: [],
    } as TableRow;
  });

  const { currentUser } = useAuthPermission();

  useEffect(() => {
    let isMounted = true;
    fetchDetail("warehouse", code).then((item) => {
      if (isMounted && item) {
        setRow(item);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [code]);

  const docNumber =
    typeof row._rawNumber === "string" && row._rawNumber
      ? row._rawNumber
      : typeof row.receiveNumber === "string" && row.receiveNumber
        ? row.receiveNumber
        : typeof row.bpbNumber === "string" && row.bpbNumber
          ? row.bpbNumber
          : typeof code === "string"
            ? code.replace(/-/g, "/")
            : "0138/WHIN-IMLI/G/X/2026";

  const rnNumber = String(row._rawRn || row.rnNumber || "0131/RN-IMLI/X/2026");
  const poNumber = String(row._rawPo || row.poNumber || "POL-0926-0332");
  const prNumber = String(row._rawPr || row.prNumber || "0085/PR-IMLI/IX/2026");
  const supplierName = String(row._rawSupplier || row.supplier || "PT. Hasil Fastindo");
  const rawStatus = String(row._rawStatus || row._rawApproval || row.status || "Waiting for Approve 1");
  const receiveDate = String(row._rawDate || row.date || "08-10-2026");
  const rnDate = String(row._rawRnDate || receiveDate);
  const sjNumber = String(row._rawSj || row.deliveryOrder || "SRA/H2/2610/00262");
  const ajuNumber = String(row._rawAju || "00004001456220261008004282");
  const plateNo = String(row._rawPlateNo || "L 8372 VQ");
  const noPen = String(row._rawNoPen || "088370");
  const bcType = String(row._rawBc || row.docType || "BC 4.0");
  const bpbType = String(row._rawBpbType || row.bpbType || "Gudang");
  const location = String(row._rawWarehouseLocation || "Gudang Sparepart");
  const totalQty = String(row._rawTotalQty || "25.00");
  const createdBy = String(row._rawCreatedBy || "ADMINISTRATOR");
  const createdAt = String(row._rawCreatedAt || receiveDate);
  const remark = String(row._rawRemark || "Inbound physical receipt verified at warehouse");
  const materialName = String(row._rawMaterialName || "Mur Baut M 10 x 40 + ring pir");
  const materialCode = String(row._rawMaterialCode || "60.149.301.404");

  const backendNormalizedStatus = normalizeApprovalStatus(rawStatus);

  const [approvalState, setApprovalState] = useState<DocumentApprovalState>(() => {
    const local = getLocalApprovalState("bpb", docNumber, backendNormalizedStatus);
    if (backendNormalizedStatus && local.status !== backendNormalizedStatus) {
      return {
        ...local,
        status: backendNormalizedStatus,
        currentTier:
          backendNormalizedStatus === "WAITING_APPROVE_2"
            ? 2
            : backendNormalizedStatus === "APPROVED"
              ? 2
              : 1,
      };
    }
    return local;
  });

  useEffect(() => {
    const local = getLocalApprovalState("bpb", docNumber, backendNormalizedStatus);
    if (local.status !== backendNormalizedStatus) {
      setApprovalState({
        ...local,
        status: backendNormalizedStatus,
        currentTier:
          backendNormalizedStatus === "WAITING_APPROVE_2"
            ? 2
            : backendNormalizedStatus === "APPROVED"
              ? 2
              : 1,
      });
    } else {
      setApprovalState(local);
    }
  }, [docNumber, rawStatus, backendNormalizedStatus]);

  const isApproved = approvalState.status === "APPROVED";

  const bpbItems: any[] =
    row._items && Array.isArray(row._items) && row._items.length > 0
      ? row._items
      : row.items && Array.isArray(row.items) && row.items.length > 0
        ? row.items
        : [
          {
            no: 1,
            name: materialName,
            code: materialCode,
            jobNumber: "—",
            poNumber,
            prNumber,
            deliveryNote: sjNumber,
            receiveQty: parseFloat(totalQty.replace(/[^0-9.]/g, "")) || 25,
            unit: "PCE",
            location,
            purpose: remark,
          },
        ];

  const totalItemCount = bpbItems.length;
  const computedTotalQty = bpbItems
    .reduce((sum, it) => sum + (Number(it.receiveQty || it.rawQty || 0) || 0), 0)
    .toFixed(2);
  const displayTotalQty = Number(computedTotalQty) > 0 ? computedTotalQty : totalQty;
  const primaryUnit = bpbItems[0]?.unit || "PCE";

  const handlePrintPdf = async () => {
    const newState = await recordDocumentActivity({
      module: "bpb",
      documentId: row.id ? String(row.id) : docNumber,
      documentNumber: docNumber,
      action: "printed",
      userId: currentUser?.id || "user",
      userName: currentUser?.name || "Warehouse Staff",
      userRole: currentUser?.role || "warehouse",
      note: `Printed Receive Material (BPB) ${docNumber}`,
    });
    setApprovalState(newState);
    window.print();
  };

  // Build comprehensive Transaction Activity & History Log
  const activityLogEntries = (() => {
    const dynamicEntries = (approvalState.history || []).map((entry) => {
      let actionLabel = "Activity Recorded";
      let statusLabel = "Logged";
      let tone: "green" | "blue" | "orange" | "red" | "purple" | "gray" = "gray";

      if (entry.action === "approved") {
        actionLabel = `Approve ${entry.tier || 1} Receive Material (BPB)`;
        statusLabel = `Approve ${entry.tier || 1}`;
        tone = "green";
      } else if (entry.action === "unapproved") {
        actionLabel = `UnApprove ${entry.tier || 1} Receive Material (BPB)`;
        statusLabel = "UnApproved";
        tone = "orange";
      } else if (entry.action === "rejected") {
        actionLabel = `Rejected at Stage ${entry.tier || 1}${entry.note ? ` (${entry.note})` : ""}`;
        statusLabel = "Rejected";
        tone = "red";
      } else if (entry.action === "revised") {
        actionLabel = entry.note || "Revised BPB Document";
        statusLabel = "Revised";
        tone = "blue";
      } else if (entry.action === "printed") {
        actionLabel = entry.note || "Printed BPB Document";
        statusLabel = "Printed";
        tone = "purple";
      } else if (entry.action === "created") {
        actionLabel = entry.note || "Created Receive Material (BPB)";
        statusLabel = "Created";
        tone = "blue";
      }

      return {
        id: entry.id,
        user: entry.userName || "System User",
        role: entry.userRole || "Warehouse Staff",
        action: actionLabel,
        time: entry.timestamp,
        status: statusLabel,
        tone,
      };
    });

    const fallbackEntries = [
      {
        id: "fb_created",
        user: createdBy || "Warehouse Staff",
        role: "Document Creator",
        action: `Created Receive Material ${docNumber}`,
        time: createdAt || receiveDate,
        status: "Created",
        tone: "blue" as const,
      },
    ];

    return dynamicEntries.length > 0 ? dynamicEntries : fallbackEntries;
  })();

  const handleExportXlsx = () => {
    const headers = [
      "No",
      "BPB Number",
      "RN Number",
      "Material Code",
      "Material Name",
      "Job Number",
      "PO Reference",
      "PR Reference",
      "Delivery Note (SJ)",
      "Received Qty",
      "Unit",
      "Warehouse Location",
      "Purpose / Remark",
    ];
    const dataRows = bpbItems.map((it, idx) => [
      idx + 1,
      docNumber,
      rnNumber,
      it.code || materialCode,
      it.name || it.item || materialName,
      it.jobNumber || "—",
      it.poNumber || poNumber,
      it.prNumber || prNumber,
      it.deliveryNote || sjNumber,
      Number(it.receiveQty || it.rawQty || 0).toFixed(2),
      it.unit || "PCE",
      it.location || location,
      it.purpose || it.remark || remark,
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BPB Detail");
    XLSX.writeFile(wb, `BPB_${docToSlug(docNumber)}.xlsx`);
  };

  return (
    <div className="full-page-detail">
      {/* Detail Navigation & Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Warehouse</a>
            <span>/</span>
            <a onClick={onBack}>Receive Material</a>
            <span>/</span>
            <span className="current">{docNumber}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          <ApprovalStatusBadge status={approvalState.status} />
          {isApproved && (
            <Badge tone="green">
              <Icon name="lock" size={12} style={{ marginRight: "3px" }} /> Locked
            </Badge>
          )}
          <Badge tone="cyan">{bcType}</Badge>
          <Badge tone="blue">No Pen: {noPen}</Badge>
          <Badge tone="purple">{location}</Badge>
          <Button variant="secondary" icon="print" onClick={handlePrintPdf}>
            Print PDF
          </Button>
          <Button variant="excel" onClick={handleExportXlsx}>
            Export XLSX
          </Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">INVENTORY RECEIVING RECORD</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{docNumber}</h2>
            <ApprovalStatusBadge status={approvalState.status} />
            <Badge tone="purple">{bpbType}</Badge>
          </div>
          <span className="detail-header-card__meta">
            Supplier: <strong>{supplierName}</strong> · Receipt: <strong>{rnNumber}</strong> · Receive Date: <strong>{receiveDate}</strong>
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          <Button variant="secondary" icon="file" onClick={handleExportXlsx}>
            Download Delivery Note
          </Button>
        </div>
      </div>

      {/* Two-Stage Approval Action Bar & Timeline */}
      <div className="panel" style={{ padding: "14px 20px", marginBottom: "16px" }}>
        <ApprovalActionBar
          module="bpb"
          documentId={row.id ? String(row.id) : docNumber}
          documentNumber={docNumber}
          state={approvalState}
          onStateChange={(newState) => {
            setApprovalState(newState);
            setRow((prev) => ({
              ...prev,
              _rawStatus: newState.status,
              _rawApproval: newState.status,
              status: newState.status,
            }));
          }}
        />
      </div>

      {/* 6-Column Logistics & Customs Grid */}
      <div className="detail-kpi-grid">
        <div className="detail-kpi-card">
          <span>MUTATION / RECEIVE NO.</span>
          <strong>{docNumber}</strong>
          <small>Receive Date: {receiveDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>RECEIPT / RN NO.</span>
          <strong>{rnNumber}</strong>
          <small>RN Date: {rnDate} · DN: {sjNumber}</small>
        </div>

        <div className="detail-kpi-card">
          <span>AJU NUMBER & BARCODE</span>
          <strong style={{ fontSize: "11px", wordBreak: "break-all" }}>{ajuNumber}</strong>
          <small>Customs Filing: {receiveDate}</small>
        </div>

        <div className="detail-kpi-card">
          <span>VEHICLE & REGISTRATION</span>
          <strong>Plate: {plateNo}</strong>
          <small>No Pen: {noPen} ({receiveDate})</small>
        </div>

        <div className="detail-kpi-card">
          <span>SUPPLIER & CUSTOMS</span>
          <strong>{supplierName}</strong>
          <small>Type: {bcType} · Loc: {location}</small>
        </div>

        <div className="detail-kpi-card">
          <span>TOTAL RECEIVED QUANTITY</span>
          <strong>
            {displayTotalQty} {primaryUnit}
          </strong>
          <small>
            {totalItemCount} item{totalItemCount > 1 ? "s" : ""} recorded
          </small>
        </div>
      </div>

      {/* Document Relationship Workflow Pipeline */}
      <div className="detail-pipeline">
        <div
          className="pipeline-node active"
          style={{ cursor: prNumber !== "—" ? "pointer" : "default" }}
          onClick={() =>
            prNumber !== "—" && onNavigateDetail && onNavigateDetail("pr", docToSlug(prNumber))
          }
        >
          <div className="pipeline-node__icon">
            <Icon name="file" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 1 · PR Reference</span>
            <strong>{prNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div
          className="pipeline-node active"
          style={{ cursor: poNumber !== "—" ? "pointer" : "default" }}
          onClick={() =>
            poNumber !== "—" && onNavigateDetail && onNavigateDetail("po", docToSlug(poNumber))
          }
        >
          <div className="pipeline-node__icon">
            <Icon name="archive" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 2 · PO Reference</span>
            <strong>{poNumber}</strong>
          </div>
        </div>

        <Icon name="arrowRight" size={16} className="pipeline-arrow" />

        <div className="pipeline-node current">
          <div className="pipeline-node__icon">
            <Icon name="box" size={16} />
          </div>
          <div className="pipeline-node__text">
            <span>Step 3 · BPB Receipt</span>
            <strong>{docNumber}</strong>
          </div>
        </div>
      </div>

      {/* Full-Width Received Material Table */}
      <div className="detail-table-card">
        <div className="detail-table-card__header">
          <div className="detail-table-card__title">
            <Icon name="box" size={16} />
            <span>Material Items Received ({totalItemCount})</span>
          </div>
          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
            Location: <strong style={{ color: "var(--ink)" }}>{location}</strong>
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="detail-data-table">
            <thead>
              <tr>
                <th style={{ width: "36px", textAlign: "center" }}>No</th>
                <th style={{ minWidth: "150px" }}>Material Item</th>
                <th style={{ width: "85px" }}>Job Number</th>
                <th style={{ minWidth: "115px" }}>PO Reference</th>
                <th style={{ minWidth: "115px" }}>PR Reference</th>
                <th style={{ minWidth: "115px" }}>Delivery Note (SJ)</th>
                <th style={{ width: "95px", textAlign: "right" }}>Received Qty</th>
                <th style={{ width: "110px" }}>Warehouse Loc</th>
                <th style={{ minWidth: "130px" }}>Description / Purpose</th>
              </tr>
            </thead>
            <tbody>
              {bpbItems.map((it, idx) => {
                const itemQty = Number(it.receiveQty ?? it.rawQty ?? 25).toFixed(2);
                const itemUnit = it.unit || primaryUnit;
                const itemLoc = it.warehouse || it.warehouseLocation || it.location || location;
                return (
                  <tr key={it.id || idx}>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>
                      {idx + 1}
                    </td>
                    <td>
                      <Material
                        name={it.name || it.item || materialName}
                        code={it.code || it.itemCode || materialCode}
                      />
                    </td>
                    <td>{it.jobNumber || "—"}</td>
                    <td>
                      <strong style={{ color: "var(--ink)", fontSize: "11px" }}>
                        {it.poNumber || poNumber}
                      </strong>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>
                        {receiveDate}
                      </small>
                    </td>
                    <td>
                      <strong style={{ color: "var(--ink)", fontSize: "11px" }}>
                        {it.prNumber || prNumber}
                      </strong>
                      <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>
                        {receiveDate}
                      </small>
                    </td>
                    <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                      {it.dnNumber || it.deliveryNote || sjNumber}
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        fontFamily: "ui-monospace, monospace",
                        fontWeight: 700,
                        color: "var(--blue-700)",
                      }}
                    >
                      {itemQty} {itemUnit}
                    </td>
                    <td>
                      <Badge tone="blue">{itemLoc}</Badge>
                    </td>
                    <td style={{ fontSize: "11.5px", color: "var(--ink-soft)" }}>
                      {it.purpose || it.remark || remark}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f8fafc", fontWeight: 700 }}>
                <td colSpan={6} style={{ textAlign: "right", padding: "12px 14px" }}>
                  Total Received Items:
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "12px 14px",
                    fontFamily: "ui-monospace, monospace",
                  }}
                >
                  {displayTotalQty} {primaryUnit}
                </td>
                <td colSpan={2} style={{ padding: "12px 14px", color: "var(--muted)", fontSize: "11px" }}>
                  {isApproved
                    ? "Posted & verified in inventory stock ledger"
                    : "Pending final approval for stock ledger posting"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Two-Column Lower Content Grid */}
      <div className="detail-lower-grid">
        {/* Left Card: Warehouse Receiving Notes & Customs Information */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Warehouse Receiving Notes & Customs</strong>
            <span>Internal Inspection Log</span>
          </div>
          <div className="detail-section-card__body">
            <div>
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.4px",
                }}
              >
                Item Purpose / Maintenance Remark
              </span>
              <div
                style={{
                  background: "var(--canvas)",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "12px",
                  color: "var(--ink)",
                  marginTop: "6px",
                  border: "1px solid var(--line)",
                  lineHeight: "1.45",
                }}
              >
                <strong>{remark}</strong>
                <p style={{ margin: "4px 0 0", color: "var(--ink-soft)", fontSize: "11.5px" }}>
                  Goods physically received and inspected at {location}. Packaging intact, quantity matches delivery note.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div
                style={{
                  background: "var(--white)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Registration No Pen
                </span>
                <strong style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>
                  {noPen}
                </strong>
              </div>
              <div
                style={{
                  background: "var(--white)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--line)",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Customs Clearance Document
                </span>
                <strong style={{ display: "block", fontSize: "12px", marginTop: "2px" }}>
                  {bcType}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Card: Receiving & Audit Verification Log (Full Width with Horizontal Scroll Support) */}
        <div className="detail-section-card">
          <div className="detail-section-card__header">
            <strong>Transaction History & Activity Log</strong>
            <span>{activityLogEntries.length} Activity Records</span>
          </div>
          <div className="detail-section-card__body" style={{ padding: 0 }}>
            <div className="table-scroll">
              <table className="audit-log-table">
                <thead>
                  <tr>
                    <th style={{ width: "160px" }}>Actor / Staff</th>
                    <th>Activity Performed</th>
                    <th style={{ width: "180px" }}>Timestamp</th>
                    <th style={{ width: "120px" }}>Activity Type</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLogEntries.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <strong>{log.user}</strong>
                        <small style={{ display: "block", color: "var(--muted)", fontSize: "10px" }}>
                          {log.role}
                        </small>
                      </td>
                      <td>{log.action}</td>
                      <td style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px" }}>
                        {log.time}
                      </td>
                      <td>
                        <Badge tone={log.tone}>✓ {log.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WarehouseDetail;
