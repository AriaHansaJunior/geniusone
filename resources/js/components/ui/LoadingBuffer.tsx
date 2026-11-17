import React from "react";

export interface LoadingBufferProps {
  label?: string;
  sublabel?: string;
  variant?: "table" | "panel" | "inline";
  skeletonRows?: number;
  className?: string;
}

/**
 * Unified data buffering animation across Modern UI and Default UI.
 */
export function LoadingBuffer({
  label = "Loading data...",
  sublabel,
  variant = "panel",
  skeletonRows = 0,
  className = "",
}: LoadingBufferProps) {
  const showSkeleton = variant !== "inline" && skeletonRows > 0;

  return (
    <div
      className={`loading-buffer loading-buffer--${variant} ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="loading-buffer__head">
        <span className="loading-buffer__spinner" aria-hidden="true" />
        <div className="loading-buffer__text">
          <span className="loading-buffer__label">{label}</span>
          {sublabel && variant !== "inline" && (
            <span className="loading-buffer__sublabel">{sublabel}</span>
          )}
        </div>
      </div>

      {showSkeleton && (
        <div className="loading-buffer-skeleton" aria-hidden="true">
          {Array.from({ length: skeletonRows }, (_, idx) => (
            <div
              key={idx}
              className={`loading-buffer-skeleton__row ${
                idx === skeletonRows - 1 ? "loading-buffer-skeleton__row--short" : ""
              }`.trim()}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface TableLoadingRowProps {
  colSpan: number;
  label?: string;
  sublabel?: string;
  skeletonRows?: number;
}

/**
 * Drop-in table body row displaying animated buffering state while records load.
 */
export function TableLoadingRow({
  colSpan,
  label = "Loading records...",
  sublabel = "Please wait while data is synchronized from the server.",
  skeletonRows = 3,
}: TableLoadingRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="loading-buffer-table-cell">
        <LoadingBuffer
          variant="table"
          label={label}
          sublabel={sublabel}
          skeletonRows={skeletonRows}
        />
      </td>
    </tr>
  );
}
