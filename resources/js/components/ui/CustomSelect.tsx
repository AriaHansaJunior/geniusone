import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
}

export interface PortalDropdownPosition {
  style: React.CSSProperties;
  openUpwards: boolean;
  alignRight: boolean;
}

export function computeDropdownPortalPosition(
  rect: DOMRect,
  opts: {
    menuPlacement?: "auto" | "bottom" | "top";
    isSearchEnabled: boolean;
    compactWidth?: number;
  }
): PortalDropdownPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = 8;
  const gap = 4;

  const spaceBelow = Math.max(0, vh - rect.bottom - margin - gap);
  const spaceAbove = Math.max(0, rect.top - margin - gap);

  let openUpwards = false;
  if (opts.menuPlacement === "top") {
    openUpwards = true;
  } else if (opts.menuPlacement === "bottom") {
    openUpwards = false;
  } else {
    openUpwards = spaceBelow < 280 && spaceAbove > spaceBelow;
  }

  const maxPopupHeight = opts.isSearchEnabled ? 312 : 280;
  const availableVertical = openUpwards ? spaceAbove : spaceBelow;
  const clampedMaxHeight = Math.min(maxPopupHeight, Math.max(150, availableVertical));

  const targetMinWidth = opts.compactWidth
    ? opts.compactWidth
    : Math.min(Math.max(rect.width, opts.isSearchEnabled ? 250 : rect.width), vw - margin * 2);

  const alignRight =
    !opts.compactWidth && vw - rect.left < Math.max(targetMinWidth, 300) && rect.right > targetMinWidth;

  const style: React.CSSProperties = {
    maxHeight: `${clampedMaxHeight}px`,
  };

  if (opts.compactWidth) {
    style.width = `${opts.compactWidth}px`;
    style.minWidth = `${opts.compactWidth}px`;
    style.maxWidth = `${opts.compactWidth}px`;
    const safeLeft = Math.max(margin, Math.min(rect.left, vw - opts.compactWidth - margin));
    style.left = `${safeLeft}px`;
    style.right = "auto";
  } else if (alignRight) {
    const rightDist = Math.max(margin, vw - rect.right);
    const maxW = Math.min(Math.max(420, rect.width), vw - rightDist - margin);
    style.right = `${rightDist}px`;
    style.left = "auto";
    style.minWidth = `${Math.min(targetMinWidth, maxW)}px`;
    style.width = "max-content";
    style.maxWidth = `${Math.max(160, maxW)}px`;
  } else {
    const safeLeft = Math.max(
      margin,
      Math.min(rect.left, vw - Math.min(targetMinWidth, vw - margin * 2) - margin)
    );
    const maxW = Math.min(Math.max(420, rect.width), vw - safeLeft - margin);
    style.left = `${safeLeft}px`;
    style.right = "auto";
    style.minWidth = `${Math.min(targetMinWidth, maxW)}px`;
    style.width = "max-content";
    style.maxWidth = `${Math.max(160, maxW)}px`;
  }

  if (openUpwards) {
    style.top = "auto";
    style.bottom = `${Math.max(margin, vh - rect.top + gap)}px`;
  } else {
    style.top = `${Math.max(margin, rect.bottom + gap)}px`;
    style.bottom = "auto";
  }

  return { style, openUpwards, alignRight };
}

export function scrollOptionIntoContainer(containerEl: HTMLElement | null, selector: string) {
  if (!containerEl) return;
  const targetEl = containerEl.querySelector(selector) as HTMLElement | null;
  if (!targetEl) return;
  const scrollBox =
    (containerEl.querySelector(".custom-select-options-list") as HTMLElement | null) || containerEl;
  const elRect = targetEl.getBoundingClientRect();
  const boxRect = scrollBox.getBoundingClientRect();
  if (elRect.top < boxRect.top) {
    scrollBox.scrollTop -= boxRect.top - elRect.top + 6;
  } else if (elRect.bottom > boxRect.bottom) {
    scrollBox.scrollTop += elRect.bottom - boxRect.bottom + 6;
  }
}

export function handleDropdownSearchKeyDown<T extends { value: string }>(
  e: React.KeyboardEvent<HTMLInputElement>,
  filteredOptions: T[],
  highlightedIndex: number,
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>,
  onSelect: (val: string) => void,
  listEl?: HTMLElement | null
) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    if (filteredOptions.length === 0) return;
    setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
    window.requestAnimationFrame(() => {
      scrollOptionIntoContainer(listEl ?? null, ".custom-select-option.is-highlighted");
    });
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (filteredOptions.length === 0) return;
    setHighlightedIndex((prev) => (prev <= 0 ? filteredOptions.length - 1 : prev - 1));
    window.requestAnimationFrame(() => {
      scrollOptionIntoContainer(listEl ?? null, ".custom-select-option.is-highlighted");
    });
  } else if (e.key === "Enter") {
    if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
      e.preventDefault();
      onSelect(filteredOptions[highlightedIndex].value);
    }
  }
}

export function useDropdownPortalLifecycle(params: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  triggerRef: React.RefObject<HTMLDivElement | null>;
  listRef: React.RefObject<HTMLDivElement | null>;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  isSearchEnabled: boolean;
  menuPlacement?: "auto" | "bottom" | "top";
  compactWidth?: number;
  setPortalPos: React.Dispatch<React.SetStateAction<PortalDropdownPosition>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>;
}) {
  const {
    isOpen,
    setIsOpen,
    containerRef,
    triggerRef,
    listRef,
    searchInputRef,
    isSearchEnabled,
    menuPlacement = "auto",
    compactWidth,
    setPortalPos,
    setSearchQuery,
    setHighlightedIndex,
  } = params;

  const updatePortalPosition = useCallback(() => {
    const anchorEl = triggerRef.current || containerRef.current;
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    setPortalPos(
      computeDropdownPortalPosition(rect, {
        menuPlacement,
        isSearchEnabled,
        compactWidth,
      })
    );
  }, [containerRef, triggerRef, menuPlacement, isSearchEnabled, compactWidth, setPortalPos]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = listRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      if (listRef.current && target && listRef.current.contains(target)) {
        return;
      }
      const anchorEl = triggerRef.current || containerRef.current;
      if (!anchorEl) return;
      const rect = anchorEl.getBoundingClientRect();
      if (
        rect.bottom < 0 ||
        rect.top > window.innerHeight ||
        rect.right < 0 ||
        rect.left > window.innerWidth
      ) {
        setIsOpen(false);
        return;
      }
      setPortalPos(
        computeDropdownPortalPosition(rect, {
          menuPlacement,
          isSearchEnabled,
          compactWidth,
        })
      );
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePortalPosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePortalPosition);
    };
  }, [
    isOpen,
    setIsOpen,
    containerRef,
    triggerRef,
    listRef,
    menuPlacement,
    isSearchEnabled,
    compactWidth,
    setPortalPos,
    updatePortalPosition,
  ]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setHighlightedIndex(-1);
      return;
    }

    updatePortalPosition();

    const frame = window.requestAnimationFrame(() => {
      scrollOptionIntoContainer(listRef.current, ".custom-select-option.is-selected");
      if (isSearchEnabled) {
        const input = searchInputRef.current;
        if (input) {
          input.focus({ preventScroll: true });
          const len = input.value.length;
          input.setSelectionRange(len, len);
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, isSearchEnabled, updatePortalPosition, listRef, searchInputRef, setSearchQuery, setHighlightedIndex]);

  return updatePortalPosition;
}

export function filterSelectOptions<
  T extends { value: string; label: string; description?: string; badge?: string }
>(options: T[], query: string): T[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return options;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return options;

  return options.filter((opt) => {
    const searchableValue =
      opt.value && opt.value !== "all" && !/^\d+$/.test(opt.value) ? opt.value : "";
    const haystack = [
      opt.label,
      opt.description || "",
      opt.badge || "",
      searchableValue,
    ]
      .join(" ")
      .toLowerCase();

    return tokens.every((token) => haystack.includes(token));
  });
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: (string | CustomSelectOption)[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dropdownClassName?: string;
  dropdownWidth?: number;
  id?: string;
  name?: string;
  style?: React.CSSProperties;
  menuPlacement?: "auto" | "bottom" | "top";
  searchable?: boolean;
  searchPlaceholder?: string;
  required?: boolean;
  invalid?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option...",
  disabled = false,
  className = "",
  dropdownClassName = "",
  dropdownWidth,
  id,
  name,
  style,
  menuPlacement = "auto",
  searchable,
  searchPlaceholder = "Type to search...",
  required = false,
  invalid = false,
}: CustomSelectProps) {
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

  // Normalize options array to { value, label, description, badge }
  const normalizedOptions: CustomSelectOption[] = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === "string") {
        return { value: opt, label: opt };
      }
      return opt;
    });
  }, [options]);

  const isSearchEnabled =
    searchable !== undefined ? searchable : normalizedOptions.length >= 6;

  const filteredOptions = useMemo(() => {
    if (!isSearchEnabled) return normalizedOptions;
    return filterSelectOptions(normalizedOptions, searchQuery);
  }, [isSearchEnabled, normalizedOptions, searchQuery]);

  // Find active option label
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  const displayLabel = selectedOption ? selectedOption.label : value || placeholder;

  const updatePortalPosition = useDropdownPortalLifecycle({
    isOpen,
    setIsOpen,
    containerRef,
    triggerRef,
    listRef,
    searchInputRef,
    isSearchEnabled,
    menuPlacement,
    compactWidth: dropdownWidth,
    setPortalPos,
    setSearchQuery,
    setHighlightedIndex,
  });

  // Handle open toggle with placement calculation
  const handleToggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePortalPosition();
    }
    setIsOpen((prev) => !prev);
  };

  // Keep highlighted option synchronized with active query results
  useEffect(() => {
    if (!isOpen || !isSearchEnabled) return;
    if (searchQuery.trim() === "") {
      const selectedIdx = filteredOptions.findIndex((opt) => opt.value === value);
      setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : filteredOptions.length > 0 ? 0 : -1);
    } else {
      setHighlightedIndex(filteredOptions.length > 0 ? 0 : -1);
    }
  }, [filteredOptions.length, isOpen, isSearchEnabled, searchQuery, value]);

  const handleSelect = (val: string) => {
    onChange(val);
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
      handleSelect,
      listRef.current
    );
  };

  const renderOptionsList = () => {
    if (filteredOptions.length === 0) {
      return <div className="custom-select-empty">No matching results</div>;
    }

    return filteredOptions.map((opt, idx) => {
      const isSelected = opt.value === value;
      const isHighlighted = isSearchEnabled && idx === highlightedIndex;
      return (
        <div
          key={opt.value}
          className={`custom-select-option ${isSelected ? "is-selected" : ""} ${isHighlighted ? "is-highlighted" : ""
            } ${opt.description ? "has-desc" : ""}`}
          role="option"
          aria-selected={isSelected}
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(opt.value);
          }}
        >
          <div className="custom-select-option-content">
            <div className="custom-select-option-row">
              <span className="custom-select-option-text" title={opt.label}>
                {opt.label}
              </span>
              {opt.badge && <span className="custom-select-option-badge">{opt.badge}</span>}
            </div>
            {opt.description && (
              <span className="custom-select-option-desc">{opt.description}</span>
            )}
          </div>
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
    isOpen && typeof document !== "undefined"
      ? createPortal(
        <div
          className={`custom-select-dropdown custom-select-dropdown--portal ${dropdownClassName} ${isSearchEnabled ? "custom-select-dropdown--searchable" : ""
            } ${portalPos.openUpwards ? "custom-select-dropdown--top" : ""} ${portalPos.alignRight ? "custom-select-dropdown--align-right" : ""
            }`}
          ref={listRef}
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
                aria-label="Search options"
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
            <div className="custom-select-options-list">{renderOptionsList()}</div>
          ) : (
            renderOptionsList()
          )}
        </div>,
        document.body
      )
      : null;

  return (
    <div
      ref={containerRef}
      className={`custom-select-container ${className} ${disabled ? "is-disabled" : ""} ${isOpen ? "is-open" : ""}`}
      id={id}
      style={style}
    >
      {/* Hidden input for forms */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Button - Entire surface clickable */}
      <div
        ref={triggerRef}
        className={`custom-select-trigger ${isOpen ? "is-open" : ""} ${invalid || className.includes("has-error") ? "has-error" : ""
          }`.trim()}
        onClick={handleToggleOpen}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required ? "true" : undefined}
        aria-invalid={invalid || className.includes("has-error") ? "true" : undefined}
        data-required={required ? "true" : undefined}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            handleToggleOpen();
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
      >
        <span
          className={`custom-select-label ${!selectedOption && !value ? "is-placeholder" : ""}`}
          title={typeof displayLabel === "string" ? displayLabel : undefined}
        >
          {displayLabel}
        </span>
        <div className={`custom-select-chevron ${isOpen ? "is-open" : ""}`} aria-hidden="true">
          <Icon name="chevronDown" size={15} />
        </div>
      </div>

      {dropdownMenu}
    </div>
  );
}
