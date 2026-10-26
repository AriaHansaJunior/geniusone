import React from "react";
import { Icon } from "./Icon";
import { Badge, type BadgeTone } from "./Badge";
import { Pagination } from "./Pagination";
import type { Column, TableRow } from "../../types";

import { ApprovalStatusBadge } from "../approval/ApprovalStatusBadge";

function formatCell(key: string, value: any) {
  if (React.isValidElement(value)) return value;
  if (value === null || value === undefined || value === "") return "—";

  if (
    key === "status" ||
    key === "statusPr" ||
    key === "statusPo" ||
    key === "statusApprove" ||
    key === "approval"
  ) {
    return <ApprovalStatusBadge status={String(value)} />;
  }

  if (key === "statusFacility" || key === "facility") {
    return <Badge tone="purple">{String(value)}</Badge>;
  }

  if (key === "bpbType") {
    return <Badge tone="blue">{String(value)}</Badge>;
  }

  if (key === "poNumber" || key === "prNumber" || key === "receiveNumber") {
    return <strong className="cell-code">{String(value)}</strong>;
  }

  if (key === "deptRequest" || key === "deptCreated") {
    return <span className="cell-dept">{String(value)}</span>;
  }

  if (key === "totalPrice" || key === "subTotal") {
    return <strong className="cell-right font-mono">{String(value)}</strong>;
  }

  return value;
}

interface DataTableProps {
  columns: Column[];
  rows: TableRow[];
  onDetail: (row: TableRow) => void;
  emptyTitle?: string;
}

export function DataTable({
  columns,
  rows,
  onDetail,
  emptyTitle = "No matching documents",
}: DataTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [rows.length]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedRows = rows.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  return (
    <div className="table-frame">
      <div className="table-scroll">
        <table role="table" aria-label="Data Table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === "right" ? "align-right" : col.key === "no" || col.key === "num" ? "cell-center" : ""}
                  style={{ minWidth: col.min }}
                >
                  {col.label}
                  {col.key !== "actions" && col.key !== "no" && col.key !== "num" && (
                    <Icon name="arrowDown" size={12} />
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayedRows.length ? (
              displayedRows.map((row, index) => (
                <tr key={row._id || index}>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={col.align === "right" ? "align-right" : col.key === "no" || col.key === "num" ? "cell-center" : ""}
                    >
                      {col.key === "actions" ? (
                        <button
                          type="button"
                          className="icon-action"
                          aria-label="View details"
                          title="View details"
                          onClick={() => onDetail(row)}
                        >
                          <Icon name="eye" size={17} />
                        </button>
                      ) : col.key === "no" || col.key === "num" ? (
                        <span className="cell-num">
                          {(safeCurrentPage - 1) * pageSize + index + 1}
                        </span>
                      ) : (
                        formatCell(col.key, row[col.key])
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length}>
                  <div className="empty">
                    <div className="empty__icon">
                      <Icon name="search" />
                    </div>
                    <strong>{emptyTitle}</strong>
                    <span>Try changing or clearing your filters.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        totalRecords={rows.length}
        currentPage={safeCurrentPage}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}

export default DataTable;
