import { Icon } from "./Icon";
import { Pagination } from "./Pagination";
import type { Column, TableRow } from "../../types";

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
            {rows.length ? (
              rows.map((row, index) => (
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
                        row[col.key]
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
      <Pagination count={rows.length} />
    </div>
  );
}
