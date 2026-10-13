import React from "react";
import { Icon } from "./Icon";
import { Badge, type BadgeTone } from "./Badge";
import { Pagination } from "./Pagination";
import type { Column, TableRow } from "../../types";

function formatCell(key: string, value: any) {
  if (React.isValidElement(value)) return value;
  if (value === null || value === undefined || value === "") return "—";

  if (
    key === "status" ||
    key === "statusPr" ||
    key === "statusPo" ||
    key === "statusApprove"
  ) {
    const str = String(value);
    let tone: BadgeTone = "gray";
    let prefix = "";

    if (str.includes("Approved 2") || str.includes("Complete")) {
      tone = "blue";
      prefix = "✓ ";
    } else if (str.includes("Approved 1") || str.includes("Approved") || str.includes("Fully")) {
      tone = "green";
      prefix = "✓ ";
    } else if (str.includes("Ready") || str.includes("Draft")) {
      tone = "cyan";
      prefix = "⏳ ";
    } else if (str.includes("Outstanding")) {
      tone = "orange";
      prefix = "⌛ ";
    } else if (str.includes("Rejected")) {
      tone = "red";
    }

    return (
      <Badge tone={tone}>
        {prefix}
        {str}
      </Badge>
    );
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
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={col.align === "right" ? "align-right" : ""}
                  style={{ minWidth: col.min }}
                >
                  {col.label}
                  <Icon name="arrowDown" size={12} />
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
                      className={col.align === "right" ? "align-right" : ""}
                    >
                      {col.key === "actions" ? (
                        <button
                          type="button"
                          className="icon-action"
                          aria-label="View details"
                          onClick={() => onDetail(row)}
                        >
                          <Icon name="eye" size={17} />
                        </button>
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
