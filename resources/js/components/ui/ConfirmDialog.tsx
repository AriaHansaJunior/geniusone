import { useEffect } from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import type { IconName } from "../../types";

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  /**
   * Structured entity properties for uniform 2-line delete confirmations:
   * Line 1: Are you sure you want to delete {entityType}
   * Line 2: "{entityName}" ({entityCode})?
   * Line 3: {notice || "This action cannot be undone."}
   */
  entityType?: string;
  entityName?: string;
  entityCode?: string;
  /**
   * Fallback message or custom confirmation content
   */
  message?: string;
  notice?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "secondary" | "danger" | "warning";
  variant?: "primary" | "secondary" | "danger" | "warning"; // backwards compatibility alias
  icon?: IconName;
  onConfirm: () => void;
  onCancel: () => void;
}

function capitalizeWords(str: string): string {
  if (!str) return "";
  return str
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ConfirmDialog({
  isOpen,
  title,
  entityType,
  entityName,
  entityCode,
  message,
  notice,
  confirmLabel,
  cancelLabel = "Cancel",
  confirmVariant,
  variant,
  icon,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Resolve active variant: prop confirmVariant -> variant alias -> default danger if deleting
  const isDeleteIntent = Boolean(
    entityType ||
    (message && /delete|remove|destroy|hapus/i.test(message))
  );

  const effectiveVariant =
    confirmVariant ||
    variant ||
    (isDeleteIntent ? "danger" : "primary");

  const isDanger = effectiveVariant === "danger";

  // Parse structured entity details from message if props not explicitly provided
  let activeEntityType = entityType;
  let activeEntityName = entityName;
  let activeEntityCode = entityCode;
  let activeNotice = notice;

  if (!activeEntityType && message) {
    // Matches patterns like:
    // "Are you sure you want to delete request type "Export Batch" (REQ-TYP-07)? This action cannot be undone."
    // "Are you sure you want to delete brand "NO BRAND"? This action cannot be undone."
    // "Are you sure you want to delete the buffer threshold rule for "Steel" (RM-01)?"
    const deleteRegex =
      /^Are you sure you want to delete (?:the )?(?:([a-zA-Z0-9_\s-]+?)\s+(?:rule for\s+)?)"([^"]+)"(?:\s*\(([^)]+)\))?\?\s*(.*)$/i;
    const match = message.match(deleteRegex);
    if (match) {
      activeEntityType = match[1]?.trim() || "record";
      activeEntityName = match[2]?.trim();
      activeEntityCode = match[3] ? match[3].trim() : undefined;
      if (match[4] && match[4].trim()) {
        activeNotice = match[4].trim();
      }
    }
  }

  // Capitalize entity type for display in Title and Confirm Button
  const entityTitleCase = activeEntityType ? capitalizeWords(activeEntityType) : "";

  // Title: explicitly provided -> or "Delete {EntityType}" -> or "Confirm Action"
  const displayTitle =
    title && title !== "Delete Record?"
      ? title
      : entityTitleCase
      ? `Delete ${entityTitleCase}`
      : isDanger
      ? "Delete Record"
      : "Confirm Action";

  // Confirm Button Label: explicitly provided -> or "Delete {EntityType}" -> or "Confirm"
  const displayConfirmLabel =
    confirmLabel && confirmLabel !== "Continue"
      ? confirmLabel
      : entityTitleCase
      ? `Delete ${entityTitleCase}`
      : isDanger
      ? "Delete"
      : "Confirm";

  // Icon: explicitly provided -> trash for danger/delete -> alertTriangle
  const displayIcon: IconName =
    icon || (isDanger ? "trash" : "alertTriangle");

  const hasUniformEntity = Boolean(activeEntityType && activeEntityName);

  return (
    <div
      className="confirm-dialog-backdrop"
      onMouseDown={onCancel}
      role="presentation"
    >
      <div
        className="confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog__header">
          <div
            className={`confirm-dialog__icon-wrapper ${
              isDanger ? "confirm-dialog__icon-wrapper--danger" : ""
            }`}
          >
            <Icon name={displayIcon} size={22} />
          </div>
          <div className="confirm-dialog__header-text">
            <h3 id="confirm-dialog-title">{displayTitle}</h3>
          </div>
          <button
            type="button"
            className="confirm-dialog__close"
            onClick={onCancel}
            aria-label="Close dialog"
            title="Close dialog"
          >
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="confirm-dialog__body">
          {hasUniformEntity ? (
            <div className="confirm-dialog__uniform-box">
              <div className="confirm-dialog__line1">
                Are you sure you want to delete {activeEntityType}
              </div>
              <div className="confirm-dialog__line2">
                "{activeEntityName}"{activeEntityCode ? ` (${activeEntityCode})` : ""}?
              </div>
              <div className="confirm-dialog__warning">
                {activeNotice || "This action cannot be undone."}
              </div>
            </div>
          ) : (
            <>
              <p className="confirm-dialog__message">{message}</p>
              {activeNotice && (
                <div className="confirm-dialog__notice">
                  <Icon name="alertTriangle" size={16} />
                  <span>{activeNotice}</span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="confirm-dialog__footer">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={effectiveVariant}
            onClick={onConfirm}
          >
            {displayConfirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
