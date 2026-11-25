import React from "react";
import { Icon } from "./Icon";
import { Badge, type BadgeTone } from "./Badge";
import { Pagination } from "./Pagination";
import { LoadingBuffer, TableLoadingRow } from "./LoadingBuffer";
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
    const str = String(value || "").trim();
    if (!str || str === "-" || str === "—") return "—";
    const isNon = /non/i.test(str);
    const label = isNon ? "NON FASILITAS" : "FASILITAS";
    return <Badge tone={isNon ? "gray" : "purple"}>{label}</Badge>;
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
  onSelectPo?: (poNumber: string, row: TableRow) => void;
  onSelectPr?: (prNumber: string, row: TableRow) => void;
  emptyTitle?: string;
  isLoading?: boolean;
  loadingMessage?: string;
}

export function DataTable({
  columns,
  rows,
  onDetail,
  onSelectPo,
  onSelectPr,
  emptyTitle = "No matching documents",
  isLoading = false,
  loadingMessage = "Loading records...",
}: DataTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [sortField, setSortField] = React.useState<string | null>(null);
  const [sortDirection, setSortDirection] = React.useState<"none" | "asc" | "desc">("none");

  const visibleColumns = React.useMemo(
    () => columns.filter((col) => col.key !== "actions"),
    [columns]
  );

  React.useEffect(() => {
    setCurrentPage(1);
  }, [rows, sortField, sortDirection]);

  const sortedRows = React.useMemo(() => {
    if (!sortField || sortDirection === "none") return rows;

    const getComparable = (row: TableRow, key: string): string | number => {
      const rawCandidate =
        key === "poNumber" ? row._rawPo ?? row[key]
        : key === "prNumber" ? row._rawPr ?? row[key]
        : key === "totalPrice" ? row._rawTotalPrice ?? row[key]
        : key === "subTotal" ? row._rawSubTotal ?? row[key]
        : key === "date" ? row._rawDate ?? row[key]
        : row[key];

      if (rawCandidate === null || rawCandidate === undefined || React.isValidElement(rawCandidate)) {
        return "";
      }
      if (typeof rawCandidate === "number") return rawCandidate;
      const str = String(rawCandidate).trim();
      const numCandidate = str.replace(/[^0-9.-]/g, "");
      if (/^-?\d+(\.\d+)?$/.test(numCandidate) && !/[a-zA-Z/-]{2,}/.test(str)) {
        const parsed = Number(numCandidate);
        if (!Number.isNaN(parsed)) return parsed;
      }
      return str.toLowerCase();
    };

    const next = [...rows];
    next.sort((a, b) => {
      const aVal = getComparable(a, sortField);
      const bVal = getComparable(b, sortField);
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
    return next;
  }, [rows, sortField, sortDirection]);

  const handleToggleSort = (key: string) => {
    if (sortField === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") {
        setSortDirection("none");
        setSortField(null);
      } else setSortDirection("asc");
    } else {
      setSortField(key);
      setSortDirection("asc");
    }
  };

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const displayedRows = sortedRows.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  return (
    <div className="table-frame">
      {isLoading && rows.length > 0 && (
        <div className="table-frame__buffer-bar">
          <LoadingBuffer variant="inline" label={loadingMessage} />
        </div>
      )}
      <div className="table-scroll">
        <table role="table" aria-label="Data Table">
          <thead>
            <tr>
              {visibleColumns.map((col) => {
                const isSortable = col.key !== "actions" && col.key !== "no" && col.key !== "num";
                const isActiveSort = sortField === col.key && sortDirection !== "none";
                const alignCls =
                  col.align === "right" ? "align-right" : col.key === "no" || col.key === "num" ? "cell-center" : "";
                return (
                  <th
                    key={col.key}
                    className={`${alignCls} ${isSortable ? "th-sortable" : ""}`.trim()}
                    style={{ minWidth: col.min, cursor: isSortable ? "pointer" : undefined }}
                    onClick={isSortable ? () => handleToggleSort(col.key) : undefined}
                    aria-sort={
                      isActiveSort
                        ? sortDirection === "asc"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {col.label}
                    {isSortable && (
                      <Icon
                        name={isActiveSort && sortDirection === "asc" ? "arrowUp" : "arrowDown"}
                        size={12}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading && rows.length === 0 ? (
              <TableLoadingRow
                colSpan={visibleColumns.length}
                label={loadingMessage}
                sublabel="Synchronizing documents from database..."
              />
            ) : displayedRows.length ? (
              displayedRows.map((row, index) => (
                <tr
                  key={row._id || index}
                  onClick={() => onDetail(row)}
                  style={{ cursor: "pointer" }}
                  title="Click row to open transaction details"
                >
                  {visibleColumns.map((col) => {
                    const rawVal = row[col.key];
                    const isPoCol = col.key === "poNumber" && rawVal && rawVal !== "—";
                    const isPrCol = col.key === "prNumber" && rawVal && rawVal !== "—";

                    return (
                      <td
                        key={col.key}
                        className={col.align === "right" ? "align-right" : col.key === "no" || col.key === "num" ? "cell-center" : ""}
                      >
                        {col.key === "no" || col.key === "num" ? (
                          <span className="cell-num">
                            {(safeCurrentPage - 1) * pageSize + index + 1}
                          </span>
                        ) : isPoCol ? (
                          React.isValidElement(rawVal) ? (
                            <strong
                              className="cell-code"
                              style={{
                                color: "var(--blue-700, #1d4ed8)",
                                textDecoration: "underline",
                                cursor: "pointer",
                              }}
                              title="Open Purchase Order"
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetPo = String(row._rawPo || row.poNumber || "").trim();
                                if (onSelectPo && targetPo && targetPo !== "—") {
                                  onSelectPo(targetPo, row);
                                } else {
                                  onDetail(row);
                                }
                              }}
                            >
                              {rawVal}
                            </strong>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {String(rawVal)
                                .split(",")
                                .map((p) => p.trim())
                                .filter(Boolean)
                                .map((p, pIdx) => (
                                  <strong
                                    key={pIdx}
                                    className="cell-code"
                                    style={{
                                      color: "var(--blue-700, #1d4ed8)",
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                    }}
                                    title={`Open Purchase Order ${p}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectPo && p && p !== "—") {
                                        onSelectPo(p, row);
                                      } else {
                                        onDetail(row);
                                      }
                                    }}
                                  >
                                    {p}
                                  </strong>
                                ))}
                            </div>
                          )
                        ) : isPrCol ? (
                          (() => {
                            if (React.isValidElement(rawVal)) {
                              return (
                                <div style={{ maxWidth: "175px" }}>
                                  <strong
                                    className="cell-code"
                                    style={{
                                      color: "var(--blue-700, #1d4ed8)",
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                    }}
                                    title="Open Purchase Requisition"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const targetPr = String(row._rawPr || row.prNumber || "").trim();
                                      if (onSelectPr && targetPr && targetPr !== "—") {
                                        onSelectPr(targetPr, row);
                                      } else {
                                        onDetail(row);
                                      }
                                    }}
                                  >
                                    {rawVal}
                                  </strong>
                                </div>
                              );
                            }

                            const rawStr = String(rawVal).trim();
                            if (!rawStr || rawStr === "—") return "—";

                            // Split by comma, semicolon, newline, or whitespace before PR code
                            const prList = rawStr
                              .split(/[,;\n]+|\s+(?=\d{4}\/PR-)/)
                              .map((p) => p.trim())
                              .filter(Boolean);

                            if (prList.length === 0) return "—";

                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "3px",
                                  maxWidth: "175px",
                                  alignItems: "flex-start",
                                }}
                              >
                                {prList.map((p, pIdx) => (
                                  <strong
                                    key={pIdx}
                                    className="cell-code"
                                    style={{
                                      color: "var(--blue-700, #1d4ed8)",
                                      textDecoration: "underline",
                                      cursor: "pointer",
                                      fontSize: "12px",
                                      lineHeight: "1.35",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={`Open Purchase Requisition ${p}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onSelectPr && p && p !== "—") {
                                        onSelectPr(p, row);
                                      } else {
                                        onDetail(row);
                                      }
                                    }}
                                  >
                                    {p}
                                  </strong>
                                ))}
                              </div>
                            );
                          })()
                        ) : (
                          formatCell(col.key, rawVal)
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={visibleColumns.length}>
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
        totalRecords={sortedRows.length}
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
