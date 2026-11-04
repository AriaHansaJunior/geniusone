import { Icon } from "./Icon";
import type { IconName } from "../../types";

export interface FieldOption {
  value: string;
  label: string;
}

export function Field({
  label,
  value,
  displayValue,
  icon,
  wide,
  options,
  isInput,
  inputPlaceholder,
  onChange,
  onInputChange,
  onClick,
}: {
  label: string;
  value?: string;
  displayValue?: string;
  icon?: IconName;
  wide?: boolean;
  options?: (FieldOption | string)[];
  isInput?: boolean;
  inputPlaceholder?: string;
  onChange?: (val: string) => void;
  onInputChange?: (val: string) => void;
  onClick?: () => void;
}) {
  const selectedLabel = (() => {
    if (displayValue) return displayValue;
    if (options && value !== undefined) {
      const match = options.find((opt) =>
        typeof opt === "string" ? opt === value : opt.value === value
      );
      if (match) return typeof match === "string" ? match : match.label;
    }
    return value || "";
  })();

  return (
    <label className={`field ${wide ? "field--wide" : ""}`}>
      <span>{label}</span>
      <div
        className="field__control"
        style={{ position: "relative" }}
        onClick={onClick}
      >
        {icon && <Icon name={icon} size={16} />}
        {isInput ? (
          <input
            type="text"
            className="field__input"
            value={value || ""}
            placeholder={inputPlaceholder || "Type to filter..."}
            onChange={(e) => {
              if (onInputChange) onInputChange(e.target.value);
              if (onChange) onChange(e.target.value);
            }}
            style={{
              border: "none",
              outline: "none",
              background: "transparent",
              width: "100%",
              fontSize: "12px",
              color: "var(--ink)",
              fontFamily: "inherit",
              fontWeight: 500,
            }}
          />
        ) : (
          <>
            <span
              style={{
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontWeight: value && value !== "all" ? 600 : 400,
                color: value && value !== "all" ? "var(--ink)" : "var(--ink-soft)",
              }}
            >
              {selectedLabel}
            </span>
            <Icon
              name="chevronDown"
              size={13}
              style={{ color: "var(--slate-400)", flexShrink: 0 }}
            />
            {options && options.length > 0 && (
              <select
                value={value}
                onChange={(e) => onChange && onChange(e.target.value)}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                  appearance: "none",
                  zIndex: 2,
                }}
              >
                {options.map((opt) => {
                  const optVal = typeof opt === "string" ? opt : opt.value;
                  const optLabel = typeof opt === "string" ? opt : opt.label;
                  return (
                    <option key={optVal} value={optVal}>
                      {optLabel}
                    </option>
                  );
                })}
              </select>
            )}
          </>
        )}
      </div>
    </label>
  );
}
