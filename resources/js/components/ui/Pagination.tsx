import { Icon } from "./Icon";

interface PaginationProps {
  count?: number;
  totalRecords?: number;
  total?: number;
  totalCount?: number;
  currentPage?: number;
  page?: number;
  pageSize?: number;
  showPageSize?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function Pagination({
  count,
  totalRecords,
  total: totalProp,
  totalCount,
  currentPage,
  page,
  pageSize = 25,
  showPageSize = true,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const total = totalRecords ?? count ?? totalProp ?? totalCount ?? 0;
  const pageVal = currentPage ?? page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, pageVal), totalPages);
  const start = total === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const end = Math.min(safeCurrentPage * pageSize, total);

  // Compute smart windowed page numbers with ellipses
  const getPageItems = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (safeCurrentPage <= 3) {
      return [1, 2, 3, 4, "...", totalPages];
    }

    if (safeCurrentPage >= totalPages - 2) {
      return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, "...", totalPages];
  };

  const pageItems = getPageItems();

  return (
    <div className="pagination">
      <div className="pagination__summary">
        Showing <strong>{start}–{end}</strong> of <strong>{total}</strong> records
      </div>
      <div className="pagination__right">
        <div className="pagination__pages" role="navigation" aria-label="Pagination">
          <button
            type="button"
            className="pagination__arrow-btn"
            aria-label="Previous page"
            title="Previous page"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange && onPageChange(safeCurrentPage - 1)}
          >
            <Icon name="arrowLeft" size={14} />
          </button>
          {pageItems.map((item, idx) =>
            typeof item === "number" ? (
              <button
                key={`page-${item}`}
                type="button"
                className={`pagination__page-btn ${item === safeCurrentPage ? "active" : ""}`}
                aria-current={item === safeCurrentPage ? "page" : undefined}
                onClick={() => onPageChange && onPageChange(item)}
              >
                {item}
              </button>
            ) : (
              <span key={`ellipsis-${idx}`} className="pagination__ellipsis" aria-hidden="true">
                …
              </span>
            )
          )}
          <button
            type="button"
            className="pagination__arrow-btn"
            aria-label="Next page"
            title="Next page"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange && onPageChange(safeCurrentPage + 1)}
          >
            <Icon name="arrowRight" size={14} />
          </button>
        </div>
        {showPageSize && (
          <label className="pagination__rows">
            <span>Rows</span>
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

export default Pagination;
