import React, { type ReactNode } from "react";
import { Button } from "../../../components/ui/Button";

export interface SmartOneField {
  label: string;
  value: ReactNode;
}

interface SmartOneDetailSheetProps {
  pageTitle: string;
  onBack: () => void;
  topBanner?: ReactNode;
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;
  approvalSection?: ReactNode;
  columns: SmartOneField[][];
  summarySection?: ReactNode;
  tableSection?: ReactNode;
  notesSection?: ReactNode;
  historySection?: ReactNode;
  bottomActions?: ReactNode;
}

export function SmartOneDetailSheet({
  pageTitle,
  onBack,
  topBanner,
  toolbarLeft,
  toolbarRight,
  approvalSection,
  columns,
  summarySection,
  tableSection,
  notesSection,
  historySection,
  bottomActions,
}: SmartOneDetailSheetProps) {
  const gridClass =
    columns.length <= 2
      ? "smartone-kv-grid smartone-kv-grid--2"
      : "smartone-kv-grid";

  return (
    <div className="smartone-detail-page">
      <div className="smartone-page-title-row">
        <h1 className="smartone-page-title">{pageTitle}</h1>
        <div className="smartone-page-actions">
          <Button type="button" variant="outline" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
      </div>

      {topBanner}

      {/* Unified SmartOne Single Card */}
      <div className="smartone-unified-card">
        {(toolbarLeft || toolbarRight) && (
          <div className="smartone-card-bar">
            <div className="smartone-card-bar__group">{toolbarLeft}</div>
            {toolbarRight && (
              <div className="smartone-card-bar__group">{toolbarRight}</div>
            )}
          </div>
        )}

        {approvalSection && (
          <div className="smartone-approval-inline">{approvalSection}</div>
        )}

        {/* Vertical Key-Value Lists Inside the Same Card */}
        <div className={gridClass}>
          {columns.map((col, colIdx) => (
            <div key={colIdx} className="smartone-kv-col">
              {col.map((item, rowIdx) => (
                <div key={`${colIdx}-${rowIdx}-${item.label}`} className="smartone-kv-row">
                  <span className="smartone-kv-label">{item.label}</span>
                  <div className="smartone-kv-value">
                    <span className="smartone-kv-colon">:</span>
                    <div className="smartone-kv-value-body">{item.value}</div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {notesSection}
        {summarySection}
        {tableSection}
        {historySection}
        {bottomActions && (
          <div className="smartone-bottom-actions">{bottomActions}</div>
        )}
      </div>
    </div>
  );
}
