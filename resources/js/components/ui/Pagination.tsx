import { Icon } from "./Icon";

interface PaginationProps {
  count?: number;
  totalRecords?: number;
  currentPage?: number;
  pageSize?: number;
  showPageSize?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  count,
  totalRecords,
  currentPage = 1,
  pageSize = 25,
  showPageSize = true,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const total = totalRecords ?? count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const start = total === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const end = Math.min(safeCurrentPage * pageSize, total);

  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(i);
  }

  return (
    <div className="pagination">
      <span className="pagination__summary">
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong> records
      </span>
      <div className="pagination__right">
        <div className="pagination__pages">
          <button
            type="button"
            aria-label="Previous page"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange && onPageChange(safeCurrentPage - 1)}
          >
            <Icon name="arrowLeft" size={15} />
          </button>
          {pages.map((p) => (
            <button
              key={p}
              type="button"
              className={p === safeCurrentPage ? "active" : ""}
              onClick={() => onPageChange && onPageChange(p)}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            aria-label="Next page"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(safeCurrentPage + 1)}
          >
            <Icon name="arrowRight" size={15} />
          </button>
        </div>
        {showPageSize && (
          <label className="pagination__rows">
            Rows{" "}
            <select
              value={pageSize}
              aria-label="Rows per page"
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                if (onPageSizeChange) onPageSizeChange(nextSize);
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        )}
      </div>
    </div>
  );
}
