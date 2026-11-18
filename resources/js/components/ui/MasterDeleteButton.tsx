import React from "react";
import { Icon } from "./Icon";

export interface MasterDeleteButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * Icon-only delete button matching GeniusOne's standardized .btn-action-delete style.
 */
export function MasterDeleteButton({
  label,
  onClick,
  disabled = false,
}: MasterDeleteButtonProps) {
  return (
    <button
      type="button"
      className="btn-action-delete"
      onClick={onClick}
      disabled={disabled}
      title={`Delete ${label}`}
      aria-label={`Delete ${label}`}
    >
      <Icon name="trash" size={14} />
    </button>
  );
}
