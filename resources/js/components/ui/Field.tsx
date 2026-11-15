import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";
import {
  filterSelectOptions,
  handleDropdownSearchKeyDown,
  useDropdownPortalLifecycle,
  type PortalDropdownPosition,
} from "./CustomSelect";
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
  searchable,
  searchPlaceholder = "Type to search...",
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
  searchable?: boolean;
  searchPlaceholder?: string;
  onChange?: (val: string) => void;
  onInputChange?: (val: string) => void;
  onClick?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [portalPos, setPortalPos] = useState<PortalDropdownPosition>({
    style: {},
    openUpwards: false,
    alignRight: false,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  const isSearchEnabled =
    !isInput && (searchable !== undefined ? searchable : normalizedOptions.length >= 6);

  const filteredOptions = useMemo(() => {
    if (!isSearchEnabled) return normalizedOptions;
    return filterSelectOptions(normalizedOptions, searchQuery);
  }, [isSearchEnabled, normalizedOptions, searchQuery]);

  // Selected label calculation
  const selectedLabel = useMemo(() => {
    if (displayValue) return displayValue;
    if (normalizedOptions.length > 0 && value !== undefined) {
      const match = normalizedOptions.find((opt) => opt.value === value);
      if (match) return match.label;
    }
    return value || "";
  }, [displayValue, normalizedOptions, value]);

  const updatePortalPosition = useDropdownPortalLifecycle({
    isOpen,
    setIsOpen,
    containerRef,
    triggerRef,
    listRef,
    searchInputRef,
    isSearchEnabled,
    menuPlacement: "auto",
    setPortalPos,
    setSearchQuery,
    setHighlightedIndex,
  });

  useEffect(() => {
    if (!isOpen || !isSearchEnabled) return;
    if (searchQuery.trim() === "") {
      const selectedIdx = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : filteredOptions.length > 0 ? 0 : -1);
    } else {
      setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    }
  }, [filteredOptions.length, isOpen, isSearchEnabled, searchQuery, value]);

  const handleToggle = () => {
    if (onClick) {
      onClick();
    }
    if (!isInput && normalizedOptions.length > 0) {
      if (!isOpen) {
        updatePortalPosition();
      }
      setIsOpen((prev) => !prev);
    }
  };

  const handleSelectOption = (optVal: string) => {
    if (onChange) {
      onChange(optVal);
    }
    setSearchQuery("");
    setHighlightedIndex(-1);
    setIsOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    handleDropdownSearchKeyDown(
      e,
      filteredOptions,
      highlightedIndex,
      setHighlightedIndex,
      handleSelectOption,
      listRef.current
    );
  };

  const renderFieldOptions = () => {
    if (filteredOptions.length === 0) {
      return <div className="custom-select-empty">No matching results</div>;
    }

    return filteredOptions.map((opt, idx) => {
      const isSelected = opt.value === value;
      const isHighlighted = isSearchEnabled && idx === highlightedIndex;
      return (
        <div
          key={opt.value}
          className={`custom-select-option ${isSelected ? "is-selected" : ""} ${
            isHighlighted ? "is-highlighted" : ""
          }`}
          role="option"
          aria-selected={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            handleSelectOption(opt.value);
          }}
        >
          <span className="custom-select-option-text" title={opt.label}>
            {opt.label}
          </span>
          {isSelected && (
            <span className="custom-select-option-check" aria-hidden="true">
              <Icon name="check" size={14} strokeWidth={2.5} />
            </span>
          )}
        </div>
      );
    });
  };

  const dropdownMenu =
    !isInput && isOpen && normalizedOptions.length > 0 && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={listRef}
            className={`custom-select-dropdown custom-select-dropdown--portal ${
              isSearchEnabled ? "custom-select-dropdown--searchable" : ""
            } ${portalPos.openUpwards ? "custom-select-dropdown--top" : ""} ${
              portalPos.alignRight ? "custom-select-dropdown--align-right" : ""
            }`}
            role="listbox"
            style={portalPos.style}
            onClick={(e) => e.stopPropagation()}
          >
            {isSearchEnabled && (
              <div className="custom-select-search-box">
                <span className="custom-select-search-icon" aria-hidden="true">
                  <Icon name="search" size={14} />
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  className="custom-select-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${label}`}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="custom-select-search-clear"
                    onClick={() => {
                      setSearchQuery("");
                      searchInputRef.current?.focus({ preventScroll: true });
                    }}
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    <Icon name="close" size={13} />
                  </button>
                )}
              </div>
            )}

            {isSearchEnabled ? (
              <div className="custom-select-options-list">{renderFieldOptions()}</div>
            ) : (
              renderFieldOptions()
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={containerRef}
      className={`field ${wide ? "field--wide" : ""}`}
      style={{ position: "relative" }}
    >
      <span className="field__label">{label}</span>
      <div
        ref={triggerRef}
        className={`field__control ${isOpen ? "is-active" : ""}`}
        style={{ position: "relative", cursor: isInput ? "text" : "pointer" }}
        onClick={handleToggle}
        role={isInput ? undefined : "button"}
        tabIndex={isInput ? undefined : 0}
        onKeyDown={(e) => {
          if (isInput) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            handleToggle();
          } else if (
            isSearchEnabled &&
            !isOpen &&
            e.key.length === 1 &&
            !e.ctrlKey &&
            !e.metaKey &&
            !e.altKey
          ) {
            e.preventDefault();
            updatePortalPosition();
            setSearchQuery(e.key);
            setIsOpen(true);
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

      {dropdownMenu}
    </div>
  );
}
