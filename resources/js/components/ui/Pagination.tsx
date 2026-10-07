import { Icon } from "./Icon";

export function Pagination({ count }: { count: number }) {
  return (
    <div className="pagination">
      <span>
        Showing <strong>1–{count}</strong> of <strong>{Math.max(count, 24)}</strong> records
      </span>
      <div className="pagination__pages">
        <button type="button" aria-label="Previous page">
          <Icon name="arrowLeft" size={15} />
        </button>
        <button type="button" className="active">1</button>
        <button type="button">2</button>
        <button type="button">3</button>
        <span>…</span>
        <button type="button">8</button>
        <button type="button" aria-label="Next page">
          <Icon name="arrowRight" size={15} />
        </button>
      </div>
      <label>
        Rows{" "}
        <select defaultValue="25">
          <option value="25">25</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </label>
    </div>
  );
}
