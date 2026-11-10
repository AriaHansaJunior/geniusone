import React, { useEffect } from "react";
import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export interface KwtPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentCode: string;
  // Optional variant switcher for PR (Internal vs Eksternal)
  hasVariantSwitcher?: boolean;
  activeVariant?: "internal" | "eksternal";
  onVariantChange?: (variant: "internal" | "eksternal") => void;
  children: React.ReactNode;
}

export const KwtPrintModal: React.FC<KwtPrintModalProps> = ({
  isOpen,
  onClose,
  title,
  documentCode,
  hasVariantSwitcher = false,
  activeVariant = "internal",
  onVariantChange,
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="kwt-print-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="kwt-print-modal" role="dialog" aria-modal="true">
        {/* Modal Header */}
        <div className="kwt-print-modal__header">
          <div className="kwt-print-modal__title-box">
            <h3 className="kwt-print-modal__title">{title}</h3>
            <span className="kwt-print-modal__code-badge">{documentCode}</span>
          </div>

          <div className="kwt-print-modal__actions">
            {hasVariantSwitcher && onVariantChange && (
              <div className="kwt-print-modal__type-switcher">
                <button
                  type="button"
                  className={`kwt-print-modal__type-btn ${
                    activeVariant === "internal" ? "active" : ""
                  }`}
                  onClick={() => onVariantChange("internal")}
                >
                  Internal (KWT-PPIC-001)
                </button>
                <button
                  type="button"
                  className={`kwt-print-modal__type-btn ${
                    activeVariant === "eksternal" ? "active" : ""
                  }`}
                  onClick={() => onVariantChange("eksternal")}
                >
                  Eksternal (KWT-PPIC-002)
                </button>
              </div>
            )}

            <Button variant="primary" icon="print" onClick={handlePrint}>
              Print Now
            </Button>
            <Button variant="secondary" icon="x" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        {/* Modal Body: Printable Document Sheet */}
        <div className="kwt-print-modal__body">{children}</div>
      </div>
    </div>
  );
};

