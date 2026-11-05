import React, { useState, useEffect, useRef, useMemo } from "react";
import { Icon } from "./Icon";

export interface CustomDatePickerProps {
  value?: string; // Format: "YYYY-MM-DD"
  onChange?: (date: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function parseISODate(dateStr?: string): { year: number; month: number; day: number } | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const parts = dateStr.trim().split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // 0-indexed
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return { year, month, day };
}

function formatToISO(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(dateStr?: string): string {
  const parsed = parseISODate(dateStr);
  if (!parsed) return "";
  const d = String(parsed.day).padStart(2, "0");
  const m = String(parsed.month + 1).padStart(2, "0");
  const y = String(parsed.year).padStart(4, "0");
  return `${d}/${m}/${y}`;
}

export function CustomDatePicker({
  value = "",
  onChange,
  placeholder = "DD/MM/YYYY",
  disabled = false,
  className = "",
  id,
  name,
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialize view year & month from value or today
  const today = useMemo(() => new Date(), []);
  const initialDate = useMemo(() => parseISODate(value) || {
    year: today.getFullYear(),
    month: today.getMonth(),
    day: today.getDate(),
  }, [value, today]);

  const [viewYear, setViewYear] = useState<number>(initialDate.year);
  const [viewMonth, setViewMonth] = useState<number>(initialDate.month);
  const [yearRangeStart, setYearRangeStart] = useState<number>(
    () => Math.floor(initialDate.year / 12) * 12
  );

  // When value changes from outside, sync view if valid
  useEffect(() => {
    const parsed = parseISODate(value);
    if (parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
      setYearRangeStart(Math.floor(parsed.year / 12) * 12);
    }
  }, [value]);

  // Handle click outside to close popup
  useEffect(() => {
    if (!isOpen) {
      setIsYearPickerOpen(false);
      return;
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsYearPickerOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsYearPickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handlePrevYearRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    setYearRangeStart((s) => s - 12);
  };

  const handleNextYearRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    setYearRangeStart((s) => s + 12);
  };

  const handleSelectDay = (year: number, month: number, day: number) => {
    const isoString = formatToISO(year, month, day);
    onChange?.(isoString);
    setIsOpen(false);
    setIsYearPickerOpen(false);
  };

  const handleSelectYear = (year: number) => {
    setViewYear(year);
    setIsYearPickerOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.("");
    setIsOpen(false);
    setIsYearPickerOpen(false);
  };

  const handleToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isoString = formatToISO(today.getFullYear(), today.getMonth(), today.getDate());
    onChange?.(isoString);
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setIsOpen(false);
    setIsYearPickerOpen(false);
  };

  // Generate calendar days matrix
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      iso: string;
      isSelected: boolean;
      isToday: boolean;
    }> = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = formatToISO(y, m, day);
      days.push({
        day,
        month: m,
        year: y,
        isCurrentMonth: false,
        iso,
        isSelected: iso === value,
        isToday:
          today.getFullYear() === y &&
          today.getMonth() === m &&
          today.getDate() === day,
      });
    }

    // Current month days
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const iso = formatToISO(viewYear, viewMonth, day);
      days.push({
        day,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        iso,
        isSelected: iso === value,
        isToday:
          today.getFullYear() === viewYear &&
          today.getMonth() === viewMonth &&
          today.getDate() === day,
      });
    }

    // Next month leading days to complete grid (up to 35 or 42)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let day = 1; day <= remaining; day++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      const iso = formatToISO(y, m, day);
      days.push({
        day,
        month: m,
        year: y,
        isCurrentMonth: false,
        iso,
        isSelected: iso === value,
        isToday:
          today.getFullYear() === y &&
          today.getMonth() === m &&
          today.getDate() === day,
      });
    }

    return days;
  }, [viewYear, viewMonth, value, today]);

  const displayString = formatDisplay(value);

  // 12-year window for year selector
  const yearsList = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => yearRangeStart + i);
  }, [yearRangeStart]);

  return (
    <div
      ref={containerRef}
      className={`custom-datepicker-container ${className} ${disabled ? "is-disabled" : ""}`}
      id={id}
    >
      {/* Hidden input for form submits */}
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger Field - Click anywhere opens popup */}
      <div
        className={`custom-datepicker-trigger ${isOpen ? "is-active" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen((prev) => !prev);
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }
        }}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span className={`custom-datepicker-value ${!displayString ? "is-placeholder" : ""}`}>
          {displayString || placeholder}
        </span>
        <div className="custom-datepicker-icon" aria-hidden="true">
          <Icon name="calendar" size={16} />
        </div>
      </div>

      {/* Custom GeniusOne Calendar Popup */}
      {isOpen && (
        <div className="custom-calendar-popup" role="dialog" aria-modal="true" aria-label="Choose Date">
          {/* Calendar Header */}
          <div className="custom-calendar-header">
            {isYearPickerOpen ? (
              <button
                type="button"
                className="custom-calendar-year-range-title"
                onClick={() => setIsYearPickerOpen(false)}
                title="Click to return to days view"
              >
                <span>{yearRangeStart} – {yearRangeStart + 11}</span>
                <Icon name="chevronUp" size={13} />
              </button>
            ) : (
              <div className="custom-calendar-title-group">
                <span className="custom-calendar-month-text">{MONTH_NAMES[viewMonth]}</span>
                <button
                  type="button"
                  className="custom-calendar-year-badge-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setYearRangeStart(Math.floor(viewYear / 12) * 12);
                    setIsYearPickerOpen(true);
                  }}
                  title="Click to select year range"
                >
                  <span>{viewYear}</span>
                  <Icon name="chevronDown" size={12} />
                </button>
              </div>
            )}

            <div className="custom-calendar-nav">
              <button
                type="button"
                className="custom-calendar-nav-btn"
                onClick={isYearPickerOpen ? handlePrevYearRange : handlePrevMonth}
                title={isYearPickerOpen ? "Previous 12 Years" : "Previous Month"}
                aria-label={isYearPickerOpen ? "Previous 12 Years" : "Previous Month"}
              >
                <Icon name="chevronLeft" size={15} />
              </button>
              <button
                type="button"
                className="custom-calendar-nav-btn"
                onClick={isYearPickerOpen ? handleNextYearRange : handleNextMonth}
                title={isYearPickerOpen ? "Next 12 Years" : "Next Month"}
                aria-label={isYearPickerOpen ? "Next 12 Years" : "Next Month"}
              >
                <Icon name="chevronRight" size={15} />
              </button>
            </div>
          </div>

          {/* Conditional View: Year Picker Grid vs Days Matrix */}
          {isYearPickerOpen ? (
            <div className="custom-calendar-year-picker-view">
              <div className="custom-calendar-years-grid">
                {yearsList.map((y) => (
                  <button
                    key={y}
                    type="button"
                    className={`custom-calendar-year-cell ${y === viewYear ? "is-selected" : ""} ${
                      y === today.getFullYear() ? "is-current-year" : ""
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectYear(y);
                    }}
                  >
                    {y}
                  </button>
                ))}
              </div>

              <div className="custom-calendar-footer">
                <button
                  type="button"
                  className="custom-calendar-action custom-calendar-action--clear"
                  onClick={() => setIsYearPickerOpen(false)}
                >
                  Back to Days
                </button>
                <button
                  type="button"
                  className="custom-calendar-action custom-calendar-action--today"
                  onClick={() => {
                    handleSelectYear(today.getFullYear());
                  }}
                >
                  Current Year ({today.getFullYear()})
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Weekday Labels */}
              <div className="custom-calendar-weekdays">
                {WEEKDAY_NAMES.map((w) => (
                  <div key={w} className="custom-calendar-weekday">
                    {w}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="custom-calendar-grid">
                {calendarDays.map((item, idx) => (
                  <button
                    key={`${item.iso}-${idx}`}
                    type="button"
                    className={`custom-calendar-day ${
                      !item.isCurrentMonth ? "is-outside" : ""
                    } ${item.isSelected ? "is-selected" : ""} ${
                      item.isToday ? "is-today" : ""
                    }`}
                    onClick={() => handleSelectDay(item.year, item.month, item.day)}
                  >
                    {item.day}
                  </button>
                ))}
              </div>

              {/* Quick Action Footer: Clear & Today */}
              <div className="custom-calendar-footer">
                <button
                  type="button"
                  className="custom-calendar-action custom-calendar-action--clear"
                  onClick={handleClear}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="custom-calendar-action custom-calendar-action--today"
                  onClick={handleToday}
                >
                  Today
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
