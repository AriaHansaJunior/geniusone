import { Icon } from "./Icon";

export function SearchField({
  value,
  onChange,
  placeholder = "Search document, supplier, material…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="search-field">
      <Icon name="search" size={17} />
      <input
        aria-label="Search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange("")}
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </label>
  );
}
