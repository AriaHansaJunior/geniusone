import React, { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "./Icon";

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | CustomSelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  style?: React.CSSProperties;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  className = "",
  id,
  name,
  style,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Normalize options array to { value, label }
  const normalizedOptions: CustomSelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  // Find active option label
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  const displayLabel = selectedOption ? selectedOption.label : value || placeholder;

  // Handle click outside to close
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

  // Scroll active item into view when popup opens
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.querySelector(".custom-select-option.is-selected") as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className} ${disabled ? "is-disabled" : ""}`}
      id={id}
      style={style}
    >
      {/* Hidden input for forms */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button - Entire surface clickable */}
      <div
        className={`custom-select-trigger ${isOpen ? "is-open" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && !disabled) {
            e.preventDefault();
            setIsOpen(true);
          }
        }}
      >
        <span className={`custom-select-label ${!selectedOption && !value ? "is-placeholder" : ""}`}>
          {displayLabel}
        </span>
        <div className={`custom-select-chevron ${isOpen ? "is-open" : ""}`} aria-hidden="true">
          <Icon name="chevronDown" size={15} />
        </div>
      </div>

      {/* Custom GeniusOne Dropdown List */}
      {isOpen && (
        <div className="custom-select-dropdown" ref={listRef} role="listbox">
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
                  handleSelect(opt.value);
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
