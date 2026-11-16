import React from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { ApprovalActionBar } from "../../../components/approval/ApprovalActionBar";
import { ApprovalTimeline } from "../../../components/approval/ApprovalTimeline";
import { ApprovalStatusBadge } from "../../../components/approval/ApprovalStatusBadge";
import type { DocumentApprovalState } from "../../../types/approval";
import type { RequestMaterialRecord } from "../../../pages/Warehouse/Request/RequestMaterial/request-material-types";
import { SmartOneDetailSheet, type SmartOneField } from "../components/SmartOneDetailSheet";

interface RequestMaterialDefaultDetailProps {
  record: RequestMaterialRecord;
  isApproved: boolean;
  approvalState: DocumentApprovalState;
  setApprovalState: React.Dispatch<React.SetStateAction<DocumentApprovalState>>;
  onBack: () => void;
  onPrint: () => void;
}

export function RequestMaterialDefaultDetail({
  record,
  isApproved,
  approvalState,
  setApprovalState,
  onBack,
  onPrint,
}: RequestMaterialDefaultDetailProps) {
  const columns: SmartOneField[][] = [
    [
      { label: "Transaction Number", value: <strong>{record.requestCode}</strong> },
      { label: "Job Number", value: record.jobNumber || "—" },
      { label: "Request Date", value: record.requestDate || "—" },
      { label: "Request Type", value: record.typeOfRequest || "—" },
      { label: "Department", value: record.department || "—" },
    ],
    [
      { label: "Customer", value: record.customer || "—" },
      { label: "SO Number", value: record.soNumber || "—" },
      { label: "PO Buyer", value: record.poBuyer || "—" },
      { label: "Warehouse Dest.", value: record.warehouseDestination || "—" },
      { label: "Dest. Location", value: record.destinationLocation || "—" },
      { label: "Project Type", value: record.projectType || "—" },
    ],
    [
      {
        label: "Created At",
        value: `${record.createdDate || "—"}${record.createdBy ? ` by ${record.createdBy}` : ""}`,
      },
      { label: "Last Updated At", value: record.lastUpdatedDate || "—" },
      { label: "Approved 1 At", value: record.approved1At || "—" },
      { label: "Approved 2 At", value: record.approved2At || "—" },
      { label: "Revision Count", value: String(record.revisionCount ?? 0) },
    ],
  ];

  return (
    <SmartOneDetailSheet
      pageTitle={`Detail Request Material — ${record.requestCode}`}
      onBack={onBack}
      toolbarLeft={
        <>
          <ApprovalStatusBadge status={approvalState.status} />
          {isApproved && <Badge tone="green">Locked</Badge>}
          {record.department && <Badge tone="purple">{record.department}</Badge>}
          <Button type="button" variant="secondary" size="sm" onClick={onPrint}>
            Print PDF
          </Button>
        </>
      }
      approvalSection={
        <>
          <ApprovalActionBar
            module="request_material"
            documentId={record.requestCode}
            documentNumber={record.requestCode}
            state={approvalState}
            onStateChange={setApprovalState}
          />
          <div className="smartone-timeline-strip">
            <ApprovalTimeline state={approvalState} />
          </div>
        </>
      }
      columns={columns}
      tableSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">
              Requisition Items ({record.items?.length || 0})
            </h2>
          </div>
          <div className="smartone-card-section__body smartone-card-section__body--flush">
            <div className="smartone-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="smartone-td-center">No.</th>
                    <th>Item Code</th>
                    <th>External Code</th>
                    <th>Item</th>
                    <th className="smartone-td-center">Unit</th>
                    <th className="smartone-td-right">Quantity</th>
                    <th>Remark</th>
                  </tr>
                </thead>
                <tbody>
                  {!record.items || record.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="smartone-empty-cell">
                        No items in this request.
                      </td>
                    </tr>
                  ) : (
                    record.items.map((item, idx) => (
                      <tr key={item.id || idx}>
                        <td className="smartone-td-center smartone-td-muted">{idx + 1}</td>
                        <td>
                          <span className="code-pill">{item.itemCode || "—"}</span>
                        </td>
                        <td className="smartone-td-muted">{item.externalCode || "—"}</td>
                        <td className="smartone-td-bold">{item.itemName}</td>
                        <td className="smartone-td-center smartone-td-bold">{item.unit}</td>
                        <td className="smartone-td-right smartone-td-mono smartone-td-bold">
                          {item.requestQty?.toFixed(2) || "0.00"}
                        </td>
                        <td className="smartone-td-muted">{item.remark || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      }
      notesSection={
        <div className="smartone-card-section">
          <div className="smartone-card-section__header">
            <h2 className="smartone-card-section__title">Request Note</h2>
          </div>
          <div className="smartone-card-section__body">
            <div className="smartone-notes-box">
              {record.requestNote || "No request note provided."}
            </div>
          </div>
        </div>
      }
    />
  );
}
