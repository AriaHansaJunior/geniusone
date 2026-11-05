import React, { useState, useEffect, useRef, useMemo } from "react";
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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options array
  const normalizedOptions: FieldOption[] = useMemo(() => {
    if (!options) return [];
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Selected label calculation
  const selectedLabel = useMemo(() => {
    if (displayValue) return displayValue;
    if (normalizedOptions.length > 0 && value !== undefined) {
      const match = normalizedOptions.find((opt) => opt.value === value);
      if (match) return match.label;
    }
    return value || "";
  }, [displayValue, normalizedOptions, value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Scroll active option into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector(".custom-select-option.is-selected") as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (onClick) {
      onClick();
    }
    if (!isInput && normalizedOptions.length > 0) {
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelectOption = (optVal: string) => {
    if (onChange) {
      onChange(optVal);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`field ${wide ? "field--wide" : ""}`}
      style={{ position: "relative" }}
    >
      <span className="field__label">{label}</span>
      <div
        className={`field__control ${isOpen ? "is-active" : ""}`}
        style={{ position: "relative", cursor: isInput ? "text" : "pointer" }}
        onClick={handleToggle}
        role={isInput ? undefined : "button"}
        tabIndex={isInput ? undefined : 0}
        onKeyDown={(e) => {
          if (!isInput && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-haspopup={!isInput && normalizedOptions.length > 0 ? "listbox" : undefined}
        aria-expanded={isOpen}
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
              {selectedLabel || "All"}
            </span>
            <div
              style={{
                display: "grid",
                placeItems: "center",
                color: isOpen ? "var(--blue-600)" : "var(--slate-400)",
                transform: isOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s ease, color 0.15s ease",
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Icon name="chevronDown" size={13} />
            </div>
          </>
        )}
      </div>

      {/* Custom Floating Dropdown Menu (No Native OS Menu) */}
      {!isInput && isOpen && normalizedOptions.length > 0 && (
        <div
          ref={listRef}
          className="custom-select-dropdown"
          role="listbox"
          style={{ minWidth: "100%", width: "max-content", maxWidth: "340px" }}
        >
          {normalizedOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`custom-select-option ${isSelected ? "is-selected" : ""}`}
                role="option"
                aria-selected={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectOption(opt.value);
                }}
              >
                <span className="custom-select-option-text">{opt.label}</span>
                {isSelected && (
                  <span className="custom-select-option-check" aria-hidden="true">
                    <Icon name="check" size={14} strokeWidth={2.5} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
