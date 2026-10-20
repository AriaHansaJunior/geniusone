import React, { useMemo } from "react";
import { Button } from "../../../../components/ui/Button";
import { Icon } from "../../../../components/ui/Icon";
import { Badge, type BadgeTone } from "../../../../components/ui/Badge";
import { initialRequestMaterialRecords } from "./request-material-data";
import type { RequestMaterialRecord } from "./request-material-types";

interface RequestMaterialDetailProps {
  id: string;
  records?: RequestMaterialRecord[];
  onBack: () => void;
}

export function RequestMaterialDetail({
  id,
  records = initialRequestMaterialRecords,
  onBack,
}: RequestMaterialDetailProps) {
  // Find record by id or requestCode
  const record = useMemo(() => {
    return records.find(
      (r) =>
        r.id.toLowerCase() === id.toLowerCase() ||
        r.requestCode.toLowerCase() === id.toLowerCase()
    );
  }, [id, records]);

  // Graceful Handling for Invalid Record ID
  if (!record) {
    return (
      <div className="full-page-detail">
        <div className="detail-top-bar">
          <button type="button" className="btn-back-pill" onClick={onBack}>
            <Icon name="arrowLeft" size={14} />
            <span>Back to Request Material</span>
          </button>
        </div>

        <div
          className="panel"
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#b91c1c",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name="alertTriangle" size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "var(--ink)" }}>
            Request Material Not Found
          </h3>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: "440px", fontSize: "13px" }}>
            The requested material requisition ID "<strong>{id}</strong>" could not be located in the current system records.
          </p>
          <Button variant="primary" icon="arrowLeft" onClick={onBack} style={{ marginTop: "8px" }}>
            Return to Listing
          </Button>
        </div>
      </div>
    );
  }

  const getApprovalBadgeTone = (appr: string): BadgeTone => {
    if (appr === "Approved 2") return "blue";
    if (appr === "Approved 1") return "green";
    if (appr === "Draft") return "cyan";
    if (appr === "Rejected") return "red";
    return "gray";
  };

  const handlePrint = () => {
    try {
      window.print();
    } catch (err: any) {
      console.warn("Print execution error:", err);
    }
  };

  return (
    <div className="full-page-detail request-material-detail-page">
      {/* Detail Navigation & Top Action Bar */}
      <div className="detail-top-bar">
        <div className="detail-top-bar__left">
          <button type="button" className="btn-back-pill" onClick={onBack}>
            <Icon name="arrowLeft" size={14} />
            <span>Back to Request Material</span>
          </button>
          <div className="detail-breadcrumb-trail">
            <a onClick={onBack}>Warehouse</a>
            <span>/</span>
            <a onClick={onBack}>Request</a>
            <span>/</span>
            <a onClick={onBack}>Request Material</a>
            <span>/</span>
            <span className="current">{record.requestCode}</span>
          </div>
        </div>

        <div className="detail-top-bar__right">
          {/* Approval Status Indicator */}
          <Badge tone={getApprovalBadgeTone(record.approval)}>
            {record.approval}
          </Badge>
          <Button variant="secondary" icon="print" onClick={handlePrint}>
            Print PDF
          </Button>
        </div>
      </div>

      {/* Main Document Header Card */}
      <div className="detail-header-card">
        <div className="detail-header-card__info">
          <span className="detail-header-card__eyebrow">WAREHOUSE MATERIAL REQUISITION</span>
          <div className="detail-header-card__title-row">
            <h2 className="detail-header-card__title">{record.requestCode}</h2>
            <Badge tone={getApprovalBadgeTone(record.approval)}>
              {record.approval}
            </Badge>
            <Badge tone="purple">{record.department}</Badge>
          </div>
          <span className="detail-header-card__meta">
            Request Date: <strong>{record.requestDate}</strong> · Job Number: <strong>{record.jobNumber}</strong> · Customer: <strong>{record.customer}</strong>
          </span>
        </div>
      </div>

      {/* 2-Column Transaction Information Card */}
      <div className="panel" style={{ padding: "20px 24px" }}>
        <h3
          style={{
            margin: "0 0 16px 0",
            fontSize: "13px",
            fontWeight: 800,
            color: "var(--ink)",
            textTransform: "uppercase",
            letterSpacing: "0.4px",
            borderBottom: "1px solid var(--line)",
            paddingBottom: "8px",
          }}
        >
          Transaction Information
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {/* Column 1 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Transaction Number</span>
              <strong style={{ fontSize: "12.5px", color: "var(--blue-700)" }}>{record.requestCode}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Job Number</span>
              <strong style={{ fontSize: "12.5px", color: "var(--ink)" }}>{record.jobNumber || "—"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Request Date</span>
              <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{record.requestDate || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Request Type</span>
              <span style={{ fontSize: "12.5px", fontWeight: 700, color: "var(--ink-soft)" }}>{record.typeOfRequest || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Department</span>
              <span style={{ fontSize: "12.5px", fontWeight: 700 }} className="cell-dept">{record.department || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Customer</span>
              <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{record.customer || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>SO Number</span>
              <span style={{ fontSize: "12.5px" }}>{record.soNumber || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>PO Buyer</span>
              <span style={{ fontSize: "12.5px" }}>{record.poBuyer || "—"}</span>
            </div>
          </div>

          {/* Column 2 */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Warehouse Destination</span>
              <strong style={{ fontSize: "12.5px", color: "var(--ink-soft)" }}>{record.warehouseDestination || "—"}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Destination Location</span>
              <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{record.destinationLocation || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Project Type</span>
              <span style={{ fontSize: "12.5px", fontWeight: 600 }}>{record.projectType || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Created At</span>
              <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
                {record.createdDate} {record.createdBy ? `by ${record.createdBy}` : ""}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Last Updated At</span>
              <span style={{ fontSize: "12px", color: "var(--ink-soft)" }}>{record.lastUpdatedDate || "—"}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Approved 1 At</span>
              <span style={{ fontSize: "12px", color: record.approved1At !== "—" ? "var(--green-700)" : "var(--muted)" }}>
                {record.approved1At || "—"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Approved 2 At</span>
              <span style={{ fontSize: "12px", color: record.approved2At !== "—" ? "var(--blue-700)" : "var(--muted)" }}>
                {record.approved2At || "—"}
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed var(--line)", paddingBottom: "6px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontWeight: 600 }}>Revision Count</span>
              <span style={{ fontSize: "12px", fontWeight: 700 }}>{record.revisionCount ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Item Detail Table Panel */}
      <div className="panel" style={{ padding: "0" }}>
        <div
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#f8fafc",
          }}
        >
          <span style={{ fontSize: "13px", fontWeight: 800, color: "var(--ink)", textTransform: "uppercase" }}>
            Requisition Items
          </span>
          <span className="code-pill">{record.items?.length || 0} items listed</span>
        </div>

        <div className="table-frame">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: "50px", textAlign: "center" }}>No.</th>
                  <th style={{ minWidth: "150px" }}>Item Code</th>
                  <th style={{ minWidth: "130px" }}>External Code</th>
                  <th style={{ minWidth: "260px" }}>Item</th>
                  <th style={{ minWidth: "80px", textAlign: "center" }}>Unit</th>
                  <th style={{ minWidth: "110px", textAlign: "right" }}>Quantity</th>
                  <th style={{ minWidth: "200px" }}>Remark</th>
                </tr>
              </thead>
              <tbody>
                {record.items && record.items.length > 0 ? (
                  record.items.map((item, index) => (
                    <tr key={item.id || index}>
                      <td style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                        {index + 1}
                      </td>
                      <td>
                        <span className="code-pill">{item.itemCode || "—"}</span>
                      </td>
                      <td style={{ color: "var(--muted)" }}>
                        {item.externalCode || "—"}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {item.itemName}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: "11.5px", fontWeight: 700, color: "var(--blue-700)" }}>
                          {item.unit}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <strong style={{ fontSize: "13px", color: "var(--ink)" }}>
                          {item.requestQty?.toFixed(2) || "0.00"}
                        </strong>
                      </td>
                      <td style={{ color: "var(--ink-soft)", fontSize: "12px" }}>
                        {item.remark || "—"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "30px 16px" }}>
                      <div className="empty">
                        <div className="empty__icon">
                          <Icon name="search" />
                        </div>
                        <strong>No items in this request</strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Note Card */}
      <div className="panel" style={{ padding: "18px 24px" }}>
        <h4 style={{ margin: "0 0 8px 0", fontSize: "12px", fontWeight: 800, color: "var(--muted)", textTransform: "uppercase" }}>
          Request Note
        </h4>
        <div
          style={{
            padding: "12px 16px",
            background: "#f8fafc",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            color: "var(--ink)",
            lineHeight: 1.5,
          }}
        >
          {record.requestNote || "No request note provided."}
        </div>
      </div>
    </div>
  );
}

export default RequestMaterialDetail;
